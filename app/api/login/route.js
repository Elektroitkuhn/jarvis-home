import { equalPasswords, newSession, cookieFor } from '../../../lib/auth.js';
import { json, error, readBody, requireOrigin } from '../../../lib/http.js';
import { getConfig } from '../../../lib/config.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  const invalid = requireOrigin(request);
  if (invalid) return invalid;
  let body;
  try { body = await readBody(request); } catch { return error('Ungültige Eingabe'); }
  try {
    const config = await getConfig();
    if (typeof body.password !== 'string' || body.password.length > 512 || !equalPasswords(body.password, config.APP_PASSWORD)) {
      return error('Passwort stimmt nicht', 401);
    }
    return json({ok:true}, 200, {'Set-Cookie': cookieFor(newSession(config.SESSION_SECRET))});
  } catch { return error('Server noch nicht eingerichtet', 503); }
}
