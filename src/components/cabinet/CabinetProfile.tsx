import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';
import { brokerStore } from '../../lib/brokerStore';
import { PageTitle, card, dt, muted, useAccounts } from './common';

const KYC: Record<string, [string, string]> = {
  approved: ['Tasdiqlangan', 'bg-emerald-500/15 text-emerald-500'],
  pending: ['Tekshirilmoqda', 'bg-amber-500/15 text-amber-500'],
  rejected: ['Rad etilgan', 'bg-rose-500/15 text-rose-500'],
  unsubmitted: ['Topshirilmagan', 'bg-gray-500/15 text-gray-400'],
};
const input = 'w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12161a] px-3 py-2.5 text-sm text-gray-900 dark:text-white';

export function CabinetProfile({ onOpenKyc }: { onOpenKyc?: () => void }) {
  const user = brokerStore.getActiveUser();
  const accounts = useAccounts();
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [busy, setBusy] = useState(false);
  const [label, cls] = KYC[user.kycStatus] ?? KYC.unsubmitted;

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (form.next !== form.again) return toast.error('Yangi parollar mos kelmadi');
    setBusy(true);
    try {
      await apiFetch('/api/v1/auth/password', { body: { current: form.current, next: form.next } });
      toast.success("Parol o'zgartirildi");
      setForm({ current: '', next: '', again: '' });
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }

  const row = (k: string, v: ReactNode) => (
    <div className="flex justify-between gap-4 py-2.5 border-t border-gray-100 dark:border-white/5 text-sm first:border-0">
      <span className={muted}>{k}</span><span className="font-medium text-right">{v}</span>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle title="Profil" />
      <div className={card}>
        {row('Ism', user.fullName)}
        {row('Email', user.email)}
        {row('Telefon', user.phone ?? '—')}
        {row("Ro'yxatdan o'tgan", dt(user.createdAt))}
        {row('Shaxsni tasdiqlash (KYC)', (
          <span className="inline-flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
            {user.kycStatus !== 'approved' && onOpenKyc && <button onClick={onOpenKyc} className="text-xs underline">Topshirish</button>}
          </span>
        ))}
      </div>

      <div className={`${card} overflow-x-auto`}>
        <div className="font-bold mb-2">Hisoblarim</div>
        <table className="w-full text-sm">
          <thead className={`text-left text-xs ${muted}`}><tr><th className="py-2">Raqam</th><th>Turi</th><th>Tarif</th><th>Leverage</th><th>Server</th></tr></thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-gray-100 dark:border-white/5">
                <td className="py-2 font-mono">#{a.accountNumber}</td><td>{a.isDemo ? 'Demo' : 'Real'}</td><td>{a.nickname ?? a.accountType}</td><td>1:{a.leverage}</td><td className={muted}>{a.server}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={changePassword} className={`${card} space-y-3`}>
        <div className="font-bold">Parolni o'zgartirish</div>
        <input className={input} type="password" placeholder="Joriy parol" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required autoComplete="current-password" />
        <input className={input} type="password" placeholder="Yangi parol (kamida 8 belgi)" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required minLength={8} autoComplete="new-password" />
        <input className={input} type="password" placeholder="Yangi parolni takrorlang" value={form.again} onChange={(e) => setForm({ ...form, again: e.target.value })} required autoComplete="new-password" />
        <button disabled={busy} className="px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-40">Saqlash</button>
      </form>
    </div>
  );
}
