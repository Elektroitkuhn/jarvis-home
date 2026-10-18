import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Laufzeitgeheimnisse: niemals in NEXT_PUBLIC_ oder in den Git-Quelltext schreiben.
// Der Amplify SSR Compute-Rolle nur GetSecretValue für jarvis-home/config geben.
const SECRET_NAME = 'jarvis-home/config';
const SECRET_REGION = process.env.JARVIS_SECRET_REGION || 'eu-central-1';
const CACHE_MS = 5 * 60 * 1000;
const client = new SecretsManagerClient({ region: SECRET_REGION });
let cached;
let expires = 0;
let pending;

export async function getConfig() {
  if (cached && Date.now() < expires) return cached;
  if (pending) return pending;
  pending = (async () => {
    const result = await client.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
    if (!result.SecretString) throw new Error('Das AWS-Secret enthält keinen Textwert');
    const config = JSON.parse(result.SecretString);
    for (const name of ['N8N_BASE_URL', 'N8N_USER', 'N8N_PASSWORD', 'APP_PASSWORD', 'SESSION_SECRET']) {
      if (typeof config[name] !== 'string' || !config[name]) throw new Error(`Konfiguration unvollständig: ${name}`);
    }
    if (config.APP_PASSWORD.length < 16 || config.SESSION_SECRET.length < 32) throw new Error('Familienpasswort oder Sitzungsschlüssel zu kurz');
    const url = new URL(config.N8N_BASE_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('N8N_BASE_URL ungültig');
    }
    cached = config;
    expires = Date.now() + CACHE_MS;
    return cached;
  })();
  try { return await pending; }
  finally { pending = null; }
}
