import { create } from 'zustand';
import { AccountState, BrokerAdapter, ClosedTrade, NewOrder, Order, Position, Tick } from './types';
import { MockBroker } from './brokers/MockBroker';
import { RestWsBroker } from './brokers/RestWsBroker';
import { calculatePnL, getContractSize, getPipSize, validateOrder } from './engine';

const STORAGE_KEYS = {
  HISTORY: 'mt_trading_history_v1',
  SETTINGS: 'mt_trading_settings_v1',
  ACCOUNT: 'mt_trading_account_v1',
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const mockAdapter = new MockBroker();
const restWsAdapter = new RestWsBroker();

export interface TradingStoreState {
  positions: Position[];
  pending: Order[];
  history: ClosedTrade[];
  account: AccountState;
  activeSymbol: string;
  activeTimeframe: string;
  ticks: Record<string, Tick>;
  selectedAdapter: 'mock' | 'rest_ws';
  broker: BrokerAdapter;
  connected: boolean;

  // Actions
  init: () => void;
  switchAdapter: (type: 'mock' | 'rest_ws') => Promise<void>;
  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: string) => void;
  onTickReceived: (t: Tick) => void;
  sendOrder: (order: NewOrder) => Promise<{ success: boolean; error?: string }>;
  modifyPosition: (id: string, patch: { sl?: number | null; tp?: number | null; trailingPips?: number | null }) => void;
  closePosition: (id: string, reason?: 'SL' | 'TP' | 'MANUAL', closePriceOverride?: number) => void;
  partialClosePosition: (id: string, volume: number) => void;
  closeAllPositions: () => number;
  cancelPendingOrder: (id: string) => void;
  fillPendingOrder: (id: string, t: Tick) => void;
  depositDemo: (amount: number) => void;
}

