process.env.DB_PATH = ':memory:';
process.env.MARKET_HOURS = 'off';
process.env.JWT_SECRET = 'test';
process.env.OTP_REQUIRED = 'off';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';

const { brokerRouter } = await import('../server/brokerApi.js');
const { tradingEngine } = await import('../server/tradingEngine.js');
tradingEngine.start();

test('test mode (default) refuses real-money deposits and withdrawals', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', brokerRouter);
  const server = http.createServer(app).listen(0);
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const call = async (path: string, body?: unknown, token?: string) => {
    const r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: (await r.json()) as any };
  };
  try {
    const reg = await call('/auth/register', { email: 'x@y.io', fullName: 'Test User', password: 'password123' });
    const accs = (await call('/accounts', undefined, reg.body.token)).body.accounts;
    const live = accs.find((a: any) => !a.isDemo);
    const dep = await call('/wallet/deposit', { accountId: live.id, amount: 100, method: 'payme' }, reg.body.token);
    assert.equal(dep.status, 403);
    assert.match(dep.body.error, /Test rejimi/);
    const demo = accs.find((a: any) => a.isDemo);
    const top = await call('/wallet/deposit', { accountId: demo.id, amount: 500 }, reg.body.token);
    assert.equal(top.status, 200); // demo top-up still allowed
    assert.equal((await call('/market/status')).body.testMode, true);
  } finally { server.close(); }
});
