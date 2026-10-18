import { cookieFor } from '../../../lib/auth.js';
import { json, requireOrigin } from '../../../lib/http.js';
export const runtime = 'nodejs';
export async function POST(request) {
  const invalid = requireOrigin(request);
  if (invalid) return invalid;
  return json({ok:true}, 200, {'Set-Cookie': cookieFor('',true)});
}
