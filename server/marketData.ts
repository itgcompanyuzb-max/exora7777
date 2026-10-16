// server/marketData.ts
// Price feed (live providers + simulator fallback) and OHLC candle store.
import WebSocket from 'ws';
import { db } from './db.js';
import { SYMBOL_SPECS, SPEC_BY_SYMBOL, TIER_CONDITIONS, Tier, isMarketOpen } from './symbols.js';

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  time: number;
}
export interface Candle {
  time: number; // unix seconds (bucket open)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const round = (v: number, digits: number) => Number(v.toFixed(digits));
const randn = () => {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};

class MarketData {
  private mids = new Map<string, number>();
  private anchors = new Map<string, number>();
  private lastLive = new Map<string, number>();
  private sessionOpen = new Map<string, number>();
  private bars = new Map<string, Candle>(); // current 1m bar per symbol
  private dirty = new Set<string>();
  private tickListeners: Array<(q: Quote) => void> = [];
  public feedMode: 'simulated' | 'binance' | 'binance+twelvedata' | 'twelvedata' = 'simulated';

  constructor() {
    for (const s of SYMBOL_SPECS) {
      this.mids.set(s.symbol, s.anchor);
      this.anchors.set(s.symbol, s.anchor);
      this.sessionOpen.set(s.symbol, s.anchor);
    }
  }

  // ---------------------------------------------------------------- quotes
  onTick(cb: (q: Quote) => void) {
    this.tickListeners.push(cb);
    return () => {
      this.tickListeners = this.tickListeners.filter((l) => l !== cb);
    };
  }

  mid(symbol: string): number | undefined {
    return this.mids.get(symbol);
  }

  quote(symbol: string, tier: Tier = 'Standard'): Quote | undefined {
    const spec = SPEC_BY_SYMBOL.get(symbol);
    const mid = this.mids.get(symbol);
    if (!spec || mid === undefined) return undefined;
    const half = (spec.baseSpread * TIER_CONDITIONS[tier].spreadMult) / 2;
    return {
      symbol,
      mid,
      bid: round(mid - half, spec.digits),
      ask: round(mid + half, spec.digits),
      time: Date.now(),
    };
  }

  private dayOpenCache = new Map<string, { at: number; open: number; high: number; low: number }>();
  dayStats(symbol: string) {
    const mid = this.mids.get(symbol) ?? 0;
    const cached = this.dayOpenCache.get(symbol);
    let c = cached;
    if (!c || Date.now() - c.at > 60_000) {
      const startOfDay = Math.floor(Date.now() / 86400000) * 86400;
      const first = db.prepare('SELECT open FROM candles WHERE symbol = ? AND time >= ? ORDER BY time ASC LIMIT 1').get(symbol, startOfDay) as any;
      const range = db.prepare('SELECT MAX(high) AS h, MIN(low) AS l FROM candles WHERE symbol = ? AND time >= ?').get(symbol, startOfDay) as any;
      c = { at: Date.now(), open: first?.open ?? this.sessionOpen.get(symbol) ?? mid, high: range?.h ?? mid, low: range?.l ?? mid };
      this.dayOpenCache.set(symbol, c);
    }
    const open = c.open;
    const high = Math.max(c.high, mid);
    const low = Math.min(c.low, mid);
    return { open, high, low, change: mid - open, changePct: open ? ((mid - open) / open) * 100 : 0 };
  }

  /** Inject a price from any provider (live feed, FIX bridge, test). */
  pushPrice(symbol: string, mid: number, live = true) {
    const spec = SPEC_BY_SYMBOL.get(symbol);
    if (!spec || !Number.isFinite(mid) || mid <= 0) return;
    const m = round(mid, spec.digits);
    this.mids.set(symbol, m);
    if (live) {
      this.lastLive.set(symbol, Date.now());
      this.anchors.set(symbol, m);
    }
    this.updateBar(symbol, m);
    const q = this.quote(symbol)!;
    this.tickListeners.forEach((cb) => cb(q));
  }

