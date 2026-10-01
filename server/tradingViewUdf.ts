import express from 'express';
import { tradingEngine, SymbolConfig } from './tradingEngine.js';

export const tradingViewRouter = express.Router();

// 1. /config: Supported configurations for TradingView Charting Library
tradingViewRouter.get('/config', (_req, res) => {
  res.json({
    supports_search: true,
    supports_group_request: false,
    supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
    supports_marks: false,
    supports_timescale_marks: false,
    supports_time: true,
  });
});

// 2. /time: Current Server Time (Unix seconds)
tradingViewRouter.get('/time', (_req, res) => {
  res.send(Math.floor(Date.now() / 1000).toString());
});

// Helper to normalize symbol
function normalizeSymbol(raw: string): string {
  if (!raw) return 'XAUUSD';
  let sym = raw.toUpperCase().replace(/[\s\/\-_:]/g, '');
  if (sym.startsWith('EXORA')) sym = sym.replace('EXORA', '');
  if (sym.startsWith('FOREX')) sym = sym.replace('FOREX', '');
  if (sym === 'GOLD' || sym === 'XAU') return 'XAUUSD';
  if (sym === 'BTC' || sym === 'BITCOIN') return 'BTCUSD';
  if (sym === 'EUR') return 'EURUSD';
  if (sym === 'GBP') return 'GBPUSD';
  if (sym === 'JPY') return 'USDJPY';
  return sym;
}

// 3. /symbols: Resolve Symbol Information
tradingViewRouter.get('/symbols', (req, res) => {
  const rawSymbol = String(req.query.symbol || 'XAUUSD');
  const sym = normalizeSymbol(rawSymbol);

  const config = tradingEngine.symbols.get(sym) || tradingEngine.symbols.get('XAUUSD')!;
  const isJpyOrCryptoOrGold = sym.includes('JPY') || sym.includes('XAU') || sym.includes('BTC');
  const pricescale = config.digits === 5 ? 100000 : config.digits === 3 ? 1000 : 100;

  const symbolInfo = {
    name: config.symbol,
    ticker: config.symbol,
    description: config.name,
    type: sym.includes('BTC') ? 'crypto' : sym.includes('XAU') ? 'commodity' : 'forex',
    session: '24x7',
    exchange: 'EXORA',
    listed_exchange: 'EXORA',
    timezone: 'Etc/UTC',
    minmov: 1,
    pricescale,
    minmove2: 0,
    fractional: false,
    has_intraday: true,
    supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
    intraday_multipliers: ['1', '5', '15', '30', '60', '240'],
    has_seconds: false,
    has_daily: true,
    has_weekly_and_monthly: true,
    has_empty_bars: false,
    has_no_volume: false,
    volume_precision: 2,
    data_status: 'streaming',
  };

  res.json(symbolInfo);
});

// Helper to convert resolution string to seconds
function resolutionToSeconds(res: string): number {
  if (res === '1D' || res === 'D') return 86400;
  if (res === '1W' || res === 'W') return 604800;
  if (res === '1M' || res === 'M') return 2592000;
  const num = parseInt(res, 10);
  if (isNaN(num)) return 900; // default 15m
  return num * 60;
}

