import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { AccountSelect, Empty, PageTitle, card, dt, fmt, muted, pnlColor, signed, useSelectedAccount } from './common';

const TYPE: Record<string, string> = { deposit: 'Depozit', withdrawal: 'Yechish', trade_pnl: 'Bitim natijasi', commission: 'Komissiya', swap: 'Swap', adjustment: 'Tuzatish' };
const STATUS: Record<string, string> = { pending: 'Kutilmoqda', completed: 'Bajarildi', rejected: 'Rad etildi' };

/** Account statement: every balance movement (ledger) plus payment requests. */
export function CabinetStatement() {
  const { accounts, selected, setId } = useSelectedAccount();
  const [ledger, setLedger] = useState<any[] | null>(null);
  const [tx, setTx] = useState<any[]>([]);

  useEffect(() => {
    if (!selected) return;
    setLedger(null);
    apiFetch<{ ledger: any[] }>(`/api/v1/wallet/ledger?accountId=${selected.id}&limit=300`).then((r) => setLedger(r.ledger)).catch(() => setLedger([]));
    apiFetch<{ transactions: any[] }>('/api/v1/wallet/transactions').then((r) => setTx(r.transactions.filter((t) => t.account_id === selected.id))).catch(() => {});
  }, [selected?.id, selected?.balance]);

  return (
    <div>
      <PageTitle title="Amallar tarixi" sub="Balansdagi barcha harakatlar va to'lov so'rovlari." right={selected && <AccountSelect accounts={accounts} value={selected.id} onChange={setId} />} />
      {tx.length > 0 && (
        <div className={`${card} mb-4 overflow-x-auto`}>
          <div className="font-bold mb-2">To'lov so'rovlari</div>
          <table className="w-full text-sm">
            <thead className={`text-left text-xs ${muted}`}><tr><th className="py-2">Sana</th><th>Tur</th><th>Usul</th><th className="text-right">Summa</th><th>Holat</th></tr></thead>
            <tbody>
              {tx.map((t) => (
                <tr key={t.id} className="border-t border-gray-100 dark:border-white/5">
                  <td className="py-2">{dt(t.created_at)}</td><td>{TYPE[t.kind] ?? t.kind}</td><td>{t.method}</td><td className="text-right font-mono">${fmt(t.amount)}</td><td>{STATUS[t.status] ?? t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={`${card} overflow-x-auto`}>
        {ledger === null ? <Empty>Yuklanmoqda…</Empty> : ledger.length === 0 ? <Empty>Hali amal yo'q</Empty> : (
          <table className="w-full text-sm whitespace-nowrap">
            <thead className={`text-left text-xs ${muted}`}><tr><th className="py-2">Sana</th><th>Tur</th><th>Izoh</th><th className="text-right">Summa (USD)</th><th className="text-right">Balans</th></tr></thead>
            <tbody>
              {ledger.map((l) => (
                <tr key={l.id} className="border-t border-gray-100 dark:border-white/5">
                  <td className="py-2">{dt(l.created_at)}</td><td>{TYPE[l.type] ?? l.type}</td><td className={`text-xs ${muted}`}>{l.note ?? ''}</td>
                  <td className={`text-right font-mono ${pnlColor(l.amount)}`}>{signed(l.amount)}</td><td className="text-right font-mono">{fmt(l.balance_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
