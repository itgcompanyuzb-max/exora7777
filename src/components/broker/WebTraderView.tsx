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
  X, 
  Layers, 
  Clock, 
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Maximize2,
  Minimize2,
  Zap,
  Calendar,
  Eye,
  Plus,
  Bell,
  Grid,
  User,
  Sliders,
  Camera,
  Undo2,
  Redo2,
  Save,
  Activity,
  ListFilter,
  Check,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  ShieldCheck,
  Wallet,
  HelpCircle,
  ExternalLink,
  Edit2,
  Trash2,
  TrendingUp,
  BarChart2
} from "lucide-react";
import { toast } from "sonner";
import { TradingViewChart } from "../trading/TradingViewChart";
import { liveMarketFeed, LiveMarketStatus } from "../../lib/liveMarketFeed";

interface WebTraderViewProps {
  lang: Language;
  onOpenDeposit: () => void;
  onReturnToCabinet?: () => void;
}

type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W';
type ChartStyleType = 'candles' | 'line' | 'area' | 'bars';

export function WebTraderView({ lang, onOpenDeposit, onReturnToCabinet }: WebTraderViewProps) {
  const t = translations[lang];
  const [symbols, setSymbols] = useState<ForexSymbolRate[]>(brokerStore.getSymbols());

  // Default active symbol: Gold (XAU/USD) matching screenshot
  const [selectedSymbol, setSelectedSymbol] = useState<ForexSymbolRate>(() => {
    const syms = brokerStore.getSymbols();
    return syms.find(s => s.symbol === 'XAU/USD') || syms[0];
  });

  // Active Market Tabs matching screenshot: USOIL, BTC, EUR/USD, XAU/USD
  const [openMarketTabs, setOpenMarketTabs] = useState<string[]>([
    'USOIL', 'BTC', 'EUR/USD', 'XAU/USD'
  ]);

  const [accounts, setAccounts] = useState<TradingAccount[]>(brokerStore.getAccounts());
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | undefined>(() => {
    const accs = brokerStore.getAccounts();
    return accs.find(a => a.isDemo && a.accountType === 'pro') || accs.find(a => a.accountNumber === '4198205') || accs[0];
  });

  const [positions, setPositions] = useState<Position[]>(brokerStore.getPositions());
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(brokerStore.getPendingOrders());
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>(brokerStore.getEconomicEvents());

  // Chart Controls matching Exness
  const [timeframe, setTimeframe] = useState<TimeFrame>('1m');
  const [chartStyle, setChartStyle] = useState<ChartStyleType>('candles');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showChartStyleDropdown, setShowChartStyleDropdown] = useState(false);
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [indicators, setIndicators] = useState({
    sma: true,
    ema: true,
    rsi: false,
    bollinger: false,
    volume: true,
  });

  // Lot size & execution matching screenshot (Lots: 0.01)
  const [lotSize, setLotSize] = useState<number>(0.01);
  const [showRightOrderPanel, setShowRightOrderPanel] = useState<boolean>(false);
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderExecutionType, setOrderExecutionType] = useState<'market' | 'limit' | 'stop'>('market');
  const [targetLimitPrice, setTargetLimitPrice] = useState<string>('');
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');

  // Bottom Tray State: Open, Pending, Closed
  const [bottomTab, setBottomTab] = useState<'open' | 'pending' | 'closed'>('open');
  const [bottomTrayExpanded, setBottomTrayExpanded] = useState<boolean>(false);

  // Guide & Education Modal
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Top header popovers & modals
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState('');

  // Left sidebar drawers
  const [activeLeftDrawer, setActiveLeftDrawer] = useState<'none' | 'watchlist' | 'calendar' | 'alerts' | 'api' | 'settings'>('none');
  const [alertPrice, setAlertPrice] = useState<string>('');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Subscribe to broker store
  useEffect(() => {
    const unsub = brokerStore.subscribe(() => {
      setSymbols(brokerStore.getSymbols());
      setPositions(brokerStore.getPositions());
      setPendingOrders(brokerStore.getPendingOrders());
      setEconomicEvents(brokerStore.getEconomicEvents());
      const accs = brokerStore.getAccounts();
      setAccounts(accs);
    });
    return unsub;
  }, []);

  // Update live price simulation for current symbol
  useEffect(() => {
    const timer = setInterval(() => {
      setSelectedSymbol(prev => {
        if (!prev) return prev;
        const change = (Math.random() - 0.49) * (prev.spread * 0.1);
        const newBid = Math.max(0.001, prev.bid + change);
        const newAsk = newBid + prev.spread;
        return {
          ...prev,
          bid: Number(newBid.toFixed(prev.digitPrecision)),
          ask: Number(newAsk.toFixed(prev.digitPrecision)),
        };
      });
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  // Filter positions for active user / account
  const userOpenPositions = useMemo(() => {
    if (!selectedAccount) return positions;
    return positions.filter(p => p.accountId === selectedAccount.id && p.status === 'open');
  }, [positions, selectedAccount]);

  const userPendingOrders = useMemo(() => {
    if (!selectedAccount) return pendingOrders;
    return pendingOrders.filter(o => o.accountId === selectedAccount.id && (o.status === 'pending' || (o as any).status === 'active'));
  }, [pendingOrders, selectedAccount]);

  const userClosedPositions = useMemo(() => {
    if (!selectedAccount) return [];
    return positions.filter(p => p.accountId === selectedAccount.id && p.status === 'closed');
  }, [positions, selectedAccount]);

  // Account Financial Calculations
  const totalFloatingPnl = useMemo(() => {
    return userOpenPositions.reduce((acc, p) => acc + (p.pnl || 0), 0);
  }, [userOpenPositions]);

  const currentEquity = useMemo(() => {
    const bal = selectedAccount?.balance ?? 1315.31;
    return Number((bal + totalFloatingPnl).toFixed(2));
  }, [selectedAccount, totalFloatingPnl]);

  const usedMargin = useMemo(() => {
    return userOpenPositions.reduce((acc, p) => acc + (p.margin || 0), 0);
  }, [userOpenPositions]);

  const freeMargin = useMemo(() => {
    return Math.max(0, currentEquity - usedMargin);
  }, [currentEquity, usedMargin]);

  // Execute 1-Click Order (Instant from chart toolbar)
  function handleOneClickTrade(side: 'buy' | 'sell') {
    if (!selectedAccount) return;
    try {
      const price = side === 'buy' ? selectedSymbol.ask : selectedSymbol.bid;
      brokerStore.openPosition({
        accountId: selectedAccount.id,
        symbol: selectedSymbol.symbol,
        side,
        lotSize: Math.max(0.01, lotSize),
      });

      toast.success(
        `${side.toUpperCase()} #${Math.floor(100000 + Math.random() * 900000)} ochildi: ${lotSize} lot ${selectedSymbol.symbol} @ ${price}`
      );
    } catch (err: any) {
      toast.error(err.message || "Bitim ochishda xatolik");
    }
  }

  // Execute Advanced or Pending Order from Drawer
  function handlePlaceAdvancedOrder() {
    if (!selectedAccount) return;
    try {
      if (orderExecutionType === 'market') {
        const price = orderSide === 'buy' ? selectedSymbol.ask : selectedSymbol.bid;
        brokerStore.openPosition({
          accountId: selectedAccount.id,
          symbol: selectedSymbol.symbol,
          side: orderSide,
          lotSize: Math.max(0.01, lotSize),
          sl: sl ? parseFloat(sl) : undefined,
          tp: tp ? parseFloat(tp) : undefined,
        });
        toast.success(
          `${orderSide.toUpperCase()} bitim ochildi: ${lotSize} lot ${selectedSymbol.symbol} @ ${price}`
        );
      } else {
        const target = parseFloat(targetLimitPrice);
        if (isNaN(target) || target <= 0) {
          toast.error("Iltimos, to'g'ri maqsadli narxni kiriting!");
          return;
        }
        const pendingType = orderExecutionType === 'limit'
          ? (orderSide === 'buy' ? 'buy_limit' : 'sell_limit')
          : (orderSide === 'buy' ? 'buy_stop' : 'sell_stop');

        brokerStore.createPendingOrder({
          accountId: selectedAccount.id,
          symbol: selectedSymbol.symbol,
          type: pendingType,
          lotSize: Math.max(0.01, lotSize),
          targetPrice: target,
          sl: sl ? parseFloat(sl) : undefined,
          tp: tp ? parseFloat(tp) : undefined,
        });
        toast.success(`${pendingType.toUpperCase()} buyurtma qo'yildi: @ ${target}`);
        setBottomTab('pending');
        setBottomTrayExpanded(true);
      }
      setShowRightOrderPanel(false);
    } catch (err: any) {
      toast.error(err.message || "Buyurtma berishda xatolik");
    }
  }

  // Switch symbol
  function handleSelectSymbol(sym: ForexSymbolRate) {
    setSelectedSymbol(sym);
    if (!openMarketTabs.includes(sym.symbol)) {
      setOpenMarketTabs(prev => [...prev, sym.symbol]);
    }
    setShowSymbolPicker(false);
  }

  function handleCloseTab(symName: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (openMarketTabs.length <= 1) return;
    const remaining = openMarketTabs.filter(s => s !== symName);
    setOpenMarketTabs(remaining);
    if (selectedSymbol.symbol === symName) {
      const nextSym = symbols.find(s => s.symbol === remaining[0]) || symbols[0];
      setSelectedSymbol(nextSym);
    }
  }

  // Stepper lot size
  function changeLot(delta: number) {
    setLotSize(prev => {
      const next = Math.max(0.01, Number((prev + delta).toFixed(2)));
      return next;
    });
  }

  return (
    <div className="w-full h-screen bg-[#111417] text-[#f4f7f2] flex flex-col font-sans select-none overflow-hidden text-xs">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR (Exact 1:1 replica of Exness WebTrader)                   */}
      {/* ========================================================================= */}
      <header className="h-11 bg-[#111618] border-b border-[#1f262b] px-2 flex items-center justify-between shrink-0 z-30 select-none">
        {/* Left: Yellow Exness Logo + Market Tabs */}
        <div className="flex items-center h-full overflow-x-auto scrollbar-none gap-1">
          {/* Yellow Exness 'ex' Logo */}
          <div 
            onClick={() => onReturnToCabinet ? onReturnToCabinet() : onOpenDeposit()}
            className="flex items-center gap-1.5 cursor-pointer mr-2 shrink-0 group"
            title="Exness Terminal Boshqaruv Paneli"
          >
            <div className="w-7 h-7 rounded-lg bg-[#ffde00] group-hover:scale-105 transition-transform flex items-center justify-center font-black text-black text-xs tracking-tighter shadow-sm select-none">
              ex
            </div>
          </div>

          {/* Market Tabs: USOIL, BTC, EUR/USD, XAU/USD */}
          <div className="flex items-center h-full">
            {openMarketTabs.map(tabSymbol => {
              const isActive = selectedSymbol.symbol === tabSymbol;
              return (
                <div
                  key={tabSymbol}
                  onClick={() => {
                    const found = symbols.find(s => s.symbol === tabSymbol);
                    if (found) setSelectedSymbol(found);
                  }}
                  className={`h-full flex items-center gap-2 px-3 border-r border-[#1f262b] cursor-pointer transition-colors relative ${
                    isActive 
                      ? 'bg-[#181d21] text-white font-bold' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#14181b]'
                  }`}
                >
                  {/* Symbol Icon */}
                  {tabSymbol === 'USOIL' && (
                    <div className="w-4 h-4 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-[10px] text-gray-200">
                      💧
                    </div>
                  )}
                  {tabSymbol === 'BTC' && (
                    <div className="w-4 h-4 rounded-full bg-[#f7931a] text-white flex items-center justify-center text-[9px] font-bold">
                      ₿
                    </div>
                  )}
                  {tabSymbol === 'EUR/USD' && (
                    <div className="flex items-center -space-x-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-700 border border-black/50 flex items-center justify-center text-[7px] text-yellow-300 font-bold">€</div>
                      <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-black/50 flex items-center justify-center text-[7px] text-white font-bold">$</div>
                    </div>
                  )}
                  {tabSymbol === 'XAU/USD' && (
                    <div className="w-4 h-3.5 rounded-xs bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border border-amber-300/40 flex items-center justify-center text-[7px] text-black font-black">
                      AU
                    </div>
                  )}

                  <span className="text-[11px] font-semibold tracking-wide">{tabSymbol}</span>

                  {/* Close Tab X on hover if more than 1 tab */}
                  {openMarketTabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(tabSymbol, e)}
                      className="opacity-0 hover:opacity-100 p-0.5 hover:text-rose-400 rounded transition-opacity"
                    >
                      <X className="size-3" />
                    </button>
                  )}

                  {/* Active Gold Bottom Line indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ffde00]" />
                  )}
                </div>
              );
            })}

            {/* Plus Tab: Search & Add Market */}
            <div className="relative">
              <button
                onClick={() => setShowSymbolPicker(!showSymbolPicker)}
                className="h-full px-2.5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Bozor qo'shish"
              >
                <Plus className="size-4" />
              </button>

              {/* Symbol Picker Dropdown */}
              {showSymbolPicker && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[#14181b] border border-[#262c33] rounded-xl shadow-2xl p-2.5 z-50">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#0e1113] rounded-lg border border-[#22282e] mb-2">
                    <Search className="size-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Qidiruv (BTC, XAU, EUR...)"
                      value={symbolSearchQuery}
                      onChange={e => setSymbolSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {symbols
                      .filter(s => s.symbol.toLowerCase().includes(symbolSearchQuery.toLowerCase()) || s.name.toLowerCase().includes(symbolSearchQuery.toLowerCase()))
                      .map(s => (
                        <div
                          key={s.symbol}
                          onClick={() => handleSelectSymbol(s)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs transition-colors"
                        >
                          <div>
                            <div className="font-bold text-white">{s.symbol}</div>
                            <div className="text-[10px] text-gray-400">{s.name}</div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-white font-semibold">{s.bid}</div>
                            <div className="text-[10px] text-primary">{s.spread} pip</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Account Chip + Notification Bell + 9-Dots Grid + Profile Avatar + Deposit Button */}
        <div className="flex items-center gap-2.5">
          {/* Account Info Chip with Dropdown */}
          <div className="relative">
            <div 
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-[#1f262b]"
            >
              <div className="flex flex-col items-end leading-none">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="px-1 py-0.2 bg-[#0e3a22] text-[#4ade80] rounded text-[9px] font-extrabold tracking-tight">
                    {selectedAccount?.isDemo ? 'Demo' : 'Real'}
                  </span>
                  <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wider">
                    {selectedAccount?.accountType || 'Pro'}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-bold text-white text-xs">
                  <span>{currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                  <ChevronDown className="size-3 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Account Switcher Popover */}
            {showAccountMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#14181b] border border-[#262c33] rounded-2xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-[#22282e] mb-2 text-xs">
                  <span className="font-bold text-white">Savdo Hisoblari</span>
                  <button 
                    onClick={onOpenDeposit}
                    className="text-primary hover:underline text-[11px] font-bold"
                  >
                    + Hisob ochish
                  </button>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {accounts.map(acc => (
                    <div
                      key={acc.id}
                      onClick={() => {
                        setSelectedAccount(acc);
                        setShowAccountMenu(false);
                        toast.success(`Hisob tanlandi: #${acc.accountNumber} (${acc.accountType.toUpperCase()})`);
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        selectedAccount?.id === acc.id 
                          ? 'bg-[#182025] border-primary/40' 
                          : 'bg-[#0f1214] border-transparent hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-white">#{acc.accountNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          acc.isDemo ? 'bg-emerald-950/60 text-emerald-400' : 'bg-blue-950/60 text-blue-400'
                        }`}>
                          {acc.isDemo ? 'Demo' : 'Real'} · {acc.accountType}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="text-gray-400">{acc.server}</span>
                        <span className="font-bold text-white font-mono">${acc.balance.toFixed(2)} USD</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bell Icon with Red Notification Dot */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 rounded-md hover:bg-white/5 text-gray-300 hover:text-white transition-colors cursor-pointer relative"
              title="Bildirishnomalar"
            >
              <Bell className="size-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#14181b] border border-[#262c33] rounded-2xl shadow-2xl p-3 z-50">
                <div className="font-bold text-white text-xs border-b border-[#22282e] pb-1.5 mb-2">
                  Xabarlar va Eslatmalar
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                    <div className="font-bold text-emerald-400">Bozor faol holatda</div>
                    <div className="text-gray-400 text-[10px] mt-0.5">XAU/USD va asosiy kripto juftliklarida spred minimal darajada.</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                    <div className="font-bold text-amber-400">Iqtisodiy yangiliklar</div>
                    <div className="text-gray-400 text-[10px] mt-0.5">Bugun AQSH savdo balansi va NFP kutilmoqda.</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 9-Dot Grid Apps Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowAppMenu(!showAppMenu)}
              className="p-1.5 rounded-md hover:bg-white/5 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Exness Ilovalari"
            >
              <Grid className="size-4" />
            </button>

            {showAppMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#14181b] border border-[#262c33] rounded-2xl shadow-2xl p-3 z-50">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Xizmatlar</div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { setShowAppMenu(false); onReturnToCabinet?.(); }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1.5 text-center transition-colors cursor-pointer"
                  >
                    <Wallet className="size-5 text-primary" />
                    <span className="text-[11px] font-bold text-white">Kabinet</span>
                  </button>
                  <button 
                    onClick={() => { setShowAppMenu(false); setActiveLeftDrawer('calendar'); }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1.5 text-center transition-colors cursor-pointer"
                  >
                    <Calendar className="size-5 text-blue-400" />
                    <span className="text-[11px] font-bold text-white">Taqvim</span>
                  </button>
                  <button 
                    onClick={() => { setShowAppMenu(false); setActiveLeftDrawer('alerts'); }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1.5 text-center transition-colors cursor-pointer"
                  >
                    <Clock className="size-5 text-amber-400" />
                    <span className="text-[11px] font-bold text-white">Alertlar</span>
                  </button>
                  <button 
                    onClick={() => { setShowAppMenu(false); setActiveLeftDrawer('api'); }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1.5 text-center transition-colors cursor-pointer"
                  >
                    <span className="text-base font-bold font-mono text-purple-400">{'{}'}</span>
                    <span className="text-[11px] font-bold text-white">API Bot</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar Icon */}
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center text-gray-200 hover:text-white transition-colors cursor-pointer"
              title="Foydalanuvchi Profili"
            >
              <User className="size-3.5" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#14181b] border border-[#262c33] rounded-2xl shadow-2xl p-3 z-50">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#22282e] mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[#ffde00] text-black font-black flex items-center justify-center text-xs">
                    EX
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">Avazjon Ergashev</div>
                    <div className="text-[10px] text-gray-400">VIP Pro Treyder</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <button 
                    onClick={() => { setShowProfileMenu(false); onReturnToCabinet?.(); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white flex items-center gap-2 cursor-pointer"
                  >
                    <Wallet className="size-3.5 text-primary" />
                    <span>Shaxsiy Kabinetga o'tish</span>
                  </button>
                  <button 
                    onClick={() => { setShowProfileMenu(false); onOpenDeposit(); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="size-3.5 text-emerald-400" />
                    <span>Mablag' kiritish (Deposit)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Savdo Qo'llanmasi (5 Core Features Guide) */}
          <button 
            onClick={() => setShowGuideModal(true)}
            className="p-1.5 rounded-md hover:bg-white/5 text-gray-300 hover:text-[#ffde00] transition-colors cursor-pointer"
            title="Terminal Savdo Qo'llanmasi (5 asosiy bo'lim)"
          >
            <HelpCircle className="size-4" />
          </button>

          {/* Deposit Button: Dark Teal matching Exness */}
          <button 
            onClick={onOpenDeposit}
            className="px-3.5 py-1.5 rounded-md bg-[#18373b] hover:bg-[#20494f] text-[#b6e3e9] border border-[#26555c] text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Deposit
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE: Left Sidebar + Chart & Chart Toolbar + Bottom Tray      */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* FAR LEFT VERTICAL ICON SIDEBAR (44px wide) */}
        <aside className="w-11 bg-[#111618] border-r border-[#1f262b] flex flex-col justify-between items-center py-2 shrink-0 z-20">
          <div className="flex flex-col items-center gap-3">
            {/* 1. Watchlist (List with checkbox) */}
            <button
              onClick={() => setActiveLeftDrawer(activeLeftDrawer === 'watchlist' ? 'none' : 'watchlist')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                activeLeftDrawer === 'watchlist' ? 'bg-[#ffde00] text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="Bozorlar ro'yxati (Watchlist)"
            >
              <ListFilter className="size-4" />
            </button>

            {/* 2. Economic Calendar */}
            <button
              onClick={() => setActiveLeftDrawer(activeLeftDrawer === 'calendar' ? 'none' : 'calendar')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                activeLeftDrawer === 'calendar' ? 'bg-[#ffde00] text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="Iqtisodiy Taqvim"
            >
              <Calendar className="size-4" />
            </button>

            {/* 3. Alerts */}
            <button
              onClick={() => setActiveLeftDrawer(activeLeftDrawer === 'alerts' ? 'none' : 'alerts')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                activeLeftDrawer === 'alerts' ? 'bg-[#ffde00] text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="Narx signallari (Alerts)"
            >
              <Clock className="size-4" />
            </button>

            {/* 4. API Code {} */}
            <button
              onClick={() => setActiveLeftDrawer(activeLeftDrawer === 'api' ? 'none' : 'api')}
              className={`p-2 rounded-lg transition-colors cursor-pointer font-mono font-bold ${
                activeLeftDrawer === 'api' ? 'bg-[#ffde00] text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="Savdo API va Webhooklar"
            >
              {'{}'}
            </button>
          </div>

          {/* Bottom Settings Gear */}
          <button
            onClick={() => setActiveLeftDrawer(activeLeftDrawer === 'settings' ? 'none' : 'settings')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              activeLeftDrawer === 'settings' ? 'bg-[#ffde00] text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Terminal Sozlamalari"
          >
            <Sliders className="size-4" />
          </button>
        </aside>

        {/* SLIDE-OUT LEFT DRAWERS */}
        {activeLeftDrawer === 'watchlist' && (
          <div className="w-72 bg-[#13171a] border-r border-[#1f262b] flex flex-col z-30 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="h-10 border-b border-[#1f262b] px-3 flex items-center justify-between">
              <span className="font-bold text-white text-xs">Bozorlar (Watchlist)</span>
              <button onClick={() => setActiveLeftDrawer('none')} className="text-gray-400 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-2 border-b border-[#1f262b]">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0d1012] rounded-lg border border-[#22282e]">
                <Search className="size-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Qidirish..."
                  value={symbolSearchQuery}
                  onChange={e => setSymbolSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-gray-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#1f262b]/50">
              {symbols
                .filter(s => s.symbol.toLowerCase().includes(symbolSearchQuery.toLowerCase()))
                .map(sym => (
                  <div
                    key={sym.symbol}
                    onClick={() => handleSelectSymbol(sym)}
                    className={`p-2.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors ${
                      selectedSymbol.symbol === sym.symbol ? 'bg-white/5' : ''
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{sym.symbol}</div>
                      <div className="text-[10px] text-gray-400">{sym.name}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs text-white font-bold">{sym.bid}</div>
                      <div className="text-[10px] text-primary">{sym.spread} pip</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeLeftDrawer === 'calendar' && (
          <div className="w-80 bg-[#13171a] border-r border-[#1f262b] flex flex-col z-30 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="h-10 border-b border-[#1f262b] px-3 flex items-center justify-between">
              <span className="font-bold text-white text-xs">Iqtisodiy Taqvim (News)</span>
              <button onClick={() => setActiveLeftDrawer('none')} className="text-gray-400 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {economicEvents.map(evt => (
                <div key={evt.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{evt.country} · {evt.time}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      evt.impact === 'high' ? 'bg-red-950 text-red-400 border border-red-500/30' : 'bg-amber-950 text-amber-400'
                    }`}>
                      {evt.impact === 'high' ? 'III Yuqori' : 'O\'rta'}
                    </span>
                  </div>
                  <div className="text-gray-300 font-medium text-[11px]">{evt.title}</div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400">
                    <span>Haqiqiy: <strong className="text-white">{evt.actual || '--'}</strong></span>
                    <span>Prognoz: <strong className="text-white">{evt.forecast || '--'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CENTER CONTENT: Chart Toolbar + TradingView Chart Viewport + Bottom Tray */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* ========================================================================= */}
          {/* CHART TOP TOOLBAR (Matching Exness layout 1:1)                             */}
          {/* ========================================================================= */}
          <div className="h-10 bg-[#111618] border-b border-[#1f262b] px-2.5 flex items-center justify-between gap-2 shrink-0 z-20 text-xs">
            {/* Left Tools: [+], [1m], [Candles], [fx Indicators], [Grid], Undo, Redo, Save, Camera, Fullscreen */}
            <div className="flex items-center gap-1.5">
              {/* Compare (+) */}
              <button 
                onClick={() => setShowSymbolPicker(true)}
                className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Bozorlarni taqqoslash (+)"
              >
                <Plus className="size-4" />
              </button>

              <div className="h-4 w-px bg-[#1f262b]" />

              {/* Timeframe selector (1m) */}
              <div className="relative">
                <button
                  onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
                  className="px-2 py-1 rounded hover:bg-white/5 text-white font-mono font-bold flex items-center gap-1 cursor-pointer"
                  title="Taymfreym tanlash"
                >
                  <span>{timeframe}</span>
                  <ChevronDown className="size-3 text-gray-400" />
                </button>

                {showTimeframeDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-24 bg-[#14181b] border border-[#262c33] rounded-xl shadow-2xl p-1.5 z-50 font-mono">
                    {(['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W'] as TimeFrame[]).map(tf => (
                      <button
                        key={tf}
                        onClick={() => {
                          setTimeframe(tf);
                          setShowTimeframeDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          timeframe === tf ? 'bg-[#ffde00] text-black' : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chart Style (Candles icon) */}
              <button
                onClick={() => toast.info("Shamlar rejimi: Shamlar")}
                className="p-1 rounded hover:bg-white/5 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Grafik turi: Shamlar (Candles)"
              >
                <BarChart2 className="size-4 rotate-90" />
              </button>

              {/* fx Indicators */}
              <button
                onClick={() => setShowIndicatorsModal(!showIndicatorsModal)}
                className="px-2 py-1 rounded hover:bg-white/5 text-gray-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                title="Indikatorlar (fx Indicators)"
              >
                <span className="italic font-serif font-bold text-gray-400">fx</span>
                <span>Indicators</span>
              </button>

              {/* Indicators Dropdown */}
              {showIndicatorsModal && (
                <div className="absolute top-20 left-28 w-56 bg-[#14181b] border border-[#262c33] rounded-2xl shadow-2xl p-3 z-50 space-y-2">
                  <div className="font-bold text-white text-xs border-b border-[#22282e] pb-1.5">
                    Texnik Ko'rsatkichlar
                  </div>
                  <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer">
                    <span>SMA (Moving Average)</span>
                    <input 
                      type="checkbox" 
                      checked={indicators.sma} 
                      onChange={e => setIndicators({ ...indicators, sma: e.target.checked })} 
                      className="accent-[#ffde00]"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer">
                    <span>EMA 50 (Exponential)</span>
                    <input 
                      type="checkbox" 
                      checked={indicators.ema} 
                      onChange={e => setIndicators({ ...indicators, ema: e.target.checked })} 
                      className="accent-[#ffde00]"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer">
                    <span>Bollinger Bands</span>
                    <input 
                      type="checkbox" 
                      checked={indicators.bollinger} 
                      onChange={e => setIndicators({ ...indicators, bollinger: e.target.checked })} 
                      className="accent-[#ffde00]"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer">
                    <span>RSI 14 (Relative Strength)</span>
                    <input 
                      type="checkbox" 
                      checked={indicators.rsi} 
                      onChange={e => setIndicators({ ...indicators, rsi: e.target.checked })} 
                      className="accent-[#ffde00]"
                    />
                  </label>
                </div>
              )}

              {/* Grid split icon */}
              <button 
                onClick={() => toast.info("Ko'p grafikli rejim tanlandi")}
                className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Grafik taqsimoti"
              >
                <Grid className="size-3.5" />
              </button>

              <div className="h-4 w-px bg-[#1f262b]" />

              {/* Undo / Redo */}
              <button 
                onClick={() => toast.info("Bekor qilindi")}
                className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Bekor qilish (Undo)"
              >
                <Undo2 className="size-3.5" />
              </button>
              <button 
                onClick={() => toast.info("Qaytarildi")}
                className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Qaytarish (Redo)"
              >
                <Redo2 className="size-3.5" />
              </button>

              {/* Save layout */}
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 text-gray-300 hover:text-white cursor-pointer">
                <Save className="size-3.5" />
                <span className="text-[11px] font-semibold">Save</span>
                <ChevronDown className="size-2.5 text-gray-400" />
              </div>

              {/* Camera Snapshot */}
              <button 
                onClick={() => toast.success("Grafik skrinshoti saqlandi!")}
                className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Skrinshot olish"
              >
                <Camera className="size-3.5" />
              </button>

              {/* Fullscreen Expand */}
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="To'liq ekran rejimi"
              >
                {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </button>
            </div>

            {/* Right Side: Lots: [0.01], [Sell 4,179.507], One-click 0.17, [Buy 4,179.675], [>] */}
            <div className="flex items-center gap-2 font-mono">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                <span>Lots:</span>
                <div className="flex items-center bg-[#0d1012] border border-[#262c33] rounded px-1.5 py-0.5">
                  <button 
                    onClick={() => changeLot(-0.01)}
                    className="text-gray-400 hover:text-white px-1 font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={lotSize}
                    onChange={e => setLotSize(parseFloat(e.target.value) || 0.01)}
                    className="w-12 bg-transparent text-center font-bold text-white focus:outline-none text-xs"
                  />
                  <button 
                    onClick={() => changeLot(0.01)}
                    className="text-gray-400 hover:text-white px-1 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Red Sell Button */}
              <button
                onClick={() => handleOneClickTrade('sell')}
                className="px-3.5 py-1.5 rounded-md bg-[#d9383a] hover:bg-[#eb4648] text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                title="Bozor narxida sotish (Sell Market)"
              >
                Sell {selectedSymbol.bid.toFixed(selectedSymbol.digitPrecision)}
              </button>

              {/* Middle Spread Display */}
              <div className="flex flex-col items-center leading-none px-1">
                <span className="text-[9px] text-gray-400 uppercase font-sans">One-click</span>
                <span className="text-[10px] text-gray-300 font-bold">{selectedSymbol.spread}</span>
              </div>

              {/* Blue Buy Button */}
              <button
                onClick={() => handleOneClickTrade('buy')}
                className="px-3.5 py-1.5 rounded-md bg-[#1d72f2] hover:bg-[#3282fa] text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                title="Bozor narxida sotib olish (Buy Market)"
              >
                Buy {selectedSymbol.ask.toFixed(selectedSymbol.digitPrecision)}
              </button>

              {/* Chevron to toggle right order drawer */}
              <button
                onClick={() => setShowRightOrderPanel(!showRightOrderPanel)}
                className={`p-1 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer ${
                  showRightOrderPanel ? 'rotate-180' : ''
                }`}
                title="Buyurtma oynasini kengaytirish"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MAIN CHART AREA + OPTIONAL ORDER DRAWER                                   */}
          {/* ========================================================================= */}
          <div className="flex-1 flex overflow-hidden relative">
            <main className="flex-1 w-full h-full relative overflow-hidden bg-[#0d1012]">
              <TradingViewChart
                symbol={selectedSymbol.symbol}
                interval={timeframe}
                positions={userOpenPositions}
                currentBid={selectedSymbol.bid}
                currentAsk={selectedSymbol.ask}
                onClosePosition={(id) => {
                  const pos = userOpenPositions.find(p => p.id === id);
                  brokerStore.closePosition(id);
                  toast.success(`Bitim yopildi! PnL: ${pos && pos.pnl >= 0 ? '+' : ''}$${pos?.pnl.toFixed(2) || '0.00'}`);
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
                onQuickTrade={(side) => handleOneClickTrade(side)}
              />
            </main>

            {/* Optional Collapsible Right Order Drawer (SL / TP / Pending) */}
            {showRightOrderPanel && (
              <div className="w-80 bg-[#13171a] border-l border-[#1f262b] p-4 flex flex-col justify-between z-20 shadow-2xl animate-in slide-in-from-right duration-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#22282e] pb-2">
                    <span className="font-bold text-white text-xs">Buyurtma Parametrlari</span>
                    <button onClick={() => setShowRightOrderPanel(false)} className="text-gray-400 hover:text-white">
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Order Execution Type: Market vs Limit vs Stop */}
                  <div className="flex items-center gap-1 bg-[#0d1012] p-1 rounded-xl border border-[#22282e]">
                    <button
                      onClick={() => setOrderExecutionType('market')}
                      className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        orderExecutionType === 'market' ? 'bg-[#ffde00] text-black shadow-xs' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Bozor (Market)
                    </button>
                    <button
                      onClick={() => setOrderExecutionType('limit')}
                      className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        orderExecutionType === 'limit' ? 'bg-[#ffde00] text-black shadow-xs' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Limit
                    </button>
                    <button
                      onClick={() => setOrderExecutionType('stop')}
                      className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        orderExecutionType === 'stop' ? 'bg-[#ffde00] text-black shadow-xs' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Stop
                    </button>
                  </div>

                  {/* Buy / Sell Tabs */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOrderSide('buy')}
                      className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        orderSide === 'buy' ? 'bg-[#1d72f2] text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Buy (Sotib olish)
                    </button>
                    <button
                      onClick={() => setOrderSide('sell')}
                      className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        orderSide === 'sell' ? 'bg-[#d9383a] text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      Sell (Sotish)
                    </button>
                  </div>

                  {/* Target Limit/Stop Price if not Market */}
                  {orderExecutionType !== 'market' && (
                    <div>
                      <label className="text-[10px] text-primary uppercase font-bold">
                        Maqsadli Narx ({orderExecutionType.toUpperCase()} Price)
                      </label>
                      <input
                        type="number"
                        placeholder={`Joriy: ${selectedSymbol.bid}`}
                        value={targetLimitPrice}
                        onChange={e => setTargetLimitPrice(e.target.value)}
                        className="w-full bg-[#0d1012] border border-primary/40 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {/* Stop-Loss & Take-Profit */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-semibold">Take-Profit (TP)</label>
                      <input
                        type="number"
                        placeholder="Masalan: 4200.00"
                        value={tp}
                        onChange={e => setTp(e.target.value)}
                        className="w-full bg-[#0d1012] border border-[#22282e] rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-semibold">Stop-Loss (SL)</label>
                      <input
                        type="number"
                        placeholder="Masalan: 4150.00"
                        value={sl}
                        onChange={e => setSl(e.target.value)}
                        className="w-full bg-[#0d1012] border border-[#22282e] rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePlaceAdvancedOrder}
                  className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-lg cursor-pointer ${
                    orderSide === 'buy' ? 'bg-[#1d72f2] hover:bg-[#3282fa]' : 'bg-[#d9383a] hover:bg-[#eb4648]'
                  }`}
                >
                  {orderExecutionType === 'market' 
                    ? `${orderSide.toUpperCase()} ${lotSize} Lot ${selectedSymbol.symbol}` 
                    : `${orderSide.toUpperCase()} ${orderExecutionType.toUpperCase()} QO'YISH`}
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. BOTTOM POSITIONS TRAY (Matching Exness screenshot 1:1)                  */}
          {/* ========================================================================= */}
          <div className="bg-[#111618] border-t border-[#1f262b] flex flex-col shrink-0 z-20">
            {/* Header Tabs: Open, Pending, Closed, and collapse chevron ^ */}
            <div className="h-9 px-3 flex items-center justify-between border-b border-[#1f262b]">
              <div className="flex items-center gap-4 h-full">
                {/* Open Tab */}
                <button
                  onClick={() => {
                    setBottomTab('open');
                    setBottomTrayExpanded(true);
                  }}
                  className={`h-full flex items-center font-bold text-xs relative cursor-pointer ${
                    bottomTab === 'open' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>Open</span>
                  {userOpenPositions.length > 0 && (
                    <span className="ml-1 text-[10px] text-gray-400">({userOpenPositions.length})</span>
                  )}
                  {bottomTab === 'open' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ffde00]" />
                  )}
                </button>

                {/* Pending Tab */}
                <button
                  onClick={() => {
                    setBottomTab('pending');
                    setBottomTrayExpanded(true);
                  }}
                  className={`h-full flex items-center font-bold text-xs relative cursor-pointer ${
                    bottomTab === 'pending' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>Pending</span>
                  {userPendingOrders.length > 0 && (
                    <span className="ml-1 text-[10px] text-gray-400">({userPendingOrders.length})</span>
                  )}
                  {bottomTab === 'pending' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ffde00]" />
                  )}
                </button>

                {/* Closed Tab */}
                <button
                  onClick={() => {
                    setBottomTab('closed');
                    setBottomTrayExpanded(true);
                  }}
                  className={`h-full flex items-center font-bold text-xs relative cursor-pointer ${
                    bottomTab === 'closed' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>Closed</span>
                  {bottomTab === 'closed' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ffde00]" />
                  )}
                </button>
              </div>

              {/* Far right: Collapse / Expand Chevron ^ */}
              <button
                onClick={() => setBottomTrayExpanded(!bottomTrayExpanded)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title={bottomTrayExpanded ? "Yig'ish" : "Kengaytirish"}
              >
                {bottomTrayExpanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
              </button>
            </div>

            {/* Positions Table (Visible when expanded) */}
            {bottomTrayExpanded && (
              <div className="h-44 overflow-y-auto bg-[#0d1012] p-2">
                {bottomTab === 'open' && (
                  userOpenPositions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                      <span>Ochiq bitimlar mavjud emas</span>
                      <span className="text-[10px] text-gray-600 mt-0.5">Yuqoridagi Sell yoki Buy tugmasi orqali tezkor savdo oching</span>
                    </div>
                  ) : (
                    <table className="w-full text-left font-mono text-[11px] select-none">
                      <thead>
                        <tr className="text-gray-400 border-b border-[#1f262b] pb-1 text-[10px]">
                          <th className="py-1">Simvol</th>
                          <th>Turi</th>
                          <th>Hajm</th>
                          <th>Ochilgan narx</th>
                          <th>Joriy narx</th>
                          <th>SL</th>
                          <th>TP</th>
                          <th>Foyda (USD)</th>
                          <th className="text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f262b]/40">
                        {userOpenPositions.map(pos => {
                          const isBuy = pos.side === 'buy';
                          const isProfit = pos.pnl >= 0;
                          return (
                            <tr key={pos.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-2 font-bold text-white">{pos.symbol}</td>
                              <td>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  isBuy ? 'bg-blue-950 text-blue-400' : 'bg-red-950 text-red-400'
                                }`}>
                                  {pos.side}
                                </span>
                              </td>
                              <td className="text-white font-bold">{pos.lotSize}</td>
                              <td className="text-gray-300">{pos.openPrice}</td>
                              <td className="text-white font-bold">{pos.currentPrice}</td>
                              <td className="text-gray-400">{pos.sl || '--'}</td>
                              <td className="text-gray-400">{pos.tp || '--'}</td>
                              <td className={`font-bold ${isProfit ? 'text-primary' : 'text-rose-400'}`}>
                                {isProfit ? '+' : ''}${pos.pnl.toFixed(2)}
                              </td>
                              <td className="text-right">
                                <button
                                  onClick={() => {
                                    brokerStore.closePosition(pos.id);
                                    toast.success(`Bitim yopildi! PnL: ${isProfit ? '+' : ''}$${pos.pnl.toFixed(2)}`);
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                                >
                                  Yopish
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                )}

                {bottomTab === 'pending' && (
                  userPendingOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                      <span>Kutilayotgan buyurtmalar yo'q</span>
                      <button 
                        onClick={() => setShowRightOrderPanel(true)}
                        className="mt-1 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-primary font-bold text-[10px] cursor-pointer"
                      >
                        + Yangi Limit / Stop Buyurtma Qo'yish
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left font-mono text-[11px] select-none">
                      <thead>
                        <tr className="text-gray-400 border-b border-[#1f262b] pb-1 text-[10px]">
                          <th className="py-1">Simvol</th>
                          <th>Turi</th>
                          <th>Hajm</th>
                          <th>Kutilayotgan narx</th>
                          <th>Joriy narx</th>
                          <th>SL</th>
                          <th>TP</th>
                          <th className="text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f262b]/40">
                        {userPendingOrders.map(ord => (
                          <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2 font-bold text-white">{ord.symbol}</td>
                            <td>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-950 text-amber-400 border border-amber-500/30">
                                {ord.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="text-white font-bold">{ord.lotSize}</td>
                            <td className="text-primary font-bold">{ord.targetPrice}</td>
                            <td className="text-gray-300">{ord.currentPrice}</td>
                            <td className="text-gray-400">{ord.sl || '--'}</td>
                            <td className="text-gray-400">{ord.tp || '--'}</td>
                            <td className="text-right">
                              <button
                                onClick={() => {
                                  brokerStore.cancelPendingOrder(ord.id);
                                  toast.success("Kutilayotgan buyurtma bekor qilindi");
                                }}
                                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                              >
                                Bekor qilish
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}

                {bottomTab === 'closed' && (
                  userClosedPositions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                      <span>Yopilgan bitimlar tarixi mavjud emas</span>
                    </div>
                  ) : (
                    <table className="w-full text-left font-mono text-[11px] select-none">
                      <thead>
                        <tr className="text-gray-400 border-b border-[#1f262b] pb-1 text-[10px]">
                          <th className="py-1">Simvol</th>
                          <th>Turi</th>
                          <th>Hajm</th>
                          <th>Ochilgan narx</th>
                          <th>Yopilgan narx</th>
                          <th>Yopilgan vaqti</th>
                          <th className="text-right">Yakuniy Foyda</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f262b]/40">
                        {userClosedPositions.map(pos => {
                          const isProfit = pos.pnl >= 0;
                          return (
                            <tr key={pos.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-2 font-bold text-white">{pos.symbol}</td>
                              <td>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  pos.side === 'buy' ? 'bg-blue-950 text-blue-400' : 'bg-red-950 text-red-400'
                                }`}>
                                  {pos.side}
                                </span>
                              </td>
                              <td className="text-white font-bold">{pos.lotSize}</td>
                              <td className="text-gray-300">{pos.openPrice}</td>
                              <td className="text-white font-bold">{pos.closePrice || pos.currentPrice}</td>
                              <td className="text-gray-400 text-[10px]">
                                {pos.closedAt ? new Date(pos.closedAt).toLocaleTimeString() : '--'}
                              </td>
                              <td className={`text-right font-bold ${isProfit ? 'text-primary' : 'text-rose-400'}`}>
                                {isProfit ? '+' : ''}${pos.pnl.toFixed(2)} USD
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            )}

            {/* Bottom Summary Bar: Equity, Free Margin, Balance, Margin, Margin level, and Latency signal */}
            <div className="h-7 px-3 flex items-center justify-between text-[11px] font-mono select-none bg-[#111618] text-gray-400">
              <div className="flex items-center gap-4 flex-wrap">
                <span>Equity: <strong className="text-white font-bold">{currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></span>
                <span>Free Margin: <strong className="text-white font-bold">{freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></span>
                <span>Balance: <strong className="text-white font-bold">{selectedAccount ? selectedAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '1,315.31'} USD</strong></span>
                <span>Margin: <strong className="text-white font-bold">{usedMargin.toFixed(2)} USD</strong></span>
                <span>Margin level: <strong className="text-gray-400">-</strong></span>
              </div>

              {/* Latency / Signal Strength Bars matching screenshot (ılı 6.1.2) */}
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                <span className="tracking-tighter">ılı</span>
                <span>6.1.2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TERMINAL SAVDO QO'LLANMASI (5 Core Sections Modal)                       */}
      {/* ========================================================================= */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#14181b] border border-[#262c33] rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#22282e] flex items-center justify-between bg-[#111618]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ffde00] text-black font-black text-xs flex items-center justify-center">
                  EX
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Exness WebTrader — Savdo Qo'llanmasi</h3>
                  <p className="text-[11px] text-gray-400">Terminalning 5 ta asosiy funksional bo'limi va ularning ishlash mexanizmi</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Content - 5 Sections */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* 1. Asosiy Savdo Maydoni */}
              <div className="p-4 rounded-2xl bg-[#0f1214] border border-[#22282e] space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-xs">1</span>
                  <h4>Asosiy Savdo Maydoni (Grafik va Narxlar)</h4>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Terminalning markaziy qismi <strong>TradingView</strong> jonli grafigiga asoslangan bo'lib, unga barcha texnik indikatorlar va vositalar o'rnatilgan:
                </p>
                <ul className="list-disc list-inside text-gray-400 space-y-1 pl-2">
                  <li><strong className="text-white">Aktiv (Symbol):</strong> Yuqori tablarda qaysi aktiv ochilgani ko'rinadi (masalan, <code>XAU/USD</code> — Oltin va AQSh dollari, <code>USOIL</code>, <code>BTC</code>, <code>EUR/USD</code>).</li>
                  <li><strong className="text-white">Bid (Sotish narxi):</strong> Bozorning ayni shu lahzada sotishga tayyor bo'lgan narxi.</li>
                  <li><strong className="text-white">Ask (Sotib olish narxi):</strong> Bozorning ayni shu lahzada sotib olishga tayyor bo'lgan narxi.</li>
                  <li><strong className="text-white">Spread:</strong> Bid va Ask o'rtasidagi farq (broker komissiyasi).</li>
                </ul>
              </div>

              {/* 2. Buy va Sell Tizimi */}
              <div className="p-4 rounded-2xl bg-[#0f1214] border border-[#22282e] space-y-2">
                <div className="flex items-center gap-2 text-[#4ade80] font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-[#4ade80]/20 flex items-center justify-center text-xs">2</span>
                  <h4>Buy va Sell (Sotib olish va Sotish) Tizimi</h4>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Pozitsiya ochish uchun grafik ustidagi ikkita asosiy tugma xizmat qiladi:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-1">
                    <div className="font-bold text-red-400 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      Sell (Sotish / Short)
                    </div>
                    <p className="text-gray-400 text-[11px]">
                      Agar narx tushishini kutayotgan bo'lsangiz, shu tugmani bosasiz. Aktivni yuqori narxda sotib, pastroq narxda qaytarib sotib olish orqali foyda ko'rasiz.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-1">
                    <div className="font-bold text-blue-400 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Buy (Sotib olish / Long)
                    </div>
                    <p className="text-gray-400 text-[11px]">
                      Agar narx ko'tarilishini kutayotgan bo'lsangiz, shu tugmani bosasiz. Aktivni arzon narxda sotib olib, qimmatlashganda sotish orqali daromad qilasiz.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Lot va One-Click Trading */}
              <div className="p-4 rounded-2xl bg-[#0f1214] border border-[#22282e] space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-amber-400/20 flex items-center justify-center text-xs">3</span>
                  <h4>Lot (Hajm) va One-Click Trading</h4>
                </div>
                <ul className="list-disc list-inside text-gray-400 space-y-1 pl-2">
                  <li><strong className="text-white">Lots (Lot hajmi):</strong> Savdo hajmini belgilaydi. Standart minimal hajm <code>0.01</code> (mikro lot) bo'lib, xatarlarni boshqarish uchun optimaldir.</li>
                  <li><strong className="text-white">One-click (Bir chertishda savdo):</strong> Ushbu rejimda Sell yoki Buy tugmasi bosilishi bilan ortiqcha so'rovlarsiz order bir lahzada bozorga yuboriladi va grafikda o'z aksini topadi.</li>
                </ul>
              </div>

              {/* 4. Hisob Ko'rsatkichlari */}
              <div className="p-4 rounded-2xl bg-[#0f1214] border border-[#22282e] space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-cyan-400/20 flex items-center justify-center text-xs">4</span>
                  <h4>Hisob Ko'rsatkichlari (Pastki Panel)</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-gray-400 text-[10px] uppercase font-bold">Balance</div>
                    <div className="text-white font-mono font-bold text-xs mt-0.5">Balans</div>
                    <p className="text-[10px] text-gray-400 mt-1">Ochiq bitimlardan tashqari umumiy depozit.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-gray-400 text-[10px] uppercase font-bold">Equity</div>
                    <div className="text-white font-mono font-bold text-xs mt-0.5">Kapital</div>
                    <p className="text-[10px] text-gray-400 mt-1">Balans + ochiq pozitsiyalardagi suzuvchi foyda/zarar.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-gray-400 text-[10px] uppercase font-bold">Free Margin</div>
                    <div className="text-white font-mono font-bold text-xs mt-0.5">Erkin Mablag'</div>
                    <p className="text-[10px] text-gray-400 mt-1">Yangi savdolar ochish uchun ishlatilishi mumkin bo'lgan summa.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-gray-400 text-[10px] uppercase font-bold">Margin</div>
                    <div className="text-white font-mono font-bold text-xs mt-0.5">Garov</div>
                    <p className="text-[10px] text-gray-400 mt-1">Faol bitimlarni ushlab turish uchun band qilingan summa.</p>
                  </div>
                </div>
              </div>

              {/* 5. Buyurtmalar Holati */}
              <div className="p-4 rounded-2xl bg-[#0f1214] border border-[#22282e] space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-purple-400/20 flex items-center justify-center text-xs">5</span>
                  <h4>Buyurtmalar Holati (Open, Pending, Closed)</h4>
                </div>
                <div className="space-y-1.5 text-gray-400 pl-2">
                  <div><strong className="text-white">Open (Ochiq):</strong> Ayni paytda bozorda real ishlayotgan faol savdolar (jonli PnL va bitta bosishda yopish imkoniyati bilan).</div>
                  <div><strong className="text-white">Pending (Kutishdagi):</strong> Narx siz belgilagan chegaraga (Limit yoki Stop) yetgandagina avtomatik tarzda ochiladigan kechiktirilgan buyurtmalar.</div>
                  <div><strong className="text-white">Closed (Yopilgan):</strong> Yakunlangan savdolar tarixi, yopilgan narxlari va yakuniy foyda/zarar natijalari.</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-[#22282e] bg-[#111618] flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-mono">Exness WebTerminal Core Architecture</span>
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-[#ffde00] hover:opacity-90 text-black font-extrabold text-xs cursor-pointer transition-opacity"
              >
                Tushundim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
