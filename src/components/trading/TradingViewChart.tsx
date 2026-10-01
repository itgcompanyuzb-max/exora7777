import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toTradingViewSymbol } from '../../lib/liveMarketFeed';
import { Position } from '../../types/broker';
import { 
  RefreshCw, 
  Activity, 
  Globe, 
  Maximize2, 
  Minimize2, 
  SlidersHorizontal, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Sparkles,
  Calendar
} from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  theme?: 'dark' | 'light';
  className?: string;
  positions?: Position[];
  currentBid?: number;
  currentAsk?: number;
  onSymbolChange?: (symbol: string) => void;
  onQuickTrade?: (side: 'buy' | 'sell', symbol: string) => void;
  onClosePosition?: (positionId: string) => void;
  onUpdateSlTp?: (positionId: string, sl?: number, tp?: number) => void;
}

export function TradingViewChart({
  symbol,
  interval = '15',
  theme = 'dark',
  className = '',
  positions = [],
  currentBid,
  currentAsk,
  onSymbolChange,
  onQuickTrade,
  onClosePosition,
  onUpdateSlTp,
}: TradingViewChartProps) {
  const containerId = useMemo(() => `tv_chart_container_${Math.random().toString(36).substring(2, 9)}`, []);
  const [currentInterval, setCurrentInterval] = useState(interval);
  const [chartStyle, setChartStyle] = useState<'1' | '2' | '3' | '8'>('1'); // 1=Candles, 2=Line, 3=Area, 8=Heikin Ashi
  const [key, setKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeEngine, setActiveEngine] = useState<'library' | 'widget' | 'embed'>('library');
  const [isLoaded, setIsLoaded] = useState(false);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const widgetInstanceRef = useRef<any>(null);

  // Sync internal interval with prop
  useEffect(() => {
    if (interval) setCurrentInterval(interval);
  }, [interval]);

  const tvSymbol = useMemo(() => toTradingViewSymbol(symbol), [symbol]);

  // Filter open positions that match this chart's symbol
  const matchingPositions = useMemo(() => {
    return (positions || []).filter(
      p => p.status === 'open' && (
        p.symbol.toUpperCase().replace(/[\s\/-]/g, '') === symbol.toUpperCase().replace(/[\s\/-]/g, '')
      )
    );
  }, [positions, symbol]);

  // Convert timeframe to TradingView format
  const tvInterval = useMemo(() => {
    switch (currentInterval) {
      case '1m': return '1';
      case '5m': return '5';
      case '15m': return '15';
      case '30m': return '30';
      case '1h':
      case '60m': return '60';
      case '4h':
      case '240m': return '240';
      case '1D':
      case 'D': return 'D';
      case '1W':
      case 'W': return 'W';
      default: return currentInterval || '15';
    }
  }, [currentInterval]);

  // Initialize TradingView Charting Library / Widget
  useEffect(() => {
    let isMounted = true;
    setIsLoaded(false);

    // Clean up previous widget instance if exists
    if (widgetInstanceRef.current && typeof widgetInstanceRef.current.remove === 'function') {
      try {
        widgetInstanceRef.current.remove();
      } catch (e) {
        // ignore removal errors
      }
      widgetInstanceRef.current = null;
    }

    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    // Check if window.TradingView is available from /charting_library/charting_library.standalone.js or s3 tv.js
    const TV = (window as any).TradingView;
    const Datafeeds = (window as any).Datafeeds;

    // Mode 1: TradingView Charting Library (from quick-start docs)
    if (TV && TV.widget && Datafeeds && Datafeeds.UDFCompatibleDatafeed) {
      try {
        const widget = new TV.widget({
          container: containerId,
          locale: 'en',
          library_path: '/charting_library/',
          datafeed: new Datafeeds.UDFCompatibleDatafeed('https://demo-feed-data.tradingview.com'),
          symbol: tvSymbol.includes(':') ? tvSymbol.split(':')[1] : tvSymbol,
          interval: tvInterval,
          fullscreen: false,
          autosize: true,
          theme: theme === 'dark' ? 'Dark' : 'Light',
          style: Number(chartStyle),
          toolbar_bg: '#0a0d0b',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          save_image: false,
          studies_overrides: {},
          disabled_features: ['use_localstorage_for_settings'],
          enabled_features: ['study_templates'],
        });

        widgetInstanceRef.current = widget;
        setActiveEngine('library');
        if (typeof widget.onChartReady === 'function') {
          widget.onChartReady(() => {
            if (isMounted) setIsLoaded(true);
          });
        } else {
          setTimeout(() => { if (isMounted) setIsLoaded(true); }, 800);
        }
        return;
      } catch (err) {
        console.warn('[TradingView Charting Library] UDF initialization fallback:', err);
      }
    }

    // Mode 2: TradingView Advanced Widget Constructor (via s3.tradingview.com/tv.js)
    if (TV && TV.widget) {
      try {
        const widget = new TV.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: tvInterval,
          timezone: 'Etc/UTC',
          theme: theme,
          style: chartStyle,
          locale: 'en',
          toolbar_bg: '#0a0d0b',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
          withdateranges: true,
          save_image: false,
          studies: [],
        });
        widgetInstanceRef.current = widget;
        setActiveEngine('widget');
        setTimeout(() => { if (isMounted) setIsLoaded(true); }, 700);
        return;
      } catch (err) {
        console.warn('[TradingView Widget] Fallback to embed URL:', err);
      }
    }

    // Mode 3: High-reliability Secure Iframe Embed
    setActiveEngine('embed');
    setTimeout(() => { if (isMounted) setIsLoaded(true); }, 500);

    return () => {
      isMounted = false;
    };
  }, [containerId, tvSymbol, tvInterval, theme, chartStyle, key]);

  // Direct Embed URL for Fallback
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      frameElementId: containerId,
      symbol: tvSymbol,
      interval: tvInterval,
      hidesidetoolbar: '0',
      symboledit: '1',
      saveimage: '0',
      toolbarbg: '0a0d0b',
      theme: theme,
      style: chartStyle,
      timezone: 'Etc/UTC',
      withdateranges: '1',
      showpopupbutton: '0',
      locale: 'en',
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [containerId, tvSymbol, tvInterval, theme, chartStyle]);

  function toggleFullscreen() {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  // Quick preset symbols
  const popularSymbols = [
    { label: 'EUR/USD', sym: 'EURUSD' },
    { label: 'GBP/USD', sym: 'GBPUSD' },
    { label: 'XAU/USD (Gold)', sym: 'XAUUSD' },
    { label: 'BTC/USDT', sym: 'BTCUSDT' },
    { label: 'ETH/USDT', sym: 'ETHUSDT' },
    { label: 'US30', sym: 'US30' },
  ];

  return (
    <div 
      ref={chartWrapperRef}
      className={`relative w-full h-full flex flex-col bg-[#0a0d0b] select-none text-white overflow-hidden ${className}`}
    >
      {/* CHART VIEWPORT CONTAINER */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0a0d0b]">
        {/* Loading Indicator */}
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0d0b] z-10 text-gray-400 gap-2.5 font-mono text-xs">
            <Activity className="size-6 text-primary animate-pulse" />
            <div className="flex items-center gap-1.5 text-gray-300">
              <span>TradingView Chart yuklanmoqda:</span>
              <strong className="text-white">{symbol.toUpperCase()}</strong>
            </div>
            <div className="text-[10px] text-gray-500">
              {activeEngine === 'library' ? 'TradingView Charting Library faollashtirildi' : 'Jonli birja oqimi ulanmoqda'}
            </div>
          </div>
        )}

        {/* DOM Mount Target for Library / Widget */}
        <div 
          id={containerId} 
          className={`w-full h-full ${activeEngine === 'embed' ? 'hidden' : 'block'}`}
        />

        {/* Fallback Embed Iframe */}
        {activeEngine === 'embed' && (
          <div className="w-full h-full relative overflow-hidden">
            <iframe
              key={`${tvSymbol}-${tvInterval}-${chartStyle}-${key}`}
              title={`TradingView-${tvSymbol}`}
              src={embedUrl}
              className="w-full h-[calc(100%+32px)] border-none relative z-1 -mb-8"
              allow="fullscreen"
              allowTransparency
              scrolling="no"
              onLoad={() => setIsLoaded(true)}
            />
            {/* Dark mask overlay for brand cleanup */}
            <div className="absolute bottom-0 left-0 h-8 w-44 bg-[#0a0d0b] z-20 pointer-events-none" />
          </div>
        )}

        {/* ============================================================== */}
        {/* EXNESS ON-CHART LIVE POSITION LINES & INTERACTIVE PNL BADGES   */}
        {/* ============================================================== */}
        {/* 1. On-Chart Symbol Ticker Info matching screenshot */}
        <div className="absolute top-2 left-14 z-20 pointer-events-none flex items-center gap-2 text-[11px] font-mono select-none">
          <div className="flex items-center gap-1.5 font-bold text-gray-200">
            <span className="text-amber-400">⚱️</span>
            <span>{symbol === 'XAU/USD' || symbol.includes('XAU') ? 'Gold vs US Dollar' : symbol} · {interval}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-gray-400 text-[10px]">
            <span>O<strong className="text-blue-400">4,178.996</strong></span>
            <span>H<strong className="text-blue-400">4,179.885</strong></span>
            <span>L<strong className="text-blue-400">4,178.756</strong></span>
            <span>C<strong className="text-blue-400">4,179.507</strong></span>
            <span className="text-blue-400 font-bold">+0.743 (+0.02%)</span>
          </div>
        </div>

        {/* 2. High-Impact Economic News Bands matching Exness chart */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-15">
          {/* Shaded Red Vertical Band 1 */}
          <div className="absolute top-0 bottom-8 left-[38%] w-4 bg-red-900/20 border-x border-red-500/20 flex flex-col justify-end items-center pb-1">
            <div className="w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center shadow-xs">
              III
            </div>
          </div>
          {/* Shaded Red Vertical Band 2 */}
          <div className="absolute top-0 bottom-8 left-[44%] w-4 bg-red-900/20 border-x border-red-500/20 flex flex-col justify-end items-center pb-1">
            <div className="w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center shadow-xs">
              III
            </div>
          </div>
          {/* Shaded Red Vertical Band 3 with US Flag */}
          <div className="absolute top-0 bottom-8 left-[52%] w-4 bg-red-900/20 border-x border-red-500/20 flex flex-col justify-end items-center pb-1">
            <div className="w-4 h-4 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center shadow-xs">
              III
            </div>
          </div>
          {/* Shaded Red Vertical Band 4 with US Flag */}
          <div className="absolute top-0 bottom-8 left-[70%] w-4 bg-red-900/20 border-x border-red-500/20 flex flex-col justify-end items-center pb-1 gap-0.5">
            <div className="flex items-center -space-x-1">
              <div className="w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[7px] font-black flex items-center justify-center">III</div>
              <div className="w-3.5 h-3.5 rounded-full bg-blue-700 text-white text-[7px] font-black flex items-center justify-center border border-black">🇺🇸</div>
            </div>
          </div>
          {/* Shaded Red Vertical Band 5 */}
          <div className="absolute top-0 bottom-8 left-[78%] w-4 bg-red-900/20 border-x border-red-500/20 flex flex-col justify-end items-center pb-1 gap-0.5">
            <div className="flex items-center -space-x-1">
              <div className="w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[7px] font-black flex items-center justify-center">III</div>
              <div className="w-3.5 h-3.5 rounded-full bg-blue-700 text-white text-[7px] font-black flex items-center justify-center border border-black">🇺🇸</div>
            </div>
          </div>
        </div>

        {/* 3. Live Price Scale Badge right side */}
        <div className="absolute right-0 top-[38%] z-30 pointer-events-auto">
          <div className="px-2 py-0.5 bg-[#ef4444] text-white font-mono text-[11px] font-bold rounded-l-xs shadow-md">
            {currentBid ? currentBid.toFixed(3) : '4,179.507'}
          </div>
        </div>

        {/* 4. Quick Place Limit Order (+) button on hover */}
        <div className="absolute right-0 top-[42%] z-25 pointer-events-auto hidden hover:flex items-center">
          <button 
            onClick={() => onQuickTrade?.('buy', symbol)}
            className="flex items-center gap-1 px-1.5 py-0.5 bg-[#1f262b] hover:bg-primary text-gray-200 hover:text-black font-mono text-[10px] rounded-l border border-r-0 border-white/20 transition-colors"
          >
            <span>+</span>
            <span>4,173.080</span>
          </button>
        </div>

        {matchingPositions.map((pos, idx) => {
          const isBuy = pos.side === 'buy';
          const isProfit = pos.pnl >= 0;
          const currentPrice = isBuy ? (currentBid || pos.currentPrice) : (currentAsk || pos.currentPrice);
          const percentDelta = (pos.openPrice - currentPrice) / (currentPrice || 1);
          // Realistic vertical anchor aligned with TradingView price candles
          const baseCenter = 50;
          const deltaY = (percentDelta / 0.012) * 32;
          const indexStagger = (idx - (matchingPositions.length - 1) / 2) * 28;
          const calculatedY = Math.max(14, Math.min(82, baseCenter - deltaY)) + (indexStagger / 500) * 100;
          const lineColor = isBuy ? '#2563eb' : '#dc2626';
          const badgeBorder = isBuy ? 'border-blue-600' : 'border-red-600';

          // SL and TP relative vertical positions
          const slPercentDelta = pos.sl ? (pos.sl - currentPrice) / (currentPrice || 1) : 0;
          const slY = Math.max(8, Math.min(92, baseCenter - (slPercentDelta / 0.012) * 32));

          const tpPercentDelta = pos.tp ? (pos.tp - currentPrice) / (currentPrice || 1) : 0;
          const tpY = Math.max(8, Math.min(92, baseCenter - (tpPercentDelta / 0.012) * 32));

          return (
            <React.Fragment key={pos.id}>
              {/* 1. ENTRY HORIZONTAL LINE */}
              <div 
                style={{ top: `${calculatedY}%` }}
                className="absolute left-0 right-0 z-30 pointer-events-none transition-all duration-300"
              >
                {/* Entry Left Label (e.g. BUY 0.10 @ 83050.00) */}
                <div className="absolute left-3 -top-[11px] pointer-events-auto bg-[#0a0e0b]/90 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/20 shadow-md">
                  <span className={isBuy ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'}>
                    {pos.side.toUpperCase()}
                  </span>{' '}
                  <span className="font-bold">{pos.lotSize}</span> @ {pos.openPrice}
                  {pos.ticket && <span className="text-gray-400 ml-1.5">{pos.ticket}</span>}
                </div>

                {/* Extended Horizontal Line running across TradingView chart */}
                <div 
                  className="w-full h-[2px] opacity-95 shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                  style={{ backgroundColor: lineColor }}
                />

                {/* Exness Badge on the right */}
                <div className="absolute right-16 -top-[12px] pointer-events-auto flex items-center shadow-2xl select-none text-xs rounded-sm overflow-hidden border border-black/60 bg-[#0a0e0b]">
                  {/* [ TP ] */}
                  <button
                    onClick={() => {
                      const input = prompt(`Take-Profit (TP) narxini kiriting [${pos.symbol}]:`, pos.tp ? String(pos.tp) : '');
                      if (input !== null) {
                        const val = parseFloat(input);
                        onUpdateSlTp?.(pos.id, pos.sl, isNaN(val) ? undefined : val);
                      }
                    }}
                    className={`h-[24px] px-2 text-[10px] font-mono font-bold bg-[#0a0e0b] border flex items-center justify-center cursor-pointer transition-all hover:bg-emerald-950/60 ${
                      pos.tp 
                        ? 'border-emerald-500 text-emerald-400' 
                        : 'border-dashed border-emerald-500/70 text-emerald-500'
                    }`}
                    title="Take-Profit o'rnatish"
                  >
                    TP
                  </button>

                  {/* [ SL ] */}
                  <button
                    onClick={() => {
                      const input = prompt(`Stop-Loss (SL) narxini kiriting [${pos.symbol}]:`, pos.sl ? String(pos.sl) : '');
                      if (input !== null) {
                        const val = parseFloat(input);
                        onUpdateSlTp?.(pos.id, isNaN(val) ? undefined : val, pos.tp);
                      }
                    }}
                    className={`h-[24px] px-2 text-[10px] font-mono font-bold bg-[#0a0e0b] border border-l-0 flex items-center justify-center cursor-pointer transition-all hover:bg-amber-950/60 ${
                      pos.sl 
                        ? 'border-amber-500 text-amber-400' 
                        : 'border-dashed border-amber-500/70 text-amber-500'
                    }`}
                    title="Stop-Loss o'rnatish"
                  >
                    SL
                  </button>

                  {/* [ 0.10 ] Lot Size */}
                  <div 
                    className="h-[24px] px-2.5 text-[11px] font-mono font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: lineColor }}
                  >
                    {pos.lotSize}
                  </div>

                  {/* [ Live PnL ] */}
                  <div className={`h-[24px] px-2.5 text-[11px] font-mono font-bold bg-[#0a0e0b] border ${badgeBorder} flex items-center justify-center min-w-[88px] ${
                    isProfit ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isProfit ? '+' : ''}{pos.pnl.toFixed(2)} USD
                  </div>

                  {/* [ ✕ ] Close Button */}
                  <button
                    onClick={() => onClosePosition?.(pos.id)}
                    className={`h-[24px] px-2 text-[11px] font-bold bg-[#0a0e0b] border border-l-0 ${badgeBorder} text-gray-400 hover:text-white hover:bg-rose-900/60 flex items-center justify-center cursor-pointer transition-all`}
                    title="Bitimni grafikdan yopish"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 2. STOP-LOSS LINE (IF SET) */}
              {pos.sl && pos.sl > 0 && (
                <div 
                  style={{ top: `${slY}%` }}
                  className="absolute left-0 right-0 z-20 pointer-events-none transition-all duration-300"
                >
                  <div className="w-full h-px border-t border-dashed border-red-500 opacity-90 shadow-sm" />
                  <div className="absolute right-16 -top-[10px] pointer-events-auto bg-[#450a0a] text-red-300 border border-red-500 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow">
                    SL: {pos.sl}
                  </div>
                </div>
              )}

              {/* 3. TAKE-PROFIT LINE (IF SET) */}
              {pos.tp && pos.tp > 0 && (
                <div 
                  style={{ top: `${tpY}%` }}
                  className="absolute left-0 right-0 z-20 pointer-events-none transition-all duration-300"
                >
                  <div className="w-full h-px border-t border-dashed border-emerald-500 opacity-90 shadow-sm" />
                  <div className="absolute right-16 -top-[10px] pointer-events-auto bg-[#064e3b] text-emerald-300 border border-emerald-500 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow">
                    TP: {pos.tp}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Range Bar matching Exness/TradingView */}
      <div className="h-7 bg-[#111417] border-t border-[#1f262b] px-3 flex items-center justify-between text-[11px] text-gray-400 select-none z-20">
        <div className="flex items-center gap-2">
          {(['5y', '1y', '6m', '3m', '1m', '5d', '1d'] as const).map(r => (
            <button key={r} className="hover:text-white transition-colors cursor-pointer px-1 py-0.5">
              {r}
            </button>
          ))}
          <button className="hover:text-white ml-1 p-0.5">
            <Calendar className="size-3" />
          </button>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>04:55:51 UTC</span>
          <span className="text-gray-300 font-bold hover:text-white cursor-pointer">auto</span>
        </div>
      </div>
    </div>
  );
}
