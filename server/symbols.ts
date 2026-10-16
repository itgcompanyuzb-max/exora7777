// server/symbols.ts
// Instrument catalogue and trading-condition helpers.

export type AssetClass = 'forex' | 'metal' | 'crypto' | 'energy' | 'index';

export interface SymbolSpec {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  contractSize: number;
  digits: number;
  pipSize: number;
  /** Standard-account spread in price units. */
  baseSpread: number;
  /** True when USD is the BASE currency (USDJPY, USDCHF, USDCAD): margin = lots*cs/leverage, P/L is in quote ccy. */
  usdBase: boolean;
  minLot: number;
  maxLot: number;
  lotStep: number;
  /** Minimum distance (price units) between market price and SL/TP/pending price. */
  stopLevel: number;
  maxLeverage: number;
  /** USD per lot per night (long / short). */
  swapLong: number;
  swapShort: number;
  /** Reference price used to anchor the simulator and seed history. */
  anchor: number;
  /** Simulator volatility, std-dev of log-return per 500ms step. */
  vol: number;
  binance?: string;
  twelveData?: string;
}

const fx = (s: Partial<SymbolSpec> & Pick<SymbolSpec, 'symbol' | 'name' | 'anchor' | 'digits' | 'baseSpread'>): SymbolSpec => ({
  assetClass: 'forex',
  contractSize: 100000,
  pipSize: Math.pow(10, -(s.digits - 1)),
  usdBase: false,
  minLot: 0.01,
  maxLot: 200,
  lotStep: 0.01,
  stopLevel: s.baseSpread * 2,
  maxLeverage: 2000,
  swapLong: -6,
  swapShort: 1,
  vol: 0.00004,
  ...s,
});

