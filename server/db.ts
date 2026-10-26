// server/db.ts
// SQLite persistence layer (node:sqlite, no native build step required).
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'exora.db');
if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  status TEXT NOT NULL DEFAULT 'active',
  kyc_status TEXT NOT NULL DEFAULT 'unsubmitted',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  account_number TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Standard',
  currency TEXT NOT NULL DEFAULT 'USD',
  balance REAL NOT NULL DEFAULT 0,
  leverage INTEGER NOT NULL DEFAULT 100,
  is_demo INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  ticket INTEGER UNIQUE NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  lots REAL NOT NULL,
  pending_price REAL,
  open_price REAL,
  close_price REAL,
  sl REAL,
  tp REAL,
  commission REAL NOT NULL DEFAULT 0,
  swap REAL NOT NULL DEFAULT 0,
  pnl REAL NOT NULL DEFAULT 0,
  margin REAL NOT NULL DEFAULT 0,
  parent_id TEXT,
  close_reason TEXT,
  created_at TEXT NOT NULL,
  opened_at TEXT,
  closed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_account ON orders(account_id, status);
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  ref TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger(account_id);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  kind TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assignee_id TEXT REFERENCES users(id),
  first_response_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status, updated_at);
CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  body TEXT NOT NULL,
  internal INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs ON ticket_messages(ticket_id);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS otp_requests (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  provider_request_id TEXT,
  code_hash TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_requests(phone, created_at);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS candles (
  symbol TEXT NOT NULL,
  time INTEGER NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume REAL NOT NULL,
  PRIMARY KEY (symbol, time)
);
`);

// Additive migrations for databases created by earlier versions.
try { db.exec('ALTER TABLE users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0'); } catch { /* already present */ }

try { db.exec('ALTER TABLE users ADD COLUMN referral_code TEXT'); } catch { /* already present */ }
try { db.exec('ALTER TABLE users ADD COLUMN referred_by TEXT'); } catch { /* already present */ }
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_refcode ON users(referral_code)');

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters
export function newReferralCode(): string {
  for (;;) {
    const code = Array.from(crypto.randomBytes(7), (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
    if (!db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(code)) return code;
  }
}
// give existing users a code
for (const u of db.prepare('SELECT id FROM users WHERE referral_code IS NULL').all() as any[]) {
  db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(newReferralCode(), u.id);
}

export function audit(actor: string | null, action: string, detail?: unknown, ip?: string) {
  db.prepare('INSERT INTO audit (actor, action, detail, ip, created_at) VALUES (?,?,?,?,?)').run(
    actor,
    action,
    detail === undefined ? null : JSON.stringify(detail),
    ip ?? null,
    new Date().toISOString()
  );
}
