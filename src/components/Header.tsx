import React from 'react';
import { useTradingStore } from '../store';

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];

interface HeaderProps {
  onBackToCabinet?: () => void;
  onSwitchToWebTrader?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onBackToCabinet, onSwitchToWebTrader }) => {
  const {
    activeSymbol,
    activeTimeframe,
    setSymbol,
    setTimeframe,
    selectedAdapter,
    switchAdapter,
    connected,
    account,
    depositDemo,
  } = useTradingStore();

  return (
    <header className="h-12 bg-[#181b23] border-b border-[#2a2e39] px-4 flex items-center justify-between text-xs text-gray-300 select-none">
      {/* Left: Branding & Symbol Picker */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary text-black font-black flex items-center justify-center text-xs shadow-md">
            MT
          </div>
          <span className="font-extrabold text-white text-sm tracking-wide hidden sm:inline">MetaTrader Web</span>
        </div>

        {/* Symbol Selectors */}
        <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-[#2a2e39]">
          {SYMBOLS.map((sym) => (
            <button
              key={sym}
              onClick={() => setSymbol(sym)}
              className={`px-2.5 py-1 rounded font-bold text-[11px] font-mono cursor-pointer transition-colors ${
                activeSymbol === sym ? 'bg-primary text-black shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Timeframe Buttons */}
        <div className="hidden md:flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-[#2a2e39]">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono cursor-pointer transition-colors ${
                activeTimeframe === tf ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Broker Adapter Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#131722] px-2.5 py-1 rounded-lg border border-[#2a2e39]">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] text-gray-400 font-bold uppercase">Broker:</span>
          <select
            value={selectedAdapter}
            onChange={(e) => switchAdapter(e.target.value as 'mock' | 'rest_ws')}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
          >
            <option value="mock" className="bg-[#1e222d] text-white">Mock Broker (Simulyator)</option>
            <option value="rest_ws" className="bg-[#1e222d] text-white">REST / WebSocket API</option>
          </select>
        </div>
      </div>

      {/* Right: Account Finances & Deposit */}
      <div className="flex items-center gap-4 font-mono text-[11px]">
        <div className="hidden lg:flex items-center gap-3">
          <div>
            <span className="text-gray-500 text-[10px]">BALANCE: </span>
            <strong className="text-white">${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            <span className="text-gray-500 text-[10px]">EQUITY: </span>
            <strong className={`${account.equity >= account.balance ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <div>
            <span className="text-gray-500 text-[10px]">FREE MARGIN: </span>
            <strong className="text-white">${account.freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div>
            <span className="text-gray-500 text-[10px]">MARGIN: </span>
            <strong className="text-gray-300">${account.margin.toFixed(2)}</strong>
          </div>
        </div>

        <button
          onClick={() => depositDemo(1000)}
          className="px-2.5 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-bold text-[10px] cursor-pointer transition-colors"
          title="Demo hisobga $1,000 qo'shish"
        >
          +$1k Demo
        </button>

        {onSwitchToWebTrader && (
          <button
            onClick={onSwitchToWebTrader}
            className="px-2.5 py-1 rounded bg-[#ffde00]/20 hover:bg-[#ffde00]/30 text-[#ffde00] border border-[#ffde00]/40 font-bold text-[10px] cursor-pointer transition-colors"
            title="Exness WebTrader terminaliga o'tish"
          >
            WebTrader
          </button>
        )}

        {onBackToCabinet && (
          <button
            onClick={onBackToCabinet}
            className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-white font-bold text-[10px] cursor-pointer transition-colors"
            title="Shaxsiy Kabinetga qaytish"
          >
            Kabinet
          </button>
        )}
      </div>
    </header>
  );
};
