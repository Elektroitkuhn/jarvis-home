import { checkSession, getCookie, validOrigin } from './auth.js';
import { getConfig } from './config.js';

export function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...headers
  }});
}
export const error = (message, status=400) => json({ error: message }, status);

export async function readBody(request) {
  if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) throw new Error('JSON erforderlich');
  const text = await request.text();
  if (text.length > 10000) throw new Error('Anfrage zu groß');
  const body = JSON.parse(text);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Ungültige Anfrage');
  return body;
}

export async function authenticated(request) {
  const config = await getConfig();
  return { config, ok: checkSession(getCookie(request.headers.get('cookie')), config.SESSION_SECRET) };
}
export function requireOrigin(request) {
  if (!validOrigin(request)) return error('Ungültige Herkunft', 403);
  return null;
}
