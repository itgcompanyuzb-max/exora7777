import { useEffect } from 'react';

export const STATUS_LABEL: Record<string, string> = { open: 'Ochiq', pending: 'Javob kutilmoqda', in_progress: 'Jarayonda', resolved: 'Hal qilindi', closed: 'Yopilgan' };
export const STATUS_STYLE: Record<string, string> = {
  open: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  in_progress: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  closed: 'bg-white/10 text-gray-400 border-white/15',
};
export const PRIORITY_LABEL: Record<string, string> = { low: 'Past', medium: "O'rta", high: 'Yuqori', urgent: 'Shoshilinch' };
export const PRIORITY_STYLE: Record<string, string> = {
  low: 'text-gray-400', medium: 'text-sky-300', high: 'text-amber-300', urgent: 'text-rose-400 font-bold',
};
export const CATEGORY_LABEL: Record<string, string> = {
  account: 'Hisob', deposit: 'Depozit', withdrawal: 'Yechish', trading: 'Savdo', kyc: 'Tasdiqlash (KYC)', technical: 'Texnik', other: 'Boshqa',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${STATUS_STYLE[status] ?? ''}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function ago(iso?: string | null): string {
  if (!iso) return '—';
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'hozir';
  if (s < 3600) return `${Math.floor(s / 60)} daq oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  return `${Math.floor(s / 86400)} kun oldin`;
}

export const money = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Re-run `fn` whenever the server pushes a ticket event (WebSocket) and every `pollMs` as a safety net. */
export function useTicketEvents(fn: () => void, pollMs = 10000) {
  useEffect(() => {
    const h = () => fn();
    window.addEventListener('exora-ticket', h);
    const id = setInterval(fn, pollMs);
    return () => { window.removeEventListener('exora-ticket', h); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
