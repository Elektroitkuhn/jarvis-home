import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'jarvis_session';
export const SESSION_SECONDS = 14 * 24 * 60 * 60;

export function equalPasswords(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = createHash('sha256').update(a, 'utf8').digest();
  const right = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(left, right);
}

export function newSession(secret) {
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const nonce = randomBytes(20).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${expiry}.${nonce}`).digest('base64url');
  return `${expiry}.${nonce}.${signature}`;
}

export function checkSession(token, secret) {
  if (typeof token !== 'string' || token.length > 240) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d{10,13}$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return false;
  const expiry = Number(parts[0]);
  if (!Number.isSafeInteger(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  try {
    const actual = Buffer.from(parts[2], 'base64url');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

export function cookieFor(token, clear = false) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; ${clear ? 'Max-Age=0' : `Max-Age=${SESSION_SECONDS}`}`;
}

export function getCookie(header, name = COOKIE) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(header || '').match(new RegExp(`(?:^|;\\s*)${safe}=([^;]*)`));
  return match?.[1] ?? '';
}

export function validOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return false;
  const site = request.headers.get('sec-fetch-site');
  if (site && !['same-origin', 'none'].includes(site)) return false;
  return true;
}
