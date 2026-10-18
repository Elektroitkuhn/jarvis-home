import { randomBytes } from 'node:crypto';
import { HTML } from '../lib/template.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const nonce = randomBytes(20).toString('base64url');
  const csp = `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
  return new Response(HTML.replace('__CSP_NONCE__', nonce), { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store', 'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY'
  }});
}
