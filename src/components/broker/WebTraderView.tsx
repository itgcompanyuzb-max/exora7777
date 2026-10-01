import React, { useState, useEffect, useRef, useMemo } from "react";
import { brokerStore } from "../../lib/brokerStore";
import { translations, Language } from "../../lib/i18n";
import { 
  ForexSymbolRate, 
  Position, 
  TradingAccount, 
  PendingOrder, 
  EconomicEvent 
} from "../../types/broker";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  X, 
  Layers, 
  Clock, 
  DollarSign, 
  Activity,
  BarChart2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  Zap,
  MousePointer,
  Crosshair,
  Minus,
  Edit2,
  Trash2,
  Calendar,
  Eye,
  EyeOff,
  Compass,
  Square,
  PenTool,
  HelpCircle,
  ArrowLeft,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  Globe2,
  Lock,
  Unlock,
  Ruler,
  Radio,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { TradingViewChart } from "../trading/TradingViewChart";
import { OrderBookDOM } from "../trading/OrderBookDOM";
import { liveMarketFeed, LiveMarketStatus } from "../../lib/liveMarketFeed";

interface WebTraderViewProps {
  lang: Language;
  onOpenDeposit: () => void;
  onReturnToCabinet?: () => void;
}

type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';
type ChartMode = 'candles' | 'line' | 'area';
type DrawingTool = 'cursor' | 'crosshair' | 'trendline' | 'horizontal' | 'channel' | 'fibonacci' | 'rectangle' | 'long_position' | 'short_position' | 'ruler' | 'eraser';

interface CandleData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DrawnElement {
  id: string;
  type: DrawingTool;
  color: string;
  points: { x: number; y: number; price?: number; time?: string }[];
  pips?: number;
  label?: string;
}

// Generate realistic candlestick historical array
function generateRealisticCandles(basePrice: number, precision: number, count = 45): CandleData[] {
  const candles: CandleData[] = [];
  const now = Date.now();
  let currentPrice = basePrice * 0.985;
  const step = 15 * 60 * 1000; // 15 mins

  for (let i = count; i >= 0; i--) {
    const t = new Date(now - i * step);
    const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const volatility = basePrice * 0.0035;
    const delta = (Math.random() - 0.48) * volatility;
    const open = currentPrice;
    const close = Math.max(0.0001, open + delta);
    const high = Math.max(open, close) + Math.random() * (volatility * 0.7);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.7);
    const volume = Math.floor(100 + Math.random() * 850);

    candles.push({
      time: timeStr,
      timestamp: t.getTime(),
      open: Number(open.toFixed(precision)),
      high: Number(high.toFixed(precision)),
      low: Number(low.toFixed(precision)),
      close: Number(close.toFixed(precision)),
      volume,
    });
    currentPrice = close;
  }
  return candles;
}

