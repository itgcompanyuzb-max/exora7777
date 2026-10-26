import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { brokerStore } from '../../lib/brokerStore';
import { AccountSelect, PageTitle, card, fmt, muted, useSelectedAccount } from './common';

const METHODS: Array<[string, string]> = [['payme', 'Payme'], ['click', 'Click'], ['uzcard_humo', 'Uzcard / Humo'], ['crypto_usdt', 'USDT (TRC20)'], ['bank_wire', 'Bank o\'tkazmasi']];
const input = 'w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12161a] px-3 py-2.5 text-sm text-gray-900 dark:text-white';

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
      <Info className="size-5 shrink-0 mt-0.5" /><div>{children}</div>
    </div>
  );
}

/** Deposit / withdraw. In test mode only the virtual demo balance can be changed; real-money requests are refused by the server. */
export function CabinetFunds({ mode, onOpenKyc }: { mode: 'deposit' | 'withdraw'; onOpenKyc?: () => void }) {
  const { accounts, selected, setId } = useSelectedAccount();
  const testMode = brokerStore.getFeedInfo()?.testMode ?? true;
  const [amount, setAmount] = useState(1000);
  const [method, setMethod] = useState('payme');
  const [dest, setDest] = useState('');
  const [busy, setBusy] = useState(false);
  const user = brokerStore.getActiveUser();
  if (!selected) return null;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  const topUp = (e: FormEvent) => { e.preventDefault(); return run(() => apiFetch('/api/v1/wallet/deposit', { body: { accountId: selected.id, amount } }), `Demo balansga $${fmt(amount)} qo'shildi`); };
  const reset = () => run(() => apiFetch(`/api/v1/accounts/${selected.id}/reset-demo`, { body: {} }), 'Demo hisob boshlang\'ich holatga qaytarildi ($10,000)');
  const request = (e: FormEvent) => {
    e.preventDefault();
    const path = mode === 'deposit' ? '/api/v1/wallet/deposit' : '/api/v1/wallet/withdraw';
    return run(() => apiFetch(path, { body: { accountId: selected.id, amount, method, details: { destination: dest } } }), "So'rov yuborildi. Tasdiqlangach balansga o'tadi.");
  };

  const title = mode === 'deposit' ? 'Depozit' : 'Yechish';
  return (
    <div className="max-w-2xl">
      <PageTitle title={title} right={<AccountSelect accounts={accounts} value={selected.id} onChange={setId} />} />
      <div className={`${card} mb-4`}>
        <div className={`text-xs ${muted}`}>Tanlangan hisob</div>
        <div className="text-2xl font-bold font-mono">${fmt(selected.balance)} <span className={`text-sm font-normal ${muted}`}>{selected.isDemo ? 'Demo' : 'Real'} · #{selected.accountNumber}</span></div>
      </div>

      {selected.isDemo ? (
        mode === 'deposit' ? (
          <form onSubmit={topUp} className={`${card} space-y-4`}>
            <div className="font-bold">Demo balansni to'ldirish</div>
            <p className={`text-sm ${muted}`}>Bu virtual pul, mashq uchun. Haqiqiy mablag' emas.</p>
            <div className="flex flex-wrap gap-2">
              {[1000, 5000, 10000, 50000].map((v) => (
                <button type="button" key={v} onClick={() => setAmount(v)} className={`px-4 py-2 rounded-xl border text-sm ${amount === v ? 'border-primary bg-primary/10 font-bold' : 'border-gray-200 dark:border-white/10'}`}>${fmt(v, 0)}</button>
              ))}
            </div>
            <input className={input} type="number" min={1} max={100000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <div className="flex gap-2">
              <button disabled={busy || amount < 1} className="px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-40">Qo'shish</button>
              <button type="button" disabled={busy} onClick={reset} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm">Boshlang'ich holatga qaytarish</button>
            </div>
          </form>
        ) : <Notice>Demo hisobdan pul yechib bo'lmaydi: u virtual mablag'.</Notice>
      ) : testMode ? (
        <Notice>
          <b>Test rejimi.</b> Platforma litsenziyalash jarayonida, shuning uchun haqiqiy mablag' kiritish va yechish o'chirilgan.
          Savdo qilish uchun yuqoridan <b>Demo</b> hisobni tanlang.
        </Notice>
      ) : mode === 'withdraw' && user.kycStatus !== 'approved' ? (
        <Notice>Pul yechish uchun shaxsni tasdiqlash (KYC) kerak. {onOpenKyc && <button onClick={onOpenKyc} className="underline font-semibold">KYC ga o'tish</button>}</Notice>
      ) : (
        <form onSubmit={request} className={`${card} space-y-4`}>
          <div className="font-bold">{title} so'rovi</div>
          <select className={input} value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input className={input} type="number" min={mode === 'deposit' ? 10 : 1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Summa (USD)" />
          {mode === 'withdraw' && <input className={input} value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Karta raqami yoki hamyon manzili" required />}
          <button disabled={busy} className="px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-40">So'rov yuborish</button>
          <p className={`text-xs ${muted}`}>So'rovlar operator tomonidan tekshiriladi va tasdiqlangach balansga o'tadi.</p>
        </form>
      )}
    </div>
  );
}