  // --------------------------------------------------------------- candles
  private updateBar(symbol: string, price: number) {
    const t = Math.floor(Date.now() / 60000) * 60;
    let bar = this.bars.get(symbol);
    if (!bar || bar.time !== t) {
      if (bar) this.persistBar(symbol, bar);
      bar = { time: t, open: price, high: price, low: price, close: price, volume: 0 };
      this.bars.set(symbol, bar);
    }
    bar.high = Math.max(bar.high, price);
    bar.low = Math.min(bar.low, price);
    bar.close = price;
    bar.volume += 1;
    this.dirty.add(symbol);
  }

  private persistBar(symbol: string, b: Candle) {
    db.prepare('INSERT OR REPLACE INTO candles (symbol,time,open,high,low,close,volume) VALUES (?,?,?,?,?,?,?)').run(
      symbol, b.time, b.open, b.high, b.low, b.close, b.volume
    );
  }

  flush() {
    for (const sym of this.dirty) {
      const bar = this.bars.get(sym);
      if (bar) this.persistBar(sym, bar);
    }
    this.dirty.clear();
  }

  /** Seed synthetic history so charts are not empty on a fresh database (clearly synthetic). */
  private seedHistory(days = 3) {
    const now = Math.floor(Date.now() / 60000) * 60;
    for (const spec of SYMBOL_SPECS) {
      const count = db.prepare('SELECT COUNT(*) AS n FROM candles WHERE symbol = ?').get(spec.symbol) as any;
      if (count.n > 0) continue;
      const bars: Candle[] = [];
      let price = spec.anchor;
      for (let i = 0; i < days * 1440; i++) {
        const time = now - i * 60;
        const close = price;
        const open = close * Math.exp(-randn() * spec.vol * 12);
        const wick = spec.anchor * spec.vol * 6;
        bars.push({
          time, open: round(open, spec.digits), close: round(close, spec.digits),
          high: round(Math.max(open, close) + Math.random() * wick, spec.digits),
          low: round(Math.min(open, close) - Math.random() * wick, spec.digits),
          volume: Math.floor(20 + Math.random() * 200),
        });
        price = open;
      }
      db.exec('BEGIN');
      const stmt = db.prepare('INSERT OR REPLACE INTO candles (symbol,time,open,high,low,close,volume) VALUES (?,?,?,?,?,?,?)');
      for (const b of bars) stmt.run(spec.symbol, b.time, b.open, b.high, b.low, b.close, b.volume);
      db.exec('COMMIT');
      // history ends at the anchor price; start the day from its first bar
      this.sessionOpen.set(spec.symbol, bars[bars.length - 1].open);
    }
  }

  getCandles(symbol: string, resolutionSec: number, fromSec: number, toSec: number, countback = 0): Candle[] {
    this.flush();
    let rows: Candle[];
    if (countback > 0) {
      const limit = Math.min(countback * Math.max(1, resolutionSec / 60) + 2, 200000);
      rows = (db.prepare('SELECT time, open, high, low, close, volume FROM candles WHERE symbol = ? AND time <= ? ORDER BY time DESC LIMIT ?')
        .all(symbol, toSec, limit) as unknown as Candle[]).reverse();
    } else {
      rows = db.prepare('SELECT time, open, high, low, close, volume FROM candles WHERE symbol = ? AND time >= ? AND time <= ? ORDER BY time ASC')
        .all(symbol, fromSec, toSec) as unknown as Candle[];
    }
    if (resolutionSec <= 60) return countback > 0 ? rows.slice(-countback) : rows;
    const bucket = (t: number): number => {
      if (resolutionSec >= 2592000) {
        const d = new Date(t * 1000);
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000;
      }
      if (resolutionSec === 604800) return Math.floor((t - 4 * 86400) / 604800) * 604800 + 4 * 86400;
      return Math.floor(t / resolutionSec) * resolutionSec;
    };
    const out: Candle[] = [];
    for (const r of rows) {
      const bt = bucket(r.time);
      const last = out[out.length - 1];
      if (last && last.time === bt) {
        last.high = Math.max(last.high, r.high);
        last.low = Math.min(last.low, r.low);
        last.close = r.close;
        last.volume += r.volume;
      } else {
        out.push({ ...r, time: bt });
      }
    }
    return countback > 0 ? out.slice(-countback) : out;
  }