export function WebTraderView({ lang, onOpenDeposit, onReturnToCabinet }: WebTraderViewProps) {
  const t = translations[lang];
  const [symbols, setSymbols] = useState<ForexSymbolRate[]>(brokerStore.getSymbols());
  const [selectedSymbol, setSelectedSymbol] = useState<ForexSymbolRate>(symbols[0] || {
    symbol: 'BTC',
    name: 'Bitcoin vs US Dollar',
    category: 'crypto',
    bid: 79719.47,
    ask: 79729.47,
    spread: 10.0,
    change24h: -0.01,
    high24h: 79737.27,
    low24h: 79714.65,
    digitPrecision: 2
  });

  // Active Market Tabs (Quick Switcher at top of chart)
  const [openMarketTabs, setOpenMarketTabs] = useState<string[]>([
    'BTC', 'ETH', 'SOL', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'US30'
  ]);

  const [liveStatus, setLiveStatus] = useState<LiveMarketStatus>(liveMarketFeed.getStatus());

  const [accounts, setAccounts] = useState<TradingAccount[]>(brokerStore.getAccounts());
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | undefined>(() => {
    const accs = brokerStore.getAccounts();
    return accs.find(a => a.accountNumber === '3201288') || accs.find(a => !a.isArchived) || accs[0];
  });
  const [positions, setPositions] = useState<Position[]>(brokerStore.getPositions());
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(brokerStore.getPendingOrders());
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>(brokerStore.getEconomicEvents());

  // Chart Controls State
  const [timeframe, setTimeframe] = useState<TimeFrame>('15m');
  const [chartMode, setChartMode] = useState<ChartMode>('candles');
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>('cursor');
  const [drawings, setDrawings] = useState<DrawnElement[]>([]);
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const [magnetMode, setMagnetMode] = useState(false);

  // Technical Indicators
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);

  // Candlestick Data
  const [candles, setCandles] = useState<CandleData[]>(() => 
    generateRealisticCandles(selectedSymbol.bid, selectedSymbol.digitPrecision, 40)
  );

  // Order Placement Form State
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderExecutionType, setOrderExecutionType] = useState<'market' | 'limit' | 'stop'>('market');
  const [lotSize, setLotSize] = useState<number>(0.10);
  const [targetLimitPrice, setTargetLimitPrice] = useState<string>('');
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');
  const [oneClickTrading, setOneClickTrading] = useState<boolean>(brokerStore.isOneClickTrading());
  const [showOneClickModal, setShowOneClickModal] = useState<boolean>(false);

  // Right Side Panel Tab: 'order', 'dom' (Depth of Market), 'positions', or 'analytics'
  const [rightPanelTab, setRightPanelTab] = useState<'order' | 'dom' | 'positions' | 'analytics'>('order');
  const [economicFilter, setEconomicFilter] = useState<'all' | 'high' | 'medium'>('all');

  // Dashboard Sub Tab: 'positions' | 'pending' | 'history'
  const [bottomTab, setBottomTab] = useState<'positions' | 'pending' | 'history'>('positions');
  const [mobileViewTab, setMobileViewTab] = useState<'chart' | 'order' | 'dom' | 'positions'>('chart');

  // Modals for editing / partial close
  const [editPositionModal, setEditPositionModal] = useState<Position | null>(null);
  const [editSlValue, setEditSlValue] = useState<string>('');
  const [editTpValue, setEditTpValue] = useState<string>('');
  const [partialCloseModal, setPartialCloseModal] = useState<Position | null>(null);
  const [partialLotSize, setPartialLotSize] = useState<number>(0.05);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Canvas ref for chart drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [drawingStartPoint, setDrawingStartPoint] = useState<{ x: number; y: number } | null>(null);
  // Interactive click zones for on-chart Exness position badges (Close, SL, TP)
  const positionClickZonesRef = useRef<Array<{ x: number; y: number; w: number; h: number; action: 'close' | 'sl' | 'tp'; posId: string }>>([]);

  // Subscribe to store updates
  useEffect(() => {
    const unsub = brokerStore.subscribe(() => {
      const syms = brokerStore.getSymbols();
      setSymbols(syms);
      setPositions(brokerStore.getPositions());
      setPendingOrders(brokerStore.getPendingOrders());
      setEconomicEvents(brokerStore.getEconomicEvents());
      const accs = brokerStore.getAccounts();
      setAccounts(accs);

      if (selectedAccount) {
        const found = accs.find((a) => a.id === selectedAccount.id);
        if (found) setSelectedAccount(found);
      }

      const current = syms.find((s) => s.symbol === selectedSymbol.symbol);
      if (current) {
        setSelectedSymbol(current);
      }
    });
    return unsub;
  }, [selectedAccount, selectedSymbol.symbol]);

  // When switching symbols, regenerate realistic candles
  useEffect(() => {
    liveMarketFeed.setActiveSymbol(selectedSymbol.symbol);
    const unsub = liveMarketFeed.subscribeStatus(setLiveStatus);
    setCandles(generateRealisticCandles(selectedSymbol.bid, selectedSymbol.digitPrecision, 42));
    setTargetLimitPrice(selectedSymbol.bid.toString());
    return unsub;
  }, [selectedSymbol.symbol]);

  // Live real-time tick to update latest candle
  useEffect(() => {
    const timer = setInterval(() => {
      setCandles(prev => {
        if (!prev.length) return prev;
        const lastIndex = prev.length - 1;
        const lastCandle = { ...prev[lastIndex] };
        const price = selectedSymbol.bid;
        lastCandle.close = price;
        lastCandle.high = Math.max(lastCandle.high, price);
        lastCandle.low = Math.min(lastCandle.low, price);
        lastCandle.volume += Math.floor(Math.random() * 5);
        return [...prev.slice(0, lastIndex), lastCandle];
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [selectedSymbol.bid]);

  // Contract size and margin calculation
  const leverage = selectedAccount?.leverage || 500;
  let contractSize = 100000;
  if (selectedSymbol.symbol === 'XAU/USD' || selectedSymbol.symbol === 'XAU/USD247') contractSize = 100;
  if (selectedSymbol.symbol === 'BTC' || selectedSymbol.symbol === 'BTC/USD' || selectedSymbol.symbol === 'BTC/USDT' || selectedSymbol.symbol === 'US30') contractSize = 1;
  const currentPrice = orderSide === 'buy' ? selectedSymbol.ask : selectedSymbol.bid;
  const requiredMargin = Number(((lotSize * contractSize * currentPrice) / leverage).toFixed(2));
  
  // Pip value estimation
  const pipStep = selectedSymbol.digitPrecision === 5 ? 0.0001 : selectedSymbol.digitPrecision === 3 ? 0.01 : 1;
  const estimatedPipValue = Number((lotSize * (contractSize * pipStep)).toFixed(2));

  // Switch active tab
  function handleSelectSymbol(sym: ForexSymbolRate) {
    setSelectedSymbol(sym);
    if (!openMarketTabs.includes(sym.symbol)) {
      setOpenMarketTabs(prev => [...prev, sym.symbol]);
    }
  }

  function handleCloseTab(symName: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = openMarketTabs.filter(s => s !== symName);
    if (updated.length > 0) {
      setOpenMarketTabs(updated);
      if (selectedSymbol.symbol === symName) {
        const next = symbols.find(s => s.symbol === updated[0]);
        if (next) setSelectedSymbol(next);
      }
    }
  }

  // Handle Order Placement
  function handleExecuteOrder() {
    if (!selectedAccount) {
      toast.error("Savdo hisobingiz topilmadi");
      return;
    }

    if (orderExecutionType === 'market') {
      if (selectedAccount.freeMargin < requiredMargin) {
        toast.error(`Mablag' yetarli emas! Zaruriy marja: $${requiredMargin}, Erkin marja: $${selectedAccount.freeMargin.toFixed(2)}`);
        return;
      }

      try {
        const pos = brokerStore.openPosition({
          accountId: selectedAccount.id,
          symbol: selectedSymbol.symbol,
          side: orderSide,
          lotSize,
          sl: sl ? parseFloat(sl) : undefined,
          tp: tp ? parseFloat(tp) : undefined,
        });

        toast.success(
          `Ijro etildi: ${selectedSymbol.symbol} bo'yicha ${lotSize} lot ${orderSide.toUpperCase()} #${pos.id.slice(-6)} ochildi!`,
          { description: `Narx: ${pos.openPrice} | Marja: $${requiredMargin}` }
        );
        setSl('');
        setTp('');
      } catch (err: any) {
        toast.error(err.message || "Buyurtma ijro etishda xatolik");
      }
    } else {
      // Pending Limit / Stop order
      const target = parseFloat(targetLimitPrice);
      if (isNaN(target) || target <= 0) {
        toast.error("Iltimos, maqsad narxni to'g'ri kiriting");
        return;
      }

      const pType = orderSide === 'buy' 
        ? (orderExecutionType === 'limit' ? 'buy_limit' : 'buy_stop')
        : (orderExecutionType === 'limit' ? 'sell_limit' : 'sell_stop');

      try {
        const pend = brokerStore.createPendingOrder({
          accountId: selectedAccount.id,
          symbol: selectedSymbol.symbol,
          type: pType,
          lotSize,
          targetPrice: target,
          sl: sl ? parseFloat(sl) : undefined,
          tp: tp ? parseFloat(tp) : undefined,
        });

        toast.success(`Kechiktirilgan buyurtma joylashtirildi: ${pType.toUpperCase()} @ ${target}`);
        setSl('');
        setTp('');
      } catch (err: any) {
        toast.error("Buyurtma joylashtirishda xatolik");
      }
    }
  }

  // Quick 1-click execution for Buy/Sell buttons
  function handleOneClickOrder(side: 'buy' | 'sell') {
    if (!selectedAccount) return;
    if (!oneClickTrading) {
      setOrderSide(side);
      return;
    }

    try {
      const pos = brokerStore.openPosition({
        accountId: selectedAccount.id,
        symbol: selectedSymbol.symbol,
        side,
        lotSize,
      });
      toast.success(`1-Click: ${selectedSymbol.symbol} ${lotSize} lot ${side.toUpperCase()} ochildi!`);
    } catch (e: any) {
      toast.error(e.message || "1-Click ijro etishda xatolik");
    }
  }

  // Close position
  function handleClosePosition(posId: string) {
    brokerStore.closePosition(posId);
    toast.info("Pozitsiya yopildi va balansga qayd etildi.");
  }

  // Close all positions
  function handleCloseAllPositions() {
    const count = brokerStore.closeAllPositions(selectedAccount?.id);
    if (count > 0) {
      toast.success(`Barcha ${count} ta ochiq pozitsiyalar yopildi!`);
    } else {
      toast.info("Yopish uchun faol pozitsiyalar mavjud emas");
    }
  }

  // Filter positions
  const userOpenPositions = positions.filter(
    p => p.status === 'open' && (!selectedAccount || p.accountId === selectedAccount.id)
  );
  const userPendingOrders = pendingOrders.filter(
    o => o.status === 'active' && (!selectedAccount || o.accountId === selectedAccount.id)
  );
  const userClosedPositions = positions.filter(
    p => p.status === 'closed' && (!selectedAccount || p.accountId === selectedAccount.id)
  );

  const totalFloatingPnl = userOpenPositions.reduce((sum, p) => sum + p.pnl, 0);

  // Render Canvas Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (candles.length < 2) return;

    // Price range calculation
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    candles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    // Padding on price range
    const range = maxPrice - minPrice || 1;
    const paddedMin = minPrice - range * 0.08;
    const paddedMax = maxPrice + range * 0.08;
    const paddedRange = paddedMax - paddedMin;

    const chartHeight = showRSI ? height * 0.75 : height - 30;
    const rsiTop = chartHeight + 10;
    const rsiHeight = height - rsiTop - 15;

    function getY(price: number): number {
      return chartHeight - ((price - paddedMin) / paddedRange) * chartHeight;
    }

    const candleWidth = Math.max(3, (width - 70) / candles.length - 3);

    // 1. Draw subtle background grid
    ctx.strokeStyle = '#ffffff08';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width - 60, y);
      ctx.stroke();

      const priceAtY = paddedMax - (paddedRange / 5) * i;
      ctx.fillStyle = '#8e968f';
      ctx.font = '10px monospace';
      ctx.fillText(priceAtY.toFixed(selectedSymbol.digitPrecision), width - 55, y + 3);
    }

    // 2. Draw Candlesticks or Line or Area
    candles.forEach((c, idx) => {
      const x = idx * (candleWidth + 3) + 15;
      const isGreen = c.close >= c.open;
      const bodyColor = isGreen ? '#22c55e' : '#ef4444';
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      if (chartMode === 'candles') {
        // High-Low Wick
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, highY);
        ctx.lineTo(x + candleWidth / 2, lowY);
        ctx.stroke();

        // Real Candlestick Body
        const top = Math.min(openY, closeY);
        const bHeight = Math.max(2, Math.abs(openY - closeY));
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x, top, candleWidth, bHeight);

        // Optional Volume Bars at bottom of chart
        if (showVolume) {
          const maxVol = 1000;
          const vHeight = (c.volume / maxVol) * 45;
          ctx.fillStyle = isGreen ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)';
          ctx.fillRect(x, chartHeight - vHeight, candleWidth, vHeight);
        }
      }
    });

    // Line / Area Mode rendering
    if (chartMode === 'line' || chartMode === 'area') {
      ctx.beginPath();
      candles.forEach((c, idx) => {
        const x = idx * (candleWidth + 3) + 15 + candleWidth / 2;
        const y = getY(c.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#b9ef40';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (chartMode === 'area') {
        const lastX = (candles.length - 1) * (candleWidth + 3) + 15 + candleWidth / 2;
        const firstX = 15 + candleWidth / 2;
        ctx.lineTo(lastX, chartHeight);
        ctx.lineTo(firstX, chartHeight);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, chartHeight);
        grad.addColorStop(0, 'rgba(185, 239, 64, 0.25)');
        grad.addColorStop(1, 'rgba(185, 239, 64, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    // 3. Technical Indicator: SMA 20 (Simple Moving Average)
    if (showSMA && candles.length >= 10) {
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // Blue
      ctx.lineWidth = 1.5;
      for (let i = 9; i < candles.length; i++) {
        const slice = candles.slice(i - 9, i + 1);
        const avg = slice.reduce((acc, c) => acc + c.close, 0) / slice.length;
        const x = i * (candleWidth + 3) + 15 + candleWidth / 2;
        const y = getY(avg);
        if (i === 9) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 4. Technical Indicator: EMA 50 (Exponential Moving Average)
    if (showEMA && candles.length >= 15) {
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b'; // Amber
      ctx.lineWidth = 1.5;
      for (let i = 14; i < candles.length; i++) {
        const slice = candles.slice(i - 14, i + 1);
        const avg = slice.reduce((acc, c) => acc + c.close, 0) / slice.length;
        const x = i * (candleWidth + 3) + 15 + candleWidth / 2;
        const y = getY(avg);
        if (i === 14) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 5. Draw Real-time Bid & Ask Price Line on Chart
    const currentBidY = getY(selectedSymbol.bid);
    const currentAskY = getY(selectedSymbol.ask);

    // Bid Line (Red / Neutral)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, currentBidY);
    ctx.lineTo(width - 60, currentBidY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ask Line (Green glow)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(0, currentAskY);
    ctx.lineTo(width - 60, currentAskY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ask price badge on right axis
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(width - 60, currentAskY - 9, 58, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(selectedSymbol.ask.toFixed(selectedSymbol.digitPrecision), width - 57, currentAskY + 3);

    // 6. Draw Open Position Lines on Chart (Exness-Style Extended Line & Interactive Profit/Loss Badge)
    positionClickZonesRef.current = [];
    userOpenPositions
      .filter(p => p.symbol === selectedSymbol.symbol || p.symbol.replace(/[\s\/-]/g, '') === selectedSymbol.symbol.replace(/[\s\/-]/g, ''))
      .forEach(pos => {
        const posPriceY = getY(pos.openPrice);
        if (posPriceY < -25 || posPriceY > chartHeight + 25) return;

        const isBuy = pos.side === 'buy';
        const isPosProfit = pos.pnl >= 0;
        // Exness theme: vibrant blue for BUY (#2563eb / #3b82f6), vibrant red for SELL (#dc2626 / #ef4444)
        const lineColor = isBuy ? '#2563eb' : '#dc2626';
        const badgeBorderColor = isBuy ? '#3b82f6' : '#ef4444';

        // A. Extended horizontal line running across the entire chart
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, posPriceY);
        ctx.lineTo(width - 60, posPriceY);
        ctx.stroke();

        // B. Exness Interactive Badge towards right side (just before right price axis)
        const badgeTotalWidth = 206;
        const startX = Math.max(10, width - 60 - badgeTotalWidth - 12);
        const badgeY = posPriceY - 11;
        const badgeH = 22;

        // 1. [ TP ] Box
        const tpW = 26;
        const tpX = startX;
        ctx.fillStyle = '#0a0e0b';
        ctx.fillRect(tpX, badgeY, tpW, badgeH);
        ctx.strokeStyle = pos.tp ? '#22c55e' : 'rgba(34, 197, 94, 0.7)';
        ctx.lineWidth = 1;
        if (!pos.tp) ctx.setLineDash([2, 2]);
        ctx.strokeRect(tpX, badgeY, tpW, badgeH);
        ctx.setLineDash([]);
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TP', tpX + tpW / 2, badgeY + 14);

        positionClickZonesRef.current.push({
          x: tpX,
          y: badgeY,
          w: tpW,
          h: badgeH,
          action: 'tp',
          posId: pos.id,
        });

        // 2. [ SL ] Box
        const slW = 26;
        const slX = tpX + tpW + 2;
        ctx.fillStyle = '#0a0e0b';
        ctx.fillRect(slX, badgeY, slW, badgeH);
        ctx.strokeStyle = pos.sl ? '#f59e0b' : 'rgba(245, 158, 11, 0.7)';
        ctx.lineWidth = 1;
        if (!pos.sl) ctx.setLineDash([2, 2]);
        ctx.strokeRect(slX, badgeY, slW, badgeH);
        ctx.setLineDash([]);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SL', slX + slW / 2, badgeY + 14);

        positionClickZonesRef.current.push({
          x: slX,
          y: badgeY,
          w: slW,
          h: badgeH,
          action: 'sl',
          posId: pos.id,
        });

        // 3. [ 0.01 ] Lot size pill
        const lotW = 38;
        const lotX = slX + slW + 2;
        ctx.fillStyle = lineColor;
        ctx.fillRect(lotX, badgeY, lotW, badgeH);
        ctx.strokeStyle = badgeBorderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(lotX, badgeY, lotW, badgeH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${pos.lotSize}`, lotX + lotW / 2, badgeY + 15);

        // 4. [ -4.95 USD ] Live PnL tag
        const pnlW = 90;
        const pnlX = lotX + lotW;
        ctx.fillStyle = '#0a0e0b';
        ctx.fillRect(pnlX, badgeY, pnlW, badgeH);
        ctx.strokeStyle = badgeBorderColor;
        ctx.strokeRect(pnlX, badgeY, pnlW, badgeH);
        ctx.fillStyle = isPosProfit ? '#4ade80' : '#f87171'; // Green for profit, red for loss
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        const pnlText = `${isPosProfit ? '+' : ''}${pos.pnl.toFixed(2)} USD`;
        ctx.fillText(pnlText, pnlX + pnlW / 2, badgeY + 15);

        // 5. [ ✕ ] Close button
        const closeW = 20;
        const closeX = pnlX + pnlW;
        ctx.fillStyle = '#0a0e0b';
        ctx.fillRect(closeX, badgeY, closeW, badgeH);
        ctx.strokeStyle = badgeBorderColor;
        ctx.strokeRect(closeX, badgeY, closeW, badgeH);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✕', closeX + closeW / 2, badgeY + 14);

        positionClickZonesRef.current.push({
          x: closeX,
          y: badgeY,
          w: closeW,
          h: badgeH,
          action: 'close',
          posId: pos.id,
        });

        // Reset textAlign
        ctx.textAlign = 'left';

        // C. Draw Stop-Loss dashed line if set
        if (pos.sl) {
          const slPriceY = getY(pos.sl);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, slPriceY);
          ctx.lineTo(width - 60, slPriceY);
          ctx.stroke();
          ctx.setLineDash([]);

          // SL Label badge
          ctx.fillStyle = '#78350f';
          ctx.fillRect(width - 150, slPriceY - 8, 85, 16);
          ctx.strokeStyle = '#f59e0b';
          ctx.strokeRect(width - 150, slPriceY - 8, 85, 16);
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`SL: ${pos.sl}`, width - 145, slPriceY + 4);
        }

        // D. Draw Take-Profit dashed line if set
        if (pos.tp) {
          const tpPriceY = getY(pos.tp);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, tpPriceY);
          ctx.lineTo(width - 60, tpPriceY);
          ctx.stroke();
          ctx.setLineDash([]);

          // TP Label badge
          ctx.fillStyle = '#064e3b';
          ctx.fillRect(width - 150, tpPriceY - 8, 85, 16);
          ctx.strokeStyle = '#22c55e';
          ctx.strokeRect(width - 150, tpPriceY - 8, 85, 16);
          ctx.fillStyle = '#d1fae5';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`TP: ${pos.tp}`, width - 145, tpPriceY + 4);
        }
      });

    // 7. Draw User Drawing Tools (Trendline, Horizontal Line, Fibonacci, Rectangles)
    if (drawingsVisible) {
      drawings.forEach(d => {
        ctx.strokeStyle = d.color || '#ffde00';
        ctx.lineWidth = 2;

        if (d.type === 'horizontal' && d.points[0]) {
          ctx.beginPath();
          ctx.moveTo(0, d.points[0].y);
          ctx.lineTo(width - 60, d.points[0].y);
          ctx.stroke();
          ctx.fillStyle = d.color;
          ctx.font = '10px monospace';
          ctx.fillText(`S/R: ${d.label || ''}`, 10, d.points[0].y - 4);
        } else if (d.type === 'trendline' && d.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(d.points[0].x, d.points[0].y);
          ctx.lineTo(d.points[1].x, d.points[1].y);
          ctx.stroke();
        } else if (d.type === 'rectangle' && d.points.length >= 2) {
          const rw = d.points[1].x - d.points[0].x;
          const rh = d.points[1].y - d.points[0].y;
          ctx.fillStyle = 'rgba(255, 222, 0, 0.12)';
          ctx.fillRect(d.points[0].x, d.points[0].y, rw, rh);
          ctx.strokeRect(d.points[0].x, d.points[0].y, rw, rh);
        } else if (d.type === 'fibonacci' && d.points.length >= 2) {
          const y0 = d.points[0].y;
          const y1 = d.points[1].y;
          const fibLevels = [
            { level: 0, text: '0.0%' },
            { level: 0.236, text: '23.6%' },
            { level: 0.382, text: '38.2%' },
            { level: 0.5, text: '50.0%' },
            { level: 0.618, text: '61.8%' },
            { level: 0.786, text: '78.6%' },
            { level: 1.0, text: '100.0%' },
          ];

          fibLevels.forEach(fib => {
            const fibY = y0 + (y1 - y0) * fib.level;
            ctx.strokeStyle = fib.level === 0.618 ? '#eab308' : 'rgba(255, 255, 255, 0.4)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(0, fibY);
            ctx.lineTo(width - 60, fibY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#ffffff';
            ctx.font = '9px monospace';
            ctx.fillText(`Fib ${fib.text}`, 10, fibY - 3);
          });
        }
      });
    }

    // 8. Interactive Crosshair Cursor
    if (mousePos && mousePos.x < width - 60 && mousePos.y < chartHeight) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, chartHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(width - 60, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip price tag on right axis
      const hoveredPrice = paddedMax - (mousePos.y / chartHeight) * paddedRange;
      ctx.fillStyle = '#374151';
      ctx.fillRect(width - 60, mousePos.y - 9, 58, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(hoveredPrice.toFixed(selectedSymbol.digitPrecision), width - 57, mousePos.y + 3);
    }
  }, [
    candles, 
    chartMode, 
    showSMA, 
    showEMA, 
    showVolume, 
    showRSI, 
    drawings, 
    drawingsVisible, 
    mousePos, 
    selectedSymbol, 
    userOpenPositions
  ]);

  // Canvas Mouse Click Handling for Technical Analysis Tools and Position Badges
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. Check if user clicked on any interactive position badges (Close [✕], [TP], [SL])
    const clickedZone = positionClickZonesRef.current.find(
      z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h
    );

    if (clickedZone) {
      const pos = userOpenPositions.find(p => p.id === clickedZone.posId);
      if (clickedZone.action === 'close') {
        brokerStore.closePosition(clickedZone.posId);
        toast.success(
          `Bitim #${clickedZone.posId.slice(-6)} grafikdan yopildi! PnL: ${pos && pos.pnl >= 0 ? '+' : ''}$${pos?.pnl.toFixed(2) || '0.00'}`
        );
        return;
      } else if (clickedZone.action === 'tp') {
        const curTp = pos?.tp ? String(pos.tp) : '';
        const input = prompt(`Take-Profit (TP) narxini kiriting [${pos?.symbol}]:`, curTp);
        if (input !== null) {
          const val = parseFloat(input);
          brokerStore.updatePositionSlTp(clickedZone.posId, pos?.sl, isNaN(val) ? undefined : val);
          toast.success("Take-Profit o'rnatildi!");
        }
        return;
      } else if (clickedZone.action === 'sl') {
        const curSl = pos?.sl ? String(pos.sl) : '';
        const input = prompt(`Stop-Loss (SL) narxini kiriting [${pos?.symbol}]:`, curSl);
        if (input !== null) {
          const val = parseFloat(input);
          brokerStore.updatePositionSlTp(clickedZone.posId, isNaN(val) ? undefined : val, pos?.tp);
          toast.success("Stop-Loss o'rnatildi!");
        }
        return;
      }
    }

    if (activeDrawingTool === 'horizontal') {
      const newDrawn: DrawnElement = {
        id: `draw_${Date.now()}`,
        type: 'horizontal',
        color: '#ffde00',
        points: [{ x, y }],
        label: `${selectedSymbol.bid}`
      };
      setDrawings(prev => [...prev, newDrawn]);
      toast.success("Gorizontal Support/Resistance chizig'i qo'shildi");
      setActiveDrawingTool('cursor');
    } else if (activeDrawingTool === 'trendline' || activeDrawingTool === 'fibonacci' || activeDrawingTool === 'rectangle') {
      if (!drawingStartPoint) {
        setDrawingStartPoint({ x, y });
        toast.info("Chizishni yakunlash uchun ikkinchi nuqtani bosing");
      } else {
        const newDrawn: DrawnElement = {
          id: `draw_${Date.now()}`,
          type: activeDrawingTool,
          color: activeDrawingTool === 'fibonacci' ? '#38bdf8' : '#ffde00',
          points: [drawingStartPoint, { x, y }],
        };
        setDrawings(prev => [...prev, newDrawn]);
        setDrawingStartPoint(null);
        toast.success(`${activeDrawingTool.toUpperCase()} asbobi muvaffaqiyatli chizildi!`);
        setActiveDrawingTool('cursor');
      }
    } else if (activeDrawingTool === 'eraser') {
      if (drawings.length > 0) {
        setDrawings(prev => prev.slice(0, -1));
        toast.info("Oxirgi chizma o'chirildi");
      }
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Change cursor to pointer if hovering over Exness badge buttons ([✕], [TP], [SL])
    const isHoveringButton = positionClickZonesRef.current.some(
      z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h
    );
    canvas.style.cursor = isHoveringButton ? 'pointer' : 'crosshair';
  }

  return (
    <div className={`w-full bg-[#0a0d0b] text-[#f4f7f2] flex flex-col font-sans select-none overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50 h-screen' : 'h-[calc(100vh-4.5rem)]'
    }`}>
      {/* Mobile Segmented View Mode Switcher (< lg) */}
      <div className="lg:hidden flex items-center bg-[#141916] border-b border-white/10 px-2 py-1 gap-1 shrink-0 overflow-x-auto scrollbar-none text-xs">
        <button
          onClick={() => setMobileViewTab('chart')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all text-[11px] cursor-pointer ${
            mobileViewTab === 'chart' ? 'bg-primary text-black font-extrabold shadow-xs' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          <TrendingUp className="size-3" />
          <span>Grafik</span>
        </button>
        <button
          onClick={() => { setMobileViewTab('order'); setRightPanelTab('order'); }}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all text-[11px] cursor-pointer ${
            mobileViewTab === 'order' ? 'bg-primary text-black font-extrabold shadow-xs' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          <Zap className="size-3" />
          <span>Buyurtma</span>
        </button>
        <button
          onClick={() => { setMobileViewTab('dom'); setRightPanelTab('dom'); }}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all text-[11px] cursor-pointer ${
            mobileViewTab === 'dom' ? 'bg-primary text-black font-extrabold shadow-xs' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          <Layers className="size-3" />
          <span>DOM</span>
        </button>
        <button
          onClick={() => { setMobileViewTab('positions'); setRightPanelTab('positions'); }}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all text-[11px] cursor-pointer ${
            mobileViewTab === 'positions' ? 'bg-primary text-black font-extrabold shadow-xs' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          <BarChart2 className="size-3" />
          <span>Bitimlar ({userOpenPositions.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE: Center Chart + Right Order Execution                    */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* --------------------------------------------------------------------- */}
        {/* CENTER CHART AREA: TradingView Real-Time Chart or Canvas Chart        */}
        {/* --------------------------------------------------------------------- */}
        <main className={`flex-1 flex-col min-w-0 bg-[#0a0d0b] relative overflow-hidden ${
          mobileViewTab === 'chart' ? 'flex w-full h-full' : 'hidden lg:flex'
        }`}>
          {/* Chart Header Bar: Asset Info + Engine Switcher (Exness Pro vs TradingView) + Timeframes + Chart Type + Indicators */}
          <div className="h-11 border-b border-white/10 px-3 flex items-center justify-between gap-2 bg-[#111613] shrink-0 text-xs z-10">
            {/* Left: Symbol Title & Live Spread */}
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-sm text-white tracking-wide">{selectedSymbol.symbol}</span>
              <span className="text-[11px] text-gray-400 hidden sm:inline">{selectedSymbol.name}</span>
              <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                Spred: <strong className="text-primary">{selectedSymbol.spread}</strong> pips
              </span>
            </div>

            {/* Middle: TradingView Terminal Active Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/60 border border-white/15 text-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-extrabold text-white tracking-wide">TradingView Terminal</span>
            </div>

            {/* Right: Timeframe Selector */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10">
                {(['1m', '5m', '15m', '1h', '4h', '1D'] as TimeFrame[]).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      timeframe === tf ? 'bg-primary text-black shadow-xs' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Viewport: Pure Official TradingView Terminal */}
          <TradingViewChart
            symbol={selectedSymbol.symbol}
            interval={timeframe}
            positions={userOpenPositions}
            currentBid={selectedSymbol.bid}
            currentAsk={selectedSymbol.ask}
            onClosePosition={(id) => {
              const pos = userOpenPositions.find(p => p.id === id);
              brokerStore.closePosition(id);
              toast.success(`Bitim #${id.slice(-6)} yopildi! PnL: ${pos && pos.pnl >= 0 ? '+' : ''}$${pos?.pnl.toFixed(2) || '0.00'}`);
            }}
            onUpdateSlTp={(id, sl, tp) => {
              brokerStore.updatePositionSlTp(id, sl, tp);
              toast.success("SL / TP yangilandi!");
            }}
            className="flex-1 w-full h-full"
            onSymbolChange={(symName) => {
              const found = symbols.find(s => s.symbol.replace(/[\/\-_]/g, '').toUpperCase() === symName.replace(/[\/\-_]/g, '').toUpperCase());
              if (found) handleSelectSymbol(found);
            }}
            onQuickTrade={(side) => {
              setOrderSide(side);
              handleExecuteOrder();
            }}
          />
        </main>

        {/* --------------------------------------------------------------------- */}
        {/* C. RIGHT ORDER EXECUTION & ANALYTICS SIDEBAR                          */}
        {/* --------------------------------------------------------------------- */}
        <aside className={`bg-[#111613] border-l border-white/10 flex-col shrink-0 ${
          mobileViewTab === 'order' || mobileViewTab === 'dom' || mobileViewTab === 'positions'
            ? 'flex flex-1 w-full h-full'
            : 'hidden lg:flex w-80 lg:w-96'
        }`}>
          {/* Header Switcher: Order Execution vs Order Book DOM vs Positions vs Calendar */}
          <div className="h-11 border-b border-white/10 flex items-center px-2 bg-[#141916] text-xs font-bold gap-1">
            <button
              onClick={() => setRightPanelTab('order')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 text-[11px] ${
                rightPanelTab === 'order' ? 'bg-primary text-black font-extrabold shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="size-3.5" />
              <span>Buyurtma</span>
            </button>
            <button
              onClick={() => setRightPanelTab('dom')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 text-[11px] ${
                rightPanelTab === 'dom' ? 'bg-primary text-black font-extrabold shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="size-3.5" />
              <span>DOM</span>
            </button>
            <button
              onClick={() => setRightPanelTab('positions')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 text-[11px] ${
                rightPanelTab === 'positions' ? 'bg-primary text-black font-extrabold shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart2 className="size-3.5" />
              <span>Bitimlar ({userOpenPositions.length})</span>
            </button>
            <button
              onClick={() => setRightPanelTab('analytics')}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 text-[11px] ${
                rightPanelTab === 'analytics' ? 'bg-primary text-black font-extrabold shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="size-3.5" />
              <span>Taqvim</span>
            </button>
          </div>

          {/* TAB 1: ORDER EXECUTION FORM */}
          {rightPanelTab === 'order' ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between gap-4">
              <div>
                {/* 1-Click Trading Toggle Mode */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-white">1-Click Trading</div>
                      <div className="text-[10px] text-gray-400">Tezkor tasdiqsiz ijro</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !oneClickTrading;
                      setOneClickTrading(next);
                      brokerStore.setOneClickTrading(next);
                      toast.info(next ? "Bir bosishda savdo (1-Click) faollashtirildi!" : "Bir bosishda savdo o'chirildi");
                    }}
                    className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                      oneClickTrading ? 'bg-primary justify-end' : 'bg-white/20 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-black shadow-md" />
                  </button>
                </div>

                {/* Order Type Tabs: Market | Limit | Stop */}
                <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs mb-4">
                  {(['market', 'limit', 'stop'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setOrderExecutionType(type)}
                      className={`py-1.5 rounded-lg font-bold capitalize transition-all ${
                        orderExecutionType === type ? 'bg-white/15 text-white shadow-xs' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {type === 'market' ? 'Bozor' : type}
                    </button>
                  ))}
                </div>

                {/* Live Buy / Sell Dual Execution Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {/* SELL BUTTON */}
                  <button
                    onClick={() => {
                      setOrderSide('sell');
                      if (oneClickTrading) handleOneClickOrder('sell');
                    }}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                      orderSide === 'sell'
                        ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase text-rose-400">
                      <TrendingDown className="size-3.5" />
                      <span>SELL (Sotish)</span>
                    </div>
                    <div className="font-mono text-base font-black text-white mt-1">
                      {selectedSymbol.bid.toFixed(selectedSymbol.digitPrecision)}
                    </div>
                  </button>

                  {/* BUY BUTTON */}
                  <button
                    onClick={() => {
                      setOrderSide('buy');
                      if (oneClickTrading) handleOneClickOrder('buy');
                    }}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                      orderSide === 'buy'
                        ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase text-primary">
                      <TrendingUp className="size-3.5" />
                      <span>BUY (Xarid)</span>
                    </div>
                    <div className="font-mono text-base font-black text-white mt-1">
                      {selectedSymbol.ask.toFixed(selectedSymbol.digitPrecision)}
                    </div>
                  </button>
                </div>

                {/* Target Price input for Limit / Stop orders */}
                {orderExecutionType !== 'market' && (
                  <div className="mb-4">
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Maqsad narx ({orderExecutionType.toUpperCase()} Price):
                    </label>
                    <input
                      type="number"
                      step={selectedSymbol.digitPrecision === 5 ? "0.00001" : "0.01"}
                      value={targetLimitPrice}
                      onChange={(e) => setTargetLimitPrice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm outline-none focus:border-primary"
                    />
                  </div>
                )}

                {/* Lot / Volume Size Input */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                    <span>Hajm (Lot Size):</span>
                    <span className="font-mono font-bold text-white">{lotSize.toFixed(2)} Lot</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setLotSize(prev => Math.max(0.01, Number((prev - 0.1).toFixed(2))))}
                      className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs"
                    >
                      -0.1
                    </button>
                    <button
                      onClick={() => setLotSize(prev => Math.max(0.01, Number((prev - 0.01).toFixed(2))))}
                      className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs"
                    >
                      -0.01
                    </button>

                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                      value={lotSize}
                      onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
                      className="flex-1 text-center font-mono font-black text-sm bg-white/5 border border-white/10 rounded-xl py-2 text-white outline-none focus:border-primary"
                    />

                    <button
                      onClick={() => setLotSize(prev => Number((prev + 0.01).toFixed(2)))}
                      className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs"
                    >
                      +0.01
                    </button>
                    <button
                      onClick={() => setLotSize(prev => Number((prev + 0.1).toFixed(2)))}
                      className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs"
                    >
                      +0.1
                    </button>
                  </div>

                  {/* Preset Quick Lot Chips */}
                  <div className="grid grid-cols-6 gap-1 mt-2">
                    {[0.01, 0.05, 0.10, 0.50, 1.00, 5.00].map(v => (
                      <button
                        key={v}
                        onClick={() => setLotSize(v)}
                        className={`py-1 rounded-lg text-[10px] font-mono transition-all ${
                          lotSize === v ? 'bg-primary text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Controls: Stop Loss & Take Profit */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Stop Loss (SL)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      step={selectedSymbol.digitPrecision === 5 ? "0.00001" : "0.01"}
                      value={sl}
                      onChange={(e) => setSl(e.target.value)}
                      className="w-full text-xs font-mono bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Take Profit (TP)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      step={selectedSymbol.digitPrecision === 5 ? "0.00001" : "0.01"}
                      value={tp}
                      onChange={(e) => setTp(e.target.value)}
                      className="w-full text-xs font-mono bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Risk and Margin Information Ribbon */}
                <div className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Zaruriy Marja:</span>
                    <span className="font-bold text-white">${requiredMargin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">1 Pip Qiymati:</span>
                    <span className="font-bold text-primary">${estimatedPipValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Kaldıraç (Leverage):</span>
                    <span className="font-bold text-white">1:{leverage}</span>
                  </div>
                </div>
              </div>

              {/* Main Submit Order Button */}
              <button
                onClick={handleExecuteOrder}
                className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-[0.99] cursor-pointer ${
                  orderSide === 'buy'
                    ? 'bg-primary text-black hover:opacity-90 shadow-primary/25'
                    : 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/25'
                }`}
              >
                {orderExecutionType === 'market' 
                  ? `${orderSide.toUpperCase()} ${lotSize} LOT ${selectedSymbol.symbol}`
                  : `JOYLASHTIRISH: ${orderSide.toUpperCase()} ${orderExecutionType.toUpperCase()}`
                }
              </button>
            </div>
          ) : rightPanelTab === 'dom' ? (
            /* TAB 2: REAL-TIME DEPTH OF MARKET (DOM) & ORDER BOOK */
            <div className="flex-1 overflow-hidden flex flex-col">
              <OrderBookDOM
                selectedSymbol={selectedSymbol}
                onSelectPrice={(price) => {
                  setTargetLimitPrice(price.toString());
                  setOrderExecutionType('limit');
                  toast.info(`Limit narxi tanlandi: $${price}`);
                }}
              />
            </div>
          ) : (
            /* TAB 3: ECONOMIC CALENDAR & TRADING SIGNALS */
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Calendar className="size-4 text-primary" />
                  Iqtisodiy Taqvim (Live)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">UTC+3</span>
              </div>

              {/* Filter pills */}
              <div className="flex gap-1">
                {(['all', 'high', 'medium'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setEconomicFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      economicFilter === f ? 'bg-primary text-black' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Barchasi' : `${f} Ta'sir`}
                  </button>
                ))}
              </div>

              {/* Economic Events List */}
              <div className="space-y-2">
                {economicEvents
                  .filter(ev => economicFilter === 'all' || ev.impact === economicFilter)
                  .map(event => (
                    <div 
                      key={event.id}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>{event.time} &bull; {event.countryCode}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                          event.impact === 'high' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {event.impact}
                        </span>
                      </div>
                      <div className="font-bold text-white text-xs mt-1 leading-snug">
                        {event.title}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] font-mono">
                        <div><span className="text-gray-400">Prognoz:</span> {event.forecast || '-'}</div>
                        <div><span className="text-gray-400">Avvalgi:</span> {event.previous || '-'}</div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Trading Central Sentiment Card */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 via-white/5 to-transparent border border-primary/20 mt-auto">
                <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                  <span className="flex items-center gap-1.5">
                    <Flame className="size-3.5 text-primary" />
                    Bozor Kayfiyati ({selectedSymbol.symbol})
                  </span>
                  <span className="text-primary font-mono text-[11px]">68% Xaridorlar</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
                  <div className="h-full bg-primary" style={{ width: '68%' }} />
                  <div className="h-full bg-rose-500" style={{ width: '32%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
                  <span>BUY 68%</span>
                  <span>SELL 32%</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVE POSITIONS & TRADES */}
          {rightPanelTab === 'positions' && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {/* Financial Metrics Summary Strip */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-gray-400 block">Ekvit</span>
                  <strong className="text-white">${selectedAccount?.equity.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Erkin Marja</span>
                  <strong className="text-white">${selectedAccount?.freeMargin.toFixed(2)}</strong>
                </div>
                <div className="col-span-2 pt-1 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Jami Suzuvchi P&L:</span>
                  <strong className={totalFloatingPnl >= 0 ? 'text-primary' : 'text-rose-400'}>
                    {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Sub-tabs: Positions vs Pending vs History */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-[11px]">
                <button
                  onClick={() => setBottomTab('positions')}
                  className={`flex-1 py-1 rounded-lg font-bold transition-all text-center cursor-pointer ${
                    bottomTab === 'positions' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Ochiq ({userOpenPositions.length})
                </button>
                <button
                  onClick={() => setBottomTab('pending')}
                  className={`flex-1 py-1 rounded-lg font-bold transition-all text-center cursor-pointer ${
                    bottomTab === 'pending' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Kutilayotgan ({userPendingOrders.length})
                </button>
                <button
                  onClick={() => setBottomTab('history')}
                  className={`flex-1 py-1 rounded-lg font-bold transition-all text-center cursor-pointer ${
                    bottomTab === 'history' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Tarix ({userClosedPositions.length})
                </button>
              </div>

              {/* Emergency Close All Button */}
              {bottomTab === 'positions' && userOpenPositions.length > 0 && (
                <button
                  onClick={handleCloseAllPositions}
                  className="w-full py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-extrabold text-xs transition-colors border border-rose-500/30 cursor-pointer"
                >
                  Barcha Bitimlarni Yopish ({userOpenPositions.length})
                </button>
              )}

              {/* List of Items */}
              {bottomTab === 'positions' && (
                userOpenPositions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-gray-500">
                    <BarChart2 className="size-8 stroke-[1.5] mb-2 opacity-60 text-primary" />
                    <div className="text-xs font-bold text-gray-300">Faol bitimlar yo'q</div>
                    <div className="text-[10px] text-gray-500 mt-1">Buyurtma bo'limidan yangi savdo ochishingiz mumkin</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userOpenPositions.map(pos => {
                      const isProfit = pos.pnl >= 0;
                      return (
                        <div key={pos.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white">{pos.symbol}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-black ${
                                pos.side === 'buy' ? 'bg-primary/20 text-primary' : 'bg-rose-500/20 text-rose-400'
                              }`}>
                                {pos.side} {pos.lotSize.toFixed(2)}
                              </span>
                            </div>
                            <span className={`font-black ${isProfit ? 'text-primary' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}${pos.pnl.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                            <span>Kirish: <strong className="text-white">{pos.openPrice}</strong></span>
                            <span>Joriy: <strong className="text-white">{pos.currentPrice}</strong></span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 pt-1 border-t border-white/5">
                            <span>SL: {pos.sl || '-'} / TP: {pos.tp || '-'}</span>
                            <span>Swap: ${pos.swap.toFixed(2)}</span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                            <button
                              onClick={() => {
                                setEditPositionModal(pos);
                                setEditSlValue(pos.sl ? pos.sl.toString() : '');
                                setEditTpValue(pos.tp ? pos.tp.toString() : '');
                              }}
                              className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold cursor-pointer"
                            >
                              SL/TP
                            </button>
                            <button
                              onClick={() => {
                                setPartialCloseModal(pos);
                                setPartialLotSize(Number((pos.lotSize / 2).toFixed(2)) || 0.01);
                              }}
                              className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-amber-300 text-[11px] font-bold cursor-pointer"
                            >
                              Qisman
                            </button>
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="flex-1 py-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[11px] font-black cursor-pointer"
                            >
                              Yopish (X)
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {bottomTab === 'pending' && (
                userPendingOrders.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-gray-500">
                    <Clock className="size-8 stroke-[1.5] mb-2 opacity-60 text-amber-400" />
                    <div className="text-xs font-bold text-gray-300">Kechiktirilgan buyurtmalar yo'q</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userPendingOrders.map(order => (
                      <div key={order.id} className="p-3 rounded-xl bg-white/5 border border-white/5 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-white">{order.symbol}</span>
                          <span className="text-amber-300 uppercase font-bold text-[10px]">{order.type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                          <span>Maqsad: <strong className="text-primary">{order.targetPrice}</strong></span>
                          <span>Lot: {order.lotSize}</span>
                        </div>
                        <button
                          onClick={() => {
                            brokerStore.cancelPendingOrder(order.id);
                            toast.info(`Buyurtma #${order.id.slice(-6)} bekor qilindi`);
                          }}
                          className="w-full mt-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer"
                        >
                          Bekor qilish
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}

              {bottomTab === 'history' && (
                userClosedPositions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-gray-500">
                    <CheckCircle className="size-8 stroke-[1.5] mb-2 opacity-60 text-primary" />
                    <div className="text-xs font-bold text-gray-300">Yopilgan savdolar tarixi bo'sh</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userClosedPositions.map(pos => {
                      const isProfit = pos.pnl >= 0;
                      return (
                        <div key={pos.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{pos.symbol} ({pos.side})</span>
                            <span className={`font-black ${isProfit ? 'text-primary' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}${pos.pnl.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                            <span>Lot: {pos.lotSize} &bull; {pos.openPrice} &rarr; {pos.closePrice || pos.currentPrice}</span>
                            <span>{pos.closedAt ? new Date(pos.closedAt).toLocaleTimeString() : ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS: Edit SL/TP Modal & Partial Close Modal                         */}
      {/* ========================================================================= */}
      {editPositionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141916] rounded-2xl border border-white/10 p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <span className="font-extrabold text-sm text-white">
                SL/TP O'zgartirish #{editPositionModal.id.slice(-6)}
              </span>
              <button 
                onClick={() => setEditPositionModal(null)} 
                className="text-gray-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Stop Loss Narxi:</label>
                <input
                  type="number"
                  step="0.0001"
                  value={editSlValue}
                  onChange={(e) => setEditSlValue(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Take Profit Narxi:</label>
                <input
                  type="number"
                  step="0.0001"
                  value={editTpValue}
                  onChange={(e) => setEditTpValue(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => setEditPositionModal(null)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => {
                    brokerStore.updatePositionSlTp(
                      editPositionModal.id,
                      editSlValue ? parseFloat(editSlValue) : undefined,
                      editTpValue ? parseFloat(editTpValue) : undefined
                    );
                    toast.success("Pozitsiya SL/TP saqlandi!");
                    setEditPositionModal(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-primary text-black font-extrabold"
                >
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Partial Close Modal */}
      {partialCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141916] rounded-2xl border border-white/10 p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <span className="font-extrabold text-sm text-white">
                Pozitsiyani Qisman Yopish #{partialCloseModal.id.slice(-6)}
              </span>
              <button 
                onClick={() => setPartialCloseModal(null)} 
                className="text-gray-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="text-gray-300">
                Mavjud hajm: <strong className="text-white">{partialCloseModal.lotSize} Lot</strong>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Yopiladigan hajm (Lot):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={partialCloseModal.lotSize}
                  value={partialLotSize}
                  onChange={(e) => setPartialLotSize(parseFloat(e.target.value) || 0.01)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400 text-sm font-bold"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => setPartialCloseModal(null)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => {
                    brokerStore.partialClosePosition(partialCloseModal.id, partialLotSize);
                    toast.success(`${partialLotSize} lot qisman yopildi!`);
                    setPartialCloseModal(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-amber-400 text-black font-extrabold"
                >
                  Qisman Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