// 4. /history: Universal Data Feed Historical Bars (OHLCV)
tradingViewRouter.get('/history', (req, res) => {
  try {
    const rawSymbol = String(req.query.symbol || 'XAUUSD');
    const sym = normalizeSymbol(rawSymbol);
    const resolution = String(req.query.resolution || '15');
    const from = parseInt(String(req.query.from || '0'), 10);
    const to = parseInt(String(req.query.to || Math.floor(Date.now() / 1000)), 10);
    const countback = parseInt(String(req.query.countback || '300'), 10);

    const config = tradingEngine.symbols.get(sym) || {
      symbol: sym,
      name: `${sym} Pair`,
      contractSize: 100000,
      digits: sym.includes('JPY') || sym.includes('XAU') ? 2 : 5,
      pipSize: 0.0001,
      bid: 1.0850,
      ask: 1.0852,
      spread: 0.0002,
      high24h: 1.0900,
      low24h: 1.0800,
    };

    const stepSec = resolutionToSeconds(resolution);
    const now = Math.floor(Date.now() / 1000);
    const alignedTo = Math.floor(Math.min(to, now) / stepSec) * stepSec;

    // Number of bars to generate or return
    const barsCount = Math.min(1000, Math.max(50, countback || Math.floor((to - from) / stepSec)));

    const t: number[] = [];
    const o: number[] = [];
    const h: number[] = [];
    const l: number[] = [];
    const c: number[] = [];
    const v: number[] = [];

    const currentPrice = config.bid;
    const volatility = currentPrice * 0.0008;

    // Seed deterministic random walk backwards from currentPrice
    let price = currentPrice - (barsCount * volatility * 0.2);

    for (let i = barsCount; i >= 0; i--) {
      const barTime = alignedTo - (i * stepSec);
      if (from && barTime < from && i > 50) continue;

      const delta = (Math.sin(barTime / 3600) + (Math.random() - 0.49)) * volatility * 1.5;
      const open = price;
      const close = open + delta;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      const volume = Math.floor(20 + Math.random() * 250);

      t.push(barTime);
      o.push(Number(open.toFixed(config.digits)));
      h.push(Number(high.toFixed(config.digits)));
      l.push(Number(low.toFixed(config.digits)));
      c.push(Number(close.toFixed(config.digits)));
      v.push(volume);

      price = close;
    }

    // Ensure the last bar's close reflects current live bid
    if (c.length > 0) {
      c[c.length - 1] = currentPrice;
      h[h.length - 1] = Math.max(h[h.length - 1], currentPrice);
      l[l.length - 1] = Math.min(l[l.length - 1], currentPrice);
    }

    if (t.length === 0) {
      return res.json({ s: 'no_data', nextTime: now });
    }

    return res.json({
      s: 'ok',
      t,
      o,
      h,
      l,
      c,
      v,
    });
  } catch (err: any) {
    console.error('[TradingView UDF History Error]', err);
    return res.status(500).json({ s: 'error', errmsg: err.message });
  }
});

// 5. /search: Symbol Search for TradingView
tradingViewRouter.get('/search', (req, res) => {
  const query = String(req.query.query || '').toUpperCase();
  const limit = parseInt(String(req.query.limit || '30'), 10);

  const results: any[] = [];
  for (const [sym, config] of tradingEngine.symbols.entries()) {
    if (!query || sym.includes(query) || config.name.toUpperCase().includes(query)) {
      results.push({
        symbol: sym,
        full_name: `EXORA:${sym}`,
        description: config.name,
        exchange: 'EXORA',
        ticker: sym,
        type: sym.includes('BTC') ? 'crypto' : sym.includes('XAU') ? 'commodity' : 'forex',
      });
      if (results.length >= limit) break;
    }
  }

  res.json(results);
});

// 6. /quotes: Real-Time Quotes Feed for Watchlist and Legend
tradingViewRouter.get('/quotes', (req, res) => {
  const rawSymbols = String(req.query.symbols || '');
  const symList = rawSymbols.split(',').map(s => normalizeSymbol(s.trim())).filter(Boolean);

  const list = symList.length > 0 ? symList : Array.from(tradingEngine.symbols.keys());
  const data: any[] = [];

  for (const sym of list) {
    const config = tradingEngine.symbols.get(sym);
    if (!config) continue;

    const change = config.bid - config.low24h;
    const changePercent = (change / config.low24h) * 100;

    data.push({
      s: 'ok',
      n: `EXORA:${sym}`,
      v: {
        ch: Number(change.toFixed(config.digits)),
        chp: Number(changePercent.toFixed(2)),
        short_name: sym,
        exchange: 'EXORA',
        description: config.name,
        lp: config.bid,
        ask: config.ask,
        bid: config.bid,
        open_price: config.low24h,
        high_price: config.high24h,
        low_price: config.low24h,
        prev_close_price: config.low24h,
        volume: 50000,
      },
    });
  }

  res.json({ s: 'ok', d: data });
});
