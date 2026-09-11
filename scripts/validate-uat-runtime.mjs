import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validateUatRuntime(config) {
  if (config?.api?.mode !== 'supabase') throw new Error('UAT requires the live Supabase backend.');
  for (const field of ['baseUrl', 'supabaseUrl']) {
    let url;
    try { url = new URL(config.api[field]); } catch { throw new Error(`UAT requires a valid ${field}.`); }
    if (url.protocol !== 'https:' || url.username || url.password || /^(localhost|127\.|0\.|\[::1\])/.test(url.hostname)) {
      throw new Error(`UAT requires a public HTTPS ${field}.`);
    }
  }
  const key = config.api.supabaseAnonKey || '';
  if (key.startsWith('sb_publishable_') && key.length > 20) return;
  try {
    const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    if (claims.role === 'anon') return;
  } catch { /* Reject malformed or privileged keys without echoing them. */ }
  throw new Error('UAT requires a publishable or legacy anon key; privileged keys are forbidden.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateUatRuntime(JSON.parse(readFileSync(process.argv[2] || 'www/assets/runtime-config.json', 'utf8')));
  console.log('UAT runtime verified: live backend, HTTPS endpoints, public client key.');
}
