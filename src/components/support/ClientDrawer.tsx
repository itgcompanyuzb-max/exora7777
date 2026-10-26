import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { StatusBadge, ago, money } from './shared';

/** Client 360° card for operators: profile, accounts, money movements, positions, tickets, activity. */
export function ClientDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiFetch(`/api/v1/admin/clients/${userId}`).then(setD).catch((e) => setErr(e.message));
  }, [userId]);

  const sec = 'rounded-2xl border border-white/10 bg-white/[0.03] p-3';
  const h = 'text-[11px] uppercase tracking-wider text-gray-500 mb-2';
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl h-full overflow-y-auto bg-[#0f1316] border-l border-white/10 p-5 text-white space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Mijoz kartasi (360°)</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-lg bg-white/10 text-sm">Yopish</button>
        </div>
        {err && <div className="text-rose-300 text-sm">{err}</div>}
        {!d && !err && <div className="text-gray-500 text-sm">Yuklanmoqda…</div>}
        {d && (
          <>
            <div className={sec}>
              <div className="font-bold">{d.user.fullName}</div>
              <div className="text-xs text-gray-400">{d.user.email} {d.user.phone ? `· ${d.user.phone}` : ''}</div>
              <div className="flex gap-2 mt-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-white/10">Holat: {d.user.status}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10">KYC: {d.user.kycStatus}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10">Ro'yxatdan: {ago(d.user.createdAt)}</span>
              </div>
            </div>

            <div className={sec}>
              <div className={h}>Hisoblar</div>
              {d.accounts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                  <span className="font-mono">#{a.number} <span className="text-gray-500">{a.isDemo ? 'Demo' : 'Real'} · {a.tier} · 1:{a.leverage}</span></span>
                  <span>Balans ${money(a.balance)} · Equity ${money(a.equity)}{a.margin > 0 ? ` · Marja ${a.marginLevel}%` : ''}</span>
                </div>
              ))}
            </div>

            <div className={sec}>
              <div className={h}>Ochiq pozitsiyalar va buyurtmalar ({d.positions.length})</div>
              {d.positions.length === 0 && <div className="text-xs text-gray-500">Yo'q</div>}
              {d.positions.map((p: any) => (
                <div key={p.id} className="flex justify-between text-xs py-1">
                  <span>#{p.ticket} {p.symbol} {p.side} {p.lots} {p.status === 'pending' ? `(${p.kind} @ ${p.pendingPrice})` : `@ ${p.openPrice}`}</span>
                  <span className={p.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{p.status === 'open' ? `${p.pnl >= 0 ? '+' : ''}${money(p.pnl)}` : '—'}</span>
                </div>
              ))}
            </div>

            <div className={sec}>
              <div className={h}>So'nggi to'lovlar</div>
              {d.transactions.length === 0 && <div className="text-xs text-gray-500">Yo'q</div>}
              {d.transactions.map((t: any) => (
                <div key={t.id} className="flex justify-between text-xs py-1">
                  <span>{t.kind === 'deposit' ? 'Depozit' : 'Yechish'} · {t.method} · {ago(t.created_at)}</span>
                  <span>${money(t.amount)} <span className="text-gray-500">({t.status})</span></span>
                </div>
              ))}
            </div>

            <div className={sec}>
              <div className={h}>Tiketlar ({d.tickets.length})</div>
              {d.tickets.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-xs py-1">
                  <span><span className="font-mono text-gray-500">{t.number}</span> {t.subject}</span>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>

            <div className={sec}>
              <div className={h}>Faoliyat</div>
              {d.activity.slice(0, 12).map((a: any) => (
                <div key={a.id} className="flex justify-between text-[11px] py-0.5 text-gray-400">
                  <span>{a.action}</span><span>{a.ip ?? ''} · {ago(a.created_at)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
