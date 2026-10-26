process.env.DB_PATH = ':memory:';
process.env.MARKET_HOURS = 'off';
process.env.JWT_SECRET = 'test-secret';
process.env.OTP_REQUIRED = 'off';
process.env.TEST_MODE = 'off'; // exercise the real-account deposit request flow

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';

const { db } = await import('../server/db.js');
const { tradingEngine: engine } = await import('../server/tradingEngine.js');
const { marketData } = await import('../server/marketData.js');
const { hashPassword, verifyPassword, signToken, verifyToken } = await import('../server/auth.js');
const { brokerRouter } = await import('../server/brokerApi.js');
const { SPEC_BY_SYMBOL } = await import('../server/symbols.js');

engine.start();

let n = 0;
function newUser() {
  const id = `u${++n}`;
  db.prepare("INSERT INTO users (id,email,full_name,password_hash,created_at) VALUES (?,?,?,?,?)").run(id, `${id}@t.io`, id, 'x', new Date().toISOString());
  return id;
}
const account = (opts: Parameters<typeof engine.createAccount>[1] = {}) => engine.createAccount(newUser(), { isDemo: true, ...opts });
const price = (sym: string, mid: number) => marketData.pushPrice(sym, mid);

test('password hashing and JWT', () => {
  const h = hashPassword('correct horse');
  assert.ok(verifyPassword('correct horse', h));
  assert.ok(!verifyPassword('wrong', h));
  const t = signToken('u1', 'client');
  assert.equal(verifyToken(t)?.sub, 'u1');
  assert.equal(verifyToken(t.slice(0, -2) + 'xx'), null);
  assert.equal(verifyToken(signToken('u1', 'client', -10)), null);
});

test('market buy fills at ask, margin and P/L are correct', () => {
  const acc = account();
  price('EURUSD', 1.1);
  const r = engine.placeOrder({ accountId: acc.id, symbol: 'EURUSD', side: 'BUY', lots: 1 });
  assert.ok(r.ok);
  const o = r.order!;
  assert.equal(o.openPrice, 1.10005); // mid + half of 0.0001 spread
  assert.equal(o.margin, 1100.05); // 100000 * 1.10005 / 100
  price('EURUSD', 1.101); // bid 1.10095 -> +90.. (1.10095-1.10005)*100000
  assert.equal(engine.getOrder(o.id)!.pnl, 90);
  assert.equal(acc.equity, 10090);
  const c = engine.closeOrder(o.id);
  assert.ok(c.ok);
  assert.equal(acc.balance, 10090);
  assert.equal(engine.openOrders(acc.id).length, 0);
});

test('USD-base pair: margin in USD and P/L converted from quote currency', () => {
  const acc = account({ leverage: 100 });
  price('USDJPY', 150);
  const r = engine.placeOrder({ accountId: acc.id, symbol: 'USDJPY', side: 'BUY', lots: 0.1 });
  assert.ok(r.ok);
  assert.equal(r.order!.margin, 100); // 0.1 * 100000 / 100
  price('USDJPY', 151);
  const pnl = engine.getOrder(r.order!.id)!.pnl;
  assert.ok(Math.abs(pnl - ((150.994 - 150.006) * 0.1 * 100000) / 150.994) < 0.02, `pnl ${pnl}`);
});

test('stop loss and take profit close automatically', () => {
  const acc = account();
  price('EURUSD', 1.2);
  const sl = engine.placeOrder({ accountId: acc.id, symbol: 'EURUSD', side: 'BUY', lots: 0.1, sl: 1.199, tp: 1.21 });
  assert.ok(sl.ok);
  price('EURUSD', 1.1985);
  assert.equal(engine.openOrders(acc.id).length, 0);
  const h = engine.history(acc.id)[0];
  assert.equal(h.closeReason, 'Stop Loss');
  assert.ok(acc.balance < 10000);

  price('EURUSD', 1.2);
  const tp = engine.placeOrder({ accountId: acc.id, symbol: 'EURUSD', side: 'SELL', lots: 0.1, tp: 1.19 });
  assert.ok(tp.ok);
  price('EURUSD', 1.1895);
  assert.equal(engine.history(acc.id)[0].closeReason, 'Take Profit');
});

