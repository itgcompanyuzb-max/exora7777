import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Send, Users } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Empty, PageTitle, Stat, card, dt, fmt, muted } from './common';

/** Referral program: personal link, invited traders and accrued rewards (computed from their closed volume). */
export function CabinetReferrals() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    const load = () => apiFetch('/api/v1/referrals/me').then((r) => alive && setD(r)).catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!d) return <Empty>Yuklanmoqda…</Empty>;
  const link = `${location.origin}/?ref=${d.code}`;
  const copy = (text: string, what: string) => navigator.clipboard?.writeText(text).then(() => toast.success(`${what} nusxalandi`), () => toast.error("Nusxalab bo'lmadi"));

  return (
    <div className="max-w-4xl">
      <PageTitle title="Referal dasturi" sub={`Do'stlaringizni taklif qiling: ular yopgan har bir lot uchun $${d.ratePerLot} hisoblanadi.`} />

      <div className={`${card} mb-4`}>
        <div className={`text-xs ${muted}`}>Sizning referal havolangiz</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-[240px] rounded-xl bg-gray-100 dark:bg-black/30 px-3 py-2.5 text-sm font-mono break-all">{link}</code>
          <button onClick={() => copy(link, 'Havola')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black font-bold text-sm"><Copy className="size-4" />Nusxalash</button>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Exora Prime'da savdo qilib ko'ring")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm"><Send className="size-4" />Telegram</a>
        </div>
        <div className={`mt-3 text-xs ${muted}`}>Kod: <button onClick={() => copy(d.code, 'Kod')} className="font-mono font-bold text-gray-900 dark:text-white">{d.code}</button> · ro'yxatdan o'tishda "Referal kodi" maydoniga yoziladi.</div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Taklif qilinganlar" value={d.stats.invited} />
        <Stat label="Faol treyderlar" value={d.stats.active} sub="Kamida 1 ta yopilgan bitim" />
        <Stat label="Umumiy hajm" value={`${fmt(d.stats.lots)} lot`} />
        <Stat label="Hisoblangan mukofot" value={`$${fmt(d.stats.earned)}`} tone="text-emerald-500" sub={d.testMode ? "Test rejimi: virtual hisob-kitob, to'lov qilinmaydi" : undefined} />
      </div>

      <div className={`${card} mt-4 overflow-x-auto`}>
        <div className="font-bold mb-2 flex items-center gap-2"><Users className="size-4" />Taklif qilinganlar</div>
        {d.referrals.length === 0 ? <Empty>Hali hech kim yo'q. Havolani ulashing.</Empty> : (
          <table className="w-full text-sm">
            <thead className={`text-left text-xs ${muted}`}><tr><th className="py-2">Foydalanuvchi</th><th>Sana</th><th className="text-right">Bitimlar</th><th className="text-right">Hajm (lot)</th><th className="text-right">Mukofot</th></tr></thead>
            <tbody>
              {d.referrals.map((r: any, i: number) => (
                <tr key={i} className="border-t border-gray-100 dark:border-white/5">
                  <td className="py-2"><div className="font-semibold">{r.name}</div><div className={`text-xs ${muted}`}>{r.email}</div></td>
                  <td className={`text-xs ${muted}`}>{dt(r.joinedAt)}</td><td className="text-right">{r.trades}</td><td className="text-right">{fmt(r.lots)}</td>
                  <td className="text-right font-mono text-emerald-500">${fmt(r.earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
