import React, { useState } from 'react';
import { useTradingStore } from '../store';
import { OrderExecutionType } from '../types';
import { getPipSize, pipsToPrice } from '../engine';
import { toast } from 'sonner';

export const TradePanel: React.FC = () => {
  const { activeSymbol, ticks, sendOrder } = useTradingStore();
  const currentTick = ticks[activeSymbol];

  const [orderType, setOrderType] = useState<OrderExecutionType>('MARKET');
  const [lot, setLot] = useState<number>(0.01);
  const [inputMode, setInputMode] = useState<'price' | 'pips'>('pips');
  
  // Pending order target price
  const [pendingPrice, setPendingPrice] = useState<string>('');

  // SL & TP values
  const [slValue, setSlValue] = useState<string>('20');
  const [tpValue, setTpValue] = useState<string>('40');

  // Trailing stop
  const [useTrailing, setUseTrailing] = useState<boolean>(false);
  const [trailingPips, setTrailingPips] = useState<string>('15');

  const digits = activeSymbol.includes('JPY') || activeSymbol.includes('XAU') ? 2 : 5;

  const handleLotChange = (delta: number) => {
    setLot(prev => Math.max(0.01, Number((prev + delta).toFixed(2))));
  };

  const handleExecute = async (side: 'BUY' | 'SELL') => {
    if (!currentTick) {
      toast.error("Bozor ma'lumotlari kutilmoqda");
      return;
    }

    const pip = getPipSize(activeSymbol);
    const entryPrice = orderType === 'MARKET'
      ? (side === 'BUY' ? currentTick.ask : currentTick.bid)
      : parseFloat(pendingPrice) || currentTick.bid;

    let computedSl: number | undefined;
    let computedTp: number | undefined;

    if (inputMode === 'pips') {
      const pipsSl = parseFloat(slValue);
      if (!isNaN(pipsSl) && pipsSl > 0) {
        computedSl = pipsToPrice(side, entryPrice, pipsSl, 'sl', activeSymbol);
      }
      const pipsTp = parseFloat(tpValue);
      if (!isNaN(pipsTp) && pipsTp > 0) {
        computedTp = pipsToPrice(side, entryPrice, pipsTp, 'tp', activeSymbol);
      }
    } else {
      const pSl = parseFloat(slValue);
      if (!isNaN(pSl) && pSl > 0) computedSl = pSl;
      const pTp = parseFloat(tpValue);
      if (!isNaN(pTp) && pTp > 0) computedTp = pTp;
    }

    const trailing = useTrailing && parseFloat(trailingPips) > 0 ? parseFloat(trailingPips) : undefined;

    const res = await sendOrder({
      symbol: activeSymbol,
      side,
      type: orderType,
      lot,
      price: orderType !== 'MARKET' ? parseFloat(pendingPrice) : undefined,
      sl: computedSl,
      tp: computedTp,
      trailingPips: trailing,
    });

    if (res.success) {
      toast.success(
        orderType === 'MARKET'
          ? `${side} ${lot} lot ${activeSymbol} muvaffaqiyatli ochildi!`
          : `${orderType} ${lot} lot ${activeSymbol} qo'yildi!`
      );
    } else {
      toast.error(res.error || 'Buyurtma berishda xatolik');
    }
  };

  return (
    <div className="w-80 bg-[#1e222d] border-l border-[#2a2e39] flex flex-col p-3 space-y-3 select-none text-xs text-gray-300 overflow-y-auto">
      {/* Title */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2a2e39]">
        <div className="font-extrabold text-white text-sm">Savdo Paneli</div>
        <span className="font-mono text-primary font-bold">{activeSymbol}</span>
      </div>

      {/* Instant BUY / SELL buttons */}
      <div className="grid grid-cols-2 gap-2">
        {/* SELL Button */}
        <button
          onClick={() => handleExecute('SELL')}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#F23645]/15 hover:bg-[#F23645]/25 border border-[#F23645]/50 text-white font-mono cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <span className="text-[11px] font-bold text-red-400">SELL (Sotish)</span>
          <span className="text-base font-extrabold mt-0.5">
            {currentTick ? currentTick.bid.toFixed(digits) : '---'}
          </span>
        </button>

        {/* BUY Button */}
        <button
          onClick={() => handleExecute('BUY')}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#089981]/15 hover:bg-[#089981]/25 border border-[#089981]/50 text-white font-mono cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <span className="text-[11px] font-bold text-emerald-400">BUY (Sotib olish)</span>
          <span className="text-base font-extrabold mt-0.5">
            {currentTick ? currentTick.ask.toFixed(digits) : '---'}
          </span>
        </button>
      </div>

      {/* Order Type Selector */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-gray-400">Order Turi</label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as OrderExecutionType)}
          className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-primary"
        >
          <option value="MARKET">Market Execution (Bozor narxida)</option>
          <option value="BUY_LIMIT">BUY LIMIT</option>
          <option value="SELL_LIMIT">SELL LIMIT</option>
          <option value="BUY_STOP">BUY STOP</option>
          <option value="SELL_STOP">SELL STOP</option>
        </select>
      </div>

      {/* Pending target price if not Market */}
      {orderType !== 'MARKET' && (
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-amber-400">
            Kutilayotgan Narx ({orderType.replace('_', ' ')})
          </label>
          <input
            type="number"
            step="0.0001"
            placeholder={currentTick ? String(currentTick.bid) : 'Narx'}
            value={pendingPrice}
            onChange={(e) => setPendingPrice(e.target.value)}
            className="w-full bg-[#131722] border border-amber-500/40 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
          />
        </div>
      )}

      {/* Lot Size with - and + buttons */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase">
          <span>Hajm (Lot Size)</span>
          <span className="text-white font-mono">1 lot = 100,000</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleLotChange(-0.1)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
          >
            -0.1
          </button>
          <button
            onClick={() => handleLotChange(-0.01)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
          >
            -
          </button>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={lot}
            onChange={(e) => setLot(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
            className="flex-1 bg-[#131722] border border-[#2a2e39] rounded-lg p-2 text-center text-white font-mono font-bold text-xs focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => handleLotChange(0.01)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
          >
            +
          </button>
          <button
            onClick={() => handleLotChange(0.1)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
          >
            +0.1
          </button>
        </div>
      </div>

      {/* Mode toggle (Pips vs Price) */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] uppercase font-bold text-gray-400">SL & TP O'lchovi</span>
        <div className="flex rounded-md bg-[#131722] p-0.5 border border-[#2a2e39]">
          <button
            onClick={() => setInputMode('pips')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
              inputMode === 'pips' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Pips
          </button>
          <button
            onClick={() => setInputMode('price')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
              inputMode === 'price' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Narx (Price)
          </button>
        </div>
      </div>

      {/* Stop Loss Input */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-red-400 flex items-center justify-between">
          <span>Stop Loss (SL)</span>
          <span className="text-gray-500 font-normal">{inputMode === 'pips' ? 'masofa pipsda' : 'aniq narx'}</span>
        </label>
        <input
          type="number"
          placeholder={inputMode === 'pips' ? '20' : '0.00000'}
          value={slValue}
          onChange={(e) => setSlValue(e.target.value)}
          className="w-full bg-[#131722] border border-red-500/30 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-red-500"
        />
      </div>

      {/* Take Profit Input */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-between">
          <span>Take Profit (TP)</span>
          <span className="text-gray-500 font-normal">{inputMode === 'pips' ? 'masofa pipsda' : 'aniq narx'}</span>
        </label>
        <input
          type="number"
          placeholder={inputMode === 'pips' ? '40' : '0.00000'}
          value={tpValue}
          onChange={(e) => setTpValue(e.target.value)}
          className="w-full bg-[#131722] border border-emerald-500/30 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Trailing Stop Field */}
      <div className="p-2.5 rounded-xl bg-[#131722] border border-[#2a2e39] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-white">Trailing Stop</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useTrailing}
              onChange={(e) => setUseTrailing(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
          </label>
        </div>
        {useTrailing && (
          <div>
            <label className="text-[10px] text-gray-400">Masofa (Pips)</label>
            <input
              type="number"
              value={trailingPips}
              onChange={(e) => setTrailingPips(e.target.value)}
              className="w-full bg-[#1e222d] border border-emerald-500/40 rounded p-1.5 text-white font-mono text-xs focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Send Order Button for Pending Orders */}
      {orderType !== 'MARKET' && (
        <button
          onClick={() => handleExecute(orderType.includes('BUY') ? 'BUY' : 'SELL')}
          className="w-full py-3 rounded-xl bg-primary text-black font-extrabold text-xs shadow-lg hover:opacity-90 active:scale-98 cursor-pointer transition-all"
        >
          {orderType.replace('_', ' ')} JOYLASHTIRISH
        </button>
      )}
    </div>
  );
};
