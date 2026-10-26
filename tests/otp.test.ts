// Phone verification through a mock Telegram Gateway.
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';

const calls: Array<{ method: string; auth: string; body: any }> = [];
const codes = new Map<string, string>(); // request_id -> code Telegram "delivered"
const gateway = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const body = JSON.parse(raw || '{}');
    const method = req.url!.slice(1);
    calls.push({ method, auth: String(req.headers.authorization), body });
    res.setHeader('content-type', 'application/json');
    if (req.headers.authorization !== 'Bearer good-token-1234567890abcdef') return res.end(JSON.stringify({ ok: false, error: 'ACCESS_TOKEN_INVALID' }));
    if (method === 'sendVerificationMessage') {
      if (body.phone_number === '+998900000000') return res.end(JSON.stringify({ ok: false, error: 'PHONE_NUMBER_NOT_FOUND' }));
      const id = `req_${calls.length}`;
      codes.set(id, '123456');
      return res.end(JSON.stringify({ ok: true, result: { request_id: id, phone_number: body.phone_number, remaining_balance: 4.2 } }));
    }
    if (method === 'checkVerificationStatus') {
      const status = codes.get(body.request_id) === body.code ? 'code_valid' : 'code_invalid';
      return res.end(JSON.stringify({ ok: true, result: { request_id: body.request_id, verification_status: { status } } }));
    }
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_FOUND' }));
  });
});
await new Promise<void>((r) => gateway.listen(0, r));
process.env.TELEGRAM_GATEWAY_URL = `http://127.0.0.1:${(gateway.address() as any).port}`;

const { db } = await import('../server/db.js');
const { hashPassword } = await import('../server/auth.js');
const { brokerRouter } = await import('../server/brokerApi.js');
const { tradingEngine } = await import('../server/tradingEngine.js');
const { getSecret } = await import('../server/settings.js');
tradingEngine.start();

test('Telegram phone verification gates registration; token is managed in admin and stored encrypted', async () => {
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
    db.prepare('INSERT INTO users (id,email,full_name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').run('adm', 'adm@x.io', 'Admin', hashPassword('staffpass123'), 'super_admin', new Date().toISOString());
    const admin = (await call('POST', '/auth/login', { email: 'adm@x.io', password: 'staffpass123' })).body.token;
    const user = { email: 'u@x.io', fullName: 'Uz User', password: 'password123' };

    // no token anywhere yet: dev fallback sends the code to the server log only, never to the client
    const dev = await call('POST', '/auth/otp/send', { phone: '+998 90 111 22 33' });
    assert.equal(dev.body.channel, 'console');
    assert.deepEqual(Object.keys(dev.body).sort(), ['channel', 'expiresInSec', 'otpId', 'success']); // no code field in the response

    // only super admins can manage the integration; the token is never echoed back
    assert.equal((await call('GET', '/admin/integrations')).status, 401);
    assert.equal((await call('POST', '/admin/integrations/telegram', { token: 'short' }, admin)).status, 400);
    assert.equal((await call('POST', '/admin/integrations/telegram', { token: 'good-token-1234567890abcdef' }, admin)).status, 200);
    const info = await call('GET', '/admin/integrations', undefined, admin);
    assert.equal(info.body.telegram.configured, true);
    assert.equal(info.body.telegram.hint, '…cdef');
    assert.ok(!JSON.stringify(info.body).includes('good-token'));
    assert.equal(getSecret('telegram_gateway_token'), 'good-token-1234567890abcdef');
    assert.ok(!JSON.stringify(db.prepare('SELECT value FROM settings').all()).includes('good-token')); // encrypted at rest

    // bad numbers / numbers not on Telegram
    assert.equal((await call('POST', '/auth/otp/send', { phone: '12' })).status, 400);
    const nf = await call('POST', '/auth/otp/send', { phone: '+998900000000' });
    assert.equal(nf.status, 502);
    assert.match(nf.body.error, /Telegram/);

    // happy path: Telegram "delivers" 123456
    const sent = await call('POST', '/auth/otp/send', { phone: '90 123 45 67' }); // national format is normalised
    assert.equal(sent.status, 200);
    assert.equal(sent.body.channel, 'telegram');
    const sendCall = calls.find((c) => c.method === 'sendVerificationMessage' && c.body.phone_number === '+998901234567')!;
    assert.equal(sendCall.auth, 'Bearer good-token-1234567890abcdef');
    assert.equal(sendCall.body.code, undefined); // Telegram generates the code, we never see it

    // registration needs a valid code
    const noCode = await call('POST', '/auth/register', { ...user, phone: '+998901234567' });
    assert.equal(noCode.status, 400);
    const wrong = await call('POST', '/auth/register', { ...user, phone: '+998901234567', otpId: sent.body.otpId, otpCode: '000000' });
    assert.equal(wrong.status, 400);
    assert.match(wrong.body.error, /noto'g'ri/);
    const otherPhone = await call('POST', '/auth/register', { ...user, phone: '+998909999999', otpId: sent.body.otpId, otpCode: '123456' });
    assert.equal(otherPhone.status, 400); // code is bound to the phone it was sent to
    const ok = await call('POST', '/auth/register', { ...user, phone: '+998901234567', otpId: sent.body.otpId, otpCode: '123456' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.user.phone, '+998901234567');
    assert.equal((db.prepare('SELECT phone_verified v FROM users WHERE email = ?').get('u@x.io') as any).v, 1);

    // code is single-use and the number can't be reused
    const reuse = await call('POST', '/auth/register', { ...user, email: 'u2@x.io', phone: '+998901234567', otpId: sent.body.otpId, otpCode: '123456' });
    assert.equal(reuse.status, 400);
    assert.equal((await call('POST', '/auth/otp/send', { phone: '+998901234567' })).status, 409);

    // admin test endpoint + removal
    assert.equal((await call('POST', '/admin/integrations/telegram/test', { phone: '+998905556677' }, admin)).status, 200);
    await call('DELETE', '/admin/integrations/telegram', undefined, admin);
    assert.equal((await call('GET', '/admin/integrations', undefined, admin)).body.telegram.configured, false);
  } finally {
    server.close();
    gateway.close();
  }
});
