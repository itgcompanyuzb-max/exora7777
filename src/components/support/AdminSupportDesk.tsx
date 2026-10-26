import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Lock, Reply } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { CATEGORY_LABEL, PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL, StatusBadge, ago, useTicketEvents } from './shared';
import { ClientDrawer } from './ClientDrawer';

interface Row { id: number; number: string; subject: string; category: string; status: string; priority: string; userName: string; userEmail: string; assigneeId: string | null; assigneeName: string | null; updatedAt: string; lastSender?: string }

/** Operator console: queue, thread with internal notes, client card, status/priority/assignment. */
export function AdminSupportDesk({ meId }: { meId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [filter, setFilter] = useState({ status: '', assignee: '', priority: '', q: '' });
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [drawer, setDrawer] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]).toString();
    try {
      const [l, s] = await Promise.all([apiFetch<{ tickets: Row[] }>(`/api/v1/admin/tickets?${qs}`), apiFetch('/api/v1/admin/tickets-stats')]);
      setRows(l.tickets); setStats(s);
    } catch { /* ignore transient */ }
  }, [filter]);
  const loadDetail = useCallback(async (id: number | null) => {
    if (!id) return setDetail(null);
    try { setDetail(await apiFetch(`/api/v1/admin/tickets/${id}`)); } catch { setDetail(null); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadDetail(selected); }, [selected, loadDetail]);
  useEffect(() => { apiFetch<{ staff: any[] }>('/api/v1/admin/staff').then((r) => setStaff(r.staff)).catch(() => {}); }, []);
  useTicketEvents(() => { loadList(); if (selected) loadDetail(selected); }, 8000);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [detail?.messages?.length]);

  async function act(path: string, body: unknown, ok?: string) {
    try { await apiFetch(`/api/v1/admin/tickets/${selected}/${path}`, { body }); if (ok) toast.success(ok); await Promise.all([loadList(), loadDetail(selected)]); } catch (e: any) { toast.error(e.message); }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await act('reply', { message: text, internal }, internal ? 'Ichki izoh saqlandi' : 'Javob yuborildi');
    setText('');
  }

  const sel = 'rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-xs text-white';
  const card = (label: string, value: any, tone = 'text-white') => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-xl font-bold ${tone}`}>{value ?? '—'}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 text-white">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {card('Ochiq', stats?.byStatus?.open, 'text-sky-300')}
        {card('Tayinlanmagan', stats?.unassigned, stats?.unassigned ? 'text-amber-300' : 'text-white')}
        {card('Mening tiketlarim', stats?.mine)}
        {card('Kechikkan (>24 soat)', stats?.overdue, stats?.overdue ? 'text-rose-300' : 'text-white')}
        {card("O'rtacha birinchi javob", stats?.avgFirstResponseMin == null ? '—' : `${stats.avgFirstResponseMin} daq`)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* queue */}
        <div className="xl:col-span-4 rounded-3xl border border-white/10 bg-[#12161a] p-4 flex flex-col gap-3">
          <input className={`${sel} w-full`} placeholder="Qidirish: mavzu, mijoz, TKT-1001…" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <select className={sel} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
              <option value="">Holat</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className={sel} value={filter.assignee} onChange={(e) => setFilter({ ...filter, assignee: e.target.value })}>
              <option value="">Mas'ul</option><option value="me">Menga</option><option value="none">Tayinlanmagan</option>
            </select>
            <select className={sel} value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })}>
              <option value="">Muhimlik</option>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px]">
            {rows.length === 0 && <div className="text-xs text-gray-500 py-8 text-center">Tiketlar yo'q</div>}
            {rows.map((t) => (
              <button key={t.id} onClick={() => setSelected(t.id)} className={`text-left rounded-2xl border p-3 ${selected === t.id ? 'border-primary/50 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-gray-400">{t.number} <span className={`inline-flex items-center gap-1 ${PRIORITY_STYLE[t.priority]}`}><span className="size-1.5 rounded-full bg-current" />{PRIORITY_LABEL[t.priority]}</span></span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="text-sm font-semibold mt-1 line-clamp-1">{t.subject}</div>
                <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                  <span>{t.userName} · {CATEGORY_LABEL[t.category]}</span>
                  <span className="inline-flex items-center gap-1">{t.lastSender === 'client' && <><Reply className="size-3 text-sky-300" />mijoz javob kutmoqda ·</>} {ago(t.updatedAt)}</span>
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">Mas'ul: {t.assigneeName ?? '—'}</div>
              </button>
            ))}
          </div>
        </div>

        {/* thread */}
        <div className="xl:col-span-5 rounded-3xl border border-white/10 bg-[#12161a] p-4 flex flex-col min-h-[480px]">
          {!detail && <div className="m-auto text-sm text-gray-500">Tiketni tanlang</div>}
          {detail && (
            <>
              <div className="border-b border-white/10 pb-3">
                <div className="text-[11px] font-mono text-gray-400">{detail.ticket.number} · {CATEGORY_LABEL[detail.ticket.category]}</div>
                <h3 className="font-bold">{detail.ticket.subject}</h3>
              </div>
              <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5 max-h-[400px]">
                {detail.messages.map((m: any) => (
                  <div key={m.id} className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-sm ${m.internal ? 'self-center w-[92%] bg-amber-500/10 border border-dashed border-amber-500/40 text-amber-100' : m.senderRole === 'client' ? 'self-start bg-white/10' : m.senderRole === 'system' ? 'self-center bg-white/5 text-gray-500 text-xs' : 'self-end bg-primary/90 text-black'}`}>
                    <div className="text-[10px] font-semibold opacity-70 mb-0.5 flex items-center gap-1">{m.internal && <><Lock className="size-3" />Ichki izoh ·</>} {m.senderName}</div>
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className="text-[10px] opacity-60 mt-1">{ago(m.createdAt)}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="flex flex-col gap-2 pt-3 border-t border-white/10">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={5000}
                  placeholder={internal ? 'Ichki izoh (mijoz ko\'rmaydi)…' : 'Mijozga javob…'}
                  className={`w-full rounded-xl px-3 py-2 text-sm text-white focus:outline-none border ${internal ? 'bg-amber-500/10 border-amber-500/40' : 'bg-black/30 border-white/10'}`} />
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400 flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />Ichki izoh</label>
                  <button disabled={!text.trim()} className="px-5 py-2 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-40">{internal ? 'Saqlash' : 'Yuborish'}</button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* actions + client */}
        <div className="xl:col-span-3 rounded-3xl border border-white/10 bg-[#12161a] p-4 flex flex-col gap-3 text-sm">
          {!detail && <div className="m-auto text-sm text-gray-500">—</div>}
          {detail && (
            <>
              <div className="text-[11px] uppercase tracking-wider text-gray-500">Boshqaruv</div>
              <label className="text-xs text-gray-400">Holat
                <select className={`${sel} w-full mt-1`} value={detail.ticket.status} onChange={(e) => act('status', { status: e.target.value }, 'Holat yangilandi')}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-400">Muhimlik
                <select className={`${sel} w-full mt-1`} value={detail.ticket.priority} onChange={(e) => act('priority', { priority: e.target.value }, 'Muhimlik yangilandi')}>
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-400">Mas'ul xodim
                <select className={`${sel} w-full mt-1`} value={detail.ticket.assigneeId ?? ''} onChange={(e) => act('assign', { assigneeId: e.target.value || null }, 'Mas\'ul yangilandi')}>
                  <option value="">Tayinlanmagan</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}{s.id === meId ? ' (men)' : ''}</option>)}
                </select>
              </label>
              {detail.ticket.assigneeId !== meId && <button onClick={() => act('assign', { assigneeId: 'me' }, 'Tiket sizga biriktirildi')} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs">Menga biriktirish</button>}

              <div className="h-px bg-white/10" />
              <div className="text-[11px] uppercase tracking-wider text-gray-500">Mijoz</div>
              {detail.client && (
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-sm">{detail.client.user.fullName}</div>
                  <div className="text-gray-400">{detail.client.user.email}</div>
                  <div className="text-gray-400">KYC: {detail.client.user.kycStatus} · Ochiq pozitsiya: {detail.client.openPositions}</div>
                  {detail.client.accounts.filter((a: any) => !a.isDemo).map((a: any) => <div key={a.id} className="text-gray-300">Real #{a.number}: ${a.balance.toFixed(2)}</div>)}
                  <button onClick={() => setDrawer(detail.client.user.id)} className="mt-2 w-full px-3 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 font-semibold">360° kartani ochish</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {drawer && <ClientDrawer userId={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}
