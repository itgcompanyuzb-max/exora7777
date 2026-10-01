import React, { useEffect } from 'react';
import { Header } from './Header';
import { Chart } from './Chart';
import { TradePanel } from './TradePanel';
import { Tables } from './Tables';
import { Toasts } from './Toasts';
import { useTradingStore } from '../store';

interface MetaTraderTerminalProps {
  onBackToCabinet?: () => void;
  onSwitchToWebTrader?: () => void;
}

export const MetaTraderTerminal: React.FC<MetaTraderTerminalProps> = ({ onBackToCabinet, onSwitchToWebTrader }) => {
  const { init } = useTradingStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#131722] text-[#d1d4dc] font-sans overflow-hidden select-none">
      {/* 1. Top Header */}
      <Header onBackToCabinet={onBackToCabinet} onSwitchToWebTrader={onSwitchToWebTrader} />

      {/* 2. Main Middle Workspace: Chart (Left, Big) + Trade Panel (Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Lightweight-Charts Canvas with MT Price Lines & Drag */}
        <div className="flex-1 h-full relative overflow-hidden">
          <Chart />
        </div>

        {/* Right: Instant Buy/Sell, Lots, SL/TP Pips/Price, Trailing Stop */}
        <TradePanel />
      </div>

      {/* 3. Bottom Tables: Positions, Pending Orders, History */}
      <Tables />

      {/* Notification Toasts */}
      <Toasts />
    </div>
  );
};
