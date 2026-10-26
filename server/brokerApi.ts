// server/brokerApi.ts
// Authenticated REST API for the broker platform (/api/v1).
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, audit, newReferralCode } from './db.js';
import { hashPassword, verifyPassword, signToken, requireAuth, requireRole, rateLimit } from './auth.js';
import { tradingEngine, Account, Order, ENGINE_CONFIG } from './tradingEngine.js';
import { marketData } from './marketData.js';
import { clientSupportRouter, adminSupportRouter } from './support.js';
import { sendCode, verifyCode, normalizePhone, recentSends, otpRequired, gatewayToken, testGateway } from './telegram.js';
import { setSecret, deleteSecret } from './settings.js';
import { SPEC_BY_SYMBOL, SYMBOL_SPECS, normalizeSymbol, displayName, isMarketOpen } from './symbols.js';

export const brokerRouter = Router();

const ip = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';
const bad = (res: Response, error: string, status = 400) => res.status(status).json({ success: false, error });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function orderView(o: Order) {
  return { ...o, type: o.side, openedAt: o.openedAt, ticket: o.ticket };
}
export function accountView(a: Account) {
  const { userId: _u, ...rest } = a;
  return rest;
}

function ownedAccount(req: Request, accountId?: string): Account | null {
  const mine = tradingEngine.accountsOf(req.user!.id);
  if (accountId) return mine.find((a) => a.id === accountId || a.accountNumber === accountId) ?? null;
  // No account given: prefer a funded live account, otherwise the demo account.
  return mine.find((a) => !a.isDemo && a.balance > 0) ?? mine.find((a) => a.isDemo) ?? mine[0] ?? null;
}
function ownedOrder(req: Request, orderId: string): { order: Order; acc: Account } | null {
  const order = tradingEngine.getOrder(orderId) ?? undefined;
  if (!order) return null;
  const acc = tradingEngine.accounts.get(order.accountId);
  return acc && acc.userId === req.user!.id ? { order, acc } : null;
}

// ============================================================================
// 1. AUTH
// ============================================================================
// Step 1 of sign-up: send a verification code to the phone (Telegram Gateway). The code never reaches the browser.
brokerRouter.post('/auth/otp/send', rateLimit((r) => `otp:${ip(r)}`, 10, 3600_000), async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return bad(res, "Telefon raqami noto'g'ri. Misol: +998 90 123 45 67");
  if (db.prepare('SELECT 1 FROM users WHERE phone = ? AND phone_verified = 1').get(phone)) return bad(res, "Bu raqam allaqachon ro'yxatdan o'tgan", 409);
  if (recentSends(phone) >= 3) return bad(res, "Juda ko'p urinish. 10 daqiqadan keyin qayta urining.", 429);
  try {
    const r = await sendCode(phone);
    audit(null, 'otp_send', { phone, channel: r.channel }, ip(req));
    res.json({ success: true, otpId: r.otpId, channel: r.channel, expiresInSec: 300 });
  } catch (e: any) {
    audit(null, 'otp_send_failed', { phone, error: e.message }, ip(req));
    bad(res, e.message || 'Kod yuborilmadi', 502);
  }
});

