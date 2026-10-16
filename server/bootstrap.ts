// server/bootstrap.ts
import crypto from 'crypto';
import { db } from './db.js';
import { hashPassword } from './auth.js';

/** Make sure a super admin exists. Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD. */
export function ensureAdmin() {
  const existing = db.prepare("SELECT 1 FROM users WHERE role = 'super_admin'").get();
  if (existing) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@exora.local').toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  const generated = !password;
  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[bootstrap] No super admin exists and ADMIN_PASSWORD is not set — admin portal is unavailable.');
      return;
    }
    password = crypto.randomBytes(9).toString('base64url');
  }
  db.prepare('INSERT INTO users (id,email,full_name,password_hash,role,status,kyc_status,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(`usr_${crypto.randomUUID()}`, email, 'Broker Administrator', hashPassword(password), 'super_admin', 'active', 'approved', new Date().toISOString());
  console.log(`[bootstrap] super admin created: ${email}${generated ? `  password: ${password}  (dev only — set ADMIN_PASSWORD)` : ''}`);
}