export const useTradingStore = create<TradingStoreState>((set, get) => ({
  positions: [],
  pending: [],
  history: loadStorage<ClosedTrade[]>(STORAGE_KEYS.HISTORY, []),
  account: loadStorage<AccountState>(STORAGE_KEYS.ACCOUNT, {
    balance: 10000,
    equity: 10000,
    margin: 0,
    freeMargin: 10000,
  }),
  activeSymbol: 'EURUSD',
  activeTimeframe: 'M15',
  ticks: {},
  selectedAdapter: 'mock',
  broker: mockAdapter,
  connected: false,

  init: async () => {
    const { broker, activeSymbol, onTickReceived } = get();
    await broker.connect();
    set({ connected: true });
    broker.subscribe(activeSymbol, onTickReceived);
  },

  switchAdapter: async (type: 'mock' | 'rest_ws') => {
    const prev = get().broker;
    if (prev.disconnect) prev.disconnect();

    const newBroker = type === 'mock' ? mockAdapter : restWsAdapter;
    await newBroker.connect();

    set({
      selectedAdapter: type,
      broker: newBroker,
      connected: true,
    });

    newBroker.subscribe(get().activeSymbol, get().onTickReceived);
  },

  setSymbol: (symbol: string) => {
    const s = symbol.toUpperCase().replace(/[\s\/-]/g, '');
    const { broker, onTickReceived, activeSymbol } = get();
    if (s === activeSymbol) return;

    set({ activeSymbol: s });
    broker.subscribe(s, onTickReceived);
  },

  setTimeframe: (tf: string) => {
    set({ activeTimeframe: tf });
  },

  onTickReceived: (t: Tick) => {
    const state = get();
    const sym = t.symbol.toUpperCase().replace(/[\s\/-]/g, '');
    const newTicks = { ...state.ticks, [sym]: t };

    let updatedPositions = [...state.positions];
    let updatedPending = [...state.pending];
    const closedList: ClosedTrade[] = [];
    let balanceDelta = 0;

    // 1) Trigger pending orders
    const pendingToKeep: Order[] = [];
    for (const ord of updatedPending) {
      if (ord.symbol === sym) {
        const hit =
          (ord.type === 'BUY_LIMIT' && t.ask <= ord.price) ||
          (ord.type === 'BUY_STOP' && t.ask >= ord.price) ||
          (ord.type === 'SELL_LIMIT' && t.bid >= ord.price) ||
          (ord.type === 'SELL_STOP' && t.bid <= ord.price);

        if (hit) {
          const isBuy = ord.type === 'BUY_LIMIT' || ord.type === 'BUY_STOP';
          const fillPrice = isBuy ? t.ask : t.bid;
          const newPos: Position = {
            id: `pos_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            symbol: ord.symbol,
            side: isBuy ? 'BUY' : 'SELL',
            lot: ord.lot,
            openPrice: fillPrice,
            currentPrice: fillPrice,
            sl: ord.sl,
            tp: ord.tp,
            pnl: 0,
            openTime: Math.floor(Date.now() / 1000),
          };
          updatedPositions.unshift(newPos);
          continue;
        }
      }
      pendingToKeep.push(ord);
    }
    updatedPending = pendingToKeep;

    // 2) SL / TP / Trailing checks for open positions
    const remainingPositions: Position[] = [];
    for (const pos of updatedPositions) {
      if (pos.symbol !== sym) {
        remainingPositions.push(pos);
        continue;
      }

      const isBuy = pos.side === 'BUY';
      const curPrice = isBuy ? t.bid : t.ask;
      let posSl = pos.sl;
      let posTp = pos.tp;

      // Trailing stop evaluation
      if (pos.trailingPips && pos.trailingPips > 0) {
        const pip = getPipSize(sym);
        const trailDist = pos.trailingPips * pip;
        if (isBuy) {
          const potentialSl = Number((curPrice - trailDist).toFixed(5));
          if (curPrice > pos.openPrice && (!posSl || potentialSl > posSl)) {
            posSl = potentialSl;
          }
        } else {
          const potentialSl = Number((curPrice + trailDist).toFixed(5));
          if (curPrice < pos.openPrice && (!posSl || potentialSl < posSl)) {
            posSl = potentialSl;
          }
        }
      }

      // Check hit SL
      if (posSl && ((isBuy && curPrice <= posSl) || (!isBuy && curPrice >= posSl))) {
        const finalPnl = calculatePnL(pos.side, pos.openPrice, posSl, pos.lot, pos.symbol);
        balanceDelta += finalPnl;
        closedList.push({
          id: `hist_${Date.now()}_${pos.id}`,
          symbol: pos.symbol,
          side: pos.side,
          lot: pos.lot,
          openPrice: pos.openPrice,
          closePrice: posSl,
          sl: posSl,
          tp: pos.tp,
          pnl: finalPnl,
          openTime: pos.openTime,
          closeTime: Math.floor(Date.now() / 1000),
          reason: 'SL',
        });
        continue;
      }

      // Check hit TP
      if (posTp && ((isBuy && curPrice >= posTp) || (!isBuy && curPrice <= posTp))) {
        const finalPnl = calculatePnL(pos.side, pos.openPrice, posTp, pos.lot, pos.symbol);
        balanceDelta += finalPnl;
        closedList.push({
          id: `hist_${Date.now()}_${pos.id}`,
          symbol: pos.symbol,
          side: pos.side,
          lot: pos.lot,
          openPrice: pos.openPrice,
          closePrice: posTp,
          sl: pos.sl,
          tp: posTp,
          pnl: finalPnl,
          openTime: pos.openTime,
          closeTime: Math.floor(Date.now() / 1000),
          reason: 'TP',
        });
        continue;
      }

      // Normal live price update
      const livePnl = calculatePnL(pos.side, pos.openPrice, curPrice, pos.lot, pos.symbol);
      remainingPositions.push({
        ...pos,
        currentPrice: curPrice,
        sl: posSl,
        pnl: livePnl,
      });
    }

    // Recalculate account totals
    const totalPnl = remainingPositions.reduce((sum, p) => sum + p.pnl, 0);
    const newBalance = Number((state.account.balance + balanceDelta).toFixed(2));
    const newEquity = Number((newBalance + totalPnl).toFixed(2));

    // Calculate Margin: (Lot * Contract * openPrice / leverage 100)
    const totalMargin = remainingPositions.reduce((sum, p) => {
      const contract = getContractSize(p.symbol);
      return sum + (p.lot * contract * p.openPrice) / 100;
    }, 0);

    const newMargin = Number(totalMargin.toFixed(2));
    const newFreeMargin = Math.max(0, Number((newEquity - newMargin).toFixed(2)));

    const updatedHistory = closedList.length > 0 ? [...closedList, ...state.history] : state.history;
    if (closedList.length > 0) {
      saveStorage(STORAGE_KEYS.HISTORY, updatedHistory);
      saveStorage(STORAGE_KEYS.ACCOUNT, {
        balance: newBalance,
        equity: newEquity,
        margin: newMargin,
        freeMargin: newFreeMargin,
      });
    }

    set({
      ticks: newTicks,
      positions: remainingPositions,
      pending: updatedPending,
      history: updatedHistory,
      account: {
        balance: newBalance,
        equity: newEquity,
        margin: newMargin,
        freeMargin: newFreeMargin,
      },
    });
  },

  sendOrder: async (order: NewOrder) => {
    const { broker, ticks, positions, pending } = get();
    const sym = order.symbol.toUpperCase().replace(/[\s\/-]/g, '');
    const tick = ticks[sym];

    const validation = validateOrder(order, tick);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const res = await broker.placeOrder(order);
      if ('openPrice' in res) {
        set({ positions: [res, ...positions] });
      } else {
        set({ pending: [res, ...pending] });
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Order failed' };
    }
  },

  modifyPosition: (id: string, patch: { sl?: number | null; tp?: number | null; trailingPips?: number | null }) => {
    const { positions, broker } = get();
    const updated = positions.map(p => {
      if (p.id === id) {
        return {
          ...p,
          sl: patch.sl !== undefined ? patch.sl : p.sl,
          tp: patch.tp !== undefined ? patch.tp : p.tp,
          trailingPips: patch.trailingPips !== undefined ? patch.trailingPips : p.trailingPips,
        };
      }
      return p;
    });

    broker.modifyOrder(id, patch);
    set({ positions: updated });
  },

  closePosition: (id: string, reason: 'SL' | 'TP' | 'MANUAL' = 'MANUAL', closePriceOverride?: number) => {
    const { positions, history, account, broker } = get();
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    const closePrice = closePriceOverride ?? pos.currentPrice;
    const finalPnl = calculatePnL(pos.side, pos.openPrice, closePrice, pos.lot, pos.symbol);

    const closedItem: ClosedTrade = {
      id: `hist_${Date.now()}_${pos.id}`,
      symbol: pos.symbol,
      side: pos.side,
      lot: pos.lot,
      openPrice: pos.openPrice,
      closePrice,
      sl: pos.sl,
      tp: pos.tp,
      pnl: finalPnl,
      openTime: pos.openTime,
      closeTime: Math.floor(Date.now() / 1000),
      reason,
    };

    const remaining = positions.filter(p => p.id !== id);
    const newBalance = Number((account.balance + finalPnl).toFixed(2));
    const totalPnl = remaining.reduce((sum, p) => sum + p.pnl, 0);
    const newEquity = Number((newBalance + totalPnl).toFixed(2));

    const updatedHistory = [closedItem, ...history];
    saveStorage(STORAGE_KEYS.HISTORY, updatedHistory);

    broker.closePosition(id);
    set({
      positions: remaining,
      history: updatedHistory,
      account: {
        ...account,
        balance: newBalance,
        equity: newEquity,
        freeMargin: Math.max(0, newEquity - account.margin),
      },
    });
  },

  partialClosePosition: (id: string, volume: number) => {
    const { positions, history, account, broker } = get();
    const pos = positions.find(p => p.id === id);
    if (!pos || volume <= 0) return;

    if (volume >= pos.lot) {
      get().closePosition(id);
      return;
    }

    const partialPnl = calculatePnL(pos.side, pos.openPrice, pos.currentPrice, volume, pos.symbol);
    const closedItem: ClosedTrade = {
      id: `hist_part_${Date.now()}_${pos.id}`,
      symbol: pos.symbol,
      side: pos.side,
      lot: volume,
      openPrice: pos.openPrice,
      closePrice: pos.currentPrice,
      pnl: partialPnl,
      openTime: pos.openTime,
      closeTime: Math.floor(Date.now() / 1000),
      reason: 'MANUAL',
    };

    const remainingVolume = Number((pos.lot - volume).toFixed(2));
    const updated = positions.map(p => {
      if (p.id === id) {
        return {
          ...p,
          lot: remainingVolume,
          pnl: calculatePnL(p.side, p.openPrice, p.currentPrice, remainingVolume, p.symbol),
        };
      }
      return p;
    });

    const newBalance = Number((account.balance + partialPnl).toFixed(2));
    const updatedHistory = [closedItem, ...history];
    saveStorage(STORAGE_KEYS.HISTORY, updatedHistory);

    broker.closePosition(id, volume);
    set({
      positions: updated,
      history: updatedHistory,
      account: {
        ...account,
        balance: newBalance,
      },
    });
  },

  closeAllPositions: () => {
    const { positions } = get();
    const count = positions.length;
    positions.forEach(p => get().closePosition(p.id));
    return count;
  },

  cancelPendingOrder: (id: string) => {
    const { pending, broker } = get();
    broker.cancelOrder(id);
    set({ pending: pending.filter(o => o.id !== id) });
  },

  fillPendingOrder: (id: string, t: Tick) => {
    const { pending } = get();
    const ord = pending.find(o => o.id === id);
    if (!ord) return;

    const isBuy = ord.type === 'BUY_LIMIT' || ord.type === 'BUY_STOP';
    const fillPrice = isBuy ? t.ask : t.bid;

    const newPos: Position = {
      id: `pos_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      symbol: ord.symbol,
      side: isBuy ? 'BUY' : 'SELL',
      lot: ord.lot,
      openPrice: fillPrice,
      currentPrice: fillPrice,
      sl: ord.sl,
      tp: ord.tp,
      pnl: 0,
      openTime: Math.floor(Date.now() / 1000),
    };

    set({
      positions: [newPos, ...get().positions],
      pending: pending.filter(o => o.id !== id),
    });
  },

  depositDemo: (amount: number) => {
    const { account } = get();
    const newBal = account.balance + amount;
    const newEq = account.equity + amount;
    set({
      account: {
        ...account,
        balance: newBal,
        equity: newEq,
        freeMargin: newEq - account.margin,
      },
    });
  },
}));
