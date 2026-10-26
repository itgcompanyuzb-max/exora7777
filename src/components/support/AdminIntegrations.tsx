import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface Info {
  telegram: { configured: boolean; source: 'admin' | 'env' | null; hint: string | null; otpRequired: boolean; devFallback: boolean };
  security: { production: boolean; jwtSecretFromEnv: boolean; https: boolean; otpRequired: boolean; telegramConfigured: boolean; testMode: boolean; defaultAdminActive: boolean; staffCount: number };
}

/** Super-admin screen: Telegram Gateway token (stored encrypted on the server) and a security checklist. */
export function AdminIntegrations() {
  const [info, setInfo] = useState<Info | null>(null);
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => apiFetch<Info>('/api/v1/admin/integrations').then(setInfo).catch((e) => toast.error(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch('/api/v1/admin/integrations/telegram', { body: { token } });
      setToken('');
      toast.success('Telegram Gateway tokeni saqlandi (shifrlangan holda)');
      load();
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm("Tokenni o'chirasizmi? Ro'yxatdan o'tishda kod yuborish to'xtaydi.")) return;
    try { await apiFetch('/api/v1/admin/integrations/telegram', { method: 'DELETE' }); toast.success("Token o'chirildi"); load(); } catch (err: any) { toast.error(err.message); }
  }
  async function test(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { const r = await apiFetch<{ message: string }>('/api/v1/admin/integrations/telegram/test', { body: { phone } }); toast.success(r.message); } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }

  if (!info) return <div className="text-gray-500 text-sm">Yuklanmoqda…</div>;
  const t = info.telegram;
  const sec = info.security;
  const field = 'w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/60';

  const checks: Array<{ ok: boolean; label: string; hint: string }> = [
    { ok: sec.production, label: 'Production rejimi', hint: 'NODE_ENV=production (npm start) bilan ishga tushiring' },
    { ok: sec.jwtSecretFromEnv, label: 'JWT_SECRET muhit o\'zgaruvchisida', hint: 'Uzun tasodifiy qiymat qo\'ying; aks holda ishlab chiqish kaliti ishlatiladi' },
    { ok: sec.https, label: 'HTTPS orqali ulanilgan', hint: 'Domen + SSL (Cloudflare, Caddy yoki Render) kerak' },
    { ok: sec.otpRequired, label: "Ro'yxatdan o'tishda telefon tasdiqlash majburiy", hint: 'OTP_REQUIRED=off bo\'lmasin' },
    { ok: sec.telegramConfigured, label: 'Telegram Gateway ulangan', hint: 'Token kiriting (pastda)' },
    { ok: !sec.defaultAdminActive, label: "Standart admin (admin@exora.local) o'chirilgan yoki almashtirilgan", hint: 'Yangi super admin yarating, eskisini bloklang' },
    { ok: sec.testMode, label: "Test rejimi yoqilgan (haqiqiy pul qabul qilinmaydi)", hint: 'Litsenziyagacha TEST_MODE=on qoldiring' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 text-white">
      <div className="rounded-3xl border border-white/10 bg-[#12161a] p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center"><Send className="size-5" /></div>
          <div>
            <div className="font-bold">Telegram Gateway (telefon tasdiqlash)</div>
            <div className="text-xs text-gray-400">Ro'yxatdan o'tishda mijozning Telegram'iga 6 xonali kod yuboriladi</div>
          </div>
        </div>

        <div className={`rounded-xl px-3 py-2 text-xs flex items-center gap-2 ${t.configured ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
          {t.configured ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {t.configured ? `Ulangan · token ${t.hint} · manba: ${t.source === 'admin' ? 'admin panel' : '.env'}` : t.devFallback ? "Ulanmagan · test rejimi: kodlar faqat server konsoliga yoziladi" : "Ulanmagan · mijozlar ro'yxatdan o'ta olmaydi"}
        </div>

        <form onSubmit={save} className="flex flex-col gap-2">
          <label className="text-xs text-gray-400">{t.configured ? 'Tokenni almashtirish' : 'API token'} (gateway.telegram.org → API)</label>
          <input className={field} type="password" autoComplete="off" placeholder="AAH…" value={token} onChange={(e) => setToken(e.target.value)} />
          <div className="flex gap-2">
            <button disabled={busy || token.length < 20} className="px-4 py-2 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-40">Saqlash</button>
            {t.configured && t.source === 'admin' && <button type="button" onClick={remove} className="px-3 py-2 rounded-xl bg-rose-500/15 text-rose-300 text-sm inline-flex items-center gap-1.5"><Trash2 className="size-4" />O'chirish</button>}
          </div>
          <p className="text-[11px] text-gray-500">Token serverda AES-256 bilan shifrlanib saqlanadi va brauzerga hech qachon qaytarilmaydi.</p>
        </form>

        {t.configured && (
          <form onSubmit={test} className="flex flex-col gap-2 border-t border-white/10 pt-4">
            <label className="text-xs text-gray-400">Sinov: o'z raqamingizga kod yuborish (Telegram'dagi raqam)</label>
            <div className="flex gap-2">
              <input className={field} placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <button disabled={busy || !phone} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm shrink-0 disabled:opacity-40">Yuborish</button>
            </div>
            <p className="text-[11px] text-gray-500">Har bir xabar Gateway balansidan pul yechadi.</p>
          </form>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#12161a] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center"><ShieldCheck className="size-5" /></div>
          <div>
            <div className="font-bold">Xavfsizlik holati</div>
            <div className="text-xs text-gray-400">{checks.filter((c) => c.ok).length} / {checks.length} tayyor</div>
          </div>
        </div>
        {checks.map((c) => (
          <div key={c.label} className="flex items-start gap-3 text-sm">
            {c.ok ? <CheckCircle2 className="size-4 mt-0.5 text-emerald-400 shrink-0" /> : <XCircle className="size-4 mt-0.5 text-rose-400 shrink-0" />}
            <div>
              <div className={c.ok ? 'text-white' : 'text-rose-200'}>{c.label}</div>
              {!c.ok && <div className="text-[11px] text-gray-500">{c.hint}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
