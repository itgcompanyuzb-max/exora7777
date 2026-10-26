process.env.DB_PATH = ':memory:';
process.env.MARKET_HOURS = 'off';
process.env.JWT_SECRET = 'test';
process.env.OTP_REQUIRED = 'off';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';

const { db } = await import('../server/db.js');
const { hashPassword } = await import('../server/auth.js');
const { brokerRouter } = await import('../server/brokerApi.js');
const { tradingEngine } = await import('../server/tradingEngine.js');
tradingEngine.start();
const { marketData } = await import('../server/marketData.js');
const price = (sym: string, mid: number) => marketData.pushPrice(sym, mid);

test('support desk: tickets, operator console, roles, risk monitor', async () => {
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
    // staff accounts
    for (const [id, role] of [['adm1', 'super_admin'], ['sup1', 'support_admin'], ['fin1', 'finance_admin']]) {
      db.prepare('INSERT INTO users (id,email,full_name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').run(id, `${id}@x.io`, `Staff ${id}`, hashPassword('staffpass123'), role, new Date().toISOString());
    }
    const login = async (e: string) => (await call('POST', '/auth/login', { email: e, password: 'staffpass123' })).body.token as string;
    const [admin, support, finance] = [await login('adm1@x.io'), await login('sup1@x.io'), await login('fin1@x.io')];
    const a = (await call('POST', '/auth/register', { email: 'a@c.io', fullName: 'Alice Client', password: 'password123' })).body.token;
    const b = (await call('POST', '/auth/register', { email: 'b@c.io', fullName: 'Bob Client', password: 'password123' })).body.token;

    // client creates a ticket
    assert.equal((await call('POST', '/support/tickets', { subject: 'x', message: 'y' }, a)).status, 400);
    const created = await call('POST', '/support/tickets', { subject: 'Depozit kelmadi', category: 'deposit', message: 'Payme orqali $50 yubordim' }, a);
    assert.equal(created.status, 200);
    const t = created.body.ticket;
    assert.match(t.number, /^TKT-\d+$/);
    assert.equal(t.priority, 'high'); // deposit issues are prioritised
    assert.equal((await call('GET', `/support/tickets/${t.id}`, undefined, b)).status, 404); // isolation
    assert.equal((await call('GET', '/support/tickets')).status, 401);

    // operators only
    assert.equal((await call('GET', '/admin/tickets', undefined, a)).status, 403);
    assert.equal((await call('GET', '/admin/tickets', undefined, finance)).status, 403); // finance is not support
    const list = await call('GET', '/admin/tickets?status=open', undefined, support);
    assert.equal(list.body.tickets.length, 1);
    assert.equal((await call('GET', '/admin/tickets?q=Alice', undefined, support)).body.tickets.length, 1);
    assert.equal((await call('GET', '/admin/tickets?q=nobody', undefined, support)).body.tickets.length, 0);

    // thread view includes client card
    const detail = await call('GET', `/admin/tickets/${t.id}`, undefined, support);
    assert.equal(detail.body.client.user.email, 'a@c.io');
    assert.equal(detail.body.client.accounts.length, 2);

    // internal note is hidden from the client; public reply is not
    await call('POST', `/admin/tickets/${t.id}/reply`, { message: 'Tekshirish kerak, Finance bilan gaplashaman', internal: true }, support);
    let clientView = await call('GET', `/support/tickets/${t.id}`, undefined, a);
    assert.equal(clientView.body.messages.length, 1);
    await call('POST', `/admin/tickets/${t.id}/reply`, { message: 'Salom! Tekshiryapmiz.' }, support);
    clientView = await call('GET', `/support/tickets/${t.id}`, undefined, a);
    assert.equal(clientView.body.messages.length, 2);
    assert.equal(clientView.body.messages[1].senderRole, 'agent');
    assert.equal(clientView.body.ticket.status, 'pending'); // waiting for the client
    assert.ok(clientView.body.ticket.firstResponseAt);
    assert.equal(clientView.body.ticket.assigneeName, 'Staff sup1'); // replying takes ownership

    // client replies -> back to open; staff changes status/priority; client closes
    await call('POST', `/support/tickets/${t.id}/reply`, { message: 'Rahmat, kutaman' }, a);
    assert.equal((await call('GET', `/support/tickets/${t.id}`, undefined, a)).body.ticket.status, 'open');
    assert.equal((await call('POST', `/admin/tickets/${t.id}/status`, { status: 'bogus' }, support)).status, 400);
    assert.equal((await call('POST', `/admin/tickets/${t.id}/status`, { status: 'resolved' }, support)).status, 200);
    assert.equal((await call('POST', `/admin/tickets/${t.id}/priority`, { priority: 'urgent' }, support)).status, 200);
    const stats = await call('GET', '/admin/tickets-stats', undefined, support);
    assert.equal(stats.body.byStatus.resolved, 1);
    assert.ok(stats.body.avgFirstResponseMin !== null);
    assert.equal((await call('POST', `/support/tickets/${t.id}/close`, {}, a)).status, 200);
    assert.equal((await call('POST', `/support/tickets/${t.id}/reply`, { message: 'again' }, a)).status, 409);

    // staff management is super-admin only
    const newStaff = { email: 'op@x.io', fullName: 'New Operator', role: 'support_admin', password: 'longpassword1' };
    assert.equal((await call('POST', '/admin/staff', newStaff, support)).status, 403);
    assert.equal((await call('POST', '/admin/staff', { ...newStaff, password: 'short' }, admin)).status, 400);
    assert.equal((await call('POST', '/admin/staff', newStaff, admin)).status, 200);
    assert.equal((await call('POST', '/admin/staff', newStaff, admin)).status, 409);
    const opLogin = await call('POST', '/auth/login', { email: 'op@x.io', password: 'longpassword1' });
    assert.equal(opLogin.body.user.role, 'support_admin');
    assert.ok((await call('GET', '/admin/staff', undefined, support)).body.staff.length >= 4);

    // performance stats + password change
    price('EURUSD', 1.1);
    const accA = (await call('GET', '/accounts', undefined, a)).body.accounts.find((x: any) => x.isDemo);
    const opened = await call('POST', '/trading/order/open', { accountId: accA.id, symbol: 'EURUSD', side: 'BUY', lots: 1 }, a);
    price('EURUSD', 1.102);
    await call('POST', '/trading/order/close', { positionId: opened.body.orderId }, a);
    const st = await call('GET', `/trading/stats?accountId=${accA.id}&days=30`, undefined, a);
    assert.equal(st.body.totals.trades, 1);
    assert.equal(st.body.totals.wins, 1);
    assert.ok(st.body.totals.netProfit > 150 && st.body.totals.netProfit < 200); // ~ (1.10195-1.10005)*100000
    assert.equal(st.body.bySymbol[0].symbol, 'EURUSD');
    assert.equal((await call('GET', `/trading/stats?accountId=${accA.id}`, undefined, b)).status, 404);
    assert.equal((await call('POST', '/auth/password', { current: 'wrong', next: 'newpassword1' }, a)).status, 403);
    assert.equal((await call('POST', '/auth/password', { current: 'password123', next: 'newpassword1' }, a)).status, 200);
    assert.equal((await call('POST', '/auth/login', { email: 'a@c.io', password: 'newpassword1' })).status, 200);

    // client 360 + risk monitor
    const alice = (await call('GET', '/auth/me', undefined, a)).body.user.id;
    const c360 = await call('GET', `/admin/clients/${alice}`, undefined, support);
    assert.equal(c360.body.tickets.length, 1);
    assert.equal((await call('GET', `/admin/clients/${alice}`, undefined, a)).status, 403);
    const risk = await call('GET', '/admin/risk?demo=1', undefined, support);
    assert.equal(risk.status, 200);
    assert.ok(Array.isArray(risk.body.exposure) && 'brokerResult' in risk.body.totals);
  } finally {
    server.close();
  }
});