test('pending limit & stop orders trigger on price', () => {
  const acc = account();
  price('GBPUSD', 1.3);
  const lim = engine.placeOrder({ accountId: acc.id, symbol: 'GBPUSD', side: 'BUY', kind: 'limit', lots: 0.1, price: 1.29 });
  const stp = engine.placeOrder({ accountId: acc.id, symbol: 'GBPUSD', side: 'BUY', kind: 'stop', lots: 0.1, price: 1.31 });
  assert.ok(lim.ok && stp.ok);
  assert.equal(engine.pendingOrders(acc.id).length, 2);
  price('GBPUSD', 1.289);
  assert.equal(engine.getOrder(lim.order!.id)!.status, 'open');
  assert.equal(engine.pendingOrders(acc.id).length, 1);
  price('GBPUSD', 1.312);
  assert.equal(engine.getOrder(stp.order!.id)!.status, 'open');
  // invalid placements
  price('GBPUSD', 1.3);
  assert.ok(!engine.placeOrder({ accountId: acc.id, symbol: 'GBPUSD', side: 'BUY', kind: 'limit', lots: 0.1, price: 1.31 }).ok);
  const cancel = engine.placeOrder({ accountId: acc.id, symbol: 'GBPUSD', side: 'SELL', kind: 'limit', lots: 0.1, price: 1.31 });
  assert.ok(cancel.ok && engine.cancelOrder(cancel.order!.id).ok);
});

test('validation: volume, step, margin, stops', () => {
  const acc = account();
  price('EURUSD', 1.1);
  const base = { accountId: acc.id, symbol: 'EURUSD', side: 'BUY' as const };
  assert.match(engine.placeOrder({ ...base, lots: 0.001 }).error!, /Volume/);
  assert.match(engine.placeOrder({ ...base, lots: 0.015 }).error!, /step/);
  assert.match(engine.placeOrder({ ...base, lots: 50 }).error!, /Not enough money/);
  assert.match(engine.placeOrder({ ...base, lots: 0.1, sl: 1.2 }).error!, /Stop Loss/);
  assert.match(engine.placeOrder({ ...base, lots: 0.1, tp: 1.0 }).error!, /Take Profit/);
  assert.match(engine.placeOrder({ ...base, symbol: 'NOPE', lots: 0.1 }).error!, /not supported/);
});

test('partial close splits the position and settles proportionally', () => {
  const acc = account();
  price('EURUSD', 1.1);
  const r = engine.placeOrder({ accountId: acc.id, symbol: 'EURUSD', side: 'BUY', lots: 1 });
  const marginBefore = r.order!.margin;
  price('EURUSD', 1.102);
  const c = engine.closeOrder(r.order!.id, { lots: 0.4 });
  assert.ok(c.ok);
  const left = engine.getOrder(r.order!.id)!;
  assert.equal(left.lots, 0.6);
  assert.equal(left.margin, Number((marginBefore * 0.6).toFixed(2)));
  assert.equal(c.realizedPnl, Math.round(0.4 * 100000 * (1.10195 - 1.10005) * 100) / 100);
});

test('stop-out liquidates the worst position and protects against negative balance', () => {
  const acc = account({ leverage: 500 });
  price('XAUUSD', 2000);
  const r = engine.placeOrder({ accountId: acc.id, symbol: 'XAUUSD', side: 'BUY', lots: 9 });
  assert.ok(r.ok, r.error);
  price('XAUUSD', 1990); // heavy loss
  price('XAUUSD', 1930);
  assert.equal(engine.openOrders(acc.id).length, 0);
  assert.equal(engine.history(acc.id)[0].status, 'liquidated');
  assert.ok(acc.balance >= 0);
});

