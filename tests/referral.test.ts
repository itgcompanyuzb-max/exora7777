process.env.DB_PATH = ':memory:';
process.env.MARKET_HOURS = 'off';
process.env.JWT_SECRET = 'test';
process.env.OTP_REQUIRED = 'off';
process.env.REFERRAL_USD_PER_LOT = '3';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';

const { brokerRouter } = await import('../server/brokerApi.js');
const { tradingEngine } = await import('../server/tradingEngine.js');
const { marketData } = await import('../server/marketData.js');
tradingEngine.start();

test('referral codes, linking at sign-up and volume-based accruals', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', brokerRouter);
  const server = http.createServer(app).listen(0);
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const call = async (method: string, path: string, body?: unknown, token?: string) => {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: (await r.json()) as any };
  };
  try {
    const a = (await call('POST', '/auth/register', { email: 'ref@a.io', fullName: 'Anvar Referrer', password: 'password123' })).body.token;
    const me = await call('GET', '/referrals/me', undefined, a);
    assert.match(me.body.code, /^[A-Z2-9]{7}$/);
    assert.equal(me.body.stats.invited, 0);
    assert.equal((await call('GET', '/referrals/me')).status, 401);

    // unknown code is rejected, valid code (any case) links the new user
    assert.equal((await call('POST', '/auth/register', { email: 'x@b.io', fullName: 'Bad Code', password: 'password123', referralCode: 'NOPE123' })).status, 400);
    const b = (await call('POST', '/auth/register', { email: 'bobby@b.io', fullName: 'Bobur Karimov', password: 'password123', referralCode: me.body.code.toLowerCase() })).body.token;
    const inv = await call('GET', '/referrals/me', undefined, a);
    assert.equal(inv.body.stats.invited, 1);
    assert.equal(inv.body.stats.active, 0);
    assert.equal(inv.body.referrals[0].name, 'Bobur K.'); // masked
    assert.equal(inv.body.referrals[0].email, 'bo***@b.io');

    // the invited user trades 2 lots in total -> $6 accrued
    marketData.pushPrice('EURUSD', 1.1);
    const accB = (await call('GET', '/accounts', undefined, b)).body.accounts.find((x: any) => x.isDemo);
    for (const lots of [1, 1]) {
      const o = await call('POST', '/trading/order/open', { accountId: accB.id, symbol: 'EURUSD', side: 'BUY', lots }, b);
      await call('POST', '/trading/order/close', { positionId: o.body.orderId }, b);
    }
    const after = await call('GET', '/referrals/me', undefined, a);
    assert.equal(after.body.stats.active, 1);
    assert.equal(after.body.stats.lots, 2);
    assert.equal(after.body.stats.earned, 6);
    // the invited user does not see the referrer's data
    assert.equal((await call('GET', '/referrals/me', undefined, b)).body.stats.invited, 0);
  } finally {
    server.close();
  }
});
