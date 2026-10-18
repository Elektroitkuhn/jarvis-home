import { Buffer } from 'node:buffer';

const routes = {
  list: ['GET','/webhook/jarvis-einkaufsliste'],
  add: ['POST','/webhook/jarvis-einkaufsliste-add'],
  toggle: ['POST','/webhook/jarvis-einkaufsliste-update'],
  remove: ['POST','/webhook/jarvis-einkaufsliste-delete'],
};

export async function queryN8n(config, operation, payload) {
  const route = routes[operation];
  if (!route) throw new Error('Unbekannte Aktion');
  const [method, path] = route;
  const basic = Buffer.from(`${config.N8N_USER}:${config.N8N_PASSWORD}`, 'utf8').toString('base64');
  const baseUrl = config.N8N_BASE_URL.replace(/\/+$/, '');
  const result = await fetch(baseUrl + path, {
    method, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Basic ${basic}`, Accept: 'application/json', ...(payload ? {'Content-Type':'application/json'}:{}) },
    ...(payload ? {body:JSON.stringify(payload)} : {})
  });
  if (!result.ok) throw new Error(`n8n antwortet HTTP ${result.status}`);
  const raw = await result.text();
  if (!raw.trim()) return operation === 'list' ? [] : {ok:true};
  let parsed;
  try { parsed = JSON.parse(raw); } catch {throw new Error('n8n antwortet nicht im JSON-Format');}
  if (operation === 'list') {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.data)) return parsed.data;
    if (parsed && typeof parsed === 'object' && typeof parsed.Artikel === 'string') return [parsed];
    throw new Error('Unerwartetes Tabellenformat');
  }
  return {ok:true};
}