test('raw tier: tighter spread and per-lot commission in ledger', () => {
  const acc = account({ tier: 'Raw' });
  price('EURUSD', 1.1);
  const r = engine.placeOrder({ accountId: acc.id, symbol: 'EURUSD', side: 'BUY', lots: 2 });
  assert.ok(r.ok);
  assert.equal(r.order!.commission, 7);
  assert.equal(r.order!.openPrice, 1.10001); // 0.1 pip raw spread = 1 point
  assert.equal(acc.balance, 9993);
  const led = engine.ledgerOf(acc.id) as any[];
  assert.ok(led.some((l) => l.type === 'commission' && l.amount === -7));
});

test('swap rollover: triple on Wednesday', () => {
  const acc = account();
  price('EURUSD', 1.1);
  const r = engine.placeOrder({ accountId: acc.id, symbol: 'EURUSD', side: 'BUY', lots: 1 });
  engine.applySwaps(new Date('2026-10-14T22:00:00Z')); // Wednesday
  assert.equal(engine.getOrder(r.order!.id)!.swap, -18);
  assert.equal(acc.balance, 10000 - 18);
});

test('REST API enforces authentication and ownership', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', brokerRouter);
  const server = http.createServer(app).listen(0);
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const call = async (path: string, init: any = {}, token?: string) => {
    const res = await fetch(base + path, {
      ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    return { status: res.status, body: (await res.json()) as any };
  };
  try {
    assert.equal((await call('/trading/positions')).status, 401);
    assert.equal((await call('/admin/dashboard')).status, 401);
    const a = await call('/auth/register', { method: 'POST', body: { email: 'a@x.io', fullName: 'Alice A', password: 'password123' } });
    const b = await call('/auth/register', { method: 'POST', body: { email: 'b@x.io', fullName: 'Bob B', password: 'password123' } });
    assert.equal(a.status, 200);
    assert.equal((await call('/auth/register', { method: 'POST', body: { email: 'a@x.io', fullName: 'Alice A', password: 'password123' } })).status, 409);
    assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'a@x.io', password: 'nope' } })).status, 401);
    assert.equal((await call('/admin/dashboard', {}, a.body.token)).status, 403);

    price('EURUSD', 1.1);
    const demoA = (await call('/accounts', {}, a.body.token)).body.accounts.find((x: any) => x.isDemo);
    const placed = await call('/trading/order/open', { method: 'POST', body: { accountId: demoA.id, symbol: 'EURUSD', side: 'BUY', lots: 0.1 } }, a.body.token);
    assert.equal(placed.status, 200, JSON.stringify(placed.body));
    // Bob cannot see, modify or close Alice's order, nor trade on her account
    const stolen = await call('/trading/order/close', { method: 'POST', body: { positionId: placed.body.orderId } }, b.body.token);
    assert.equal(stolen.status, 404);
    const hijack = await call('/trading/order/open', { method: 'POST', body: { accountId: demoA.id, symbol: 'EURUSD', side: 'BUY', lots: 0.1 } }, b.body.token);
    assert.equal(hijack.status, 404);
    // Real accounts cannot be topped up for free
    const live = (await call('/accounts', {}, a.body.token)).body.accounts.find((x: any) => !x.isDemo);
    const dep = await call('/wallet/deposit', { method: 'POST', body: { accountId: live.id, amount: 1000, method: 'bank_wire' } }, a.body.token);
    assert.equal(dep.body.pending, true);
    assert.equal((await call('/accounts', {}, a.body.token)).body.accounts.find((x: any) => !x.isDemo).balance, 0);
    assert.equal((await call('/wallet/withdraw', { method: 'POST', body: { accountId: live.id, amount: 5 } }, a.body.token)).status, 403); // KYC
  } finally {
    server.close();
  }
});

test('candle store aggregates 1m bars into higher timeframes', () => {
  marketData['seedHistory'](1);
  const m1 = marketData.getCandles('EURUSD', 60, 0, Math.floor(Date.now() / 1000), 120);
  const m5 = marketData.getCandles('EURUSD', 300, 0, Math.floor(Date.now() / 1000), 20);
  assert.ok(m1.length > 0 && m5.length > 0);
  for (const c of m5) {
    assert.equal(c.time % 300, 0);
    assert.ok(c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close));
  }
  assert.ok(SPEC_BY_SYMBOL.has('EURUSD'));
});
