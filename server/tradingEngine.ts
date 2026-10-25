// server/tradingEngine.ts
// Server-authoritative order management, margin and risk engine.
//  - market / limit / stop orders, partial close, SL / TP, modify, cancel
//  - tier-based spreads & commissions, per-symbol lot rules and stop levels
//  - margin call + stop-out, negative-balance protection
//  - nightly swap rollover (triple on Wednesday), market-hours enforcement
//  - every balance change goes through the ledger; orders persist in SQLite
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { db } from './db.js';
import { marketData, Quote } from './marketData.js';
import { SPEC_BY_SYMBOL, SYMBOL_SPECS, SymbolSpec, TIER_CONDITIONS, Tier, isMarketOpen } from './symbols.js';

export type Side = 'BUY' | 'SELL';
export type OrderKind = 'market' | 'limit' | 'stop';
export type OrderStatus = 'pending' | 'open' | 'closed' | 'liquidated' | 'cancelled';

export interface Order {
  id: string;
  ticket: number;
  accountId: string;
  symbol: string;
  side: Side;
  kind: OrderKind;
  status: OrderStatus;
  lots: number;
  pendingPrice?: number;
  openPrice?: number;
  closePrice?: number;
  currentPrice?: number;
  sl?: number;
  tp?: number;
  commission: number;
  swap: number;
  pnl: number; // floating while open, realised when closed (gross, excludes commission/swap)
  margin: number;
  parentId?: string;
  closeReason?: string;
  createdAt: string;
  openedAt?: string;
  closedAt?: string;
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  tier: Tier;
  currency: string;
  balance: number;
  leverage: number;
  isDemo: boolean;
  status: string;
  // derived
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  floatingPnl: number;
  createdAt: string;
}

export type Result<T> = ({ ok: true; error?: undefined } & T) | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const money = (v: number) => Math.round(v * 100) / 100;
const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
};

export const ENGINE_CONFIG = {
  marginCallLevel: Number(process.env.MARGIN_CALL_LEVEL || 100),
  stopOutLevel: Number(process.env.STOP_OUT_LEVEL || 20),
  maxActiveOrders: 200,
  /** Trading hours are always enforced with real prices; MARKET_HOURS=off only applies to the simulator. */
  get enforceMarketHours(): boolean {
    return (process.env.MARKET_HOURS || 'on') !== 'off' || !marketData.simulated;
  },
  demoStartBalance: 10000,
};

class TradingEngine extends EventEmitter {
  accounts = new Map<string, Account>();
  private orders = new Map<string, Order>(); // pending + open only
  private nextTicket = 100001;
  private lastEmit = new Map<string, number>();
  private busy = false;

  start() {
    const maxTicket = db.prepare('SELECT MAX(ticket) AS m FROM orders').get() as any;
    this.nextTicket = Math.max(100001, (maxTicket?.m ?? 100000) + 1);

    for (const r of db.prepare('SELECT * FROM accounts').all() as any[]) {
      this.accounts.set(r.id, {
        id: r.id, userId: r.user_id, accountNumber: r.account_number, tier: r.tier, currency: r.currency,
        balance: r.balance, leverage: r.leverage, isDemo: !!r.is_demo, status: r.status, createdAt: r.created_at,
        equity: r.balance, margin: 0, freeMargin: r.balance, marginLevel: 0, floatingPnl: 0,
      });
    }
    for (const r of db.prepare("SELECT * FROM orders WHERE status IN ('pending','open')").all() as any[]) {
      this.orders.set(r.id, this.rowToOrder(r));
    }
    for (const a of this.accounts.values()) this.recalc(a);

    marketData.onTick((q) => this.onTick(q));
    setInterval(() => this.rolloverCheck(), 30_000).unref();
  }