brokerRouter.post('/auth/register', rateLimit((r) => `reg:${ip(r)}`, 10, 3600_000), async (req, res) => {
  const { email, fullName, password, otpId, otpCode } = req.body ?? {};
  const refCodeIn = String(req.body?.referralCode ?? '').trim().toUpperCase();
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) return bad(res, 'Valid email is required');
  if (typeof fullName !== 'string' || fullName.trim().length < 2) return bad(res, 'Full name is required');
  if (typeof password !== 'string' || password.length < 8) return bad(res, 'Password must be at least 8 characters long');
  const e = email.trim().toLowerCase();
  const phone = normalizePhone(req.body?.phone);
  if (otpRequired()) {
    if (!phone) return bad(res, "Telefon raqamini kiriting");
    const v = await verifyCode(String(otpId ?? ''), phone, String(otpCode ?? '').trim());
    if (!v.ok) return bad(res, v.error);
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(e)) return bad(res, 'Email is already registered', 409);
  if (phone && db.prepare('SELECT 1 FROM users WHERE phone = ?').get(phone)) return bad(res, "Bu telefon raqami allaqachon ro'yxatdan o'tgan", 409);

  let referrer: any = null;
  if (refCodeIn) {
    referrer = db.prepare("SELECT id FROM users WHERE referral_code = ? AND status = 'active'").get(refCodeIn);
    if (!referrer) return bad(res, "Referal kodi topilmadi");
  }
  const id = `usr_${crypto.randomUUID()}`;
  db.prepare('INSERT INTO users (id,email,full_name,phone,phone_verified,password_hash,role,status,kyc_status,created_at,referral_code,referred_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, e, fullName.trim(), phone, otpRequired() ? 1 : 0, hashPassword(password), 'client', 'active', 'unsubmitted', new Date().toISOString(), newReferralCode(), referrer?.id ?? null);
  tradingEngine.createAccount(id, { isDemo: true });
  tradingEngine.createAccount(id, { isDemo: false });
  audit(id, 'register', { email: e, phoneVerified: otpRequired() }, ip(req));
  res.json({ success: true, user: userPayload(id), token: signToken(id, 'client') });
});

brokerRouter.post('/auth/login', rateLimit((r) => `login:${ip(r)}:${String(r.body?.email ?? '').toLowerCase()}`, 8, 15 * 60_000), (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') return bad(res, 'Email and password required');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
  if (!row || !verifyPassword(password, row.password_hash)) {
    audit(null, 'login_failed', { email }, ip(req));
    return bad(res, 'Invalid email or password', 401);
  }
  if (row.status !== 'active') return bad(res, 'Account is not active', 403);
  audit(row.id, 'login', undefined, ip(req));
  res.json({ success: true, user: userPayload(row.id), token: signToken(row.id, row.role) });
});

function userPayload(id: string) {
  const u = db.prepare('SELECT id,email,full_name,phone,role,status,kyc_status,created_at FROM users WHERE id = ?').get(id) as any;
  return { id: u.id, email: u.email, fullName: u.full_name, phone: u.phone, role: u.role, status: u.status, kycStatus: u.kyc_status, createdAt: u.created_at };
}

brokerRouter.post('/auth/password', requireAuth, rateLimit((r) => `pw:${r.user?.id}`, 6, 3600_000), (req, res) => {
  const { current, next } = req.body ?? {};
  if (typeof current !== 'string' || typeof next !== 'string') return bad(res, "Joriy va yangi parolni kiriting");
  if (next.length < 8) return bad(res, "Yangi parol kamida 8 ta belgi bo'lsin");
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!row || !verifyPassword(current, row.password_hash)) return bad(res, "Joriy parol noto'g'ri", 403);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), req.user!.id);
  audit(req.user!.id, 'password_change', undefined, ip(req));
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Referral program: rewards are computed from the referred users' closed volume.
// In test mode (virtual money only) they are shown as "accrued", nothing is paid out.
// ---------------------------------------------------------------------------
const REFERRAL_USD_PER_LOT = Number(process.env.REFERRAL_USD_PER_LOT || 3);
brokerRouter.get('/referrals/me', requireAuth, (req, res) => {
  const me = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(req.user!.id) as any;
  const invited = db.prepare('SELECT id, full_name, email, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC').all(req.user!.id) as any[];
  const maskName = (n: string) => n.split(' ').map((p, i) => (i === 0 ? p : `${p[0]}.`)).join(' ');
  const maskMail = (m: string) => m.replace(/^(.{2}).*(@.*)$/, '$1***$2');
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const rows = invited.map((u) => {
    // test mode: only demo accounts exist, so they count; otherwise only real-money accounts do
    const ids = tradingEngine.accountsOf(u.id).filter((a) => (TEST_MODE ? true : !a.isDemo)).map((a) => a.id);
    let lots = 0, trades = 0;
    if (ids.length) {
      const agg = db.prepare(`SELECT COALESCE(SUM(lots),0) l, COUNT(*) n FROM orders WHERE account_id IN (${ids.map(() => '?').join(',')}) AND status IN ('closed','liquidated')`).get(...ids) as any;
      lots = agg.l; trades = agg.n;
    }
    return { name: maskName(u.full_name), email: maskMail(u.email), joinedAt: u.created_at, trades, lots: r2(lots), earned: r2(lots * REFERRAL_USD_PER_LOT), active: trades > 0 };
  });
  res.json({
    success: true, code: me.referral_code, ratePerLot: REFERRAL_USD_PER_LOT, testMode: TEST_MODE,
    stats: { invited: rows.length, active: rows.filter((r) => r.active).length, lots: r2(rows.reduce((s, r) => s + r.lots, 0)), earned: r2(rows.reduce((s, r) => s + r.earned, 0)) },
    referrals: rows,
  });
});

brokerRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: userPayload(req.user!.id), accounts: tradingEngine.accountsOf(req.user!.id).map(accountView) });
});

// ============================================================================
// 2. ACCOUNTS & WALLET
// ============================================================================
brokerRouter.get('/accounts', requireAuth, (req, res) => {
  res.json({ success: true, accounts: tradingEngine.accountsOf(req.user!.id).map(accountView) });
});

brokerRouter.post('/accounts', requireAuth, (req, res) => {
  const { tier, leverage, isDemo } = req.body ?? {};
  if (tradingEngine.accountsOf(req.user!.id).length >= 10) return bad(res, 'Account limit reached');
  const acc = tradingEngine.createAccount(req.user!.id, { tier, leverage: Number(leverage) || undefined, isDemo: isDemo !== false });
  audit(req.user!.id, 'account_create', { id: acc.id, tier: acc.tier, demo: acc.isDemo }, ip(req));
  res.json({ success: true, account: accountView(acc) });
});

brokerRouter.post('/accounts/:id/reset-demo', requireAuth, (req, res) => {
  const acc = ownedAccount(req, req.params.id);
  if (!acc) return bad(res, 'Account not found', 404);
  const r = tradingEngine.resetDemo(acc.id);
  if (!r.ok) return bad(res, r.error);
  res.json({ success: true, account: accountView(r.account) });
});

const METHODS = ['payme', 'click', 'uzcard_humo', 'crypto_usdt', 'bank_wire'];

