import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, LogOut, Menu, Minus, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { brokerStore } from '../../lib/brokerStore';
import type { ForexSymbolRate, PendingOrder, Position, TradingAccount } from '../../types/broker';
import { SymbolIcon } from '../common/SymbolIcon';
import { TradingViewChart } from './TradingViewChart';

const money = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
type Sheet = 'none' | 'symbols' | 'accounts' | 'menu' | 'positions';

/** Phone layout of the web terminal: chart on top, big Sell / Buy bar and a positions sheet at the bottom. */
export function MobileTerminal({ onOpenCabinet, onLogout }: { onOpenCabinet: () => void; onLogout?: () => void }) {
  const [symbols, setSymbols] = useState<ForexSymbolRate[]>(brokerStore.getSymbols());
  const [accounts, setAccounts] = useState<TradingAccount[]>(brokerStore.getAccounts());
  const [positions, setPositions] = useState<Position[]>(brokerStore.getPositions());
  const [pending, setPending] = useState<PendingOrder[]>(brokerStore.getPendingOrders());
  const [symbolName, setSymbolName] = useState('XAU/USD');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [lots, setLots] = useState(0.01);
  const [sheet, setSheet] = useState<Sheet>('none');
  const [query, setQuery] = useState('');
  const [showSlTp, setShowSlTp] = useState(false);
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [edit, setEdit] = useState<Position | null>(null);
  const [editSl, setEditSl] = useState('');
  const [editTp, setEditTp] = useState('');
  const [tab, setTab] = useState<'open' | 'pending'>('open');

  useEffect(() => brokerStore.subscribe(() => {
    setSymbols(brokerStore.getSymbols());
    setAccounts(brokerStore.getAccounts());
    setPositions(brokerStore.getPositions());
    setPending(brokerStore.getPendingOrders());
  }), []);

  const symbol = symbols.find((s) => s.symbol === symbolName) ?? symbols[0];
  const account = accounts.find((a) => a.id === accountId) ?? accounts.find((a) => a.isDemo) ?? accounts[0];
  const open = useMemo(() => positions.filter((p) => p.status === 'open' && p.accountId === account?.id), [positions, account?.id]);
  const orders = useMemo(() => pending.filter((o) => o.accountId === account?.id), [pending, account?.id]);
  const total = open.reduce((s, p) => s + (p.pnl || 0), 0);
  const feed = brokerStore.getFeedInfo();

  if (!symbol || !account) return <div className="h-[100dvh] bg-[#0d1012] text-gray-400 flex items-center justify-center text-sm">Yuklanmoqda…</div>;

  const step = (d: number) => setLots((v) => Math.max(0.01, Math.round((v + d) * 100) / 100));

  function trade(side: 'buy' | 'sell') {
    try {
      brokerStore.openPosition({
        accountId: account.id, symbol: symbol.symbol, side, lotSize: lots,
        sl: sl ? parseFloat(sl) : undefined, tp: tp ? parseFloat(tp) : undefined,
      });
      if (navigator.vibrate) navigator.vibrate(20);
      toast.success(`${side === 'buy' ? 'BUY' : 'SELL'} ${lots} ${symbol.symbol}`);
    } catch (e: any) {
      toast.error(e.message || 'Buyurtma yuborilmadi');
    }
  }

  const inp = 'w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#ffde00]/60';
  const filtered = symbols.filter((s) => (s.symbol + s.name).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#0d1012] text-white overflow-hidden select-none">
      {/* top bar */}
      <div className="h-12 shrink-0 flex items-center gap-2 px-2 border-b border-[#1f262b] bg-[#111618]">
        <button onClick={() => setSheet('menu')} className="p-2 rounded-lg text-gray-300 active:bg-white/10"><Menu className="size-5" /></button>
        <button onClick={() => { setSheet('symbols'); setQuery(''); }} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 active:bg-white/10 min-w-0">
          <SymbolIcon symbol={symbol.symbol} size={22} />
          <span className="font-bold text-sm truncate">{symbol.symbol}</span>
          <ChevronDown className="size-4 text-gray-400 shrink-0" />
        </button>
        <div className="flex-1" />
        {feed?.testMode && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono">TEST</span>}
        <button onClick={() => setSheet('accounts')} className="text-right leading-tight px-2 py-1 rounded-lg active:bg-white/10">
          <div className="text-[9px] text-gray-400">{account.isDemo ? 'Demo' : 'Real'} · {account.nickname ?? account.accountType}</div>
          <div className="text-sm font-bold font-mono">{money(account.equity)}<span className="text-[10px] text-gray-400"> USD</span></div>
        </button>
      </div>

      {/* chart */}
      <div className="flex-1 min-h-0 relative">
        <TradingViewChart
          symbol={symbol.symbol}
          interval="1m"
          compact
          positions={open}
          currentBid={symbol.bid}
          currentAsk={symbol.ask}
          onClosePosition={(id) => brokerStore.closePosition(id)}
          onUpdateSlTp={(id, a, b) => brokerStore.updatePositionSlTp(id, a, b)}
          className="w-full h-full"
        />
      </div>

      {/* trade bar */}
      <div className="shrink-0 border-t border-[#1f262b] bg-[#111618] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {showSlTp && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className={inp} inputMode="decimal" placeholder="Stop Loss" value={sl} onChange={(e) => setSl(e.target.value)} />
            <input className={inp} inputMode="decimal" placeholder="Take Profit" value={tp} onChange={(e) => setTp(e.target.value)} />
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center rounded-lg bg-black/40 border border-white/10">
            <button onClick={() => step(-0.01)} className="p-2.5 active:bg-white/10"><Minus className="size-4" /></button>
            <div className="w-16 text-center font-mono text-sm font-bold">{lots.toFixed(2)}</div>
            <button onClick={() => step(0.01)} className="p-2.5 active:bg-white/10"><Plus className="size-4" /></button>
          </div>
          {[0.1, 0.5, 1].map((v) => <button key={v} onClick={() => setLots(v)} className="px-2.5 py-2 rounded-lg bg-white/5 text-xs font-mono active:bg-white/10">{v}</button>)}
          <div className="flex-1" />
          <button onClick={() => setShowSlTp(!showSlTp)} className={`p-2.5 rounded-lg border ${showSlTp ? 'border-[#ffde00]/60 text-[#ffde00]' : 'border-white/10 text-gray-300'}`} title="SL / TP"><SlidersHorizontal className="size-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => trade('sell')} className="rounded-xl bg-[#e5383b] active:brightness-90 py-2.5 text-center">
            <div className="text-[10px] opacity-80 leading-none">SELL</div>
            <div className="text-lg font-bold font-mono leading-tight">{symbol.bid}</div>
          </button>
          <button onClick={() => trade('buy')} className="rounded-xl bg-[#1d6ff3] active:brightness-90 py-2.5 text-center">
            <div className="text-[10px] opacity-80 leading-none">BUY</div>
            <div className="text-lg font-bold font-mono leading-tight">{symbol.ask}</div>
          </button>
        </div>
        <button onClick={() => setSheet('positions')} className="mt-2 w-full flex items-center justify-between rounded-lg px-3 py-2 bg-white/5 active:bg-white/10 text-xs">
          <span className="font-semibold">Pozitsiyalar <span className="text-gray-400">({open.length})</span>{orders.length > 0 && <span className="text-gray-400"> · kutilayotgan ({orders.length})</span>}</span>
          <span className={`font-mono font-bold ${total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{total >= 0 ? '+' : ''}{money(total)} USD</span>
        </button>
      </div>

      {/* bottom sheets */}
      {sheet !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setSheet('none')}>
          <div className="w-full max-h-[78dvh] overflow-y-auto rounded-t-3xl bg-[#14181b] border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

            {sheet === 'symbols' && (
              <>
                <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2 mb-3">
                  <Search className="size-4 text-gray-500" />
                  <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Instrument qidirish" className="flex-1 bg-transparent text-sm focus:outline-none" />
                </div>
                {filtered.map((s) => (
                  <button key={s.symbol} onClick={() => { setSymbolName(s.symbol); setSheet('none'); }} className="w-full flex items-center justify-between py-2.5 border-b border-white/5 active:bg-white/5 text-left">
                    <span className="flex items-center gap-3"><SymbolIcon symbol={s.symbol} size={28} /><span><div className="font-bold text-sm">{s.symbol}</div><div className="text-[11px] text-gray-400">{s.name}</div></span></span>
                    <span className="text-right font-mono text-sm"><div>{s.bid}</div><div className={`text-[11px] ${s.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{s.change24h >= 0 ? '+' : ''}{s.change24h}%</div></span>
                  </button>
                ))}
              </>
            )}

            {sheet === 'accounts' && (
              <>
                <div className="font-bold mb-2">Hisobni tanlang</div>
                {accounts.map((a) => (
                  <button key={a.id} onClick={() => { setAccountId(a.id); setSheet('none'); }} className={`w-full flex items-center justify-between py-3 px-3 mb-2 rounded-xl border text-left ${a.id === account.id ? 'border-[#ffde00]/60 bg-white/5' : 'border-white/10'}`}>
                    <span><div className="font-bold text-sm">{a.isDemo ? 'Demo' : 'Real'} · #{a.accountNumber}</div><div className="text-[11px] text-gray-400">{a.nickname ?? a.accountType} · 1:{a.leverage}</div></span>
                    <span className="font-mono font-bold">{money(a.balance)}</span>
                  </button>
                ))}
              </>
            )}

            {sheet === 'menu' && (
              <div className="space-y-2">
                <button onClick={() => { setSheet('none'); onOpenCabinet(); }} className="w-full text-left rounded-xl bg-white/5 active:bg-white/10 px-4 py-3 font-semibold">Shaxsiy kabinet</button>
                {onLogout && <button onClick={() => { setSheet('none'); onLogout(); }} className="w-full flex items-center gap-2 text-left rounded-xl bg-rose-500/10 text-rose-300 px-4 py-3 font-semibold"><LogOut className="size-4" />Tizimdan chiqish</button>}
              </div>
            )}

            {sheet === 'positions' && (
              <>
                <div className="flex gap-2 mb-3">
                  {([['open', `Ochiq (${open.length})`], ['pending', `Kutilayotgan (${orders.length})`]] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setTab(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${tab === k ? 'bg-[#ffde00] text-black' : 'bg-white/5'}`}>{label}</button>
                  ))}
                  {tab === 'open' && open.length > 0 && <button onClick={() => { open.forEach((p) => brokerStore.closePosition(p.id)); setSheet('none'); }} className="ml-auto px-3 py-1.5 rounded-full text-xs bg-rose-500/15 text-rose-300">Hammasini yopish</button>}
                </div>
                {tab === 'open' && (open.length === 0 ? <div className="py-8 text-center text-sm text-gray-500">Ochiq pozitsiya yo'q</div> : open.map((p) => (
                  <div key={p.id} className="rounded-xl border border-white/10 p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><SymbolIcon symbol={p.symbol} size={20} /><b className="text-sm">{p.symbol}</b><span className={`text-xs font-bold ${p.side === 'buy' ? 'text-sky-400' : 'text-orange-400'}`}>{p.side.toUpperCase()} {p.lotSize}</span></span>
                      <b className={`font-mono ${p.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{p.pnl >= 0 ? '+' : ''}{money(p.pnl)}</b>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400 font-mono">{p.openPrice} → {p.currentPrice}{p.sl ? ` · SL ${p.sl}` : ''}{p.tp ? ` · TP ${p.tp}` : ''}</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => { setEdit(p); setEditSl(p.sl ? String(p.sl) : ''); setEditTp(p.tp ? String(p.tp) : ''); }} className="flex-1 rounded-lg bg-white/5 py-2 text-xs font-semibold active:bg-white/10">SL / TP</button>
                      <button onClick={() => brokerStore.closePosition(p.id)} className="flex-1 rounded-lg bg-rose-500/15 text-rose-300 py-2 text-xs font-semibold active:bg-rose-500/25">Yopish</button>
                    </div>
                  </div>
                )))}
                {tab === 'pending' && (orders.length === 0 ? <div className="py-8 text-center text-sm text-gray-500">Kutilayotgan buyurtma yo'q</div> : orders.map((o) => (
                  <div key={o.id} className="rounded-xl border border-white/10 p-3 mb-2 flex items-center justify-between">
                    <span><b className="text-sm">{o.symbol}</b> <span className="text-xs text-gray-400">{o.type.replace('_', ' ').toUpperCase()} {o.lotSize} @ {o.targetPrice}</span></span>
                    <button onClick={() => brokerStore.cancelPendingOrder(o.id)} className="p-2 rounded-lg bg-white/5"><X className="size-4" /></button>
                  </div>
                )))}
              </>
            )}
          </div>
        </div>
      )}

      {/* SL/TP editor */}
      {edit && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/70" onClick={() => setEdit(null)}>
          <div className="w-full rounded-t-3xl bg-[#14181b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold mb-1">{edit.symbol} {edit.side.toUpperCase()} {edit.lotSize}</div>
            <div className="text-[11px] text-gray-400 mb-3 font-mono">Ochilish narxi {edit.openPrice}</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input className={inp} inputMode="decimal" placeholder="Stop Loss" value={editSl} onChange={(e) => setEditSl(e.target.value)} />
              <input className={inp} inputMode="decimal" placeholder="Take Profit" value={editTp} onChange={(e) => setEditTp(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEdit(null)} className="flex-1 rounded-xl bg-white/5 py-3 text-sm">Bekor</button>
              <button onClick={() => { brokerStore.updatePositionSlTp(edit.id, editSl ? parseFloat(editSl) : undefined, editTp ? parseFloat(editTp) : undefined); setEdit(null); toast.success('SL / TP yuborildi'); }} className="flex-1 rounded-xl bg-[#ffde00] text-black font-bold py-3 text-sm">Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
