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
  const [editId, setEditId] = useState<string | null>(null);
  const [editSl, setEditSl] = useState('');
  const [editTp, setEditTp] = useState('');
  const editing = editId ? (positions || []).find((p) => p.id === editId) : undefined;

  useEffect(() => {
    exnessBroker.setEditHandler((id) => setEditId(id));
    return () => exnessBroker.setEditHandler(null);
  }, []);
  useEffect(() => {
    if (editing) { setEditSl(editing.sl ? String(editing.sl) : ''); setEditTp(editing.tp ? String(editing.tp) : ''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

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
          library_path: '/charting_library/static/',
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
          disabled_features: ['use_localstorage_for_settings', 'create_volume_indicator_by_default'],
          enabled_features: ['show_symbol_logos', 'show_symbol_logo_in_legend', 'show_symbol_logo_for_compare_studies'],
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

    // The library failed to start. Never fall back to a third-party chart: its prices would not match the broker's.
    setActiveEngine('embed');
    setIsLoaded(true);

    return () => {
      isMounted = false;
    };
  }, [containerId, tvSymbol, tvInterval, theme, chartStyle, key]);

  // Synchronize open positions with ExnessBroker native chart position lines (current symbol only)
  useEffect(() => {
    const here = symbol.replace(/[\s/\-_]/g, '').toUpperCase();
    (positions || []).forEach((p) => {
      const same = p.symbol.replace(/[\s/\-_]/g, '').toUpperCase() === here;
      if (p.status === 'open' && same) {
        exnessBroker.upsertPosition({
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
        exnessBroker.forgetPosition(p.id);
      }
    });
  }, [positions, symbol]);

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

        {/* Chart unavailable (library failed to load) */}
        {activeEngine === 'embed' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#0a0d0b]">
            <div className="text-rose-300 font-bold text-sm">Grafik yuklanmadi</div>
            <div className="text-gray-400 text-xs max-w-sm">
              TradingView Charting Library ishga tushmadi. Sahifani yangilang (Ctrl+F5). Muammo davom etsa, brauzer konsolidagi xatoni yuboring.
              Brokerning narxlariga mos kelmaydigan tashqi grafik ko'rsatilmaydi.
            </div>
            <button onClick={() => setKey((k) => k + 1)} className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs">Qayta urinish</button>
          </div>
        )}

        {editing && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50" onClick={() => setEditId(null)}>
            <div className="w-[320px] rounded-2xl border border-white/10 bg-[#14181b] p-4 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm">#{(editing.ticket || '').toString().replace('#', '')} {editing.symbol} <span className={editing.side === 'buy' ? 'text-sky-400' : 'text-orange-400'}>{editing.side.toUpperCase()} {editing.lotSize}</span></div>
                <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
              </div>
              <div className="text-[11px] text-gray-400 mb-3">Ochilish narxi: <span className="font-mono text-white">{editing.openPrice}</span></div>
              {([['Stop Loss', editSl, setEditSl, -1], ['Take Profit', editTp, setEditTp, 1]] as const).map(([label, val, set, dir]) => (
                <div key={label} className="mb-3">
                  <label className="text-[11px] text-gray-400">{label}</label>
                  <input value={val} onChange={(e) => set(e.target.value)} inputMode="decimal" placeholder="Narx" className="mt-1 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#ffde00]/60" />
                  <div className="flex gap-1.5 mt-1.5">
                    {[0.1, 0.25, 0.5, 1].map((pct) => {
                      const sign = (editing.side === 'buy' ? 1 : -1) * dir;
                      const px = editing.openPrice * (1 + (sign * pct) / 100);
                      return <button key={pct} type="button" onClick={() => set(px.toFixed(editing.openPrice < 10 ? 5 : editing.openPrice < 1000 ? 3 : 2))} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-mono">{pct}%</button>;
                    })}
                    <button type="button" onClick={() => set('')} className="px-2 py-1 rounded-md bg-white/5 hover:bg-rose-500/20 text-[10px]">tozalash</button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { onUpdateSlTp?.(editing.id, editSl ? parseFloat(editSl) : undefined, editTp ? parseFloat(editTp) : undefined); setEditId(null); }}
                className="w-full rounded-lg bg-[#ffde00] text-black font-bold text-sm py-2.5 hover:brightness-95"
              >Saqlash</button>
            </div>
          </div>
        )}

        {/* Position lines are drawn natively on the chart by ExnessBrokerAdapter (createPositionLine); no DOM overlay. */}
      </div>

      {/* Fallback range bar: the Charting Library already renders its own */}
      <div className={`${activeEngine === 'library' ? 'hidden' : ''} h-7 bg-[#111417] border-t border-[#1f262b] px-3 flex items-center justify-between text-[11px] text-gray-400 select-none z-20`}>
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
