import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';
import { ago } from './shared';

const ROLES: Record<string, string> = {
  super_admin: 'Super admin (hamma narsa)',
  support_admin: "Qo'llab-quvvatlash operatori (tiketlar, mijozlar)",
  finance_admin: 'Moliya xodimi (depozit/yechish)',
  compliance_admin: 'Compliance (KYC, audit)',
};

/** Staff accounts and roles (creation limited to super admins by the API). */
export function AdminStaff({ canManage, meId }: { canManage: boolean; meId: string }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'support_admin', password: '' });
  const load = useCallback(() => apiFetch<{ staff: any[] }>('/api/v1/admin/staff').then((r) => setStaff(r.staff)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/admin/staff', { body: form });
      toast.success('Xodim qo\'shildi');
      setForm({ fullName: '', email: '', role: 'support_admin', password: '' });
      load();
    } catch (err: any) { toast.error(err.message); }
  }
  async function setRole(id: string, role: string) {
    try { await apiFetch(`/api/v1/admin/staff/${id}/role`, { body: { role } }); toast.success('Rol yangilandi'); load(); } catch (err: any) { toast.error(err.message); }
  }
  async function toggle(id: string, status: string) {
    try { await apiFetch(`/api/v1/admin/users/${id}/status`, { body: { status: status === 'active' ? 'suspended' : 'active' } }); load(); } catch (err: any) { toast.error(err.message); }
  }

  const f = 'rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white';
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 text-white">
      <div className="xl:col-span-2 rounded-3xl border border-white/10 bg-[#12161a] p-4">
        <div className="text-sm font-bold mb-3">Xodimlar ({staff.length})</div>
        <table className="w-full text-xs">
          <thead className="text-gray-500 text-left"><tr><th className="py-1">Ism</th><th>Rol</th><th className="text-right">Ochiq tiket</th><th>Holat</th><th /></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-white/5">
                <td className="py-2"><div className="font-semibold">{s.fullName}{s.id === meId ? ' (men)' : ''}</div><div className="text-gray-500">{s.email} · {ago(s.createdAt)}</div></td>
                <td>
                  {canManage && s.id !== meId ? (
                    <select className="rounded-lg bg-black/30 border border-white/10 px-2 py-1 text-xs" value={s.role} onChange={(e) => setRole(s.id, e.target.value)}>
                      {Object.entries(ROLES).map(([k]) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  ) : s.role}
                </td>
                <td className="text-right">{s.openTickets}</td>
                <td>{s.status}</td>
                <td className="text-right">{canManage && s.id !== meId && <button onClick={() => toggle(s.id, s.status)} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">{s.status === 'active' ? "O'chirish" : 'Yoqish'}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="rounded-3xl border border-white/10 bg-[#12161a] p-4 flex flex-col gap-3">
        <div className="text-sm font-bold">Yangi xodim</div>
        {!canManage && <div className="text-xs text-amber-300">Xodim qo'shish faqat super adminga ruxsat etilgan.</div>}
        <input className={f} placeholder="To'liq ism" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} disabled={!canManage} required />
        <input className={f} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canManage} required />
        <select className={f} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={!canManage}>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k} className="bg-[#12161a]">{v}</option>)}
        </select>
        <input className={f} type="password" placeholder="Parol (kamida 10 belgi)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={!canManage} minLength={10} required />
        <button disabled={!canManage} className="px-4 py-2 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-40">Qo'shish</button>
      </form>
    </div>
  );
}
