// Thin client for the Exora trading backend (/api/v1).
const TOKEN_KEY = 'exora_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function apiFetch<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(path.startsWith('/') ? path : `/api/v1/${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || data?.success === false) {
    if (res.status === 401) setToken(null);
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

/** Authorization header for code that talks to the API with raw fetch (e.g. TradingView broker adapter). */
export function authHeaders(): Record<string, string> {
  const t = getToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export async function apiLogin(email: string, password: string) {
  const r = await apiFetch<{ token: string; user: any }>('/api/v1/auth/login', { method: 'POST', body: { email, password } });
  setToken(r.token);
  return r.user;
}

export async function apiRegister(p: { email: string; password: string; fullName: string; phone?: string; otpId?: string; otpCode?: string; referralCode?: string }) {
  const r = await apiFetch<{ token: string; user: any }>('/api/v1/auth/register', { method: 'POST', body: p });
  setToken(r.token);
  return r.user;
}
