// Bridges the UI store to the live trading backend: REST for actions, WebSocket for state.
// While active, the server is the single source of truth for accounts, orders, P/L and prices.
import { toast } from 'sonner';
import { brokerStore, TradeBridge } from './brokerStore';
import { apiFetch, getToken, setToken } from './api';
import type {
  AccountType, AuditLogItem, BrokerUser, ForexSymbolRate, PendingOrder, Position, TradingAccount, Transaction,
} from '../types/broker';

interface ServerSymbol {
  symbol: string; display: string; name: string; assetClass: string; pipSize: number; digits: number; contractSize: number;
  minLot: number; lotStep: number; maxLot: number; stopLevel: number; usdBase: boolean; maxLeverage: number; open: boolean; live: boolean; delayed?: boolean; source: string;
  bid: number; ask: number; changePct: number; high: number; low: number;
}
type ServerOrder = Record<string, any>;
type ServerAccount = Record<string, any>;

const TIER_TO_TYPE: Record<string, AccountType> = { Standard: 'standard', Pro: 'pro', Raw: 'ecn' };
const TYPE_TO_TIER: Record<AccountType, string> = { standard: 'Standard', pro: 'Pro', ecn: 'Raw' };
const CATEGORY: Record<string, ForexSymbolRate['category']> = { forex: 'forex', metal: 'commodities', energy: 'commodities', crypto: 'crypto', index: 'indices' };
const norm = (s: string) => s.replace(/[\s/\-_]/g, '').toUpperCase();

class ServerBridge implements TradeBridge {
  private user: BrokerUser | null = null;
  private accounts = new Map<string, TradingAccount>();
  private open = new Map<string, Position>();
  private pending = new Map<string, PendingOrder>();
  private history: Position[] = [];
  private transactions: Transaction[] = [];
  private symbols = new Map<string, ServerSymbol>(); // by server symbol
  private ws: WebSocket | null = null;
  private retry = 0;
  private stopped = true;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private feedMode = '';
  private testMode = true;
  private adminUsers: BrokerUser[] = [];
  private adminAudit: AuditLogItem[] = [];
  private adminTimer: ReturnType<typeof setInterval> | null = null;

  // ------------------------------------------------------------ lifecycle
  async start(): Promise<void> {
    this.stopped = false;
    brokerStore.attachBridge(this);
    const me = await apiFetch<{ user: any; accounts: ServerAccount[] }>('/api/v1/auth/me');
    this.user = {
      id: me.user.id, email: me.user.email, fullName: me.user.fullName, phone: me.user.phone, country: 'Uzbekistan',
      role: me.user.role, status: me.user.status, is2faEnabled: false, kycStatus: me.user.kycStatus, referralCode: '',
      createdAt: me.user.createdAt,
    };
    me.accounts.forEach((a) => this.accounts.set(a.id, this.mapAccount(a)));
    const sy = await apiFetch<{ symbols: ServerSymbol[]; feed: string; testMode: boolean }>('/api/v1/symbols');
    this.feedMode = sy.feed;
    this.testMode = sy.testMode;
    sy.symbols.forEach((s) => this.symbols.set(s.symbol, s));
    await Promise.all([...this.accounts.keys()].map((id) => this.loadPositions(id)));
    await this.refreshTransactions();
    this.flush(true);
    this.connect();
    if (this.user.role !== 'client') {
      await this.loadAdmin();
      this.adminTimer = setInterval(() => this.loadAdmin().catch(() => {}), 10000);
    }
  }

  /** Back-office data (users, all transactions, audit) for admin roles. */
  private async loadAdmin() {
    const role = this.user?.role;
    const [u, t, a] = await Promise.all([
      apiFetch<{ users: any[] }>('/api/v1/admin/users').catch(() => ({ users: [] })),
      role === 'super_admin' || role === 'finance_admin' ? apiFetch<{ transactions: any[] }>('/api/v1/admin/transactions') : Promise.resolve({ transactions: [] }),
      role === 'super_admin' || role === 'compliance_admin' ? apiFetch<{ audit: any[] }>('/api/v1/admin/audit') : Promise.resolve({ audit: [] }),
    ]);
    this.adminUsers = u.users.map((x) => ({
      id: x.id, email: x.email, fullName: x.full_name, phone: x.phone ?? undefined, country: 'Uzbekistan', role: x.role, status: x.status,
      is2faEnabled: false, kycStatus: x.kyc_status, referralCode: '', createdAt: x.created_at,
    }));
    this.adminTx = t.transactions.map((x) => ({ ...this.mapTransaction(x), userId: x.user_id, userEmail: x.user_email, userName: x.user_name, accountNumber: x.account_number }));
    this.adminAudit = a.audit.map((x) => ({
      id: String(x.id), actorId: x.actor ?? '', actorEmail: x.actor_email ?? x.actor ?? 'anonymous', actorRole: x.actor_role ?? 'client',
      action: String(x.action).toUpperCase(), targetEntity: '', details: x.detail ?? '', ipAddress: x.ip ?? '', createdAt: x.created_at,
    }));
    this.scheduleFlush();
  }
  private adminTx: Transaction[] = [];

