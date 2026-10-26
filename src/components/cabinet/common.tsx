import { useEffect, useState, type ReactNode } from 'react';
import { brokerStore } from '../../lib/brokerStore';
import type { TradingAccount } from '../../types/broker';

export const card = 'rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#181c19] p-5';
export const muted = 'text-gray-500 dark:text-gray-400';
export const fmt = (v: number, d = 2) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const signed = (v: number) => `${v > 0 ? '+' : ''}${fmt(v)}`;
export const pnlColor = (v: number) => (v > 0 ? 'text-emerald-500' : v < 0 ? 'text-rose-500' : '');
export const dt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export function useAccounts(): TradingAccount[] {
  const [list, setList] = useState(brokerStore.getAccounts());
  useEffect(() => brokerStore.subscribe(() => setList(brokerStore.getAccounts())), []);
  return list;
}

/** Account chooser; defaults to the demo account while the platform is in test mode. */
export function useSelectedAccount() {
  const accounts = useAccounts();
  const [id, setId] = useState<string | null>(null);
  const selected = accounts.find((a) => a.id === id) ?? accounts.find((a) => a.isDemo) ?? accounts[0];
  return { accounts, selected, setId };
}

export function AccountSelect({ accounts, value, onChange }: { accounts: TradingAccount[]; value?: string; onChange: (id: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12161a] px-3 py-2 text-sm text-gray-900 dark:text-white"
    >
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.isDemo ? 'Demo' : 'Real'} · #{a.accountNumber} · {a.nickname ?? a.accountType} · ${fmt(a.balance)}
        </option>
      ))}
    </select>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {sub && <p className={`text-sm mt-0.5 ${muted}`}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, tone = '', sub }: { label: string; value: ReactNode; tone?: string; sub?: ReactNode }) {
  return (
    <div className={card}>
      <div className={`text-xs ${muted}`}>{label}</div>
      <div className={`text-2xl font-bold mt-1 font-mono ${tone}`}>{value}</div>
      {sub && <div className={`text-xs mt-1 ${muted}`}>{sub}</div>}
    </div>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <div className={`py-10 text-center text-sm ${muted}`}>{children}</div>;
