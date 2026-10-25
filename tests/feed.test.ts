// Verifies the live-feed providers against local mock servers (Yahoo chart API, Binance REST+WS).
process.env.DB_PATH = ':memory:';
process.env.MARKET_HOURS = 'off';
process.env.JWT_SECRET = 'test';
delete process.env.FINNHUB_API_KEY;

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { WebSocketServer } from 'ws';

const nowSec = () => Math.floor(Date.now() / 1000);
const PRICES: Record<string, number> = { 'EURUSD=X': 1.085, 'GC=F': 2650.4, 'GBPUSD=X': 1.27, 'AUDUSD=X': 0.66, 'NZDUSD=X': 0.6, USDCHF: 0.88, 'USDCAD=X': 1.39, 'SI=F': 31.2, 'CL=F': 71.1, '^DJI': 43800 };

const yahoo = http.createServer((req, res) => {
  const url = new URL(req.url!, 'http://x');
  const sym = decodeURIComponent(url.pathname.split('/').pop()!);
  res.setHeader('content-type', 'application/json');
  if (url.searchParams.get('range') === '2d') {
    const t = nowSec() - 180;
    const p = PRICES[sym] ?? 1;
    return res.end(JSON.stringify({ chart: { result: [{ timestamp: [t, t + 60, t + 120], indicators: { quote: [{ open: [p, p, p], high: [p + 0.01, p + 0.01, p + 0.01], low: [p - 0.01, p - 0.01, p - 0.01], close: [p, p + 0.002, p + 0.001], volume: [5, 6, 7] }] } }] } }));
  }
  // USDJPY is deliberately stale (quote older than 5 minutes) -> must not be tradable
  const stale = sym === 'USDJPY=X';
  const price = PRICES[sym] ?? 100;
  res.end(JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: price, regularMarketTime: stale ? nowSec() - 3600 : nowSec() } }] } }));
});

const binanceRest = http.createServer((_req, res) => {
  const t = Date.now() - 180000;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify([[t, '84000', '84010', '83990', '84005', '1.5'], [t + 60000, '84005', '84020', '84000', '84010', '2.5']]));
});

const binanceWs = new WebSocketServer({ port: 0 });
binanceWs.on('connection', (ws) => {
  const timer = setInterval(() => {
    for (const [s, b, a] of [['BTCUSDT', '84000.10', '84000.30'], ['ETHUSDT', '2300.00', '2300.40'], ['SOLUSDT', '150.00', '150.10']]) {
      ws.send(JSON.stringify({ stream: `${s.toLowerCase()}@bookTicker`, data: { s, b, a } }));
    }
  }, 50);
  ws.on('close', () => clearInterval(timer));
});

await new Promise<void>((r) => yahoo.listen(0, r));
await new Promise<void>((r) => binanceRest.listen(0, r));
process.env.YAHOO_BASE_URL = `http://127.0.0.1:${(yahoo.address() as any).port}`;
process.env.BINANCE_REST_URL = `http://127.0.0.1:${(binanceRest.address() as any).port}`;
process.env.BINANCE_WS_URL = `ws://127.0.0.1:${(binanceWs.address() as any).port}`;
process.env.YAHOO_POLL_MS = '500';

const { db } = await import('../server/db.js');
const { marketData } = await import('../server/marketData.js');
const { tradingEngine: engine } = await import('../server/tradingEngine.js');

engine.start();
marketData.start();
await new Promise((r) => setTimeout(r, 4000));

test('feed mode and instrument set reflect real sources', () => {
  assert.match(marketData.feedMode, /^live:(binance\+yahoo|yahoo\+binance)$/);
  assert.ok(!marketData.simulated);
  const names = marketData.activeSpecs().map((s) => s.symbol);
  for (const s of ['EURUSD', 'XAUUSD', 'USOIL', 'US30', 'BTCUSD', 'SOLUSD']) assert.ok(names.includes(s), s);
});

test('live prices flow in from Yahoo (forex/gold) and Binance (crypto)', () => {
  assert.equal(marketData.mid('EURUSD'), 1.085);
  assert.equal(marketData.mid('XAUUSD'), 2650.4);
  assert.equal(marketData.mid('BTCUSD'), 84000.2);
  assert.ok(marketData.isLive('XAUUSD') && marketData.isLive('BTCUSD'));
  assert.equal(marketData.sourceOf('XAUUSD'), 'yahoo');
  assert.equal(marketData.sourceOf('BTCUSD'), 'binance');
});

test('stale quote is never treated as live and cannot be traded', () => {
  assert.ok(!marketData.isLive('USDJPY'));
  const user = 'u1';
  db.prepare("INSERT INTO users (id,email,full_name,password_hash,created_at) VALUES (?,?,?,?,?)").run(user, 'a@b.c', 'A', 'x', new Date().toISOString());
  const acc = engine.createAccount(user, { isDemo: true });
  const r = engine.placeOrder({ accountId: acc.id, symbol: 'USDJPY', side: 'BUY', lots: 0.1 });
  assert.ok(!r.ok);
  assert.match(r.error!, /Live price/);
  // a live instrument fills at the real price + spread
  const ok = engine.placeOrder({ accountId: acc.id, symbol: 'EURUSD', side: 'BUY', lots: 0.1 });
  assert.ok(ok.ok, ok.error);
  assert.equal(ok.order!.openPrice, 1.08505);
});

test('real history replaces synthetic bars', () => {
  const eur = marketData.getCandles('EURUSD', 60, 0, nowSec() + 60, 100);
  assert.ok(eur.length >= 3 && eur.some((c) => c.volume === 7));
  const btc = marketData.getCandles('BTCUSD', 60, 0, nowSec() + 60, 100);
  assert.ok(btc.some((c) => c.close === 84010));
  assert.equal((db.prepare("SELECT COUNT(*) n FROM meta WHERE key LIKE 'synthetic:%'").get() as any).n, 0);
});

test.after(() => {
  yahoo.close(); binanceRest.close(); binanceWs.close();
  setTimeout(() => process.exit(0), 100);
});