  adminTransaction(id: string, action: 'approve' | 'reject') {
    this.fire(apiFetch(`/api/v1/admin/transactions/${id}/${action}`, { body: {} }), () => this.loadAdmin());
  }
  adminToggleUser(id: string, status: 'active' | 'suspended') {
    this.fire(apiFetch(`/api/v1/admin/users/${id}/status`, { body: { status } }), () => this.loadAdmin());
  }

  stop() {
    this.stopped = true;
    if (this.adminTimer) clearInterval(this.adminTimer);
    this.ws?.close();
    this.ws = null;
  }

  private async loadPositions(accountId: string) {
    const r = await apiFetch<{ positions: ServerOrder[] }>(`/api/v1/trading/positions?status=ALL&accountId=${accountId}`);
    for (const o of r.positions) this.applyOrder(o);
  }

  async refreshTransactions() {
    const r = await apiFetch<{ transactions: any[] }>('/api/v1/wallet/transactions');
    this.transactions = r.transactions.map((t) => this.mapTransaction(t));
    this.scheduleFlush();
  }

  // ------------------------------------------------------------ websocket
  private connect() {
    if (this.stopped) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws/trading?token=${encodeURIComponent(getToken() ?? '')}`);
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; };
    ws.onmessage = (ev) => {
      try { this.onMessage(JSON.parse(ev.data)); } catch (e) { console.warn('[sync] bad frame', e); }
    };
    ws.onclose = () => {
      if (this.stopped) return;
      setTimeout(() => this.connect(), Math.min(15000, 500 * 2 ** this.retry++));
    };
  }

  private onMessage(m: any) {
    switch (m.type) {
      case 'INIT_SNAPSHOT':
        (m.symbols as ServerSymbol[]).forEach((x) => { const s = this.symbols.get(x.symbol); if (s) { s.live = x.live; s.bid = x.bid; s.ask = x.ask; } });
        (m.accounts as ServerAccount[]).forEach((a) => this.accounts.set(a.id, this.mapAccount(a)));
        this.open.clear();
        this.pending.clear();
        (m.positions as ServerOrder[]).forEach((o) => this.applyOrder(o));
        break;
      case 'TICK': {
        const s = this.symbols.get(m.data.symbol);
        if (s) { s.live = true; s.bid = m.data.bid; s.ask = m.data.ask; s.high = Math.max(s.high, m.data.mid); s.low = Math.min(s.low, m.data.mid); }
        break;
      }
      case 'ACCOUNT_UPDATE':
        this.accounts.set(m.data.id, this.mapAccount(m.data));
        break;
      case 'POSITION_UPDATE':
        this.applyOrder(m.data);
        break;
      case 'ORDER_EVENT':
        this.applyOrder(m.data);
        this.notifyEvent(m.event, m.data);
        break;
      case 'TICKET_UPDATE':
      case 'TICKET_STAFF':
        window.dispatchEvent(new CustomEvent('exora-ticket', { detail: m }));
        if (m.type === 'TICKET_UPDATE' && m.event === 'agent_reply') toast.info("Qo'llab-quvvatlashdan yangi javob keldi");
        if (m.type === 'TICKET_STAFF' && (m.event === 'created' || m.event === 'client_reply')) toast.info(m.event === 'created' ? 'Yangi tiket' : 'Mijoz tiketga javob berdi');
        break;
      case 'ALERT':
        if (m.data.type === 'margin_call') toast.warning(`Margin Call! Marja darajasi ${m.data.marginLevel}%`);
        if (m.data.type === 'stop_out') toast.error(`Stop Out! Pozitsiya avtomatik yopildi (marja ${m.data.marginLevel}%)`);
        break;
    }
    this.scheduleFlush();
  }

  private notifyEvent(event: string, o: ServerOrder) {
    const reason = String(o.closeReason ?? '');
    if (event === 'closed' && /^(Stop Loss|Take Profit)/.test(reason)) {
      toast[o.pnl >= 0 ? 'success' : 'warning'](`${reason}: #${o.ticket} ${o.symbol} ${o.pnl >= 0 ? '+' : ''}$${Number(o.pnl).toFixed(2)}`);
    } else if (event === 'opened' && o.kind !== 'market') {
      toast.info(`Kutilayotgan buyurtma ishga tushdi: #${o.ticket} ${o.symbol} @ ${o.openPrice}`);
    } else if (event === 'cancelled' && /Rejected/.test(reason)) {
      toast.error(reason);
    }
  }

  // ------------------------------------------------------------- mapping
  private ui(symbol: string): string {
    return this.symbols.get(symbol)?.display ?? symbol;
  }

  private mapAccount(a: ServerAccount): TradingAccount {
    return {
      id: a.id, userId: this.user?.id ?? '', accountNumber: a.accountNumber, accountType: TIER_TO_TYPE[a.tier] ?? 'standard',
      currency: a.currency, balance: a.balance, equity: a.equity, margin: a.margin, freeMargin: a.freeMargin,
      marginLevel: a.marginLevel, leverage: a.leverage, server: a.isDemo ? 'ExoraPrime-Demo01' : 'ExoraPrime-Live01',
      isDemo: a.isDemo, isArchived: a.status !== 'active', platform: 'Exora Terminal', nickname: a.tier, createdAt: a.createdAt,
    };
  }

  private mapPosition(o: ServerOrder): Position {
    return {
      id: o.id, ticket: `#${o.ticket}`, accountId: o.accountId, symbol: this.ui(o.symbol), side: o.side === 'BUY' ? 'buy' : 'sell',
      lotSize: o.lots, openPrice: o.openPrice, currentPrice: o.currentPrice ?? o.closePrice ?? o.openPrice, closePrice: o.closePrice,
      sl: o.sl ?? undefined, tp: o.tp ?? undefined, commission: o.commission, swap: o.swap, pnl: o.pnl,
      status: o.status === 'liquidated' ? 'liquidated' : o.status === 'closed' ? 'closed' : 'open',
      openedAt: o.openedAt ?? o.createdAt, closedAt: o.closedAt, comment: o.closeReason ?? undefined,
    };
  }

  private mapPending(o: ServerOrder): PendingOrder {
    const s = this.symbols.get(o.symbol);
    return {
      id: o.id, accountId: o.accountId, symbol: this.ui(o.symbol), type: `${o.side.toLowerCase()}_${o.kind}` as PendingOrder['type'],
      lotSize: o.lots, targetPrice: o.pendingPrice, currentPrice: s ? (o.side === 'BUY' ? s.ask : s.bid) : 0,
      sl: o.sl ?? undefined, tp: o.tp ?? undefined, createdAt: o.createdAt, status: 'active',
    };
  }

  private mapTransaction(t: any): Transaction {
    const acc = this.accounts.get(t.account_id);
    return {
      id: t.id, userId: this.user?.id ?? '', userEmail: this.user?.email ?? '', userName: this.user?.fullName ?? '',
      accountId: t.account_id, accountNumber: acc?.accountNumber, type: t.kind, amount: t.amount, fee: 0, netAmount: t.amount,
      currency: 'USD', paymentMethod: t.method, status: t.status === 'completed' ? 'completed' : t.status === 'rejected' ? 'rejected' : 'pending',
      createdAt: t.created_at, processedAt: t.reviewed_at ?? undefined,
    };
  }

  private applyOrder(o: ServerOrder) {
    if (o.status === 'pending') { this.pending.set(o.id, this.mapPending(o)); return; }
    this.pending.delete(o.id);
    if (o.status === 'open') { this.open.set(o.id, this.mapPosition(o)); return; }
    this.open.delete(o.id);
    if (o.status === 'closed' || o.status === 'liquidated') {
      this.history = [this.mapPosition(o), ...this.history.filter((h) => h.id !== o.id)].slice(0, 500);
    }
  }

  // --------------------------------------------------------- store updates
  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => { this.flushTimer = null; this.flush(); }, 150);
  }

  private flush(first = false) {
    const rates: ForexSymbolRate[] = [...this.symbols.values()].map((s) => ({
      symbol: s.display, name: s.name, category: CATEGORY[s.assetClass] ?? 'forex', bid: s.bid, ask: s.ask,
      spread: Number(((s.ask - s.bid) / s.pipSize).toFixed(1)), change24h: Number(s.changePct.toFixed(2)),
      high24h: s.high, low24h: s.low, digitPrecision: s.digits,
    }));
    brokerStore.setServerState({
      ...(first && this.user ? { activeUser: this.user } : {}),
      accounts: [...this.accounts.values()],
      positions: [...this.open.values(), ...this.history],
      pendingOrders: [...this.pending.values()],
      transactions: this.user && this.user.role !== 'client' ? [...this.adminTx, ...this.transactions] : this.transactions,
      ...(this.user && this.user.role !== 'client' ? { users: this.adminUsers } : {}),
      auditLogs: this.adminAudit,
      kycList: [], // KYC document intake is not implemented server-side yet
      symbols: rates,
      feed: { mode: this.feedMode, testMode: this.testMode, liveCount: [...this.symbols.values()].filter((x) => x.live).length, delayedCount: [...this.symbols.values()].filter((x) => x.live && x.delayed).length, total: this.symbols.size },
    });
  }

  // ----------------------------------------------------- sync pre-checks
  /** Fast client-side checks so the UI can show an immediate error; the server re-validates everything. */
  private precheck(accountId: string, uiSymbol: string, lots: number, side?: 'buy' | 'sell', sl?: number, tp?: number): ServerSymbol {
    const acc = this.accounts.get(accountId);
    if (!acc) throw new Error('Hisob topilmadi');
    const s = this.symbols.get(norm(uiSymbol)) ?? [...this.symbols.values()].find((x) => x.display === uiSymbol);
    if (!s) throw new Error(`${uiSymbol} serverda qo'llab-quvvatlanmaydi`);
    if (!s.open && s.live) throw new Error(`${s.display} bozori hozir yopiq`);
    if (!s.live) throw new Error(`${s.display}: jonli narx hozir mavjud emas (bozor yopiq yoki narx manbasi uzilgan)`);
    if (!(lots >= s.minLot - 1e-9 && lots <= s.maxLot + 1e-9)) throw new Error(`Hajm ${s.minLot} dan ${s.maxLot} lotgacha bo'lishi kerak`);
    if (Math.abs(lots / s.lotStep - Math.round(lots / s.lotStep)) > 1e-6) throw new Error(`Hajm qadami ${s.lotStep}`);
    if (side) {
      const price = side === 'buy' ? s.ask : s.bid;
      const notional = s.usdBase ? lots * s.contractSize : lots * s.contractSize * price;
      const margin = notional / Math.min(acc.leverage, s.maxLeverage);
      if (margin > acc.freeMargin) throw new Error(`Mablag' yetarli emas: kerakli marja $${margin.toFixed(2)}, erkin marja $${acc.freeMargin.toFixed(2)}`);
      const ref = side === 'buy' ? s.bid : s.ask;
      if (sl && (side === 'buy' ? sl > ref - s.stopLevel : sl < ref + s.stopLevel)) throw new Error('Stop Loss noto\'g\'ri tomonda yoki juda yaqin');
      if (tp && (side === 'buy' ? tp < ref + s.stopLevel : tp > ref - s.stopLevel)) throw new Error('Take Profit noto\'g\'ri tomonda yoki juda yaqin');
    }
    return s;
  }

  private fire(promise: Promise<any>, after?: () => void) {
    promise.then(() => after?.()).catch((e: Error) => toast.error(e.message || 'Server xatosi'));
  }

  // ------------------------------------------------------- TradeBridge API
  openPosition(p: Parameters<TradeBridge['openPosition']>[0]): Position {
    const s = this.precheck(p.accountId, p.symbol, p.lotSize, p.side, p.sl, p.tp);
    this.fire(apiFetch('/api/v1/trading/order/open', { body: { accountId: p.accountId, symbol: s.symbol, side: p.side.toUpperCase(), kind: 'market', lots: p.lotSize, sl: p.sl, tp: p.tp } }));
    const price = p.side === 'buy' ? s.ask : s.bid;
    return { id: `local_${Date.now()}`, accountId: p.accountId, symbol: s.display, side: p.side, lotSize: p.lotSize, openPrice: price, currentPrice: price, sl: p.sl, tp: p.tp, commission: 0, swap: 0, pnl: 0, status: 'open', openedAt: new Date().toISOString() };
  }

  closePosition(id: string) {
    this.fire(apiFetch('/api/v1/trading/order/close', { body: { positionId: id } }));
  }

  partialClosePosition(id: string, lots: number) {
    this.fire(apiFetch('/api/v1/trading/order/close', { body: { positionId: id, lots } }));
  }

  closeAllPositions(accountId?: string): number {
    const list = [...this.open.values()].filter((p) => !accountId || p.accountId === accountId);
    list.forEach((p) => this.closePosition(p.id));
    return list.length;
  }

  updatePositionSlTp(id: string, sl?: number, tp?: number) {
    this.fire(apiFetch('/api/v1/trading/order/modify', { body: { positionId: id, sl: sl ?? null, tp: tp ?? null } }));
  }

  createPendingOrder(p: Parameters<TradeBridge['createPendingOrder']>[0]): PendingOrder {
    const [side, kind] = p.type.split('_') as ['buy' | 'sell', 'limit' | 'stop'];
    const s = this.precheck(p.accountId, p.symbol, p.lotSize);
    this.fire(apiFetch('/api/v1/trading/order/open', { body: { accountId: p.accountId, symbol: s.symbol, side: side.toUpperCase(), kind, lots: p.lotSize, price: p.targetPrice, sl: p.sl, tp: p.tp } }));
    return { id: `local_${Date.now()}`, accountId: p.accountId, symbol: s.display, type: p.type, lotSize: p.lotSize, targetPrice: p.targetPrice, currentPrice: side === 'buy' ? s.ask : s.bid, sl: p.sl, tp: p.tp, createdAt: new Date().toISOString(), status: 'active' };
  }

  cancelPendingOrder(id: string) {
    this.fire(apiFetch('/api/v1/trading/order/cancel', { body: { orderId: id } }));
  }

  createDeposit(p: Parameters<TradeBridge['createDeposit']>[0]): Transaction {
    const acc = this.accounts.get(p.accountId);
    if (!acc) throw new Error('Hisob topilmadi');
    this.fire(apiFetch('/api/v1/wallet/deposit', { body: { accountId: p.accountId, amount: p.amount, method: p.paymentMethod, details: p.details } }), () => this.refreshTransactions());
    return this.provisionalTx('deposit', acc, p.amount, p.paymentMethod, acc.isDemo ? 'completed' : 'pending');
  }

  createWithdrawal(p: Parameters<TradeBridge['createWithdrawal']>[0]): Transaction {
    const acc = this.accounts.get(p.accountId);
    if (!acc) throw new Error('Hisob topilmadi');
    if (acc.isDemo) throw new Error('Demo hisobdan yechib bo\'lmaydi');
    if (p.amount > acc.freeMargin) throw new Error("Mablag' yetarli emas yoki erkin marja cheklovi mavjud");
    this.fire(apiFetch('/api/v1/wallet/withdraw', { body: { accountId: p.accountId, amount: p.amount, method: p.paymentMethod, details: p.details } }), () => this.refreshTransactions());
    return this.provisionalTx('withdrawal', acc, p.amount, p.paymentMethod, 'pending');
  }

  openAccount(p: Parameters<TradeBridge['openAccount']>[0]): TradingAccount {
    const draft: TradingAccount = {
      id: `local_${Date.now()}`, userId: this.user?.id ?? '', accountNumber: '…', accountType: p.accountType, currency: 'USD',
      balance: p.isDemo ? 10000 : 0, equity: p.isDemo ? 10000 : 0, margin: 0, freeMargin: p.isDemo ? 10000 : 0, marginLevel: 0,
      leverage: p.leverage ?? 100, server: p.isDemo ? 'ExoraPrime-Demo01' : 'ExoraPrime-Live01', isDemo: p.isDemo,
      platform: 'Exora Terminal', nickname: p.nickname, createdAt: new Date().toISOString(),
    };
    this.fire(apiFetch<{ account: ServerAccount }>('/api/v1/accounts', { body: { tier: TYPE_TO_TIER[p.accountType], leverage: p.leverage, isDemo: p.isDemo } }).then((r) => {
      this.accounts.set(r.account.id, this.mapAccount(r.account));
      this.scheduleFlush();
    }));
    return draft;
  }

  private provisionalTx(type: 'deposit' | 'withdrawal', acc: TradingAccount, amount: number, method: string, status: Transaction['status']): Transaction {
    return {
      id: `local_${Date.now()}`, userId: this.user?.id ?? '', userEmail: this.user?.email ?? '', userName: this.user?.fullName ?? '',
      accountId: acc.id, accountNumber: acc.accountNumber, type, amount, fee: 0, netAmount: amount, currency: 'USD',
      paymentMethod: method as Transaction['paymentMethod'], status, createdAt: new Date().toISOString(),
    };
  }
}

const bridge = new ServerBridge();

/** Connect the UI to the backend for the current session token (no-op without a token). */
export async function startServerSync(): Promise<boolean> {
  if (!getToken()) return false;
  try {
    await bridge.start();
    return true;
  } catch (e) {
    console.warn('[sync] could not start:', e);
    setToken(null);
    return false;
  }
}

export function signOut() {
  bridge.stop();
  setToken(null);
  try { localStorage.setItem('exora_logged_in', 'false'); } catch { /* ignore */ }
  location.reload();
}
