import { ApiError } from './backend';
import { runtime } from './context';

const encoder = new TextEncoder();
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}

/** Constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** The configured admin password. Fails closed when it is not set. */
export function getAdminPassword(): string {
  const pw = runtime().env.ADMIN_PASSWORD;
  if (!pw) {
    throw new ApiError({ code: 'INTERNAL_ERROR', message: 'Admin access is not configured: set the ADMIN_PASSWORD secret.' });
  }
  return pw;
}

function sessionSecret(): string {
  const s = runtime().env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new ApiError({ code: 'INTERNAL_ERROR', message: 'Admin access is not configured: set the SESSION_SECRET secret (16+ characters).' });
  }
  return s;
}

/** Signed, expiring session token (HMAC-SHA256). The admin password itself is never reused as a token. */
export async function createSessionToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = b64url(encoder.encode(JSON.stringify({ v: 1, exp })));
  const sig = b64url(await hmac(sessionSecret(), payload));
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: unknown): Promise<boolean> {
  if (typeof token !== 'string' || token.length > 512) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = b64url(await hmac(sessionSecret(), payload));
  if (!timingSafeEqual(sig, expected)) return false;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' && json.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
