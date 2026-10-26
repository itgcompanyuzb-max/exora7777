// server/support.ts
// Support desk: client tickets + operator console, staff management, risk monitor and client 360° view.
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, audit } from './db.js';
import { requireAuth, requireRole, rateLimit, hashPassword } from './auth.js';
import { bus } from './bus.js';
import { tradingEngine } from './tradingEngine.js';
import { marketData } from './marketData.js';
import { SPEC_BY_SYMBOL } from './symbols.js';

const CATEGORIES = ['account', 'deposit', 'withdrawal', 'trading', 'kyc', 'technical', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['open', 'pending', 'in_progress', 'resolved', 'closed'];
const STAFF_ROLES = ['super_admin', 'finance_admin', 'compliance_admin', 'support_admin'];

const ip = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';
const bad = (res: Response, error: string, status = 400) => res.status(status).json({ success: false, error });
const now = () => new Date().toISOString();
const clip = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

const ticketView = (t: any) => ({
  id: t.id, number: `TKT-${1000 + t.id}`, subject: t.subject, category: t.category, priority: t.priority, status: t.status,
  assigneeId: t.assignee_id ?? null, assigneeName: t.assignee_name ?? null, userId: t.user_id, userName: t.user_name, userEmail: t.user_email,
  firstResponseAt: t.first_response_at ?? null, createdAt: t.created_at, updatedAt: t.updated_at, messageCount: t.message_count ?? undefined,
  lastSender: t.last_sender ?? undefined,
});

const LIST_SQL = `SELECT t.*, u.full_name AS user_name, u.email AS user_email, a.full_name AS assignee_name,
  (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.internal = 0) AS message_count,
  (SELECT sender_role FROM ticket_messages m WHERE m.ticket_id = t.id AND m.internal = 0 ORDER BY m.id DESC LIMIT 1) AS last_sender
  FROM tickets t JOIN users u ON u.id = t.user_id LEFT JOIN users a ON a.id = t.assignee_id`;

function messages(ticketId: number, includeInternal: boolean) {
  const rows = db.prepare(`SELECT m.*, u.full_name AS sender_name FROM ticket_messages m LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.ticket_id = ? ${includeInternal ? '' : 'AND m.internal = 0'} ORDER BY m.id ASC`).all(ticketId) as any[];
  return rows.map((m) => ({ id: m.id, senderId: m.sender_id, senderName: m.sender_name ?? 'System', senderRole: m.sender_role, body: m.body, internal: !!m.internal, createdAt: m.created_at }));
}

function addMessage(ticketId: number, senderId: string, senderRole: 'client' | 'agent' | 'system', body: string, internal = false) {
  db.prepare('INSERT INTO ticket_messages (ticket_id,sender_id,sender_role,body,internal,created_at) VALUES (?,?,?,?,?,?)')
    .run(ticketId, senderId, senderRole, body, internal ? 1 : 0, now());
  db.prepare('UPDATE tickets SET updated_at = ? WHERE id = ?').run(now(), ticketId);
}

const emit = (ticketId: number, event: string) => {
  const t = db.prepare('SELECT user_id, assignee_id FROM tickets WHERE id = ?').get(ticketId) as any;
  if (t) bus.emit('ticket', { ticketId, userId: t.user_id, assigneeId: t.assignee_id, event });
};

// ============================================================================
// CLIENT SIDE  (/api/v1/support)
// ============================================================================
export const clientSupportRouter = Router();
clientSupportRouter.use(requireAuth);

clientSupportRouter.get('/tickets', (req, res) => {
  const rows = db.prepare(`${LIST_SQL} WHERE t.user_id = ? ORDER BY t.updated_at DESC LIMIT 100`).all(req.user!.id);
  res.json({ success: true, tickets: rows.map(ticketView) });
});

clientSupportRouter.post('/tickets', rateLimit((r) => `tkt:${r.user?.id}`, 8, 3600_000), (req, res) => {
  const subject = clip(req.body?.subject, 140);
  const body = clip(req.body?.message, 5000);
  const category = CATEGORIES.includes(req.body?.category) ? req.body.category : 'other';
  if (subject.length < 3) return bad(res, 'Mavzu kamida 3 ta belgi bo\'lishi kerak');
  if (body.length < 5) return bad(res, 'Xabar juda qisqa');
  const priority = category === 'withdrawal' || category === 'deposit' ? 'high' : 'medium';
  const info = db.prepare('INSERT INTO tickets (user_id,subject,category,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
    .run(req.user!.id, subject, category, priority, 'open', now(), now());
  const id = Number(info.lastInsertRowid);
  addMessage(id, req.user!.id, 'client', body);
  audit(req.user!.id, 'ticket_create', { id, category }, ip(req));
  emit(id, 'created');
  res.json({ success: true, ticket: ticketView(db.prepare(`${LIST_SQL} WHERE t.id = ?`).get(id)) });
});

function ownTicket(req: Request, res: Response): any | null {
  const t = db.prepare(`${LIST_SQL} WHERE t.id = ? AND t.user_id = ?`).get(Number(req.params.id), req.user!.id);
  if (!t) { bad(res, 'Tiket topilmadi', 404); return null; }
  return t;
}

clientSupportRouter.get('/tickets/:id', (req, res) => {
  const t = ownTicket(req, res);
  if (t) res.json({ success: true, ticket: ticketView(t), messages: messages(t.id, false) });
});

clientSupportRouter.post('/tickets/:id/reply', rateLimit((r) => `tkr:${r.user?.id}`, 40, 3600_000), (req, res) => {
  const t = ownTicket(req, res);
  if (!t) return;
  const body = clip(req.body?.message, 5000);
  if (!body) return bad(res, 'Xabar bo\'sh');
  if (t.status === 'closed') return bad(res, 'Tiket yopilgan. Yangi tiket oching.', 409);
  addMessage(t.id, req.user!.id, 'client', body);
  db.prepare("UPDATE tickets SET status = 'open' WHERE id = ?").run(t.id); // client reply re-opens / queues it
  emit(t.id, 'client_reply');
  res.json({ success: true, messages: messages(t.id, false) });
});

clientSupportRouter.post('/tickets/:id/close', (req, res) => {
  const t = ownTicket(req, res);
  if (!t) return;
  db.prepare("UPDATE tickets SET status = 'closed', updated_at = ? WHERE id = ?").run(now(), t.id);
  addMessage(t.id, req.user!.id, 'system', 'Mijoz tiketni yopdi');
  emit(t.id, 'closed');
  res.json({ success: true });
});

// ============================================================================
// OPERATOR SIDE  (mounted under /api/v1/admin; auth + staff role already enforced there)
// ============================================================================
export const adminSupportRouter = Router();
const supportRoles = requireRole('super_admin', 'support_admin');

adminSupportRouter.get('/tickets', supportRoles, (req, res) => {
  const where: string[] = [];
  const args: any[] = [];
  const q = (k: string, col: string) => { if (req.query[k]) { where.push(`${col} = ?`); args.push(String(req.query[k])); } };
  q('status', 't.status'); q('priority', 't.priority'); q('category', 't.category');
  if (req.query.assignee === 'me') { where.push('t.assignee_id = ?'); args.push(req.user!.id); }
  else if (req.query.assignee === 'none') where.push('t.assignee_id IS NULL');
  else if (req.query.assignee) { where.push('t.assignee_id = ?'); args.push(String(req.query.assignee)); }
  if (req.query.q) { where.push(`(t.subject LIKE ? OR u.email LIKE ? OR u.full_name LIKE ? OR ('TKT-' || (1000 + t.id)) LIKE ?)`); const like = `%${String(req.query.q).slice(0, 60)}%`; args.push(like, like, like, like); }
  const order = `CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.updated_at DESC`;
  const rows = db.prepare(`${LIST_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT 300`).all(...args);
  res.json({ success: true, tickets: rows.map(ticketView) });
});

adminSupportRouter.get('/tickets-stats', supportRoles, (_req, res) => {
  const c = (sql: string, ...a: any[]) => (db.prepare(sql).get(...a) as any).n as number;
  const byStatus: Record<string, number> = {};
  for (const s of STATUSES) byStatus[s] = c('SELECT COUNT(*) n FROM tickets WHERE status = ?', s);
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const rows = db.prepare('SELECT created_at, first_response_at FROM tickets WHERE first_response_at IS NOT NULL AND created_at >= ?').all(since) as any[];
  const avgMin = rows.length ? rows.reduce((s, r) => s + (Date.parse(r.first_response_at) - Date.parse(r.created_at)) / 60000, 0) / rows.length : null;
  res.json({
    success: true,
    byStatus,
    unassigned: c("SELECT COUNT(*) n FROM tickets WHERE assignee_id IS NULL AND status NOT IN ('resolved','closed')"),
    mine: c("SELECT COUNT(*) n FROM tickets WHERE assignee_id = ? AND status NOT IN ('resolved','closed')", _req.user!.id),
    overdue: c("SELECT COUNT(*) n FROM tickets WHERE status IN ('open','in_progress') AND updated_at < ?", new Date(Date.now() - 24 * 3600000).toISOString()),
    avgFirstResponseMin: avgMin === null ? null : Math.round(avgMin),
  });
});

function clientCard(userId: string) {
  const u = db.prepare('SELECT id,email,full_name,phone,status,kyc_status,created_at,referral_code,referred_by FROM users WHERE id = ?').get(userId) as any;
  if (!u) return null;
  const accounts = tradingEngine.accountsOf(userId).map((a) => ({ id: a.id, number: a.accountNumber, tier: a.tier, isDemo: a.isDemo, balance: a.balance, equity: a.equity, margin: a.margin, marginLevel: a.marginLevel, leverage: a.leverage }));
  const ids = accounts.map((a) => a.id);
  const tx = ids.length ? db.prepare(`SELECT id,kind,amount,method,status,created_at FROM transactions WHERE account_id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at DESC LIMIT 8`).all(...ids) : [];
  return {
    user: { id: u.id, email: u.email, fullName: u.full_name, phone: u.phone, status: u.status, kycStatus: u.kyc_status, createdAt: u.created_at, referralCode: u.referral_code, referredBy: u.referred_by ? ((db.prepare('SELECT full_name FROM users WHERE id = ?').get(u.referred_by) as any)?.full_name ?? null) : null, referredCount: (db.prepare('SELECT COUNT(*) n FROM users WHERE referred_by = ?').get(u.id) as any).n },
    accounts, transactions: tx, openPositions: ids.reduce((n, id) => n + tradingEngine.openOrders(id).length, 0),
    ticketCount: (db.prepare('SELECT COUNT(*) n FROM tickets WHERE user_id = ?').get(userId) as any).n,
  };
}

adminSupportRouter.get('/tickets/:id', supportRoles, (req, res) => {
  const t = db.prepare(`${LIST_SQL} WHERE t.id = ?`).get(Number(req.params.id)) as any;
  if (!t) return bad(res, 'Tiket topilmadi', 404);
  res.json({ success: true, ticket: ticketView(t), messages: messages(t.id, true), client: clientCard(t.user_id) });
});

adminSupportRouter.post('/tickets/:id/reply', supportRoles, (req, res) => {
  const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(Number(req.params.id)) as any;
  if (!t) return bad(res, 'Tiket topilmadi', 404);
  const body = clip(req.body?.message, 5000);
  if (!body) return bad(res, 'Xabar bo\'sh');
  const internal = !!req.body?.internal;
  addMessage(t.id, req.user!.id, 'agent', body, internal);
  if (!internal) {
    // public reply: take ownership if unassigned, stamp first-response time, wait for the client
    db.prepare("UPDATE tickets SET status = CASE WHEN status IN ('resolved','closed') THEN status ELSE 'pending' END, assignee_id = COALESCE(assignee_id, ?), first_response_at = COALESCE(first_response_at, ?) WHERE id = ?")
      .run(req.user!.id, now(), t.id);
  }
  audit(req.user!.id, internal ? 'ticket_note' : 'ticket_reply', { id: t.id }, ip(req));
  emit(t.id, internal ? 'note' : 'agent_reply');
  res.json({ success: true, messages: messages(t.id, true) });
});

function patchTicket(field: 'status' | 'priority' | 'assignee_id', values: string[] | null) {
  return (req: Request, res: Response) => {
    const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(Number(req.params.id)) as any;
    if (!t) return bad(res, 'Tiket topilmadi', 404);
    let value: string | null;
    if (field === 'assignee_id') {
      const a = req.body?.assigneeId;
      value = a === 'me' ? req.user!.id : a ? String(a) : null;
      if (value && !db.prepare("SELECT 1 FROM users WHERE id = ? AND role != 'client'").get(value)) return bad(res, 'Xodim topilmadi');
    } else {
      value = String(req.body?.[field === 'status' ? 'status' : 'priority'] ?? '');
      if (!values!.includes(value)) return bad(res, 'Noto\'g\'ri qiymat');
    }
    db.prepare(`UPDATE tickets SET ${field} = ?, updated_at = ? WHERE id = ?`).run(value, now(), t.id);
    addMessage(t.id, req.user!.id, 'system', `${field === 'assignee_id' ? 'Mas\'ul' : field === 'status' ? 'Holat' : 'Muhimlik'}: ${value ?? 'tayinlanmagan'}`, true);
    audit(req.user!.id, `ticket_${field}`, { id: t.id, value }, ip(req));
    emit(t.id, field);
    res.json({ success: true });
  };
}
adminSupportRouter.post('/tickets/:id/status', supportRoles, patchTicket('status', STATUSES));
adminSupportRouter.post('/tickets/:id/priority', supportRoles, patchTicket('priority', PRIORITIES));
adminSupportRouter.post('/tickets/:id/assign', supportRoles, patchTicket('assignee_id', null));

// ---------------------------------------------------------------- staff
adminSupportRouter.get('/staff', requireRole('super_admin', 'support_admin'), (_req, res) => {
  const rows = db.prepare("SELECT id,email,full_name,role,status,created_at FROM users WHERE role != 'client' ORDER BY created_at").all() as any[];
  res.json({
    success: true,
    staff: rows.map((u) => ({
      id: u.id, email: u.email, fullName: u.full_name, role: u.role, status: u.status, createdAt: u.created_at,
      openTickets: (db.prepare("SELECT COUNT(*) n FROM tickets WHERE assignee_id = ? AND status NOT IN ('resolved','closed')").get(u.id) as any).n,
    })),
  });
});

adminSupportRouter.post('/staff', requireRole('super_admin'), (req, res) => {
  const email = clip(req.body?.email, 160).toLowerCase();
  const fullName = clip(req.body?.fullName, 120);
  const role = String(req.body?.role);
  const password = String(req.body?.password ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad(res, 'Email noto\'g\'ri');
  if (fullName.length < 2) return bad(res, 'Ism kiriting');
  if (!STAFF_ROLES.includes(role)) return bad(res, 'Rol noto\'g\'ri');
  if (password.length < 10) return bad(res, 'Parol kamida 10 ta belgi bo\'lsin');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return bad(res, 'Bu email band', 409);
  const id = `usr_${crypto.randomUUID()}`;
  db.prepare('INSERT INTO users (id,email,full_name,password_hash,role,status,kyc_status,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, email, fullName, hashPassword(password), role, 'active', 'approved', now());
  audit(req.user!.id, 'staff_create', { id, email, role }, ip(req));
  res.json({ success: true, id });
});

adminSupportRouter.post('/staff/:id/role', requireRole('super_admin'), (req, res) => {
  const role = String(req.body?.role);
  if (!STAFF_ROLES.includes(role)) return bad(res, 'Rol noto\'g\'ri');
  if (req.params.id === req.user!.id) return bad(res, 'O\'z rolingizni o\'zgartira olmaysiz');
  db.prepare("UPDATE users SET role = ? WHERE id = ? AND role != 'client'").run(role, req.params.id);
  audit(req.user!.id, 'staff_role', { id: req.params.id, role }, ip(req));
  res.json({ success: true });
});

// ---------------------------------------------------------------- client 360°
adminSupportRouter.get('/clients/:id', requireRole('super_admin', 'support_admin', 'compliance_admin', 'finance_admin'), (req, res) => {
  const card = clientCard(req.params.id);
  if (!card) return bad(res, 'Mijoz topilmadi', 404);
  const ids = card.accounts.map((a) => a.id);
  const positions = ids.flatMap((id) => [...tradingEngine.openOrders(id), ...tradingEngine.pendingOrders(id)]);
  const history = ids.flatMap((id) => tradingEngine.history(id, 15));
  const tickets = db.prepare(`${LIST_SQL} WHERE t.user_id = ? ORDER BY t.updated_at DESC LIMIT 20`).all(req.params.id).map(ticketView);
  const log = db.prepare('SELECT id, action, detail, ip, created_at FROM audit WHERE actor = ? ORDER BY id DESC LIMIT 30').all(req.params.id);
  res.json({ success: true, ...card, positions, history, tickets, activity: log });
});

// ---------------------------------------------------------------- risk monitor
adminSupportRouter.get('/risk', (req, res) => {
  const includeDemo = req.query.demo === '1';
  const accounts = [...tradingEngine.accounts.values()].filter((a) => includeDemo || !a.isDemo);
  const accIds = new Set(accounts.map((a) => a.id));
  const exposure = new Map<string, { symbol: string; longLots: number; shortLots: number; openCount: number; floatingPnl: number; notional: number }>();
  for (const o of tradingEngine.openOrders()) {
    if (!accIds.has(o.accountId)) continue;
    const spec = SPEC_BY_SYMBOL.get(o.symbol)!;
    const e = exposure.get(o.symbol) ?? { symbol: o.symbol, longLots: 0, shortLots: 0, openCount: 0, floatingPnl: 0, notional: 0 };
    if (o.side === 'BUY') e.longLots += o.lots; else e.shortLots += o.lots;
    e.openCount++;
    e.floatingPnl += o.pnl;
    e.notional += spec.usdBase ? o.lots * spec.contractSize : o.lots * spec.contractSize * (o.currentPrice ?? o.openPrice ?? 0);
    exposure.set(o.symbol, e);
  }
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const owner = (userId: string) => (db.prepare('SELECT full_name, email FROM users WHERE id = ?').get(userId) as any) ?? {};
  const row = (a: (typeof accounts)[number]) => ({ accountId: a.id, number: a.accountNumber, userId: a.userId, owner: owner(a.userId).full_name, email: owner(a.userId).email, isDemo: a.isDemo, tier: a.tier, balance: a.balance, equity: a.equity, margin: a.margin, marginLevel: a.marginLevel, floatingPnl: a.floatingPnl });
  const withPos = accounts.filter((a) => a.margin > 0);
  res.json({
    success: true,
    totals: {
      accounts: accounts.length,
      openPositions: [...exposure.values()].reduce((n, e) => n + e.openCount, 0),
      pendingOrders: tradingEngine.pendingOrders().filter((o) => accIds.has(o.accountId)).length,
      equity: r2(accounts.reduce((s, a) => s + a.equity, 0)),
      floatingPnl: r2(accounts.reduce((s, a) => s + a.floatingPnl, 0)),
      brokerResult: r2(-accounts.reduce((s, a) => s + a.floatingPnl, 0)), // B-book view: clients' floating P/L is the house's opposite
    },
    exposure: [...exposure.values()].map((e) => ({ ...e, netLots: r2(e.longLots - e.shortLots), longLots: r2(e.longLots), shortLots: r2(e.shortLots), floatingPnl: r2(e.floatingPnl), notional: Math.round(e.notional) })).sort((a, b) => b.notional - a.notional),
    marginCalls: withPos.filter((a) => a.marginLevel < 150).sort((a, b) => a.marginLevel - b.marginLevel).slice(0, 20).map(row),
    topLosers: withPos.filter((a) => a.floatingPnl < 0).sort((a, b) => a.floatingPnl - b.floatingPnl).slice(0, 10).map(row),
    topWinners: withPos.filter((a) => a.floatingPnl > 0).sort((a, b) => b.floatingPnl - a.floatingPnl).slice(0, 10).map(row),
    feed: marketData.status(),
  });
});
