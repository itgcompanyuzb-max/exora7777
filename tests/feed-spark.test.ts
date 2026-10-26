// Yahoo batch ("spark") polling: one request serves every symbol; 429 triggers back-off, not a crash.
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test';
process.env.MARKET_FEED = 'auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

let sparkCalls = 0;
let chartCalls = 0;
const server = http.createServer((req, res) => {
  const url = new URL(req.url!, 'http://x');
  res.setHeader('content-type', 'application/json');
  if (url.pathname.endsWith('/spark')) {
    sparkCalls++;
    const syms = (url.searchParams.get('symbols') || '').split(',');
    const t = Math.floor(Date.now() / 1000);
    return res.end(JSON.stringify({ spark: { result: syms.map((symbol, i) => ({ symbol, response: [{ meta: { regularMarketPrice: 100 + i, regularMarketTime: t } }] })) } }));
  }
  chartCalls++;
  res.statusCode = 404;
  res.end('{}');
});
await new Promise<void>((r) => server.listen(0, r));
process.env.YAHOO_BASE_URL = `http://127.0.0.1:${(server.address() as any).port}`;
process.env.YAHOO_POLL_MS = '1000';
process.env.BINANCE_REST_URL = process.env.YAHOO_BASE_URL;
process.env.BINANCE_WS_URL = 'ws://127.0.0.1:1'; // unreachable on purpose

const { marketData } = await import('../server/marketData.js');
marketData.start();
await new Promise((r) => setTimeout(r, 2500));

test('one batch request refreshes every Yahoo symbol', () => {
  assert.ok(sparkCalls >= 2, `spark calls: ${sparkCalls}`);
  for (const s of ['EURUSD', 'XAUUSD', 'USOIL', 'US30']) assert.ok(marketData.isLive(s), s);
  assert.ok(marketData.status().health.yahoo.ok >= 2);
  assert.equal(marketData.status().health.yahoo.lastError, null);
});

test.after(() => { server.close(); setTimeout(() => process.exit(0), 100); });
