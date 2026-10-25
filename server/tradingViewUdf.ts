// server/tradingViewUdf.ts
// TradingView Universal Data Feed (UDF) backed by the persisted candle store.
import express from 'express';
import { marketData } from './marketData.js';
import { SPEC_BY_SYMBOL, normalizeSymbol, SymbolSpec } from './symbols.js';

export const tradingViewRouter = express.Router();

const RESOLUTIONS = ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'];

function resolutionToSeconds(r: string): number {
  if (r === '1D' || r === 'D') return 86400;
  if (r === '1W' || r === 'W') return 604800;
  if (r === '1M' || r === 'M') return 2592000;
  const n = parseInt(r, 10);
  return Number.isFinite(n) && n > 0 ? n * 60 : 900;
}
const tvType = (s: SymbolSpec) =>
  s.assetClass === 'crypto' ? 'crypto' : s.assetClass === 'index' ? 'index' : s.assetClass === 'metal' || s.assetClass === 'energy' ? 'commodity' : 'forex';
const session = (s: SymbolSpec) => (s.assetClass === 'crypto' ? '24x7' : '2200-2200:1234567;1');

tradingViewRouter.get('/config', (_req, res) => {
  res.json({
    supports_search: true, supports_group_request: false, supported_resolutions: RESOLUTIONS,
    supports_marks: false, supports_timescale_marks: false, supports_time: true,
    exchanges: [{ value: 'EXORA', name: 'Exora Prime', desc: 'Exora Prime' }],
    symbols_types: [{ name: 'All', value: '' }, { name: 'Forex', value: 'forex' }, { name: 'Commodity', value: 'commodity' }, { name: 'Crypto', value: 'crypto' }],
  });
});

tradingViewRouter.get('/time', (_req, res) => res.type('text/plain').send(String(Math.floor(Date.now() / 1000))));

tradingViewRouter.get('/symbols', (req, res) => {
  const sym = normalizeSymbol(String(req.query.symbol || 'XAUUSD'));
  const s = SPEC_BY_SYMBOL.get(sym);
  if (!s || !marketData.isActive(s.symbol)) return res.status(404).json({ s: 'error', errmsg: 'Unknown symbol' });
  res.json({
    name: s.symbol, ticker: s.symbol, description: s.name, type: tvType(s), session: session(s),
    exchange: 'EXORA', listed_exchange: 'EXORA', timezone: 'Etc/UTC', minmov: 1, pricescale: Math.pow(10, s.digits),
    fractional: false, has_intraday: true, supported_resolutions: RESOLUTIONS, intraday_multipliers: ['1', '5', '15', '30', '60', '240'],
    has_daily: true, has_weekly_and_monthly: true, has_empty_bars: false, has_no_volume: false, volume_precision: 2,
    data_status: 'streaming', currency_code: 'USD',
  });
});

tradingViewRouter.get('/history', (req, res) => {
  const sym = normalizeSymbol(String(req.query.symbol || ''));
  if (!SPEC_BY_SYMBOL.has(sym)) return res.json({ s: 'error', errmsg: 'Unknown symbol' });
  const step = resolutionToSeconds(String(req.query.resolution || '15'));
  const now = Math.floor(Date.now() / 1000);
  const to = Math.min(parseInt(String(req.query.to || now), 10) || now, now);
  const from = parseInt(String(req.query.from || '0'), 10) || 0;
  const countback = Math.min(5000, parseInt(String(req.query.countback || '0'), 10) || 0);

  const candles = marketData.getCandles(sym, step, from, to, countback);
  const inRange = countback ? candles : candles.filter((c) => c.time >= from && c.time <= to);
  if (inRange.length === 0) {
    const prev = marketData.getCandles(sym, step, 0, from, 1);
    return res.json(prev.length ? { s: 'no_data', nextTime: prev[0].time } : { s: 'no_data' });
  }
  res.json({
    s: 'ok',
    t: inRange.map((c) => c.time), o: inRange.map((c) => c.open), h: inRange.map((c) => c.high),
    l: inRange.map((c) => c.low), c: inRange.map((c) => c.close), v: inRange.map((c) => c.volume),
  });
});

tradingViewRouter.get('/search', (req, res) => {
  const q = String(req.query.query || '').toUpperCase();
  const type = String(req.query.type || '');
  const limit = Math.min(50, parseInt(String(req.query.limit || '30'), 10) || 30);
  res.json(
    marketData.activeSpecs().filter((s) => (!q || s.symbol.includes(q) || s.name.toUpperCase().includes(q)) && (!type || tvType(s) === type))
      .slice(0, limit)
      .map((s) => ({ symbol: s.symbol, full_name: `EXORA:${s.symbol}`, description: s.name, exchange: 'EXORA', ticker: s.symbol, type: tvType(s) }))
  );
});

tradingViewRouter.get('/quotes', (req, res) => {
  const raw = String(req.query.symbols || '');
  const list = raw ? raw.split(',').map((s) => normalizeSymbol(s.trim())) : marketData.activeSpecs().map((s) => s.symbol);
  const d = list.flatMap((sym) => {
    const spec = SPEC_BY_SYMBOL.get(sym);
    const q = marketData.quote(sym);
    if (!spec || !q) return [];
    const st = marketData.dayStats(sym);
    return [{
      s: 'ok', n: `EXORA:${sym}`,
      v: {
        ch: Number(st.change.toFixed(spec.digits)), chp: Number(st.changePct.toFixed(2)), short_name: sym, exchange: 'EXORA',
        description: spec.name, lp: q.mid, ask: q.ask, bid: q.bid, open_price: st.open, high_price: Math.max(st.open, q.mid),
        low_price: Math.min(st.open, q.mid), prev_close_price: st.open, volume: 0,
      },
    }];
  });
  res.json({ s: 'ok', d });
});
