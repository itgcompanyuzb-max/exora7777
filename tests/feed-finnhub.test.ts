// Finnhub streaming provider against a local mock WebSocket.
process.env.DB_PATH = ':memory:';
process.env.MARKET_HOURS = 'off';
process.env.JWT_SECRET = 'test';
process.env.FINNHUB_API_KEY = 'testkey';
process.env.MARKET_FEED = 'finnhub';
import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketServer } from 'ws';

const subs: string[] = [];
let token = '';
const wss = new WebSocketServer({ port: 0 });
wss.on('connection', (ws, req) => {
  token = new URL(req.url!, 'http://x').searchParams.get('token') || '';
  ws.on('message', (m) => {
    const msg = JSON.parse(m.toString());
    if (msg.type === 'subscribe') subs.push(msg.symbol);
    if (msg.symbol === 'OANDA:XAU_USD') setInterval(() => ws.send(JSON.stringify({ type: 'trade', data: [{ s: 'OANDA:XAU_USD', p: 2655.55, t: Date.now(), v: 1 }] })), 50).unref();
  });
});
process.env.FINNHUB_WS_URL = `ws://127.0.0.1:${(wss.address() as any).port}`;

const { marketData } = await import('../server/marketData.js');
marketData.start();
await new Promise((r) => setTimeout(r, 1500));

test('Finnhub subscribes to FX/metal symbols with the token and streams prices', () => {
  assert.equal(token, 'testkey');
  assert.ok(subs.includes('OANDA:XAU_USD') && subs.includes('OANDA:EUR_USD'));
  assert.equal(marketData.sourceOf('XAUUSD'), 'finnhub');
  assert.equal(marketData.mid('XAUUSD'), 2655.55);
  assert.ok(marketData.isLive('XAUUSD'));
  assert.ok(!marketData.isLive('EURUSD')); // subscribed but no trade yet
});

test.after(() => { wss.close(); setTimeout(() => process.exit(0), 100); });
