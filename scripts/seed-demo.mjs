// Fills a RUNNING server with presentation data: an operator, 3 clients, support tickets and open trades.
// Usage: set ADMIN_PASSWORD=... && npm run seed:demo   (server must be running; crypto/forex need a live price)
const base = `http://localhost:${process.env.PORT || 3000}/api/v1`;
const J = (t) => ({ 'content-type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) });
const post = async (p, b, t) => (await fetch(base + p, { method: 'POST', headers: J(t), body: JSON.stringify(b) })).json();
const get = async (p, t) => (await fetch(base + p, { headers: J(t) })).json();
const adm = (await post('/auth/login', { email: process.env.ADMIN_EMAIL || 'admin@exora.local', password: process.env.ADMIN_PASSWORD || 'admin12345' })).token;
await post('/admin/staff', { fullName: 'Dilnoza Operator', email: 'dilnoza@x.io', role: 'support_admin', password: 'operator-pass-1' }, adm);
const names = [['Azizbek Rahimov', 'aziz@c.io'], ['Madina Karimova', 'madina@c.io'], ['Jasur Toshmatov', 'jasur@c.io']];
const clients = [];
for (const [fullName, email] of names) { const r = await post('/auth/register', { fullName, email, password: 'password123' }); clients.push(r.token); }
const tk = [
  [0, 'Depozit hisobga tushmadi', 'deposit', "Payme orqali 50$ yubordim, 2 soat bo'ldi lekin balans o'zgarmadi."],
  [1, "Hisobni tasdiqlash (KYC) qancha vaqt oladi?", 'kyc', 'Hujjatlarimni kecha yukladim.'],
  [2, 'Terminalda buyurtma ochilmayapti', 'technical', 'Buy bosganimda "Market closed" chiqyapti, nega?'],
];
const tids = [];
for (const [i, subject, category, message] of tk) tids.push((await post('/support/tickets', { subject, category, message }, clients[i])).ticket.id);
await post(`/admin/tickets/${tids[0]}/reply`, { message: "Salom! To'lovingizni tekshiryapmiz, 15 daqiqada javob beramiz." }, adm);
await post(`/admin/tickets/${tids[0]}/reply`, { message: "Payme tranzaksiya ID so'rash kerak", internal: true }, adm);
await post(`/support/tickets/${tids[0]}/reply`, { message: 'Tranzaksiya ID: 7788123' }, clients[0]);
await post(`/admin/tickets/${tids[2]}/priority`, { priority: 'high' }, adm);
// trades for risk monitor (demo accounts, simulated prices)
for (const [i, sym, side, lots] of [[0, 'XAUUSD', 'BUY', 0.5], [1, 'XAUUSD', 'SELL', 0.3], [1, 'EURUSD', 'BUY', 1], [2, 'BTCUSD', 'BUY', 0.2], [2, 'EURUSD', 'SELL', 0.7]]) {
  const r = await post('/trading/order/open', { symbol: sym, side, lots }, clients[i]); if (!r.success) console.log('order failed', r.error);
}
console.log('seeded; admin token ok:', !!adm);
