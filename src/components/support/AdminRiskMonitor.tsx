import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { money } from './shared';

/** Live exposure and account-risk board (refreshes every 3 s). */
export function AdminRiskMonitor() {
  const [d, setD] = useState<any>(null);
  const [demo, setDemo] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = () => apiFetch(`/api/v1/admin/risk?demo=${demo ? 1 : 0}`).then((r) => alive && setD(r)).catch(() => {});
    load();
    const id = setInterval(load, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [demo]);

  if (!d) return <div className="text-gray-500 text-sm">Yuklanmoqda…</div>;
  const t = d.totals;
  const tone = (v: number) => (v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-white');
  const card = (label: string, value: string, c = 'text-white') => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-xl font-bold ${c}`}>{value}</div>
    </div>
  );
  const accTable = (title: ReactNode, rows: any[], empty: string) => (
    <div className="rounded-3xl border border-white/10 bg-[#12161a] p-4">
      <div className="text-sm font-bold mb-2">{title}</div>
      {rows.length === 0 ? <div className="text-xs text-gray-500">{empty}</div> : (
        <table className="w-full text-xs">
          <thead className="text-gray-500 text-left"><tr><th className="py-1 pr-3">Hisob</th><th className="pr-3">Mijoz</th><th className="text-right pr-3">Equity</th><th className="text-right pr-3">Marja %</th><th className="text-right">Float P/L</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.accountId} className="border-t border-white/5">
                <td className="py-1 pr-3 font-mono">#{r.number}{r.isDemo ? ' (demo)' : ''}</td><td className="pr-3">{r.owner}</td>
                <td className="text-right pr-3">${money(r.equity)}</td>
                <td className={`text-right pr-3 ${r.marginLevel < 100 ? 'text-rose-300 font-bold' : ''}`}>{r.marginLevel.toFixed(0)}</td>
                <td className={`text-right ${tone(r.floatingPnl)}`}>{money(r.floatingPnl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 text-white">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">Narx manbasi: <b className="text-white">{d.feed.mode}</b> · jonli: {d.feed.symbols.filter((s: any) => s.live).length}/{d.feed.symbols.length}</div>
        <label className="text-xs text-gray-400 flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />Demo hisoblarni ham ko'rsatish</label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {card('Hisoblar', String(t.accounts))}
        {card('Ochiq pozitsiyalar', String(t.openPositions))}
        {card('Kutilayotgan buyurtmalar', String(t.pendingOrders))}
        {card('Mijozlar equity', `$${money(t.equity)}`)}
        {card('Mijozlar float P/L', `$${money(t.floatingPnl)}`, tone(t.floatingPnl))}
        {card('Broker natijasi (B-book)', `$${money(t.brokerResult)}`, tone(t.brokerResult))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#12161a] p-4">
        <div className="text-sm font-bold mb-2">Instrumentlar bo'yicha ekspozitsiya</div>
        {d.exposure.length === 0 ? <div className="text-xs text-gray-500">Ochiq pozitsiya yo'q</div> : (
          <table className="w-full text-xs">
            <thead className="text-gray-500 text-left"><tr><th className="py-1">Instrument</th><th className="text-right">Long lot</th><th className="text-right">Short lot</th><th className="text-right">Net lot</th><th className="text-right">Pozitsiyalar</th><th className="text-right">Nominal $</th><th className="text-right">Float P/L</th></tr></thead>
            <tbody>
              {d.exposure.map((e: any) => (
                <tr key={e.symbol} className="border-t border-white/5">
                  <td className="py-1 font-semibold">{e.symbol}</td>
                  <td className="text-right">{e.longLots}</td><td className="text-right">{e.shortLots}</td>
                  <td className={`text-right font-bold ${e.netLots > 0 ? 'text-sky-300' : e.netLots < 0 ? 'text-amber-300' : ''}`}>{e.netLots}</td>
                  <td className="text-right">{e.openCount}</td><td className="text-right">{e.notional.toLocaleString()}</td>
                  <td className={`text-right ${tone(e.floatingPnl)}`}>{money(e.floatingPnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {accTable(<span className="inline-flex items-center gap-1.5"><AlertTriangle className="size-4 text-amber-400" />Margin call xavfi (&lt;150%)</span>, d.marginCalls, 'Xavf ostidagi hisob yo\'q')}
        {accTable('Eng ko\'p yo\'qotayotganlar', d.topLosers, 'Yo\'q')}
        {accTable('Eng ko\'p yutayotganlar', d.topWinners, 'Yo\'q')}
      </div>
    </div>
  );
}
