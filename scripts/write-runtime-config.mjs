import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputPath = resolve('src/assets/runtime-config.json');
const generatedRoot = resolve('src/.generated-public');
const canonicalOrigin = (process.env.SENATLA_CANONICAL_ORIGIN || 'https://senatla-ops.vercel.app').trim().replace(/\/$/, '');
const canonicalUrl = `${canonicalOrigin}/landing`;
const envPaths = [resolve('.env'), resolve('.env.local')];

for (const envPath of envPaths) {
  loadEnvFile(envPath);
}

const config = {
  api: {
    mode: process.env.SENATLA_API_MODE || 'local',
    baseUrl: process.env.SENATLA_API_BASE_URL || '',
    supabaseUrl: firstEnvValue('SENATLA_SUPABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: firstEnvValue(
      'SENATLA_SUPABASE_ANON_KEY',
      'SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ),
  },
  build: {
    commitSha: firstEnvValue('VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA'),
    environment: firstEnvValue('VERCEL_ENV', 'SENATLA_DEPLOYMENT_ENV'),
  },
  seo: { canonicalOrigin },
};

const parsedOrigin = new URL(canonicalOrigin);
if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== canonicalOrigin) {
  throw new Error('SENATLA_CANONICAL_ORIGIN must be an HTTPS origin without a path, query, or fragment.');
}

if (!['local', 'supabase'].includes(config.api.mode)) {
  throw new Error('SENATLA_API_MODE must be either local or supabase.');
}

if (process.env.VERCEL === '1' && config.api.mode !== 'supabase') {
  throw new Error('Hosted Vercel builds require SENATLA_API_MODE=supabase.');
}

if (
  (config.api.mode === 'supabase' || process.env.VERCEL === '1') &&
  (!config.api.supabaseUrl || !config.api.supabaseAnonKey)
) {
  throw new Error(
    'Supabase authentication requires SENATLA_SUPABASE_URL and SENATLA_SUPABASE_ANON_KEY. ' +
      'Common Vercel aliases SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and ' +
      'SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY are also supported.',
  );
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(config, null, 2));
mkdirSync(generatedRoot, { recursive: true });
writeFileSync(resolve(generatedRoot, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${canonicalOrigin}/sitemap.xml\n`);
writeFileSync(resolve(generatedRoot, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${canonicalUrl}</loc></url></urlset>\n`);
try {
  const indexTemplate = readFileSync(resolve('src/index.html'), 'utf8');
  mkdirSync(resolve('src/.generated'), { recursive: true });
  writeFileSync(resolve('src/.generated/index.html'), indexTemplate.replaceAll('__SENATLA_CANONICAL_ORIGIN__', canonicalOrigin));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

function firstEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function loadEnvFile(filePath) {
  try {
    const contents = requireText(filePath);
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    // Missing local env files are optional.
  }
}

function requireText(filePath) {
  return readFileSync(filePath, 'utf8');
}
