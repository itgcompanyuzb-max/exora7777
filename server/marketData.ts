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
  public feedMode = 'simulated'; // 'simulated' | 'live:binance' | 'live:binance+finnhub' ...
  private sources = new Map<string, 'binance' | 'finnhub' | 'swissquote' | 'yahoo'>();
  private quoteTime = new Map<string, number>(); // provider timestamp (ms) of the latest accepted quote
  private liveMaxAgeMs = Number(process.env.LIVE_MAX_AGE_MS || 30000);

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
      db.prepare("INSERT OR REPLACE INTO meta (key,value) VALUES (?, '1')").run(`synthetic:${spec.symbol}`);
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
  /** True when prices are simulated (no live provider configured). */
  get simulated() {
    return this.sources.size === 0;
  }

  /** Instruments that can be traded: all in simulated mode, otherwise only those with a live source. */
  isActive(symbol: string): boolean {
    return this.simulated ? SPEC_BY_SYMBOL.has(symbol) : this.sources.has(symbol);
  }
  activeSpecs() {
    return SYMBOL_SPECS.filter((s) => this.isActive(s.symbol));
  }

  /** Fresh real tick received recently (always true for the simulator). */
  isLive(symbol: string): boolean {
    if (this.simulated) return true;
    if (!this.sources.has(symbol)) return false;
    return Date.now() - (this.lastLive.get(symbol) ?? 0) < this.liveMaxAgeMs;
  }

  /** Accepted but older than 90 s at the provider (e.g. delayed futures quotes). */
  isDelayed(symbol: string): boolean {
    if (this.simulated || !this.isLive(symbol)) return false;
    const q = this.quoteTime.get(symbol);
    return q !== undefined && Date.now() - q > 90000;
  }

  sourceOf(symbol: string): string {
    return this.simulated ? 'simulated' : this.sources.get(symbol) ?? 'none';
  }

  status() {
    return {
      mode: this.feedMode,
      health: this.health,
      symbols: this.activeSpecs().map((s) => ({
        symbol: s.symbol, source: this.sourceOf(s.symbol), live: this.isLive(s.symbol), delayed: this.isDelayed(s.symbol),
        ageMs: this.lastLive.has(s.symbol) ? Date.now() - this.lastLive.get(s.symbol)! : null,
      })),
    };
  }

  start() {
    const mode = (process.env.MARKET_FEED || 'auto').toLowerCase();
    const finnhubKey = process.env.FINNHUB_API_KEY?.trim();
    if (mode !== 'simulated') {
      for (const s of SYMBOL_SPECS) {
        if (s.binance) this.sources.set(s.symbol, 'binance');
        else if (s.finnhub && finnhubKey) this.sources.set(s.symbol, 'finnhub');
        else if (s.swissquote) this.sources.set(s.symbol, 'swissquote');
        else if (s.yahoo) this.sources.set(s.symbol, 'yahoo');
      }
    }
    const used = new Set(this.sources.values());
    this.feedMode = this.simulated ? 'simulated' : `live:${[...used].join('+')}`;
    console.log(`[market] feed mode: ${this.feedMode} (${this.simulated ? SYMBOL_SPECS.length : this.sources.size} instruments)`);
    if (!this.simulated && !finnhubKey) {
      console.log('[market] Forex/metals: Swissquote public bid/ask feed. Oil/US30: Yahoo Finance (may be delayed). Set FINNHUB_API_KEY for a streaming feed.');
    }

    if (this.simulated) {
      this.seedHistory();
      // Random-walk simulator — demo only, never mixed with live data.
      setInterval(() => this.simulateStep(), 500).unref();
    } else {
      this.backfillBinanceHistory().catch((e) => console.warn('[market] Binance history backfill failed:', e.message));
      this.backfillYahooHistory().catch((e) => console.warn('[market] Yahoo history backfill failed:', e.message));
      if (used.has('binance')) this.connectBinance();
      if (used.has('finnhub')) this.connectFinnhub();
      if (used.has('swissquote')) this.pollSwissquote();
      if (used.has('yahoo')) this.pollYahoo();
    }
    setInterval(() => this.flush(), 5000).unref();
    if (!this.simulated) {
      setInterval(() => {
        const st = this.status().symbols;
        const stale = st.filter((x) => !x.live && isMarketOpen(SPEC_BY_SYMBOL.get(x.symbol)!)).map((x) => x.symbol);
        console.log(`[market] health: ${st.filter((x) => x.live).length}/${st.length} live${stale.length ? `; no fresh price (market open): ${stale.join(', ')}` : ''}`);
      }, 60000).unref();
    }
  }

  private simulateStep() {
    for (const spec of SYMBOL_SPECS) {
      if (process.env.MARKET_HOURS !== 'off' && !isMarketOpen(spec)) continue;
      const mid = this.mids.get(spec.symbol)!;
      const anchor = this.anchors.get(spec.symbol)!;
      const reversion = ((anchor - mid) / anchor) * 0.002;
      this.pushPrice(spec.symbol, mid * Math.exp(randn() * spec.vol + reversion), false);
    }
  }

  /** Replace synthetic bars with real 1-minute klines (last ~2 days) for Binance-sourced symbols. */
  private async backfillBinanceHistory() {
    const rest = (process.env.BINANCE_REST_URL || 'https://api.binance.com').replace(/\/$/, '');
    for (const [symbol, src] of this.sources) {
      if (src !== 'binance') continue;
      const spec = SPEC_BY_SYMBOL.get(symbol)!;
      const flagged = db.prepare('SELECT 1 FROM meta WHERE key = ?').get(`synthetic:${symbol}`);
      if (flagged) {
        db.prepare('DELETE FROM candles WHERE symbol = ?').run(symbol);
        db.prepare('DELETE FROM meta WHERE key = ?').run(`synthetic:${symbol}`);
      }
      let endTime = Date.now();
      for (let page = 0; page < 3; page++) {
        const res = await fetch(`${rest}/api/v3/klines?symbol=${spec.binance}&interval=1m&limit=1000&endTime=${endTime}`);
        if (!res.ok) throw new Error(`klines ${spec.binance}: HTTP ${res.status}`);
        const rows = (await res.json()) as any[][];
        if (!rows.length) break;
        db.exec('BEGIN');
        const stmt = db.prepare('INSERT OR REPLACE INTO candles (symbol,time,open,high,low,close,volume) VALUES (?,?,?,?,?,?,?)');
        for (const k of rows) stmt.run(symbol, Math.floor(k[0] / 1000), +k[1], +k[2], +k[3], +k[4], +k[5]);
        db.exec('COMMIT');
        endTime = rows[0][0] - 1;
      }
      console.log(`[market] history backfilled for ${symbol}`);
    }
  }

  private yahooUrl(symbol: string, query: string) {
    const base = (process.env.YAHOO_BASE_URL || 'https://query1.finance.yahoo.com').replace(/\/$/, '');
    return `${base}/v8/finance/chart/${encodeURIComponent(SPEC_BY_SYMBOL.get(symbol)!.yahoo!)}?${query}`;
  }
  private static readonly YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; ExoraPrime/1.0)', Accept: 'application/json' };

  /** Real 1-minute history for Yahoo-sourced symbols (last ~2 days). */
  private async backfillYahooHistory() {
    for (const [symbol, src] of this.sources) {
      if (src === 'binance' || !SPEC_BY_SYMBOL.get(symbol)!.yahoo) continue;
      const spec = SPEC_BY_SYMBOL.get(symbol)!;
      const res = await fetch(this.yahooUrl(symbol, 'interval=1m&range=2d'), { headers: MarketData.YAHOO_HEADERS });
      if (!res.ok) { console.warn(`[market] Yahoo history ${symbol}: HTTP ${res.status}`); continue; }
      const r = ((await res.json()) as any)?.chart?.result?.[0];
      const ts: number[] = r?.timestamp ?? [];
      const q = r?.indicators?.quote?.[0];
      if (!ts.length || !q) continue;
      if (db.prepare('SELECT 1 FROM meta WHERE key = ?').get(`synthetic:${symbol}`)) {
        db.prepare('DELETE FROM candles WHERE symbol = ?').run(symbol);
        db.prepare('DELETE FROM meta WHERE key = ?').run(`synthetic:${symbol}`);
      }
      db.exec('BEGIN');
      const stmt = db.prepare('INSERT OR REPLACE INTO candles (symbol,time,open,high,low,close,volume) VALUES (?,?,?,?,?,?,?)');
      for (let i = 0; i < ts.length; i++) {
        if (q.open[i] == null || q.close[i] == null) continue;
        stmt.run(symbol, ts[i], round(q.open[i], spec.digits), round(q.high[i], spec.digits), round(q.low[i], spec.digits), round(q.close[i], spec.digits), q.volume?.[i] ?? 0);
      }
      db.exec('COMMIT');
      console.log(`[market] history backfilled for ${symbol} (${ts.length} bars)`);
    }
  }

  /** Per-source health, exposed through /market/status for diagnostics. */
  private health: Record<string, { ok: number; fail: number; lastError: string | null; lastOkAt: number | null }> = {};
  private noteResult(source: string, err?: string) {
    const h = (this.health[source] ??= { ok: 0, fail: 0, lastError: null, lastOkAt: null });
    if (err) {
      if (h.lastError !== err) console.warn(`[market] ${source} problem: ${err}`);
      h.fail++;
      h.lastError = err;
    } else {
      if (h.lastError) console.log(`[market] ${source} recovered`);
      h.ok++;
      h.lastError = null;
      h.lastOkAt = Date.now();
    }
  }

  private applyYahooMeta(symbol: string, meta: any) {
    const price = Number(meta?.regularMarketPrice);
    const t = Number(meta?.regularMarketTime);
    // Yahoo CME futures (oil) are ~10 min delayed: accept up to 20 min in test mode and flag them as delayed.
    const maxAge = (process.env.TEST_MODE || 'on') !== 'off' ? 1200 : 300;
    if (Number.isFinite(price) && (!t || Date.now() / 1000 - t < maxAge)) {
      this.quoteTime.set(symbol, t ? t * 1000 : Date.now());
      this.pushPrice(symbol, price, true);
    }
  }

  /**
   * Yahoo polling. First choice is the batch "spark" endpoint (one request for every symbol);
   * if it is unavailable we fall back to one request per symbol, strictly one at a time with
   * pacing and exponential back-off on HTTP 429 so Yahoo does not rate-limit us.
   */
  private pollYahoo() {
    const symbols = [...this.sources].filter(([, src]) => src === 'yahoo').map(([sym]) => sym);
    const interval = Math.max(1000, Number(process.env.YAHOO_POLL_MS || 3000));
    const base = (process.env.YAHOO_BASE_URL || 'https://query1.finance.yahoo.com').replace(/\/$/, '');
    const bySymbol = new Map(symbols.map((sym) => [SPEC_BY_SYMBOL.get(sym)!.yahoo!, sym]));
    let backoff = 0;
    let batchWorks = true;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const fetchJson = async (url: string) => {
      const res = await fetch(url, { headers: MarketData.YAHOO_HEADERS, signal: AbortSignal.timeout(6000) });
      if (res.status === 429) throw Object.assign(new Error('HTTP 429 (rate limited)'), { rateLimited: true });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<any>;
    };

    const batch = async (): Promise<boolean> => {
      const q = [...bySymbol.keys()].map(encodeURIComponent).join(',');
      const data = await fetchJson(`${base}/v8/finance/spark?symbols=${q}&range=1d&interval=1m`);
      const rows: any[] = data?.spark?.result ?? [];
      let n = 0;
      for (const row of rows) {
        const sym = bySymbol.get(row?.symbol);
        const meta = row?.response?.[0]?.meta;
        if (sym && meta) { this.applyYahooMeta(sym, meta); n++; }
      }
      return n > 0;
    };

    const single = async () => {
      for (const [ySym, sym] of bySymbol) {
        const data = await fetchJson(`${base}/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1m&range=1d`);
        this.applyYahooMeta(sym, data?.chart?.result?.[0]?.meta);
        await sleep(Math.max(300, Math.floor(interval / bySymbol.size)));
      }
    };

    const loop = async () => {
      for (;;) {
        try {
          if (batchWorks && !(await batch().catch((e) => { if (e.rateLimited) throw e; return false; }))) {
            batchWorks = false; // endpoint unavailable -> use per-symbol requests from now on
            console.log('[market] Yahoo batch endpoint unavailable, using per-symbol polling');
          }
          if (!batchWorks) await single();
          this.noteResult('yahoo');
          backoff = 0;
          await sleep(interval);
        } catch (e: any) {
          this.noteResult('yahoo', e.message);
          backoff = e.rateLimited ? Math.min(60000, (backoff || 5000) * 2) : Math.min(15000, (backoff || 1000) * 2);
          await sleep(backoff);
        }
      }
    };
    loop();
  }

  /** Swissquote public bid/ask quotes (FX + metals): a few requests in parallel, each symbol every SWISSQUOTE_POLL_MS. */
  private pollSwissquote() {
    const base = (process.env.SWISSQUOTE_BASE_URL || 'https://forex-data-feed.swissquote.com').replace(/\/$/, '');
    const interval = Math.max(500, Number(process.env.SWISSQUOTE_POLL_MS || 2000));
    const list = [...this.sources].filter(([, src]) => src === 'swissquote').map(([sym]) => sym);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    list.forEach((symbol, idx) => {
      const spec = SPEC_BY_SYMBOL.get(symbol)!;
      let backoff = 0;
      const run = async () => {
        await sleep((idx * interval) / list.length); // stagger so requests spread over the interval
        for (;;) {
          try {
            const res = await fetch(`${base}/public-quotes/bboquotes/instrument/${spec.swissquote}`, { headers: MarketData.YAHOO_HEADERS, signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as any[];
            const entry = Array.isArray(data) ? data[0] : data;
            const profiles: any[] = entry?.spreadProfilePrices ?? [];
            const p = profiles.find((x) => String(x.spreadProfile).toLowerCase() === 'prime') ?? profiles[0] ?? entry;
            const bid = Number(p?.bid);
            const ask = Number(p?.ask);
            const ts = Number(entry?.ts) || Date.now();
            if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && Date.now() - ts < 120000) {
              this.quoteTime.set(symbol, ts);
              this.pushPrice(symbol, (bid + ask) / 2, true);
            }
            this.noteResult('swissquote');
            backoff = 0;
            await sleep(interval);
          } catch (e: any) {
            this.noteResult('swissquote', e.message);
            backoff = Math.min(30000, (backoff || 1000) * 2);
            await sleep(backoff);
          }
        }
      };
      run();
    });
  }

  private reconnect(fn: () => void, attempt: number) {
    setTimeout(fn, Math.min(30000, 1000 * 2 ** attempt)).unref();
  }

  private connectBinance(attempt = 0) {
    const map = new Map<string, string>();
    for (const [sym, src] of this.sources) if (src === 'binance') map.set(SPEC_BY_SYMBOL.get(sym)!.binance!.toLowerCase(), sym);
    const base = (process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443').replace(/\/$/, '');
    const streams = [...map.keys()].map((k) => `${k}@bookTicker`).join('/');
    const ws = new WebSocket(`${base}/stream?streams=${streams}`);
    ws.on('open', () => {
      console.log('[market] Binance feed connected');
      attempt = 0;
    });
    ws.on('message', (raw) => {
      try {
        const d = JSON.parse(raw.toString()).data;
        const sym = map.get(String(d.s).toLowerCase());
        if (sym) { this.pushPrice(sym, (parseFloat(d.b) + parseFloat(d.a)) / 2, true); this.noteResult('binance'); }
      } catch { /* ignore malformed frame */ }
    });
    ws.on('close', () => this.reconnect(() => this.connectBinance(attempt + 1), attempt));
    ws.on('error', (e) => this.noteResult('binance', e.message));
  }

  private connectFinnhub(attempt = 0) {
    const map = new Map<string, string>();
    for (const [sym, src] of this.sources) if (src === 'finnhub') map.set(SPEC_BY_SYMBOL.get(sym)!.finnhub!, sym);
    const base = (process.env.FINNHUB_WS_URL || 'wss://ws.finnhub.io').replace(/\/$/, '');
    const ws = new WebSocket(`${base}?token=${process.env.FINNHUB_API_KEY}`);
    ws.on('open', () => {
      console.log('[market] Finnhub feed connected');
      attempt = 0;
      for (const fh of map.keys()) ws.send(JSON.stringify({ type: 'subscribe', symbol: fh }));
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type !== 'trade') return;
        for (const t of msg.data as Array<{ s: string; p: number }>) {
          const sym = map.get(t.s);
          if (sym) this.pushPrice(sym, t.p, true);
        }
      } catch { /* ignore malformed frame */ }
    });
    ws.on('close', () => this.reconnect(() => this.connectFinnhub(attempt + 1), attempt));
    ws.on('error', (e) => this.noteResult('finnhub', e.message));
  }
}

export const marketData = new MarketData();
