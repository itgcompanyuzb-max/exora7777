// server/auth.ts
// Password hashing (scrypt), HS256 JWT, auth middleware and RBAC.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

let secret = process.env.JWT_SECRET || '';
if (!secret) {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
  // Development: keep a generated secret on disk so sessions and encrypted settings survive restarts.
  const file = path.join(process.cwd(), 'data', '.jwt-secret');
  try {
    secret = fs.readFileSync(file, 'utf8').trim();
  } catch {
    secret = crypto.randomBytes(32).toString('hex');
    try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, secret, { mode: 0o600 }); } catch { /* read-only fs: ephemeral */ }
  }
  console.warn('[auth] JWT_SECRET not set — using a development secret from data/.jwt-secret. Set JWT_SECRET in production.');
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

export interface TokenPayload {
  sub: string;
  role: string;
  exp: number;
}

export function signToken(userId: string, role: string, ttlSec = role === 'client' ? 12 * 3600 : 4 * 3600): string {
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify({ sub: userId, role, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

/** Key for encrypting integration secrets at rest (SETTINGS_SECRET falls back to JWT_SECRET). */
export const settingsKey = () => crypto.createHash('sha256').update(`settings:${process.env.SETTINGS_SECRET || secret}`).digest();

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as TokenPayload;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

export interface AuthedUser {
  id: string;
  email: string;
  role: string;
}
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthedUser;
  }
}

export function userFromToken(token: string | undefined): AuthedUser | null {
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const row = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(payload.sub) as any;
  if (!row || row.status !== 'active') return null;
  return { id: row.id, email: row.email, role: row.role };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const user = userFromToken(header.startsWith('Bearer ') ? header.slice(7) : undefined);
  if (!user) return res.status(401).json({ success: false, error: 'Authentication required' });
  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

// Sliding-window rate limiter keyed by an arbitrary string (IP, IP+email, ...).
const hits = new Map<string, number[]>();
export function rateLimit(keyFn: (req: Request) => string, limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    if (recent.length > limit) {
      return res.status(429).json({ success: false, error: 'Too many requests, slow down.' });
    }
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (!v.some((t) => now - t < 3600_000)) hits.delete(k);
}, 600_000).unref();
