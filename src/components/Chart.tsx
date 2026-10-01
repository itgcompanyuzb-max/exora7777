import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  LineStyle,
  SeriesMarker,
  Time,
  ColorType,
} from 'lightweight-charts';
import { useTradingStore } from '../store';
import { Position, Order, Tick } from '../types';
import { calculatePnL, getPipSize } from '../engine';

type Kind = 'entry' | 'sl' | 'tp' | 'pending';

interface DragState {
  isDragging: boolean;
  positionId: string;
  kind: 'sl' | 'tp';
  originalPrice: number;
  currentPrice: number;
}

export const Chart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesMapRef = useRef<Map<string, IPriceLine>>(new Map());
  const dragStateRef = useRef<DragState | null>(null);

  const {
    activeSymbol,
    activeTimeframe,
    broker,
    positions,
    pending,
    ticks,
    modifyPosition,
  } = useTradingStore();

  const [isLoading, setIsLoading] = useState(true);
  const [hoveredLineInfo, setHoveredLineInfo] = useState<string | null>(null);

  const currentTick = ticks[activeSymbol];

  // Helper to upsert a line
  const upsertLine = useCallback((
    key: string,
    opts: { price: number; color: string; style: LineStyle; width: 1 | 2 | 3 | 4; title: string }
  ) => {
    const series = seriesRef.current;
    if (!series) return;

    const existing = priceLinesMapRef.current.get(key);
    if (existing) {
      existing.applyOptions({
        price: opts.price,
        title: opts.title,
        color: opts.color,
        lineStyle: opts.style,
        lineWidth: opts.width,
      });
      return;
    }

    try {
      const newLine = series.createPriceLine({
        price: opts.price,
        color: opts.color,
        lineWidth: opts.width,
        lineStyle: opts.style,
        axisLabelVisible: true,
        title: opts.title,
      });
      priceLinesMapRef.current.set(key, newLine);
    } catch (e) {
      console.warn('Failed creating price line', e);
    }
  }, []);

  const removeLine = useCallback((key: string) => {
    const series = seriesRef.current;
    const l = priceLinesMapRef.current.get(key);
    if (series && l) {
      try {
        series.removePriceLine(l);
      } catch {}
      priceLinesMapRef.current.delete(key);
    }
  }, []);

  const clearAllLines = useCallback(() => {
    const series = seriesRef.current;
    if (series) {
      priceLinesMapRef.current.forEach((l) => {
        try {
          series.removePriceLine(l);
        } catch {}
      });
    }
    priceLinesMapRef.current.clear();
  }, []);

  // Sync Positions & Pending orders to Price Lines
  const syncLines = useCallback(() => {
    const series = seriesRef.current;
    if (!series || !currentTick) return;

    const matchingPositions = positions.filter(
      (p) => p.symbol.toUpperCase().replace(/[\s\/-]/g, '') === activeSymbol.toUpperCase().replace(/[\s\/-]/g, '')
    );
    const matchingPending = pending.filter(
      (o) => o.symbol.toUpperCase().replace(/[\s\/-]/g, '') === activeSymbol.toUpperCase().replace(/[\s\/-]/g, '')
    );

    const activeKeys = new Set<string>();

    // 1. Sync Positions
    matchingPositions.forEach((p) => {
      const isBuy = p.side === 'BUY';
      const curPrice = isBuy ? currentTick.bid : currentTick.ask;
      const pnl = calculatePnL(p.side, p.openPrice, curPrice, p.lot, p.symbol);
      const pip = getPipSize(p.symbol);

      // Entry line
      const entryKey = `${p.id}:entry`;
      activeKeys.add(entryKey);
      upsertLine(entryKey, {
        price: p.openPrice,
        color: isBuy ? '#2962FF' : '#FF6D00',
        style: LineStyle.Solid,
        width: 2,
        title: `${p.side} ${p.lot.toFixed(2)} | ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}$`,
      });

      // SL line
      const slKey = `${p.id}:sl`;
      if (p.sl && p.sl > 0) {
        activeKeys.add(slKey);
        const pips = Math.abs(p.sl - p.openPrice) / pip;
        const risk = pips * 10 * p.lot;
        upsertLine(slKey, {
          price: p.sl,
          color: '#F23645',
          style: LineStyle.Dashed,
          width: 1,
          title: `SL | -${pips.toFixed(1)} pips | -${risk.toFixed(2)}$`,
        });
      } else {
        removeLine(slKey);
      }

      // TP line
      const tpKey = `${p.id}:tp`;
      if (p.tp && p.tp > 0) {
        activeKeys.add(tpKey);
        const pips = Math.abs(p.tp - p.openPrice) / pip;
        const gain = pips * 10 * p.lot;
        upsertLine(tpKey, {
          price: p.tp,
          color: '#089981',
          style: LineStyle.Dashed,
          width: 1,
          title: `TP | +${pips.toFixed(1)} pips | +${gain.toFixed(2)}$`,
        });
      } else {
        removeLine(tpKey);
      }
    });

    // 2. Sync Pending Orders
    matchingPending.forEach((ord) => {
      const pendKey = `${ord.id}:pending`;
      activeKeys.add(pendKey);
      upsertLine(pendKey, {
        price: ord.price,
        color: '#B2B5BE',
        style: LineStyle.Dotted,
        width: 1,
        title: `${ord.type.replace('_', ' ')} ${ord.lot.toFixed(2)} @ ${ord.price}`,
      });
    });

    // 3. Remove lines that are no longer active
    priceLinesMapRef.current.forEach((_, key) => {
      if (!activeKeys.has(key)) {
        removeLine(key);
      }
    });

    // 4. Update Candle Markers for open trades
    const markers: SeriesMarker<Time>[] = [];
    matchingPositions.forEach((pos) => {
      const timeVal = pos.openTime as Time;
      markers.push({
        time: timeVal,
        position: pos.side === 'BUY' ? 'belowBar' : 'aboveBar',
        color: pos.side === 'BUY' ? '#089981' : '#F23645',
        shape: pos.side === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: `${pos.side} ${pos.lot} @ ${pos.openPrice}`,
      });
    });

    try {
      series.setMarkers(markers);
    } catch {}
  }, [activeSymbol, currentTick, positions, pending, upsertLine, removeLine]);

  // Initialize Lightweight-Charts instance
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
        fontFamily: "'Trebuchet MS', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2a2e39',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2a2e39',
        },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        autoScale: true,
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#089981',
      downColor: '#F23645',
      borderVisible: false,
      wickUpColor: '#089981',
      wickDownColor: '#F23645',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearAllLines();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [clearAllLines]);

  // Load candle data when symbol or timeframe changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    clearAllLines();

    broker.getCandles(activeSymbol, activeTimeframe, 150).then((candles) => {
      if (isCancelled || !seriesRef.current) return;
      try {
        const sorted = [...candles].sort((a, b) => (Number(a.time) - Number(b.time)));
        seriesRef.current.setData(sorted.map(c => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })));
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        console.error('Candles render error', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeSymbol, activeTimeframe, broker, clearAllLines]);

  // Update chart candle on every tick
  useEffect(() => {
    if (!seriesRef.current || !currentTick) return;
    const series = seriesRef.current;
    const timeVal = currentTick.time as Time;
    const price = currentTick.bid;

    try {
      series.update({
        time: timeVal,
        open: price,
        high: price,
        low: price,
        close: price,
      });
    } catch {}

    syncLines();
  }, [currentTick, syncLines]);

  // Re-sync lines when positions or pending changes
  useEffect(() => {
    syncLines();
  }, [positions, pending, syncLines]);

  // =========================================================================
  // DRAG TO MODIFY SL / TP DIRECTLY ON THE CHART
  // =========================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      const series = seriesRef.current;
      const chart = chartRef.current;
      if (!series || !chart) return;

      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      // Check proximity (within 8px) of any open position's SL or TP line
      for (const pos of positions) {
        if (pos.symbol.toUpperCase().replace(/[\s\/-]/g, '') !== activeSymbol.toUpperCase().replace(/[\s\/-]/g, '')) {
          continue;
        }

        // Test SL line
        if (pos.sl) {
          const slCoord = series.priceToCoordinate(pos.sl);
          if (slCoord !== null && Math.abs(slCoord - mouseY) <= 8) {
            dragStateRef.current = {
              isDragging: true,
              positionId: pos.id,
              kind: 'sl',
              originalPrice: pos.sl,
              currentPrice: pos.sl,
            };
            chart.applyOptions({ handleScroll: false, handleScale: false });
            container.style.cursor = 'ns-resize';
            setHoveredLineInfo(`SL o'zgartirilmoqda (${pos.symbol})`);
            return;
          }
        }

        // Test TP line
        if (pos.tp) {
          const tpCoord = series.priceToCoordinate(pos.tp);
          if (tpCoord !== null && Math.abs(tpCoord - mouseY) <= 8) {
            dragStateRef.current = {
              isDragging: true,
              positionId: pos.id,
              kind: 'tp',
              originalPrice: pos.tp,
              currentPrice: pos.tp,
            };
            chart.applyOptions({ handleScroll: false, handleScale: false });
            container.style.cursor = 'ns-resize';
            setHoveredLineInfo(`TP o'zgartirilmoqda (${pos.symbol})`);
            return;
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const series = seriesRef.current;
      if (!series) return;

      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      // If dragging, convert coordinate to price and update live line
      if (dragStateRef.current?.isDragging) {
        const newPrice = series.coordinateToPrice(mouseY);
        if (newPrice !== null && !isNaN(newPrice)) {
          const { positionId, kind } = dragStateRef.current;
          const pos = positions.find((p) => p.id === positionId);
          if (pos) {
            const digits = activeSymbol.includes('JPY') || activeSymbol.includes('XAU') ? 2 : 5;
            const roundedPrice = Number(newPrice.toFixed(digits));
            dragStateRef.current.currentPrice = roundedPrice;

            const pip = getPipSize(pos.symbol);
            const pips = Math.abs(roundedPrice - pos.openPrice) / pip;
            const diffUsd = pips * 10 * pos.lot;

            const lineKey = `${positionId}:${kind}`;
            upsertLine(lineKey, {
              price: roundedPrice,
              color: kind === 'sl' ? '#F23645' : '#089981',
              style: LineStyle.Dashed,
              width: 2,
              title: kind === 'sl'
                ? `SL | -${pips.toFixed(1)} pips | -${diffUsd.toFixed(2)}$ [DRAGGING]`
                : `TP | +${pips.toFixed(1)} pips | +${diffUsd.toFixed(2)}$ [DRAGGING]`,
            });
          }
        }
        return;
      }

      // Hover check to change cursor to ns-resize when hovering near SL/TP
      let isNear = false;
      for (const pos of positions) {
        if (pos.symbol.toUpperCase().replace(/[\s\/-]/g, '') !== activeSymbol.toUpperCase().replace(/[\s\/-]/g, '')) continue;
        if (pos.sl) {
          const slCoord = series.priceToCoordinate(pos.sl);
          if (slCoord !== null && Math.abs(slCoord - mouseY) <= 8) {
            isNear = true;
            break;
          }
        }
        if (pos.tp) {
          const tpCoord = series.priceToCoordinate(pos.tp);
          if (tpCoord !== null && Math.abs(tpCoord - mouseY) <= 8) {
            isNear = true;
            break;
          }
        }
      }
      container.style.cursor = isNear ? 'ns-resize' : 'crosshair';
    };

    const handleMouseUp = () => {
      const chart = chartRef.current;
      if (dragStateRef.current?.isDragging) {
        const { positionId, kind, currentPrice } = dragStateRef.current;
        if (kind === 'sl') {
          modifyPosition(positionId, { sl: currentPrice });
        } else {
          modifyPosition(positionId, { tp: currentPrice });
        }
        dragStateRef.current = null;
        setHoveredLineInfo(null);
      }

      if (chart) {
        chart.applyOptions({ handleScroll: true, handleScale: true });
      }
      container.style.cursor = 'crosshair';
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeSymbol, positions, modifyPosition, upsertLine]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#131722] overflow-hidden select-none">
      {/* Top Chart Header Ticker */}
      <div className="h-9 px-3 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between text-xs font-mono text-gray-300 z-10">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-white text-sm">{activeSymbol}</span>
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-primary font-bold text-[10px]">
            {activeTimeframe}
          </span>
          {currentTick && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-400">Bid: <strong className="text-red-400">{currentTick.bid.toFixed(activeSymbol.includes('JPY') || activeSymbol.includes('XAU') ? 2 : 5)}</strong></span>
              <span className="text-gray-400">Ask: <strong className="text-blue-400">{currentTick.ask.toFixed(activeSymbol.includes('JPY') || activeSymbol.includes('XAU') ? 2 : 5)}</strong></span>
            </div>
          )}
        </div>

        {hoveredLineInfo && (
          <div className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] animate-pulse">
            {hoveredLineInfo}
          </div>
        )}
      </div>

      {/* Main Chart Canvas Mount Point */}
      <div className="flex-1 w-full relative">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#131722]/80 backdrop-blur-xs text-gray-400 text-xs font-mono">
            <span>Grafik yuklanmoqda ({activeSymbol} {activeTimeframe})...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full cursor-crosshair" />
      </div>
    </div>
  );
};
