import { BrokerAdapter, Candle, NewOrder, Order, Position, Tick } from '../types';
import { getPipSize } from '../engine';

interface InitialSymbolData {
  basePrice: number;
  spread: number;
  volatility: number;
}

const SYMBOL_CONFIG: Record<string, InitialSymbolData> = {
  EURUSD: { basePrice: 1.08500, spread: 0.00010, volatility: 0.00012 },
  GBPUSD: { basePrice: 1.29400, spread: 0.00015, volatility: 0.00018 },
  USDJPY: { basePrice: 154.200, spread: 0.015, volatility: 0.025 },
  XAUUSD: { basePrice: 2680.50, spread: 0.25, volatility: 0.45 },
};

export class MockBroker implements BrokerAdapter {
  name = 'MockBroker (Random Walk Engine)';
  private prices: Record<string, number> = {};
  private listeners: Map<string, Set<(t: Tick) => void>> = new Map();
  private intervalId?: any;

  constructor() {
    Object.entries(SYMBOL_CONFIG).forEach(([sym, cfg]) => {
      this.prices[sym] = cfg.basePrice;
    });
  }

  async connect(): Promise<void> {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      const now = Date.now();
      Object.entries(SYMBOL_CONFIG).forEach(([sym, cfg]) => {
        const delta = (Math.random() - 0.495) * cfg.volatility;
        this.prices[sym] = Math.max(0.0001, this.prices[sym] + delta);

        const bid = Number(this.prices[sym].toFixed(sym.includes('JPY') || sym.includes('XAU') ? 2 : 5));
        const ask = Number((bid + cfg.spread).toFixed(sym.includes('JPY') || sym.includes('XAU') ? 2 : 5));

        const tick: Tick = {
          symbol: sym,
          bid,
          ask,
          time: Math.floor(now / 1000),
        };

        const subs = this.listeners.get(sym);
        if (subs) {
          subs.forEach(cb => cb(tick));
        }
      });
    }, 500);
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  subscribe(symbol: string, onTick: (t: Tick) => void): () => void {
    const s = symbol.toUpperCase().replace(/[\s\/-]/g, '');
    if (!this.listeners.has(s)) {
      this.listeners.set(s, new Set());
    }
    this.listeners.get(s)!.add(onTick);

    // Emit initial tick immediately
    const cfg = SYMBOL_CONFIG[s] || { basePrice: 1.08500, spread: 0.00010, volatility: 0.00012 };
    const cur = this.prices[s] || cfg.basePrice;
    onTick({
      symbol: s,
      bid: cur,
      ask: Number((cur + cfg.spread).toFixed(s.includes('JPY') || s.includes('XAU') ? 2 : 5)),
      time: Math.floor(Date.now() / 1000),
    });

    return () => {
      this.listeners.get(s)?.delete(onTick);
    };
  }

  async getCandles(symbol: string, tf: string, limit = 150): Promise<Candle[]> {
    const s = symbol.toUpperCase().replace(/[\s\/-]/g, '');
    const cfg = SYMBOL_CONFIG[s] || SYMBOL_CONFIG['EURUSD'];
    const currentPrice = this.prices[s] || cfg.basePrice;

    // Determine timeframe duration in seconds
    let tfSec = 60;
    if (tf === 'M5' || tf === '5') tfSec = 300;
    else if (tf === 'M15' || tf === '15') tfSec = 900;
    else if (tf === 'H1' || tf === '60') tfSec = 3600;
    else if (tf === 'H4' || tf === '240') tfSec = 14400;
    else if (tf === 'D1' || tf === 'D') tfSec = 86400;

    const nowSec = Math.floor(Date.now() / 1000);
    const alignedNow = Math.floor(nowSec / tfSec) * tfSec;
    const candles: Candle[] = [];

    let price = currentPrice - (limit * cfg.volatility * 0.4);

    for (let i = limit; i >= 0; i--) {
      const time = alignedNow - (i * tfSec);
      const walk = (Math.random() - 0.49) * cfg.volatility * 3;
      const open = price;
      const close = open + walk;
      const high = Math.max(open, close) + Math.random() * cfg.volatility * 1.5;
      const low = Math.min(open, close) - Math.random() * cfg.volatility * 1.5;

      const digits = s.includes('JPY') || s.includes('XAU') ? 2 : 5;
      candles.push({
        time,
        open: Number(open.toFixed(digits)),
        high: Number(high.toFixed(digits)),
        low: Number(low.toFixed(digits)),
        close: Number(close.toFixed(digits)),
      });
      price = close;
    }

    // Set the latest close to currentPrice
    if (candles.length > 0) {
      candles[candles.length - 1].close = currentPrice;
    }

    return candles;
  }

  async placeOrder(o: NewOrder): Promise<Position | Order> {
    const s = o.symbol.toUpperCase().replace(/[\s\/-]/g, '');
    const cfg = SYMBOL_CONFIG[s] || SYMBOL_CONFIG['EURUSD'];
    const cur = this.prices[s] || cfg.basePrice;
    const nowSec = Math.floor(Date.now() / 1000);

    if (o.type === 'MARKET') {
      const isBuy = o.side === 'BUY';
      const openPrice = isBuy ? Number((cur + cfg.spread).toFixed(s.includes('JPY') || s.includes('XAU') ? 2 : 5)) : cur;
      
      const pos: Position = {
        id: `pos_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        symbol: s,
        side: o.side || 'BUY',
        lot: o.lot,
        openPrice,
        currentPrice: openPrice,
        sl: o.sl,
        tp: o.tp,
        trailingPips: o.trailingPips,
        pnl: 0,
        openTime: nowSec,
      };
      return pos;
    }

    const order: Order = {
      id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      symbol: s,
      type: o.type,
      price: o.price || cur,
      lot: o.lot,
      sl: o.sl,
      tp: o.tp,
      time: nowSec,
    };
    return order;
  }

  async modifyOrder(_id: string, _patch: { sl?: number | null; tp?: number | null; price?: number }): Promise<void> {
    // In mock broker, the client store manages state
    return Promise.resolve();
  }

  async closePosition(_id: string, _volume?: number): Promise<void> {
    return Promise.resolve();
  }

  async cancelOrder(_id: string): Promise<void> {
    return Promise.resolve();
  }
}