  // ---------------------------------------------------------------- feeds
  start() {
    this.seedHistory();
    const mode = (process.env.MARKET_FEED || 'simulated').toLowerCase();
    const useBinance = mode.includes('binance');
    const useTwelve = mode.includes('twelvedata') && !!process.env.TWELVEDATA_API_KEY;
    this.feedMode = useBinance && useTwelve ? 'binance+twelvedata' : useBinance ? 'binance' : useTwelve ? 'twelvedata' : 'simulated';
    console.log(`[market] feed mode: ${this.feedMode}`);
    if (useBinance) this.connectBinance();
    if (useTwelve) this.pollTwelveData();
    // Simulator fills any symbol that has no fresh live tick (also covers weekends / provider outages).
    setInterval(() => this.simulateStep(), 500).unref();
    setInterval(() => this.flush(), 5000).unref();
  }

  private simulateStep() {
    const now = Date.now();
    for (const spec of SYMBOL_SPECS) {
      const live = this.lastLive.get(spec.symbol) ?? 0;
      if (now - live < 4000) continue;
      if (process.env.MARKET_HOURS !== 'off' && !isMarketOpen(spec)) continue;
      const mid = this.mids.get(spec.symbol)!;
      const anchor = this.anchors.get(spec.symbol)!;
      const reversion = (anchor - mid) / anchor * 0.002;
      const next = mid * Math.exp(randn() * spec.vol + reversion);
      this.pushPrice(spec.symbol, next, false);
    }
  }

  private connectBinance(attempt = 0) {
    const map = new Map<string, string>();
    for (const s of SYMBOL_SPECS) if (s.binance) map.set(s.binance.toLowerCase(), s.symbol);
    const streams = [...map.keys()].map((k) => `${k}@bookTicker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    ws.on('open', () => {
      console.log('[market] Binance feed connected');
      attempt = 0;
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const d = msg.data;
        const sym = map.get(String(d.s).toLowerCase());
        if (sym) this.pushPrice(sym, (parseFloat(d.b) + parseFloat(d.a)) / 2, true);
      } catch { /* ignore malformed frame */ }
    });
    const retry = () => setTimeout(() => this.connectBinance(attempt + 1), Math.min(30000, 1000 * 2 ** attempt)).unref();
    ws.on('close', retry);
    ws.on('error', (e) => console.warn('[market] Binance feed error:', e.message));
  }

  private pollTwelveData() {
    const key = process.env.TWELVEDATA_API_KEY!;
    const specs = SYMBOL_SPECS.filter((s) => s.twelveData && !(this.feedMode.includes('binance') && s.binance));
    const byTd = new Map(specs.map((s) => [s.twelveData!, s.symbol]));
    const interval = Number(process.env.TWELVEDATA_POLL_MS || 20000);
    const poll = async () => {
      try {
        const url = `https://api.twelvedata.com/price?symbol=${[...byTd.keys()].join(',')}&apikey=${key}`;
        const data: any = await (await fetch(url)).json();
        for (const [td, sym] of byTd) {
          const p = parseFloat(data?.[td]?.price ?? data?.price);
          if (Number.isFinite(p)) this.pushPrice(sym, p, true);
        }
      } catch (e: any) {
        console.warn('[market] TwelveData poll failed:', e.message);
      }
    };
    poll();
    setInterval(poll, interval).unref();
  }
}

export const marketData = new MarketData();
