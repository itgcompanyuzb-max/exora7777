import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toTradingViewSymbol } from '../../lib/liveMarketFeed';
import { Position } from '../../types/broker';
import { exnessBroker } from '../../lib/tradingview/ExnessBrokerAdapter';
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

  // Filter open positions that match this chart's symbol with flexible matching
  const matchingPositions = useMemo(() => {
    const s1 = symbol.toUpperCase().replace(/[\s\/\-_]/g, '');
    return (positions || []).filter(p => {
      if (p.status !== 'open') return false;
      const s2 = p.symbol.toUpperCase().replace(/[\s\/\-_]/g, '');
      return s1 === s2 || 
        (s1.includes('XAU') && s2.includes('XAU')) || 
        (s1.includes('BTC') && s2.includes('BTC')) || 
        (s1.includes('EUR') && s2.includes('EUR')) || 
        (s1.includes('OIL') && s2.includes('OIL'));
    });
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

    // Mode 1: TradingView Charting Library (connected to local FinTech UDF backend)
    if (TV && TV.widget && Datafeeds && Datafeeds.UDFCompatibleDatafeed) {
      try {
        const udfUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/tv` : '/api/tv';
        const widget = new TV.widget({
          container: containerId,
          locale: 'en',
          library_path: '/charting_library/',
          datafeed: new Datafeeds.UDFCompatibleDatafeed(udfUrl),
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
            if (isMounted) {
              setIsLoaded(true);
              try {
                const chart = widget.chart();
                exnessBroker.setChart(chart);
              } catch (e) {
                console.warn('[ExnessBroker] setChart hook:', e);
              }
            }
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

  // Synchronize open positions with ExnessBroker native chart position lines
  useEffect(() => {
    (positions || []).forEach((p) => {
      if (p.status === 'open') {
        exnessBroker.drawPositionOnChart({
          id: p.id,
          symbol: p.symbol,
          qty: p.side === 'buy' ? p.lotSize : -p.lotSize,
          side: p.side === 'buy' ? 'Buy' : 'Sell',
          avgPrice: p.openPrice,
          currentPrice: p.currentPrice || p.openPrice,
          stopLoss: p.sl,
          takeProfit: p.tp,
          unrealizedPl: p.pnl,
          openedAt: new Date(p.openedAt).getTime(),
        });
      } else {
        exnessBroker.removeChartLines(p.id);
      }
    });
  }, [positions]);

  // Synchronize live market tick to update P/L on native position lines
  useEffect(() => {
    if (!currentBid || !currentAsk) return;
    exnessBroker.updateMarketTick(symbol, currentBid, currentAsk);
  }, [currentBid, currentAsk, symbol]);

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
