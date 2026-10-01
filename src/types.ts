export interface Tick {
  symbol: string;
  bid: number;
  ask: number;
  time: number;
}

export interface Candle {
  time: number; // Unix timestamp in seconds (for lightweight-charts)
  open: number;
  high: number;
  low: number;
  close: number;
}

export type OrderSide = 'BUY' | 'SELL';

export type PendingOrderType = 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';

export type OrderExecutionType = 'MARKET' | PendingOrderType;

export interface Position {
  id: string;
  symbol: string;
  side: OrderSide;
  lot: number;
  openPrice: number;
  currentPrice: number;
  sl?: number | null;
  tp?: number | null;
  trailingPips?: number | null;
  highestPriceSinceOpen?: number;
  lowestPriceSinceOpen?: number;
  pnl: number;
  openTime: number; // in seconds
}

export interface Order {
  id: string;
  symbol: string;
  type: PendingOrderType;
  price: number;
  lot: number;
  sl?: number | null;
  tp?: number | null;
  time: number; // in seconds
}

export interface NewOrder {
  symbol: string;
  side?: OrderSide;
  type: OrderExecutionType;
  lot: number;
  price?: number; // for pending orders
  sl?: number | null;
  tp?: number | null;
  trailingPips?: number | null;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  side: OrderSide;
  lot: number;
  openPrice: number;
  closePrice: number;
  sl?: number | null;
  tp?: number | null;
  pnl: number;
  openTime: number;
  closeTime: number;
  reason: 'SL' | 'TP' | 'MANUAL';
}

export interface AccountState {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
}

export interface BrokerAdapter {
  name: string;
  connect(): Promise<void>;
  disconnect?(): void;
  subscribe(symbol: string, onTick: (t: Tick) => void): () => void;
  getCandles(symbol: string, tf: string, limit: number): Promise<Candle[]>;
  placeOrder(o: NewOrder): Promise<Position | Order>;
  modifyOrder(id: string, patch: { sl?: number | null; tp?: number | null; price?: number }): Promise<void>;
  closePosition(id: string, volume?: number): Promise<void>;
  cancelOrder(id: string): Promise<void>;
}