  private rowToOrder(r: any): Order {
    const u = (v: any) => (v === null || v === undefined ? undefined : v);
    return {
      id: r.id, ticket: r.ticket, accountId: r.account_id, symbol: r.symbol, side: r.side, kind: r.kind,
      status: r.status, lots: r.lots, pendingPrice: u(r.pending_price), openPrice: u(r.open_price),
      closePrice: u(r.close_price), sl: u(r.sl), tp: u(r.tp), commission: r.commission, swap: r.swap,
      pnl: r.pnl, margin: r.margin, parentId: u(r.parent_id), closeReason: u(r.close_reason),
      createdAt: r.created_at, openedAt: u(r.opened_at), closedAt: u(r.closed_at),
    };
  }

  private saveOrder(o: Order) {
    db.prepare(`INSERT OR REPLACE INTO orders
      (id,ticket,account_id,symbol,side,kind,status,lots,pending_price,open_price,close_price,sl,tp,commission,swap,pnl,margin,parent_id,close_reason,created_at,opened_at,closed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      o.id, o.ticket, o.accountId, o.symbol, o.side, o.kind, o.status, o.lots, o.pendingPrice ?? null,
      o.openPrice ?? null, o.closePrice ?? null, o.sl ?? null, o.tp ?? null, o.commission, o.swap, o.pnl,
      o.margin, o.parentId ?? null, o.closeReason ?? null, o.createdAt, o.openedAt ?? null, o.closedAt ?? null
    );
  }

  // -------------------------------------------------------------- accounts
  private nextAccountNumber(): string {
    for (;;) {
      const n = String(10000000 + crypto.randomInt(0, 89999999));
      if (!db.prepare('SELECT 1 FROM accounts WHERE account_number = ?').get(n)) return n;
    }
  }

  createAccount(userId: string, opts: { tier?: Tier; leverage?: number; isDemo?: boolean; balance?: number } = {}): Account {
    const tier: Tier = opts.tier && opts.tier in TIER_CONDITIONS ? opts.tier : 'Standard';
    const isDemo = opts.isDemo ?? true;
    const allowed = [1, 5, 10, 20, 25, 50, 100, 200, 300, 400, 500, 1000, 2000];
    const leverage = opts.leverage && allowed.includes(opts.leverage) ? opts.leverage : 100;
    const balance = isDemo ? opts.balance ?? ENGINE_CONFIG.demoStartBalance : 0;
    const acc: Account = {
      id: `acc_${crypto.randomUUID()}`, userId, accountNumber: this.nextAccountNumber(), tier, currency: 'USD',
      balance: 0, leverage, isDemo, status: 'active', createdAt: new Date().toISOString(),
      equity: 0, margin: 0, freeMargin: 0, marginLevel: 0, floatingPnl: 0,
    };
    db.prepare('INSERT INTO accounts (id,user_id,account_number,tier,currency,balance,leverage,is_demo,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(acc.id, userId, acc.accountNumber, tier, acc.currency, 0, leverage, isDemo ? 1 : 0, 'active', acc.createdAt);
    this.accounts.set(acc.id, acc);
    if (balance > 0) this.ledger(acc, 'deposit', balance, 'initial', isDemo ? 'Demo starting balance' : 'Opening balance');
    this.recalc(acc);
    return acc;
  }

  accountsOf(userId: string): Account[] {
    return [...this.accounts.values()].filter((a) => a.userId === userId);
  }

  /** Single choke point for every balance change. */
  adjustBalance(accountId: string, amount: number, type: string, ref?: string, note?: string): Result<{ balance: number }> {
    const acc = this.accounts.get(accountId);
    if (!acc) return fail('Account not found');
    if (!Number.isFinite(amount)) return fail('Invalid amount');
    this.ledger(acc, type, amount, ref, note);
    this.recalc(acc);
    this.emitAccount(acc, true);
    return { ok: true, balance: acc.balance };
  }

  private ledger(acc: Account, type: string, amount: number, ref?: string, note?: string) {
    acc.balance = money(acc.balance + amount);
    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(acc.balance, acc.id);
    db.prepare('INSERT INTO ledger (account_id,type,amount,balance_after,ref,note,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(acc.id, type, money(amount), acc.balance, ref ?? null, note ?? null, new Date().toISOString());
  }

  resetDemo(accountId: string, balance = ENGINE_CONFIG.demoStartBalance): Result<{ account: Account }> {
    const acc = this.accounts.get(accountId);
    if (!acc || !acc.isDemo) return fail('Only demo accounts can be reset');
    for (const o of this.activeOrders(accountId)) {
      if (o.status === 'open') this.closeOrder(o.id, { reason: 'Demo reset' });
      else this.cancelOrder(o.id, 'Demo reset');
    }
    this.ledger(acc, 'adjustment', balance - acc.balance, 'demo_reset', 'Demo account reset');
    this.recalc(acc);
    this.emitAccount(acc, true);
    return { ok: true, account: acc };
  }

  // ----------------------------------------------------------- calculations
  private quoteFor(acc: Account, symbol: string): Quote | undefined {
    return marketData.quote(symbol, acc.tier);
  }

  private pnlAt(o: Order, spec: SymbolSpec, closePrice: number, lots = o.lots): number {
    const diff = o.side === 'BUY' ? closePrice - o.openPrice! : o.openPrice! - closePrice;
    const gross = diff * lots * spec.contractSize;
    return money(spec.usdBase ? gross / closePrice : gross);
  }

  private marginFor(spec: SymbolSpec, lots: number, price: number, leverage: number): number {
    const lev = Math.min(leverage, spec.maxLeverage);
    const notional = spec.usdBase ? lots * spec.contractSize : lots * spec.contractSize * price;
    return money(notional / lev);
  }

  private activeOrders(accountId: string): Order[] {
    return [...this.orders.values()].filter((o) => o.accountId === accountId);
  }

  private recalc(acc: Account) {
    let floating = 0;
    let margin = 0;
    for (const o of this.orders.values()) {
      if (o.accountId !== acc.id || o.status !== 'open') continue;
      floating += o.pnl;
      margin += o.margin;
    }
    acc.floatingPnl = money(floating);
    acc.equity = money(acc.balance + floating);
    acc.margin = money(margin);
    acc.freeMargin = money(acc.equity - margin);
    acc.marginLevel = margin > 0 ? money((acc.equity / margin) * 100) : 0;
  }

  private emitAccount(acc: Account, force = false) {
    const now = Date.now();
    if (!force && now - (this.lastEmit.get(acc.id) ?? 0) < 250) return;
    this.lastEmit.set(acc.id, now);
    this.emit('account', acc);
  }

  // ------------------------------------------------------------- validation
  private validateStops(spec: SymbolSpec, side: Side, ref: number, sl?: number, tp?: number): string | null {
    if (sl !== undefined && sl > 0) {
      if (side === 'BUY' ? sl > ref - spec.stopLevel : sl < ref + spec.stopLevel)
        return `Invalid Stop Loss: must be ${side === 'BUY' ? 'below' : 'above'} ${(side === 'BUY' ? ref - spec.stopLevel : ref + spec.stopLevel).toFixed(spec.digits)}`;
    }
    if (tp !== undefined && tp > 0) {
      if (side === 'BUY' ? tp < ref + spec.stopLevel : tp > ref - spec.stopLevel)
        return `Invalid Take Profit: must be ${side === 'BUY' ? 'above' : 'below'} ${(side === 'BUY' ? ref + spec.stopLevel : ref - spec.stopLevel).toFixed(spec.digits)}`;
    }
    return null;
  }

  // ---------------------------------------------------------------- orders
  placeOrder(p: { accountId: string; symbol: string; side: Side; kind?: OrderKind; lots: number; price?: number; sl?: number; tp?: number }): Result<{ order: Order; account: Account }> {
    const acc = this.accounts.get(p.accountId);
    if (!acc || acc.status !== 'active') return fail('Trading account not available');
    const spec = SPEC_BY_SYMBOL.get(p.symbol);
    if (!spec) return fail('Symbol not supported');
    if (p.side !== 'BUY' && p.side !== 'SELL') return fail('Side must be BUY or SELL');
    const kind: OrderKind = p.kind ?? 'market';
    if (!['market', 'limit', 'stop'].includes(kind)) return fail('Unsupported order type');

    const lots = num(p.lots);
    if (lots === undefined || lots < spec.minLot - 1e-9 || lots > spec.maxLot + 1e-9) return fail(`Volume must be between ${spec.minLot} and ${spec.maxLot} lots`);
    if (Math.abs(lots / spec.lotStep - Math.round(lots / spec.lotStep)) > 1e-6) return fail(`Volume step is ${spec.lotStep}`);
    if (this.activeOrders(acc.id).length >= ENGINE_CONFIG.maxActiveOrders) return fail('Maximum number of active orders reached');
    if (!marketData.isActive(spec.symbol)) return fail(`${spec.symbol} is not available: no live price source configured`);
    if (ENGINE_CONFIG.enforceMarketHours && !isMarketOpen(spec)) return fail(`Market is closed for ${spec.symbol}`);
    if (!marketData.isLive(spec.symbol)) return fail(`Live price for ${spec.symbol} is unavailable right now — please retry shortly`);

    const q = this.quoteFor(acc, spec.symbol);
    if (!q) return fail('No price available');
    const sl = num(p.sl) || undefined;
    const tp = num(p.tp) || undefined;
    const now = new Date().toISOString();

    const base: Order = {
      id: `ord_${crypto.randomUUID()}`, ticket: this.nextTicket++, accountId: acc.id, symbol: spec.symbol, side: p.side,
      kind, status: 'pending', lots, sl, tp, commission: 0, swap: 0, pnl: 0, margin: 0, createdAt: now,
    };

    if (kind === 'market') {
      const price = p.side === 'BUY' ? q.ask : q.bid;
      const err = this.validateStops(spec, p.side, p.side === 'BUY' ? q.bid : q.ask, sl, tp);
      if (err) return fail(err);
      const filled = this.fill(base, acc, spec, price);
      if (!filled.ok) return fail(filled.error!);
      return { ok: true, order: base, account: acc };
    }

    const price = num(p.price);
    if (price === undefined || price <= 0) return fail('Pending order requires a price');
    const d = spec.stopLevel;
    const bad =
      (kind === 'limit' && p.side === 'BUY' && price > q.ask - d) ||
      (kind === 'limit' && p.side === 'SELL' && price < q.bid + d) ||
      (kind === 'stop' && p.side === 'BUY' && price < q.ask + d) ||
      (kind === 'stop' && p.side === 'SELL' && price > q.bid - d);
    if (bad) return fail(`Invalid price for ${kind} ${p.side.toLowerCase()} order`);
    const err = this.validateStops(spec, p.side, price, sl, tp);
    if (err) return fail(err);
    base.pendingPrice = price;
    this.orders.set(base.id, base);
    this.saveOrder(base);
    this.emit('order', { order: base, event: 'placed' });
    return { ok: true, order: base, account: acc };
  }

  /** Turn an order into an open position at `price` (margin + commission checks). */
  private fill(o: Order, acc: Account, spec: SymbolSpec, price: number): Result<{}> {
    const margin = this.marginFor(spec, o.lots, price, acc.leverage);
    const commission = money(o.lots * TIER_CONDITIONS[acc.tier].commissionPerLot);
    if (margin + commission > acc.freeMargin) {
      return fail(`Not enough money: required margin $${margin.toFixed(2)}, free margin $${acc.freeMargin.toFixed(2)}`);
    }
    o.status = 'open';
    o.openPrice = price;
    o.currentPrice = price;
    o.margin = margin;
    o.commission = commission;
    o.openedAt = new Date().toISOString();
    this.orders.set(o.id, o);
    if (commission > 0) this.ledger(acc, 'commission', -commission, o.id, `Commission #${o.ticket}`);
    this.saveOrder(o);
    this.recalc(acc);
    this.emitAccount(acc, true);
    this.emit('order', { order: o, event: 'opened' });
    return { ok: true };
  }

  modifyOrder(id: string, p: { sl?: number | null; tp?: number | null; price?: number }): Result<{ order: Order }> {
    const o = this.orders.get(id);
    if (!o) return fail('Order not found or already closed');
    const acc = this.accounts.get(o.accountId)!;
    const spec = SPEC_BY_SYMBOL.get(o.symbol)!;
    const q = this.quoteFor(acc, o.symbol);
    if (!q) return fail('No price available');

    const sl = p.sl === undefined ? o.sl : p.sl === null || Number(p.sl) <= 0 ? undefined : num(p.sl);
    const tp = p.tp === undefined ? o.tp : p.tp === null || Number(p.tp) <= 0 ? undefined : num(p.tp);
    if ((p.sl !== undefined && p.sl !== null && Number(p.sl) > 0 && sl === undefined) || (p.tp !== undefined && p.tp !== null && Number(p.tp) > 0 && tp === undefined)) return fail('Invalid SL/TP value');

    if (o.status === 'open') {
      const err = this.validateStops(spec, o.side, o.side === 'BUY' ? q.bid : q.ask, sl, tp); // closing-side price
      if (err) return fail(err);
    } else {
      const price = p.price !== undefined ? num(p.price) : o.pendingPrice;
      if (price === undefined || price <= 0) return fail('Invalid price');
      const err = this.validateStops(spec, o.side, price, sl, tp);
      if (err) return fail(err);
      o.pendingPrice = price;
    }
    o.sl = sl;
    o.tp = tp;
    this.saveOrder(o);
    this.emit('order', { order: o, event: 'modified' });
    return { ok: true, order: o };
  }

  cancelOrder(id: string, reason = 'Cancelled by client'): Result<{ order: Order }> {
    const o = this.orders.get(id);
    if (!o || o.status !== 'pending') return fail('Pending order not found');
    o.status = 'cancelled';
    o.closeReason = reason;
    o.closedAt = new Date().toISOString();
    this.orders.delete(id);
    this.saveOrder(o);
    this.emit('order', { order: o, event: 'cancelled' });
    return { ok: true, order: o };
  }

  /** Close an open position, fully or partially. */
  closeOrder(id: string, opts: { lots?: number; reason?: string; liquidated?: boolean } = {}): Result<{ order: Order; realizedPnl: number; balance: number }> {
    const o = this.orders.get(id);
    if (!o || o.status !== 'open') return fail('Position not found or already closed');
    const acc = this.accounts.get(o.accountId)!;
    const spec = SPEC_BY_SYMBOL.get(o.symbol)!;
    const q = this.quoteFor(acc, o.symbol);
    if (!q) return fail('No price available');
    if (ENGINE_CONFIG.enforceMarketHours && !isMarketOpen(spec) && !opts.liquidated) return fail(`Market is closed for ${spec.symbol}`);
    // Manual closes need a fresh real price; automatic ones (SL/TP/stop-out) are driven by live ticks.
    if (!opts.reason && !marketData.isLive(spec.symbol)) return fail(`Live price for ${spec.symbol} is unavailable right now — please retry shortly`);

    const price = o.side === 'BUY' ? q.bid : q.ask;
    let closeLots = opts.lots === undefined ? o.lots : num(opts.lots) ?? 0;
    if (closeLots <= 0 || closeLots > o.lots + 1e-9) return fail('Invalid close volume');
    if (Math.abs(o.lots - closeLots) < 1e-9) closeLots = o.lots;
    const partial = closeLots < o.lots;
    if (partial && Math.abs(closeLots / spec.lotStep - Math.round(closeLots / spec.lotStep)) > 1e-6) return fail(`Volume step is ${spec.lotStep}`);

    const realized = this.pnlAt(o, spec, price, closeLots);
    const now = new Date().toISOString();
    const status: OrderStatus = opts.liquidated ? 'liquidated' : 'closed';
    let result: Order;

    if (partial) {
      const ratio = closeLots / o.lots;
      const closedPart: Order = {
        ...o, id: `ord_${crypto.randomUUID()}`, ticket: this.nextTicket++, lots: closeLots, status, closePrice: price,
        pnl: realized, margin: 0, commission: money(o.commission * ratio), swap: money(o.swap * ratio),
        parentId: o.id, closeReason: opts.reason ?? 'Client close (partial)', closedAt: now,
      };
      o.lots = Math.round((o.lots - closeLots) * 1e6) / 1e6;
      o.margin = money(o.margin * (1 - ratio));
      o.commission = money(o.commission - closedPart.commission);
      o.swap = money(o.swap - closedPart.swap);
      this.saveOrder(closedPart);
      this.saveOrder(o);
      result = closedPart;
    } else {
      o.status = status;
      o.closePrice = price;
      o.pnl = realized;
      o.closeReason = opts.reason ?? 'Client close';
      o.closedAt = now;
      o.margin = 0;
      this.orders.delete(o.id);
      this.saveOrder(o);
      result = o;
    }

    this.ledger(acc, 'trade_pnl', realized, result.id, `Close #${o.ticket} ${o.symbol}`);
    // Negative balance protection: the broker never lets a client owe money.
    if (acc.balance < 0) {
      this.ledger(acc, 'adjustment', -acc.balance, 'nbp', 'Negative balance protection');
    }
    this.recalc(acc);
    this.emitAccount(acc, true);
    this.emit('order', { order: result, event: partial ? 'partial_close' : 'closed' });
    if (partial) this.emit('order', { order: o, event: 'modified' });
    return { ok: true, order: result, realizedPnl: realized, balance: acc.balance };
  }

  // ----------------------------------------------------------- tick handling
  private onTick(tick: Quote) {
    if (this.busy) return;
    this.busy = true;
    try {
      const touched = new Set<Account>();
      for (const o of [...this.orders.values()]) {
        if (o.symbol !== tick.symbol) continue;
        const acc = this.accounts.get(o.accountId);
        const spec = SPEC_BY_SYMBOL.get(o.symbol);
        if (!acc || !spec) continue;
        const q = this.quoteFor(acc, o.symbol);
        if (!q) continue;

        if (o.status === 'pending') {
          if (ENGINE_CONFIG.enforceMarketHours && !isMarketOpen(spec)) continue;
          const px = o.pendingPrice!;
          const hit =
            (o.kind === 'limit' && o.side === 'BUY' && q.ask <= px) ||
            (o.kind === 'limit' && o.side === 'SELL' && q.bid >= px) ||
            (o.kind === 'stop' && o.side === 'BUY' && q.ask >= px) ||
            (o.kind === 'stop' && o.side === 'SELL' && q.bid <= px);
          if (hit) {
            const fillPx = o.kind === 'limit' ? (o.side === 'BUY' ? Math.min(q.ask, px) : Math.max(q.bid, px)) : (o.side === 'BUY' ? q.ask : q.bid);
            const r = this.fill(o, acc, spec, fillPx);
            if (!r.ok) this.cancelOrder(o.id, `Rejected at trigger: ${r.error}`);
          }
          continue;
        }

        const price = o.side === 'BUY' ? q.bid : q.ask;
        o.currentPrice = price;
        o.pnl = this.pnlAt(o, spec, price);
        touched.add(acc);
        if (o.sl && (o.side === 'BUY' ? price <= o.sl : price >= o.sl)) this.closeOrder(o.id, { reason: 'Stop Loss', liquidated: false });
        else if (o.tp && (o.side === 'BUY' ? price >= o.tp : price <= o.tp)) this.closeOrder(o.id, { reason: 'Take Profit' });
        else this.emit('pnl', o);
      }
      for (const acc of touched) {
        this.recalc(acc);
        this.enforceStopOut(acc);
        this.emitAccount(acc);
      }
    } catch (e) {
      console.error('[engine] tick error', e);
    } finally {
      this.busy = false;
    }
  }

  private marginCalled = new Set<string>();
  private enforceStopOut(acc: Account) {
    if (acc.margin <= 0) { this.marginCalled.delete(acc.id); return; }
    if (acc.marginLevel < ENGINE_CONFIG.marginCallLevel && !this.marginCalled.has(acc.id)) {
      this.marginCalled.add(acc.id);
      this.emit('alert', { accountId: acc.id, type: 'margin_call', marginLevel: acc.marginLevel });
    } else if (acc.marginLevel >= ENGINE_CONFIG.marginCallLevel) {
      this.marginCalled.delete(acc.id);
    }
    let guard = 50;
    while (acc.margin > 0 && acc.marginLevel <= ENGINE_CONFIG.stopOutLevel && guard-- > 0) {
      const worst = this.activeOrders(acc.id).filter((o) => o.status === 'open').sort((a, b) => a.pnl - b.pnl)[0];
      if (!worst) break;
      this.emit('alert', { accountId: acc.id, type: 'stop_out', marginLevel: acc.marginLevel, ticket: worst.ticket });
      this.closeOrder(worst.id, { reason: `Stop out (margin level ${acc.marginLevel}%)`, liquidated: true });
    }
  }

  // ---------------------------------------------------------------- swaps
  private rolloverCheck() {
    const now = new Date();
    if (now.getUTCHours() < 22) return;
    const key = now.toISOString().slice(0, 10);
    const last = db.prepare("SELECT value FROM meta WHERE key = 'last_rollover'").get() as any;
    if (last?.value === key) return;
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_rollover', ?)").run(key);
    this.applySwaps(now);
  }

  applySwaps(at: Date) {
    const dow = at.getUTCDay();
    for (const o of this.orders.values()) {
      if (o.status !== 'open') continue;
      const spec = SPEC_BY_SYMBOL.get(o.symbol)!;
      const weekend = dow === 6 || dow === 0;
      if (weekend && spec.assetClass !== 'crypto') continue;
      const mult = spec.assetClass !== 'crypto' && dow === 3 ? 3 : 1;
      const swap = money((o.side === 'BUY' ? spec.swapLong : spec.swapShort) * o.lots * mult);
      if (swap === 0) continue;
      const acc = this.accounts.get(o.accountId)!;
      o.swap = money(o.swap + swap);
      this.ledger(acc, 'swap', swap, o.id, `Swap #${o.ticket}`);
      this.saveOrder(o);
      this.recalc(acc);
      this.emitAccount(acc, true);
    }
  }

  // ----------------------------------------------------------------- reads
  openOrders(accountId?: string): Order[] {
    return [...this.orders.values()].filter((o) => o.status === 'open' && (!accountId || o.accountId === accountId));
  }
  pendingOrders(accountId?: string): Order[] {
    return [...this.orders.values()].filter((o) => o.status === 'pending' && (!accountId || o.accountId === accountId));
  }
  getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }
  history(accountId: string, limit = 100, offset = 0): Order[] {
    return (db.prepare("SELECT * FROM orders WHERE account_id = ? AND status IN ('closed','liquidated','cancelled') ORDER BY COALESCE(closed_at, created_at) DESC LIMIT ? OFFSET ?")
      .all(accountId, limit, offset) as any[]).map((r) => this.rowToOrder(r));
  }
  ledgerOf(accountId: string, limit = 100): unknown[] {
    return db.prepare('SELECT * FROM ledger WHERE account_id = ? ORDER BY id DESC LIMIT ?').all(accountId, limit);
  }
  specs() {
    return SYMBOL_SPECS;
  }
}

export const tradingEngine = new TradingEngine();
