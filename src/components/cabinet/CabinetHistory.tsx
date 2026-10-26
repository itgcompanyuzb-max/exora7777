import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { AccountSelect, Empty, PageTitle, card, dt, fmt, muted, pnlColor, signed, useSelectedAccount } from './common';

type Tab = 'CLOSED' | 'OPEN' | 'PENDING';
const TABS: Array<[Tab, string]> = [['CLOSED', 'Yopilgan'], ['OPEN', 'Ochiq'], ['PENDING', 'Kutilayotgan']];
const REASON: Record<string, string> = { 'Stop Loss': 'Stop Loss', 'Take Profit': 'Take Profit', 'Client close': 'Qo\'lda', 'Client close (partial)': 'Qisman yopish' };

/** Order history straight from the server (closed, open and pending orders). */
export function CabinetHistory() {
  const { accounts, selected, setId } = useSelectedAccount();
  const [tab, setTab] = useState<Tab>('CLOSED');
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    const load = () => apiFetch<{ positions: any[] }>(`/api/v1/trading/positions?status=${tab}&accountId=${selected.id}&limit=300`).then((r) => alive && setRows(r.positions)).catch(() => {});
    setRows(null);
    load();
    const id = tab === 'CLOSED' ? undefined : setInterval(load, 2000);
    return () => { alive = false; if (id) clearInterval(id); };
  }, [selected?.id, tab]);

  function exportCsv() {
    if (!rows?.length) return;
    const head = ['ticket', 'symbol', 'side', 'lots', 'open_price', 'close_price', 'sl', 'tp', 'opened_at', 'closed_at', 'profit', 'commission', 'swap', 'reason'];
    const lines = rows.map((o) => [o.ticket, o.symbol, o.side, o.lots, o.openPrice ?? o.pendingPrice ?? '', o.closePrice ?? '', o.sl ?? '', o.tp ?? '', o.openedAt ?? o.createdAt, o.closedAt ?? '', o.pnl, o.commission, o.swap, o.closeReason ?? ''].join(','));
    const url = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `orders-${selected?.accountNumber}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageTitle title="Bitimlar tarixi" sub="Hisobingizdagi barcha buyurtmalar." right={
        <div className="flex items-center gap-2">
          {selected && <AccountSelect accounts={accounts} value={selected.id} onChange={setId} />}
          <button onClick={exportCsv} disabled={!rows?.length} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm disabled:opacity-40">CSV yuklab olish</button>
        </div>
      } />
      <div className="flex gap-1 mb-3">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm ${tab === k ? 'bg-primary text-black font-bold' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>{label}</button>
        ))}
      </div>
      <div className={`${card} overflow-x-auto`}>
        {rows === null ? <Empty>Yuklanmoqda…</Empty> : rows.length === 0 ? <Empty>Bitim yo'q</Empty> : (
          <table className="w-full text-sm whitespace-nowrap">
            <thead className={`text-left text-xs ${muted}`}>
              <tr><th className="py-2 pr-3">Bilet</th><th className="pr-3">Instrument</th><th className="pr-3">Tur</th><th className="pr-3 text-right">Hajm</th><th className="pr-3 text-right">Ochilish</th><th className="pr-3 text-right">{tab === 'CLOSED' ? 'Yopilish' : 'Joriy'}</th><th className="pr-3">Vaqt</th><th className="pr-3 text-right">Komissiya</th><th className="pr-3 text-right">Swap</th><th className="pr-3 text-right">Foyda (USD)</th>{tab === 'CLOSED' && <th>Sabab</th>}</tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-gray-100 dark:border-white/5">
                  <td className="py-2 pr-3 font-mono text-xs">#{o.ticket}</td>
                  <td className="pr-3 font-semibold">{o.symbol}</td>
                  <td className={`pr-3 font-semibold ${o.side === 'BUY' ? 'text-sky-500' : 'text-orange-500'}`}>{o.side}{o.status === 'pending' ? ` ${o.kind}` : ''}</td>
                  <td className="pr-3 text-right">{o.lots}</td>
                  <td className="pr-3 text-right font-mono">{o.openPrice ?? o.pendingPrice}</td>
                  <td className="pr-3 text-right font-mono">{tab === 'CLOSED' ? o.closePrice : o.currentPrice ?? '—'}</td>
                  <td className={`pr-3 text-xs ${muted}`}>{dt(tab === 'CLOSED' ? o.closedAt : o.openedAt ?? o.createdAt)}</td>
                  <td className="pr-3 text-right">{o.commission ? fmt(-o.commission) : '0.00'}</td>
                  <td className="pr-3 text-right">{fmt(o.swap)}</td>
                  <td className={`pr-3 text-right font-mono font-semibold ${pnlColor(o.pnl)}`}>{o.status === 'pending' ? '—' : signed(o.pnl)}</td>
                  {tab === 'CLOSED' && <td className={`text-xs ${muted}`}>{o.status === 'liquidated' ? 'Stop-out' : REASON[o.closeReason] ?? o.closeReason ?? ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
