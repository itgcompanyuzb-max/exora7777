import { Tick, Position, Order, NewOrder } from './types';

export function getPipSize(symbol: string): number {
  const sym = symbol.toUpperCase().replace(/[\s\/-]/g, '');
  if (sym.includes('JPY')) return 0.01;
  if (sym.includes('XAU') || sym.includes('GOLD')) return 0.01;
  return 0.0001;
}

export function getContractSize(symbol: string): number {
  const sym = symbol.toUpperCase().replace(/[\s\/-]/g, '');
  if (sym.includes('XAU') || sym.includes('GOLD')) return 100;
  return 100000;
}

export function calculatePnL(
  side: 'BUY' | 'SELL',
  openPrice: number,
  currentPrice: number,
  lot: number,
  symbol: string
): number {
  const dir = side === 'BUY' ? 1 : -1;
  const contract = getContractSize(symbol);
  return Number(((dir * (currentPrice - openPrice)) * lot * contract).toFixed(2));
}

export function pipsToPrice(
  side: 'BUY' | 'SELL',
  entryPrice: number,
  pips: number,
  kind: 'sl' | 'tp',
  symbol: string
): number {
  const pip = getPipSize(symbol);
  const dist = pips * pip;
  if (side === 'BUY') {
    return kind === 'sl' ? Number((entryPrice - dist).toFixed(5)) : Number((entryPrice + dist).toFixed(5));
  } else {
    return kind === 'sl' ? Number((entryPrice + dist).toFixed(5)) : Number((entryPrice - dist).toFixed(5));
  }
}

export function priceToPips(
  openPrice: number,
  targetPrice: number,
  symbol: string
): number {
  const pip = getPipSize(symbol);
  return Number((Math.abs(targetPrice - openPrice) / pip).toFixed(1));
}

export function validateOrder(
  order: NewOrder,
  tick?: Tick
): { valid: boolean; error?: string } {
  if (!tick) return { valid: false, error: 'Bozor narxi (Tick) mavjud emas' };
  if (order.lot < 0.01) return { valid: false, error: 'Minimal hajm: 0.01 lot' };

  const pip = getPipSize(order.symbol);
  const minStopDistance = 5 * pip;

  if (order.type === 'MARKET') {
    const isBuy = order.side === 'BUY';
    const entry = isBuy ? tick.ask : tick.bid;

    if (order.sl) {
      if (isBuy && order.sl >= entry - minStopDistance) {
        return { valid: false, error: 'BUY Stop Loss ochilish narxidan kamida 5 pip past bo\'lishi shart' };
      }
      if (!isBuy && order.sl <= entry + minStopDistance) {
        return { valid: false, error: 'SELL Stop Loss ochilish narxidan kamida 5 pip yuqori bo\'lishi shart' };
      }
    }

    if (order.tp) {
      if (isBuy && order.tp <= entry + minStopDistance) {
        return { valid: false, error: 'BUY Take Profit ochilish narxidan kamida 5 pip yuqori bo\'lishi shart' };
      }
      if (!isBuy && order.tp >= entry - minStopDistance) {
        return { valid: false, error: 'SELL Take Profit ochilish narxidan kamida 5 pip past bo\'lishi shart' };
      }
    }
    return { valid: true };
  }

  // Pending orders validation
  const p = order.price ?? 0;
  if (p <= 0) return { valid: false, error: 'Kutilayotgan narx ko\'rsatilmagan' };

  if (order.type === 'BUY_LIMIT' && p >= tick.ask) {
    return { valid: false, error: 'BUY LIMIT narxi joriy ASK narxidan past bo\'lishi shart' };
  }
  if (order.type === 'BUY_STOP' && p <= tick.ask) {
    return { valid: false, error: 'BUY STOP narxi joriy ASK narxidan yuqori bo\'lishi shart' };
  }
  if (order.type === 'SELL_LIMIT' && p <= tick.bid) {
    return { valid: false, error: 'SELL LIMIT narxi joriy BID narxidan yuqori bo\'lishi shart' };
  }
  if (order.type === 'SELL_STOP' && p >= tick.bid) {
    return { valid: false, error: 'SELL STOP narxi joriy BID narxidan past bo\'lishi shart' };
  }

  return { valid: true };
}
