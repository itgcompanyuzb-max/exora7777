// server/settings.ts — secrets stored in the DB, AES-256-GCM encrypted at rest.
import crypto from 'crypto';
import { db } from './db.js';
import { settingsKey } from './auth.js';

export function setSecret(key: string, value: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', settingsKey(), iv);
  const enc = Buffer.concat([c.update(value, 'utf8'), c.final()]);
  const packed = Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
  db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?,?,?)').run(key, packed, new Date().toISOString());
}

export function getSecret(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  if (!row) return null;
  try {
    const buf = Buffer.from(row.value, 'base64');
    const d = crypto.createDecipheriv('aes-256-gcm', settingsKey(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
  } catch {
    return null; // secret key changed: treat as unset
  }
}

export function deleteSecret(key: string) {
  db.prepare('DELETE FROM settings WHERE key = ?').run(key);
}