export const SYMBOL_SPECS: SymbolSpec[] = [
  fx({ symbol: 'EURUSD', name: 'Euro / US Dollar', anchor: 1.0845, digits: 5, baseSpread: 0.00010, twelveData: 'EUR/USD' }),
  fx({ symbol: 'GBPUSD', name: 'British Pound / US Dollar', anchor: 1.2721, digits: 5, baseSpread: 0.00013, twelveData: 'GBP/USD' }),
  fx({ symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', anchor: 0.6612, digits: 5, baseSpread: 0.00012, twelveData: 'AUD/USD' }),
  fx({ symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', anchor: 0.6045, digits: 5, baseSpread: 0.00014, twelveData: 'NZD/USD' }),
  fx({ symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', anchor: 154.6, digits: 3, baseSpread: 0.012, usdBase: true, twelveData: 'USD/JPY', swapLong: 4, swapShort: -9 }),
  fx({ symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', anchor: 0.8821, digits: 5, baseSpread: 0.00014, usdBase: true, twelveData: 'USD/CHF', swapLong: 2, swapShort: -7 }),
  fx({ symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', anchor: 1.3912, digits: 5, baseSpread: 0.00016, usdBase: true, twelveData: 'USD/CAD', swapLong: -2, swapShort: -3 }),
  {
    symbol: 'XAUUSD', name: 'Gold / US Dollar', assetClass: 'metal', contractSize: 100, digits: 2, pipSize: 0.1,
    baseSpread: 0.25, usdBase: false, minLot: 0.01, maxLot: 50, lotStep: 0.01, stopLevel: 0.5, maxLeverage: 2000,
    swapLong: -30, swapShort: 14, anchor: 2685.5, vol: 0.00006, binance: 'PAXGUSDT', twelveData: 'XAU/USD',
  },
  {
    symbol: 'XAGUSD', name: 'Silver / US Dollar', assetClass: 'metal', contractSize: 5000, digits: 3, pipSize: 0.01,
    baseSpread: 0.025, usdBase: false, minLot: 0.01, maxLot: 50, lotStep: 0.01, stopLevel: 0.05, maxLeverage: 2000,
    swapLong: -12, swapShort: 4, anchor: 31.4, vol: 0.00009, twelveData: 'XAG/USD',
  },
  {
    symbol: 'USOIL', name: 'Crude Oil WTI', assetClass: 'energy', contractSize: 1000, digits: 2, pipSize: 0.01,
    baseSpread: 0.03, usdBase: false, minLot: 0.01, maxLot: 100, lotStep: 0.01, stopLevel: 0.06, maxLeverage: 200,
    swapLong: -9, swapShort: 3, anchor: 71.45, vol: 0.00009,
  },
  {
    symbol: 'US30', name: 'Wall Street 30 Index', assetClass: 'index', contractSize: 1, digits: 1, pipSize: 1,
    baseSpread: 2.5, usdBase: false, minLot: 0.01, maxLot: 100, lotStep: 0.01, stopLevel: 5, maxLeverage: 200,
    swapLong: -6, swapShort: 2, anchor: 43810, vol: 0.00005,
  },
  {
    symbol: 'SOLUSD', name: 'Solana / US Dollar', assetClass: 'crypto', contractSize: 1, digits: 2, pipSize: 0.01,
    baseSpread: 0.15, usdBase: false, minLot: 0.1, maxLot: 2000, lotStep: 0.1, stopLevel: 0.3, maxLeverage: 200,
    swapLong: -1, swapShort: -1, anchor: 154.2, vol: 0.00018, binance: 'SOLUSDT',
  },
  {
    symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', assetClass: 'crypto', contractSize: 1, digits: 2, pipSize: 1,
    baseSpread: 12, usdBase: false, minLot: 0.01, maxLot: 20, lotStep: 0.01, stopLevel: 25, maxLeverage: 400,
    swapLong: -25, swapShort: -25, anchor: 84050, vol: 0.00012, binance: 'BTCUSDT',
  },
  {
    symbol: 'ETHUSD', name: 'Ethereum / US Dollar', assetClass: 'crypto', contractSize: 1, digits: 2, pipSize: 0.1,
    baseSpread: 1.2, usdBase: false, minLot: 0.01, maxLot: 200, lotStep: 0.01, stopLevel: 2.5, maxLeverage: 400,
    swapLong: -3, swapShort: -3, anchor: 2310, vol: 0.00014, binance: 'ETHUSDT',
  },
];

export const SPEC_BY_SYMBOL = new Map(SYMBOL_SPECS.map((s) => [s.symbol, s]));

export function normalizeSymbol(raw: string | undefined): string {
  if (!raw) return '';
  let s = raw.toUpperCase().replace(/[\s/\-_]/g, '');
  if (s.includes(':')) s = s.split(':').pop()!;
  if (s === 'GOLD' || s === 'XAU') return 'XAUUSD';
  if (s === 'SILVER' || s === 'XAG') return 'XAGUSD';
  if (s === 'BTC' || s === 'BITCOIN' || s === 'BTCUSDT') return 'BTCUSD';
  if (s === 'ETH' || s === 'ETHUSDT') return 'ETHUSD';
  if (s === 'SOL' || s === 'SOLUSDT') return 'SOLUSD';
  if (s === 'XAUUSD247') return 'XAUUSD';
  if (s === 'OIL' || s === 'WTI') return 'USOIL';
  return s;
}

/** Account tier → spread multiplier and per-lot-per-side commission (USD). */
export const TIER_CONDITIONS = {
  Standard: { spreadMult: 1.0, commissionPerLot: 0 },
  Pro: { spreadMult: 0.6, commissionPerLot: 0 },
  Raw: { spreadMult: 0.1, commissionPerLot: 3.5 },
} as const;
export type Tier = keyof typeof TIER_CONDITIONS;

/** Display name used by UIs, e.g. EURUSD -> EUR/USD (non-FX tickers are returned as-is). */
export function displayName(spec: SymbolSpec): string {
  return /^[A-Z]{6}$/.test(spec.symbol) ? `${spec.symbol.slice(0, 3)}/${spec.symbol.slice(3)}` : spec.symbol;
}

/** Forex, metals, energy & indices trade Sun 22:00 UTC → Fri 22:00 UTC. Crypto trades 24/7. */
export function isMarketOpen(spec: SymbolSpec, at = new Date()): boolean {
  if (spec.assetClass === 'crypto') return true;
  const day = at.getUTCDay();
  const hour = at.getUTCHours();
  if (day === 6) return false;
  if (day === 5 && hour >= 22) return false;
  if (day === 0 && hour < 22) return false;
  return true;
}
