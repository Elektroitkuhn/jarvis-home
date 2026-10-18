import { authenticated, json, error, readBody, requireOrigin } from '../../../lib/http.js';
import { queryN8n } from '../../../lib/n8n.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const validId = v => Number.isSafeInteger(v) && v > 0 && v < 1000000000;
const validText = (v, length) => typeof v === 'string' && v.length <= length;

async function perform(request, operation) {
  if (operation !== 'list') {
    const invalid = requireOrigin(request);
    if (invalid) return invalid;
  }
  let auth;
  try { auth = await authenticated(request); }
  catch { return error('Server noch nicht eingerichtet', 503); }
  if (!auth.ok) return error('Bitte anmelden', 401);
  let payload;
  if (operation !== 'list') {
    try { payload = await readBody(request); }
    catch { return error('Ungültige JSON-Anfrage'); }
    if (operation === 'add') {
      if (!validText(payload.artikel,120) || !payload.artikel.trim() || !validText(payload.menge,80)) return error('Artikel oder Menge ungültig');
      payload = {artikel:payload.artikel.trim(), menge:payload.menge.trim()};
    } else {
      if (!validId(payload.id)) return error('Artikel-ID ungültig');
      if (operation === 'toggle') {
        if (typeof payload.erledigt !== 'boolean') return error('Erledigt muss true oder false sein');
        payload = {id:payload.id, erledigt:payload.erledigt};
      } else payload = {id:payload.id};
    }
  }
  try { return json(await queryN8n(auth.config,operation,payload)); }
  catch { return error('n8n-Verbindung fehlgeschlagen. Workflow und Zugangsdaten prüfen.', 502); }
}
export const GET = request => perform(request,'list');
export const POST = request => perform(request,'add');
export const PATCH = request => perform(request,'toggle');
export const DELETE = request => perform(request,'remove');
