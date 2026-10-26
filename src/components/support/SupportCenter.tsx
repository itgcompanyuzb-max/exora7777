import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { apiFetch, getToken } from '../../lib/api';
import { CATEGORY_LABEL, StatusBadge, ago, useTicketEvents } from './shared';

interface Ticket { id: number; number: string; subject: string; category: string; status: string; priority: string; updatedAt: string; createdAt: string; assigneeName: string | null; lastSender?: string }
interface Msg { id: number; senderName: string; senderRole: string; body: string; createdAt: string }

/** Client-facing support: create tickets and chat with operators. */
export function SupportCenter({ onLogin }: { onLogin?: () => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [thread, setThread] = useState<{ ticket: Ticket; messages: Msg[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'account', message: '' });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const authed = !!getToken();

  const loadList = useCallback(async () => {
    if (!getToken()) return;
    try { setTickets((await apiFetch<{ tickets: Ticket[] }>('/api/v1/support/tickets')).tickets); } catch { /* offline */ }
  }, []);
  const loadThread = useCallback(async (id: number | null) => {
    if (!id) return setThread(null);
    try { setThread(await apiFetch(`/api/v1/support/tickets/${id}`)); } catch { setThread(null); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadThread(selected); }, [selected, loadThread]);
  useTicketEvents(() => { loadList(); if (selected) loadThread(selected); });
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages.length]);

  if (!authed) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#12161a] p-8 text-center text-gray-300">
        <div className="text-lg font-bold text-white mb-1">Qo'llab-quvvatlash tiketlari</div>
        <p className="text-sm mb-4">Murojaat yuborish uchun tizimga kiring.</p>
        {onLogin && <button onClick={onLogin} className="px-5 py-2 rounded-xl bg-primary text-black font-bold text-sm">Kirish</button>}
      </div>
    );
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await apiFetch<{ ticket: Ticket }>('/api/v1/support/tickets', { body: form });
      toast.success(`Tiket ${r.ticket.number} yaratildi. Operatorlar tez orada javob beradi.`);
      setForm({ subject: '', category: 'account', message: '' });
      setCreating(false);
      await loadList();
      setSelected(r.ticket.id);
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/support/tickets/${selected}/reply`, { body: { message: reply } });
      setReply('');
      await loadThread(selected);
      loadList();
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function closeTicket() {
    if (!selected) return;
    try { await apiFetch(`/api/v1/support/tickets/${selected}/close`, { body: {} }); toast.success('Tiket yopildi'); await loadThread(selected); loadList(); } catch (err: any) { toast.error(err.message); }
  }

  const input = 'w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/60';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-white">
      {/* list */}
      <div className="lg:col-span-4 rounded-3xl border border-white/10 bg-[#12161a] p-4 flex flex-col gap-3 min-h-[420px]">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">Mening tiketlarim</h3>
          <button onClick={() => { setCreating(true); setSelected(null); }} className="px-3 py-1.5 rounded-lg bg-primary text-black text-xs font-bold">+ Yangi tiket</button>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[460px]">
          {tickets.length === 0 && <div className="text-xs text-gray-500 py-8 text-center">Hali tiket yo'q. Savolingiz bo'lsa, yangi tiket oching.</div>}
          {tickets.map((t) => (
            <button key={t.id} onClick={() => { setSelected(t.id); setCreating(false); }}
              className={`text-left rounded-2xl border p-3 transition-colors ${selected === t.id ? 'border-primary/50 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-gray-400">{t.number}</span>
                <StatusBadge status={t.status} />
              </div>
              <div className="text-sm font-semibold mt-1 line-clamp-1">{t.subject}</div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                <span>{CATEGORY_LABEL[t.category] ?? t.category}</span>
                <span>{t.lastSender === 'agent' && t.status === 'pending' ? '● Yangi javob · ' : ''}{ago(t.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* detail / create */}
      <div className="lg:col-span-8 rounded-3xl border border-white/10 bg-[#12161a] p-5 flex flex-col min-h-[420px]">
        {creating && (
          <form onSubmit={create} className="flex flex-col gap-3">
            <h3 className="font-bold">Yangi murojaat</h3>
            <input className={input} placeholder="Mavzu (masalan: Depozit hisobga tushmadi)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={140} required />
            <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-[#12161a]">{v}</option>)}
            </select>
            <textarea className={`${input} min-h-[140px]`} placeholder="Muammoni batafsil yozing: hisob raqami, summa, vaqt..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={5000} required />
            <div className="flex gap-2">
              <button disabled={busy} className="px-5 py-2 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-50">Yuborish</button>
              <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl bg-white/10 text-sm">Bekor qilish</button>
            </div>
          </form>
        )}

        {!creating && !thread && <div className="m-auto text-sm text-gray-500">Tiketni tanlang yoki yangisini oching</div>}

        {!creating && thread && (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-mono text-gray-400">{thread.ticket.number} · {CATEGORY_LABEL[thread.ticket.category]}</div>
                <h3 className="font-bold">{thread.ticket.subject}</h3>
                <div className="text-[11px] text-gray-500 mt-0.5">Mas'ul: {thread.ticket.assigneeName ?? 'tayinlanmagan'} · {ago(thread.ticket.createdAt)}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={thread.ticket.status} />
                {thread.ticket.status !== 'closed' && <button onClick={closeTicket} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20">Yopish</button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 max-h-[380px]">
              {thread.messages.map((m) => (
                <div key={m.id} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.senderRole === 'client' ? 'self-end bg-primary/90 text-black' : m.senderRole === 'system' ? 'self-center bg-white/5 text-gray-400 text-xs' : 'self-start bg-white/10'}`}>
                  {m.senderRole === 'agent' && <div className="text-[10px] text-primary font-semibold mb-0.5">{m.senderName} · Qo'llab-quvvatlash</div>}
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={`text-[10px] mt-1 ${m.senderRole === 'client' ? 'text-black/60' : 'text-gray-500'}`}>{ago(m.createdAt)}</div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {thread.ticket.status === 'closed' ? (
              <div className="text-xs text-gray-500 text-center py-2">Tiket yopilgan. Yangi savol uchun yangi tiket oching.</div>
            ) : (
              <form onSubmit={send} className="flex gap-2 pt-2 border-t border-white/10">
                <input className={input} placeholder="Javob yozing..." value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} />
                <button disabled={busy || !reply.trim()} className="px-5 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-40">Yuborish</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
