import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { AccountSelect, Empty, PageTitle, Stat, card, fmt, muted, pnlColor, signed, useSelectedAccount } from './common';

const PERIODS: Array<[string, number]> = [['Bugun', 1], ['7 kun', 7], ['30 kun', 30], ['90 kun', 90], ['1 yil', 365]];

/** Closed-trade statistics computed on the server from the account's real order history. */
export function CabinetPerformance() {
  const { accounts, selected, setId } = useSelectedAccount();
  const [days, setDays] = useState(30);
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    const load = () => apiFetch(`/api/v1/trading/stats?accountId=${selected.id}&days=${days}`).then((r) => alive && setD(r)).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [selected?.id, days]);

  const t = d?.totals;
  const max = Math.max(1, ...(d?.daily ?? []).map((x: any) => Math.abs(x.net)));

  return (
    <div>
      <PageTitle
        title="Natijalar"
        sub="Yopilgan bitimlar bo'yicha statistika. Ochiq pozitsiyalar terminalda."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {selected && <AccountSelect accounts={accounts} value={selected.id} onChange={setId} />}
            <div className="flex rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden text-sm">
              {PERIODS.map(([label, n]) => (
                <button key={n} onClick={() => setDays(n)} className={`px-3 py-2 ${days === n ? 'bg-primary text-black font-bold' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>{label}</button>
              ))}
            </div>
          </div>
        }
      />
      {!t ? <Empty>Yuklanmoqda…</Empty> : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat label="Sof natija (yopilgan)" value={`${signed(t.netProfit)} USD`} tone={pnlColor(t.netProfit)} sub={`Foyda ${signed(t.grossProfit)} · Zarar ${signed(t.grossLoss)}`} />
            <Stat label="Bitimlar" value={t.trades} sub={`Foydali ${t.wins} · Zararli ${t.losses} · ${t.winRate}%`} />
            <Stat label="Hajm" value={`${fmt(t.volumeLots)} lot`} sub={`Komissiya va swap: ${fmt(t.tradingCost)} USD`} />
            <Stat label="Ochiq pozitsiyalar P/L" value={`${signed(t.unrealised)} USD`} tone={pnlColor(t.unrealised)} sub={`Equity: ${fmt(d.account.equity)} USD`} />
            <Stat label="Profit factor" value={t.profitFactor ?? '—'} sub="Yalpi foyda / yalpi zarar" />
            <Stat label="Eng yaxshi bitim" value={t.best === null ? '—' : signed(t.best)} tone={pnlColor(t.best ?? 0)} />
            <Stat label="Eng yomon bitim" value={t.worst === null ? '—' : signed(t.worst)} tone={pnlColor(t.worst ?? 0)} />
            <Stat label="Balans" value={`${fmt(d.account.balance)} USD`} sub={`Marja darajasi: ${d.account.marginLevel ? d.account.marginLevel + '%' : '—'}`} />
          </div>

          <div className={`${card} mt-4`}>
            <div className="font-bold mb-3">Kunlik natija (USD)</div>
            {d.daily.length === 0 ? <Empty>Bu davrda yopilgan bitim yo'q</Empty> : (
              <div className="flex items-end gap-2 h-40">
                {d.daily.map((x: any) => (
                  <div key={x.date} className="flex-1 min-w-[10px] max-w-[56px] h-full flex flex-col justify-end items-center group relative" title={`${x.date}: ${signed(x.net)}`}>
                    <div className={`w-full rounded-t ${x.net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ height: `${Math.max(3, (Math.abs(x.net) / max) * 100)}%` }} />
                    <div className={`text-[9px] mt-1 ${muted}`}>{x.date.slice(5)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${card} mt-4 overflow-x-auto`}>
            <div className="font-bold mb-3">Instrumentlar bo'yicha</div>
            {d.bySymbol.length === 0 ? <Empty>Ma'lumot yo'q</Empty> : (
              <table className="w-full text-sm">
                <thead className={`text-left text-xs ${muted}`}><tr><th className="py-2">Instrument</th><th className="text-right">Bitimlar</th><th className="text-right">Hajm (lot)</th><th className="text-right">Natija (USD)</th></tr></thead>
                <tbody>
                  {d.bySymbol.map((s: any) => (
                    <tr key={s.symbol} className="border-t border-gray-100 dark:border-white/5">
                      <td className="py-2 font-semibold">{s.symbol}</td><td className="text-right">{s.trades}</td><td className="text-right">{fmt(s.lots)}</td>
                      <td className={`text-right font-mono ${pnlColor(s.net)}`}>{signed(s.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
