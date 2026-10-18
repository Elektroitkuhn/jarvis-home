import { authenticated, json, error } from '../../../lib/http.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try { const {ok} = await authenticated(request); return json({authenticated:ok}); }
  catch { return error('Server noch nicht eingerichtet', 503); }
}