brokerRouter.post('/wallet/deposit', requireAuth, rateLimit((r) => `dep:${ip(r)}`, 20, 3600_000), (req, res) => {
  const acc = ownedAccount(req, req.body?.accountId);
  if (!acc) return bad(res, 'Account not found', 404);
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return bad(res, 'Invalid deposit amount');

  if (acc.isDemo) {
    if (amount > 100_000) return bad(res, 'Demo top-up limit is $100,000');
    const r = tradingEngine.adjustBalance(acc.id, amount, 'deposit', 'demo_topup', 'Demo top-up');
    return r.ok ? res.json({ success: true, newBalance: r.balance, account: accountView(acc) }) : bad(res, r.error);
  }
  if (TEST_MODE) return bad(res, "Test rejimi: haqiqiy mablag' qabul qilinmaydi. Demo hisobdan foydalaning.", 403);
  const method = String(req.body?.method ?? 'bank_wire');
  if (!METHODS.includes(method)) return bad(res, 'Unsupported payment method');
  if (amount < 10) return bad(res, 'Minimum deposit is $10');
  const id = `txn_${crypto.randomUUID()}`;
  db.prepare('INSERT INTO transactions (id,account_id,kind,amount,method,status,details,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, acc.id, 'deposit', amount, method, 'pending', JSON.stringify(req.body?.details ?? {}), new Date().toISOString());
  audit(req.user!.id, 'deposit_request', { id, amount, method }, ip(req));
  res.json({ success: true, pending: true, transactionId: id, message: 'Deposit request created and awaits confirmation' });
});

brokerRouter.post('/wallet/withdraw', requireAuth, rateLimit((r) => `wd:${ip(r)}`, 10, 3600_000), (req, res) => {
  const acc = ownedAccount(req, req.body?.accountId);
  if (!acc) return bad(res, 'Account not found', 404);
  if (acc.isDemo) return bad(res, 'Withdrawals are not available for demo accounts');
  if (TEST_MODE) return bad(res, "Test rejimi: pul yechish o'chirilgan.", 403);
  const kyc = db.prepare('SELECT kyc_status FROM users WHERE id = ?').get(req.user!.id) as any;
  if (kyc.kyc_status !== 'approved') return bad(res, 'Identity verification (KYC) is required before withdrawal', 403);
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return bad(res, 'Invalid amount');
  if (amount > acc.freeMargin || amount > acc.balance) return bad(res, 'Amount exceeds withdrawable funds');
  const method = String(req.body?.method ?? 'bank_wire');
  if (!METHODS.includes(method)) return bad(res, 'Unsupported payment method');
  const id = `txn_${crypto.randomUUID()}`;
  db.prepare('INSERT INTO transactions (id,account_id,kind,amount,method,status,details,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, acc.id, 'withdrawal', amount, method, 'pending', JSON.stringify(req.body?.details ?? {}), new Date().toISOString());
  audit(req.user!.id, 'withdraw_request', { id, amount, method }, ip(req));
  res.json({ success: true, pending: true, transactionId: id });
});

brokerRouter.get('/wallet/transactions', requireAuth, (req, res) => {
  const ids = tradingEngine.accountsOf(req.user!.id).map((a) => a.id);
  const rows = ids.length
    ? db.prepare(`SELECT * FROM transactions WHERE account_id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at DESC LIMIT 200`).all(...ids)
    : [];
  res.json({ success: true, transactions: rows });
});

brokerRouter.get('/wallet/ledger', requireAuth, (req, res) => {
  const acc = ownedAccount(req, req.query.accountId as string | undefined);
  if (!acc) return bad(res, 'Account not found', 404);
  res.json({ success: true, ledger: tradingEngine.ledgerOf(acc.id, Math.min(500, Number(req.query.limit) || 100)) });
});

// ============================================================================
// 3. TRADING (OMS)
// ============================================================================
export function placeFromBody(req: Request, res: Response) {
  const b = req.body ?? {};
  const acc = ownedAccount(req, b.accountId);
  if (!acc) return bad(res, 'Account not found', 404);
  const side = String(b.side ?? b.type ?? '').toUpperCase();
  const kindRaw = String(b.kind ?? b.orderType ?? (b.type && !['BUY', 'SELL'].includes(String(b.type).toUpperCase()) ? b.type : 'market')).toLowerCase();
  const kind = kindRaw === 'stoplimit' ? 'stop' : kindRaw;
  const r = tradingEngine.placeOrder({
    accountId: acc.id, symbol: normalizeSymbol(b.symbol), side: side as 'BUY' | 'SELL', kind: kind as any,
    lots: parseFloat(b.lots ?? b.qty), price: b.price !== undefined ? parseFloat(b.price) : undefined,
    sl: b.sl !== undefined ? parseFloat(b.sl) : undefined, tp: b.tp !== undefined ? parseFloat(b.tp) : undefined,
  });
  if (!r.ok) return bad(res, r.error);
  audit(req.user!.id, 'order_place', { ticket: r.order.ticket, symbol: r.order.symbol, side, kind, lots: r.order.lots }, ip(req));
  return res.json({
    success: true, message: `Order #${r.order.ticket} ${r.order.status === 'open' ? 'executed' : 'placed'}`,
    orderId: r.order.id, ticket: r.order.ticket, fillPrice: r.order.openPrice, status: r.order.status === 'open' ? 'filled' : 'working',
    position: orderView(r.order), order: orderView(r.order), account: accountView(r.account),
  });
}
export function modifyFromBody(req: Request, res: Response, id: string) {
  const o = ownedOrder(req, id);
  if (!o) return bad(res, 'Order not found', 404);
  const b = req.body ?? {};
  const r = tradingEngine.modifyOrder(id, {
    sl: b.sl === undefined ? undefined : b.sl === null ? null : parseFloat(b.sl),
    tp: b.tp === undefined ? undefined : b.tp === null ? null : parseFloat(b.tp),
    price: b.price === undefined ? undefined : parseFloat(b.price),
  });
  return r.ok ? res.json({ success: true, message: 'Order updated', position: orderView(r.order), order: orderView(r.order) }) : bad(res, r.error);
}
export function closeFromBody(req: Request, res: Response, id: string) {
  const o = ownedOrder(req, id);
  if (!o) return bad(res, 'Order not found', 404);
  const lots = req.body?.lots !== undefined ? parseFloat(req.body.lots) : undefined;
  const r = o.order.status === 'pending' ? tradingEngine.cancelOrder(id) : tradingEngine.closeOrder(id, { lots });
  if (!r.ok) return bad(res, r.error);
  audit(req.user!.id, o.order.status === 'pending' ? 'order_cancel' : 'order_close', { ticket: o.order.ticket }, ip(req));
  return res.json({ success: true, message: 'Done', realizedPnl: 'realizedPnl' in r ? r.realizedPnl : 0, newBalance: 'balance' in r ? r.balance : o.acc.balance, order: orderView(r.order) });
}

brokerRouter.post('/trading/order/open', requireAuth, rateLimit((r) => `ord:${r.user?.id ?? ip(r)}`, 120, 60_000), placeFromBody);
brokerRouter.post('/trading/order/modify', requireAuth, (req, res) => modifyFromBody(req, res, String(req.body?.positionId ?? req.body?.orderId ?? '')));
brokerRouter.post('/trading/order/close', requireAuth, (req, res) => closeFromBody(req, res, String(req.body?.positionId ?? req.body?.orderId ?? '')));
brokerRouter.post('/trading/order/cancel', requireAuth, (req, res) => closeFromBody(req, res, String(req.body?.orderId ?? req.body?.positionId ?? '')));

brokerRouter.get('/trading/positions', requireAuth, (req, res) => {
  const acc = ownedAccount(req, req.query.accountId as string | undefined);
  if (!acc) return bad(res, 'Account not found', 404);
  const status = String(req.query.status ?? 'OPEN').toUpperCase();
  const open = status === 'OPEN' || status === 'ALL' ? tradingEngine.openOrders(acc.id) : [];
  const pending = status === 'PENDING' || status === 'ALL' ? tradingEngine.pendingOrders(acc.id) : [];
  const closed = status === 'CLOSED' || status === 'ALL' ? tradingEngine.history(acc.id, Math.min(500, Number(req.query.limit) || 100), Number(req.query.offset) || 0) : [];
  const positions = [...open, ...pending, ...closed].map(orderView);
  res.json({ success: true, positions, count: positions.length, account: accountView(acc) });
});

// Aggregated performance for the cabinet (closed trades only; net = P/L - commission + swap).
brokerRouter.get('/trading/stats', requireAuth, (req, res) => {
  const acc = ownedAccount(req, req.query.accountId as string | undefined);
  if (!acc) return bad(res, 'Account not found', 404);
  const days = Math.min(3650, Math.max(1, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = db.prepare("SELECT symbol, side, lots, pnl, commission, swap, closed_at FROM orders WHERE account_id = ? AND status IN ('closed','liquidated') AND closed_at >= ? ORDER BY closed_at").all(acc.id, since) as any[];
  const r2 = (v: number) => Math.round(v * 100) / 100;
  let profit = 0, loss = 0, cost = 0, lots = 0, wins = 0, losses = 0;
  let best: number | null = null, worst: number | null = null;
  const bySymbol = new Map<string, { symbol: string; trades: number; lots: number; net: number }>();
  const daily = new Map<string, number>();
  for (const o of rows) {
    const net = o.pnl - o.commission + o.swap;
    if (net >= 0) { profit += net; wins++; } else { loss += net; losses++; }
    cost += o.commission - o.swap;
    lots += o.lots;
    best = best === null ? net : Math.max(best, net);
    worst = worst === null ? net : Math.min(worst, net);
    const sy = bySymbol.get(o.symbol) ?? { symbol: o.symbol, trades: 0, lots: 0, net: 0 };
    sy.trades++; sy.lots += o.lots; sy.net += net;
    bySymbol.set(o.symbol, sy);
    const day = String(o.closed_at).slice(0, 10);
    daily.set(day, (daily.get(day) ?? 0) + net);
  }
  res.json({
    success: true, days, account: accountView(acc),
    totals: {
      netProfit: r2(profit + loss), grossProfit: r2(profit), grossLoss: r2(loss), tradingCost: r2(cost), trades: rows.length, wins, losses,
      winRate: rows.length ? Math.round((wins / rows.length) * 1000) / 10 : 0, volumeLots: r2(lots),
      profitFactor: loss < 0 ? r2(profit / -loss) : null, best: best === null ? null : r2(best), worst: worst === null ? null : r2(worst),
      unrealised: r2(tradingEngine.openOrders(acc.id).reduce((s, o) => s + o.pnl, 0)),
    },
    bySymbol: [...bySymbol.values()].map((x) => ({ ...x, lots: r2(x.lots), net: r2(x.net) })).sort((a, b) => b.net - a.net),
    daily: [...daily.entries()].map(([date, net]) => ({ date, net: r2(net) })),
  });
});

brokerRouter.get('/trading/history', requireAuth, (req, res) => {
  const acc = ownedAccount(req, req.query.accountId as string | undefined);
  if (!acc) return bad(res, 'Account not found', 404);
  res.json({ success: true, history: tradingEngine.history(acc.id, Math.min(500, Number(req.query.limit) || 100), Number(req.query.offset) || 0).map(orderView) });
});

// ============================================================================
// 4. MARKET DATA
// ============================================================================
export const TEST_MODE = (process.env.TEST_MODE || 'on') !== 'off';

function symbolsPayload(tier: Account['tier'] = 'Standard') {
  return marketData.activeSpecs().map((s) => {
    const q = marketData.quote(s.symbol, tier)!;
    const d = marketData.dayStats(s.symbol);
    return {
      symbol: s.symbol, display: displayName(s), name: s.name, assetClass: s.assetClass, open: isMarketOpen(s), live: marketData.isLive(s.symbol), delayed: marketData.isDelayed(s.symbol), source: marketData.sourceOf(s.symbol), high: d.high, low: d.low, contractSize: s.contractSize, digits: s.digits, pipSize: s.pipSize,
      minLot: s.minLot, maxLot: s.maxLot, lotStep: s.lotStep, stopLevel: s.stopLevel, usdBase: s.usdBase, maxLeverage: s.maxLeverage,
      bid: q.bid, ask: q.ask, spread: Number((q.ask - q.bid).toFixed(s.digits)), change: d.change, changePct: d.changePct,
    };
  });
}
brokerRouter.get('/symbols', (_req, res) => res.json({ success: true, symbols: symbolsPayload(), feed: marketData.feedMode, testMode: TEST_MODE }));
// Non-secret settings the sign-in screen needs.
brokerRouter.get('/public-config', (_req, res) =>
  res.json({ success: true, supportEmail: process.env.SUPPORT_EMAIL?.trim() || null, testMode: TEST_MODE }));
brokerRouter.get('/market/status', (_req, res) => res.json({ success: true, testMode: TEST_MODE, ...marketData.status() }));
brokerRouter.get('/rates/live', (_req, res) =>
  res.json({ success: true, timestamp: new Date().toISOString(), feed: marketData.feedMode, rates: symbolsPayload() }));
brokerRouter.get('/rates/candles', (req, res) => {
  const symbol = normalizeSymbol(String(req.query.symbol || 'XAUUSD'));
  if (!SPEC_BY_SYMBOL.has(symbol)) return bad(res, 'Unknown symbol', 404);
  const tf = Math.max(1, parseInt(String(req.query.tf || '1'), 10) || 1);
  const limit = Math.min(5000, parseInt(String(req.query.limit || '300'), 10) || 300);
  res.json({ success: true, symbol, candles: marketData.getCandles(symbol, tf * 60, 0, Math.floor(Date.now() / 1000), limit) });
});

// ============================================================================
// 5. ADMIN (RBAC)
// ============================================================================
const admin = Router();
admin.use(requireAuth, requireRole('super_admin', 'finance_admin', 'compliance_admin', 'support_admin'));

admin.get('/dashboard', (_req, res) => {
  const count = (sql: string) => (db.prepare(sql).get() as any).n as number;
  const accounts = [...tradingEngine.accounts.values()];
  const live = accounts.filter((a) => !a.isDemo);
  res.json({
    success: true,
    data: {
      totalUsers: count('SELECT COUNT(*) n FROM users'),
      activeTradingAccounts: accounts.length,
      liveAccounts: live.length,
      clientBalance: Number(live.reduce((s, a) => s + a.balance, 0).toFixed(2)),
      clientEquity: Number(live.reduce((s, a) => s + a.equity, 0).toFixed(2)),
      openPositionsCount: tradingEngine.openOrders().length,
      pendingOrdersCount: tradingEngine.pendingOrders().length,
      totalOrdersExecuted: count("SELECT COUNT(*) n FROM orders WHERE status IN ('open','closed','liquidated')"),
      pendingTransactions: count("SELECT COUNT(*) n FROM transactions WHERE status = 'pending'"),
      marginCallAccounts: accounts.filter((a) => a.margin > 0 && a.marginLevel < ENGINE_CONFIG.marginCallLevel).length,
      priceFeed: marketData.feedMode,
      liveInstruments: marketData.status().symbols.filter((x) => x.live).length,
    },
  });
});

admin.get('/users', requireRole('super_admin', 'support_admin', 'compliance_admin'), (_req, res) => {
  res.json({ success: true, users: db.prepare('SELECT id,email,full_name,phone,role,status,kyc_status,created_at FROM users ORDER BY created_at DESC LIMIT 500').all() });
});
admin.post('/users/:id/status', requireRole('super_admin', 'support_admin'), (req, res) => {
  const status = String(req.body?.status);
  if (!['active', 'suspended', 'closed'].includes(status)) return bad(res, 'Invalid status');
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  audit(req.user!.id, 'user_status', { target: req.params.id, status }, ip(req));
  res.json({ success: true });
});
admin.post('/users/:id/kyc', requireRole('super_admin', 'compliance_admin'), (req, res) => {
  const status = String(req.body?.status);
  if (!['approved', 'rejected', 'pending'].includes(status)) return bad(res, 'Invalid KYC status');
  db.prepare('UPDATE users SET kyc_status = ? WHERE id = ?').run(status, req.params.id);
  audit(req.user!.id, 'kyc_review', { target: req.params.id, status }, ip(req));
  res.json({ success: true });
});

admin.get('/transactions', requireRole('super_admin', 'finance_admin'), (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const sql = `SELECT t.*, u.id AS user_id, u.email AS user_email, u.full_name AS user_name, a.account_number
    FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN users u ON u.id = a.user_id
    ${status ? 'WHERE t.status = ?' : ''} ORDER BY t.created_at DESC LIMIT 500`;
  res.json({ success: true, transactions: status ? db.prepare(sql).all(status) : db.prepare(sql).all() });
});
admin.post('/transactions/:id/:action', requireRole('super_admin', 'finance_admin'), (req, res) => {
  const t = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as any;
  if (!t || t.status !== 'pending') return bad(res, 'Pending transaction not found', 404);
  const approve = req.params.action === 'approve';
  if (!approve && req.params.action !== 'reject') return bad(res, 'Unknown action');
  if (approve) {
    const acc = tradingEngine.accounts.get(t.account_id);
    if (!acc) return bad(res, 'Account not found', 404);
    if (t.kind === 'withdrawal' && (t.amount > acc.freeMargin || t.amount > acc.balance)) return bad(res, 'Insufficient funds on account');
    const r = tradingEngine.adjustBalance(t.account_id, t.kind === 'deposit' ? t.amount : -t.amount, t.kind, t.id, `${t.kind} via ${t.method}`);
    if (!r.ok) return bad(res, r.error);
  }
  db.prepare('UPDATE transactions SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
    .run(approve ? 'completed' : 'rejected', req.user!.id, new Date().toISOString(), t.id);
  audit(req.user!.id, `transaction_${req.params.action}`, { id: t.id, amount: t.amount, kind: t.kind }, ip(req));
  res.json({ success: true });
});

admin.post('/accounts/:id/adjust', requireRole('super_admin', 'finance_admin'), (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount === 0) return bad(res, 'Invalid amount');
  const r = tradingEngine.adjustBalance(req.params.id, amount, 'adjustment', `admin:${req.user!.id}`, String(req.body?.note ?? 'Manual adjustment'));
  if (!r.ok) return bad(res, r.error, 404);
  audit(req.user!.id, 'balance_adjust', { account: req.params.id, amount, note: req.body?.note }, ip(req));
  res.json({ success: true, balance: r.balance });
});
admin.get('/accounts', (_req, res) => res.json({ success: true, accounts: [...tradingEngine.accounts.values()].map(accountView) }));
admin.get('/positions', (_req, res) => res.json({ success: true, positions: tradingEngine.openOrders().map(orderView) }));
admin.get('/audit', requireRole('super_admin', 'compliance_admin'), (_req, res) =>
  res.json({ success: true, audit: db.prepare('SELECT a.*, u.email AS actor_email, u.role AS actor_role FROM audit a LEFT JOIN users u ON u.id = a.actor ORDER BY a.id DESC LIMIT 500').all() }));

// ---- integrations (super admin): secrets are encrypted at rest and never returned ----
admin.get('/integrations', requireRole('super_admin'), (req, res) => {
  const gw = gatewayToken();
  const staffNoCreds = db.prepare("SELECT COUNT(*) n FROM users WHERE role != 'client' AND status = 'active'").get() as any;
  res.json({
    success: true,
    security: {
      production: process.env.NODE_ENV === 'production',
      jwtSecretFromEnv: !!process.env.JWT_SECRET,
      https: req.secure || req.headers['x-forwarded-proto'] === 'https',
      otpRequired: otpRequired(),
      telegramConfigured: !!gw,
      testMode: TEST_MODE,
      defaultAdminActive: !!db.prepare("SELECT 1 FROM users WHERE email = 'admin@exora.local' AND status = 'active'").get(),
      staffCount: staffNoCreds.n,
    },
    telegram: { configured: !!gw, source: gw?.source ?? null, hint: gw ? `…${gw.token.slice(-4)}` : null, otpRequired: otpRequired(), devFallback: !gw && process.env.NODE_ENV !== 'production' },
  });
});
admin.post('/integrations/telegram', requireRole('super_admin'), (req, res) => {
  const token = String(req.body?.token ?? '').trim();
  if (token.length < 20 || /\s/.test(token)) return bad(res, "Token noto'g'ri ko'rinadi");
  setSecret('telegram_gateway_token', token);
  audit(req.user!.id, 'integration_telegram_set', { hint: token.slice(-4) }, ip(req));
  res.json({ success: true });
});
admin.delete('/integrations/telegram', requireRole('super_admin'), (req, res) => {
  deleteSecret('telegram_gateway_token');
  audit(req.user!.id, 'integration_telegram_removed', undefined, ip(req));
  res.json({ success: true });
});
admin.post('/integrations/telegram/test', requireRole('super_admin'), async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return bad(res, "Telefon raqami noto'g'ri");
  try {
    res.json({ success: true, message: await testGateway(phone) });
  } catch (e: any) {
    bad(res, e.message, 502);
  }
});

admin.use(adminSupportRouter);
brokerRouter.use('/support', clientSupportRouter);
brokerRouter.use('/admin', admin);

// JSON error handler so API failures never leak an HTML stack page.
brokerRouter.use((err: any, _req: Request, res: Response, _next: () => void) => {
  console.error('[api] unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});
