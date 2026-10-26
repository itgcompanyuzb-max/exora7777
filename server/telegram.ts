// server/telegram.ts
// Phone verification through Telegram Gateway (https://core.telegram.org/gateway/api).
// Telegram generates and delivers the code; we only learn whether the user typed it correctly.
// Without a token (development only) a code is generated locally and printed to the server console.
import crypto from 'crypto';
import { db } from './db.js';
import { getSecret } from './settings.js';

const API = () => (process.env.TELEGRAM_GATEWAY_URL || 'https://gatewayapi.telegram.org').replace(/\/$/, '');
const TTL_SEC = 300;
const MAX_ATTEMPTS = 5;

export function gatewayToken(): { token: string; source: 'admin' | 'env' } | null {
  const fromDb = getSecret('telegram_gateway_token');
  if (fromDb) return { token: fromDb, source: 'admin' };
  const env = process.env.TELEGRAM_GATEWAY_TOKEN?.trim();
  return env ? { token: env, source: 'env' } : null;
}

export const otpRequired = () => (process.env.OTP_REQUIRED || 'on') !== 'off';

/** +998 90 123-45-67 / 901234567 / 998901234567 -> +998901234567 (null when it is not a plausible E.164 number). */
export function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/[^\d+]/g, '');
  const plus = d.startsWith('+');
  d = d.replace(/\+/g, '');
  if (!plus && d.length === 9) d = '998' + d; // Uzbek national format
  const out = `+${d}`;
  return /^\+\d{8,15}$/.test(out) ? out : null;
}

const FRIENDLY: Record<string, string> = {
  PHONE_NUMBER_NOT_FOUND: "Bu raqam Telegramda topilmadi. Telegram ro'yxatdan o'tgan raqamni kiriting.",
  PHONE_NUMBER_INVALID: "Telefon raqami noto'g'ri",
  BALANCE_NOT_ENOUGH: "Telegram Gateway balansi yetarli emas (administrator to'ldirishi kerak)",
  ACCESS_TOKEN_INVALID: "Telegram Gateway tokeni noto'g'ri (administrator tekshirsin)",
  FLOOD_WAIT: "Juda ko'p urinish. Birozdan keyin qayta urining.",
};

async function gateway(method: string, token: string, body: unknown): Promise<any> {
  const res = await fetch(`${API()}/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!data.ok) throw Object.assign(new Error(FRIENDLY[data.error] ?? `Telegram xatosi: ${data.error ?? res.status}`), { code: data.error });
  return data.result;
}

export type SendResult = { otpId: string; channel: 'telegram' | 'console' };

export async function sendCode(phone: string): Promise<SendResult> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const gw = gatewayToken();
  if (gw) {
    const r = await gateway('sendVerificationMessage', gw.token, { phone_number: phone, code_length: 6, ttl: TTL_SEC });
    db.prepare('INSERT INTO otp_requests (id,phone,provider_request_id,created_at,expires_at) VALUES (?,?,?,?,?)')
      .run(id, phone, r.request_id, new Date(now).toISOString(), new Date(now + TTL_SEC * 1000).toISOString());
    return { otpId: id, channel: 'telegram' };
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Telegram Gateway sozlanmagan. Administrator tokenni kiritishi kerak.');
  // development fallback: the code only ever goes to the server log, never to the browser
  const code = String(crypto.randomInt(100000, 1000000));
  db.prepare('INSERT INTO otp_requests (id,phone,code_hash,created_at,expires_at) VALUES (?,?,?,?,?)')
    .run(id, phone, crypto.createHash('sha256').update(`${id}:${code}`).digest('hex'), new Date(now).toISOString(), new Date(now + TTL_SEC * 1000).toISOString());
  console.log(`[otp] DEV MODE (no Telegram token) — code for ${phone}: ${code}`);
  return { otpId: id, channel: 'console' };
}

/** True when the code is right for this phone. Consumes the request on success. */
export async function verifyCode(otpId: string, phone: string, code: string): Promise<{ ok: true; error?: undefined } | { ok: false; error: string }> {
  const row = db.prepare('SELECT * FROM otp_requests WHERE id = ?').get(otpId) as any;
  if (!row || row.phone !== phone || row.used) return { ok: false, error: "Tasdiqlash so'rovi topilmadi. Kodni qayta oling." };
  if (Date.parse(row.expires_at) < Date.now()) return { ok: false, error: 'Kod muddati tugagan. Yangisini oling.' };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Urinishlar soni tugadi. Yangi kod oling." };
  if (!/^\d{4,8}$/.test(code)) return { ok: false, error: "Kod noto'g'ri" };
  db.prepare('UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ?').run(otpId);

  let valid = false;
  if (row.provider_request_id) {
    const gw = gatewayToken();
    if (!gw) return { ok: false, error: 'Telegram Gateway sozlanmagan' };
    try {
      const r = await gateway('checkVerificationStatus', gw.token, { request_id: row.provider_request_id, code });
      valid = r?.verification_status?.status === 'code_valid';
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  } else {
    const h = crypto.createHash('sha256').update(`${otpId}:${code}`).digest();
    valid = crypto.timingSafeEqual(h, Buffer.from(row.code_hash, 'hex'));
  }
  if (!valid) return { ok: false, error: "Kod noto'g'ri" };
  db.prepare('UPDATE otp_requests SET used = 1 WHERE id = ?').run(otpId);
  return { ok: true };
}

/** Throttle: at most 3 codes per phone per 10 minutes. */
export function recentSends(phone: string): number {
  const since = new Date(Date.now() - 10 * 60000).toISOString();
  return (db.prepare('SELECT COUNT(*) n FROM otp_requests WHERE phone = ? AND created_at >= ?').get(phone, since) as any).n;
}

export async function testGateway(phone: string): Promise<string> {
  const gw = gatewayToken();
  if (!gw) throw new Error('Token kiritilmagan');
  const r = await gateway('sendVerificationMessage', gw.token, { phone_number: phone, code_length: 6, ttl: 60 });
  return `Yuborildi (so'rov ${r.request_id}). Qolgan balans: ${r.remaining_balance ?? "noma'lum"}`;
}
