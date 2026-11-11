import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputPath = resolve('src/assets/runtime-config.json');
const canonicalOrigin = (process.env.SENATLA_CANONICAL_ORIGIN || 'https://senatla-ops.vercel.app').trim().replace(/\/$/, '');
const envPaths = [resolve('.env'), resolve('.env.local')];
const productionOrigin = 'https://senatla-ops.vercel.app';
const uatOrigin = 'https://senatla-ops-uat.vercel.app';

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
    environment: firstEnvValue('SENATLA_DEPLOYMENT_ENV', 'VERCEL_ENV'),
    projectRef: '',
  },
  seo: { canonicalOrigin },
  analytics: { measurementId: (process.env.SENATLA_GA4_MEASUREMENT_ID || '').trim() },
};

if (config.analytics.measurementId && !/^G-[A-Z0-9]{6,20}$/.test(config.analytics.measurementId)) {
  throw new Error('SENATLA_GA4_MEASUREMENT_ID must be blank or a valid GA4 measurement ID.');
}

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

const projectRef = process.env.VERCEL === '1' ? extractSupabaseProjectRef(config.api.supabaseUrl) : '';
config.build.projectRef = projectRef;

if (process.env.VERCEL === '1') {
  const deploymentEnvironment = config.build.environment;
  const approvedProjectRef = firstEnvValue('SENATLA_APPROVED_SUPABASE_PROJECT_REF');

  if (!['production', 'preview'].includes(deploymentEnvironment)) {
    throw new Error('Hosted deployments require SENATLA_DEPLOYMENT_ENV to be production or preview.');
  }
  if (!approvedProjectRef) {
    throw new Error('Hosted deployments require SENATLA_APPROVED_SUPABASE_PROJECT_REF.');
  }
  if (!/^[a-z0-9]{20}$/.test(approvedProjectRef)) {
    throw new Error('SENATLA_APPROVED_SUPABASE_PROJECT_REF must be a 20-character Supabase project ref.');
  }
  if (projectRef !== approvedProjectRef) {
    throw new Error('Hosted Supabase URL does not match SENATLA_APPROVED_SUPABASE_PROJECT_REF.');
  }
  const expectedOrigin = deploymentEnvironment === 'preview' ? uatOrigin : productionOrigin;
  if (canonicalOrigin !== expectedOrigin) {
    throw new Error(`Hosted ${deploymentEnvironment} deployments must use ${expectedOrigin} as SENATLA_CANONICAL_ORIGIN.`);
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(config, null, 2));

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

function extractSupabaseProjectRef(value) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    const match = parsed.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/i);
    if (!match || parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('SENATLA_SUPABASE_URL must be an HTTPS Supabase project URL without a path, query, or fragment.');
    }
    return match[1].toLowerCase();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('SENATLA_SUPABASE_URL')) throw error;
    throw new Error('SENATLA_SUPABASE_URL must be an HTTPS Supabase project URL.');
  }
}
