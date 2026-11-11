import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), 'write-runtime-config.mjs');

async function runGenerator(env) {
  const tempRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'tmp');
  await mkdir(tempRoot, { recursive: true });
  const cwd = await mkdtemp(resolve(tempRoot, 'senatla-runtime-config-'));

  try {
    const result = await new Promise((resolveResult) => {
      const child = spawn(process.execPath, [scriptPath], {
        cwd,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          ...env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('close', (code) => resolveResult({ code, stdout, stderr, cwd }));
    });

    return result;
  } catch (error) {
    await rm(cwd, { recursive: true, force: true });
    throw error;
  }
}

test('runtime config generator and Vercel rewrites stay aligned', async () => {
  const supabaseAliasResult = await runGenerator({
    VERCEL: '1',
    SENATLA_API_MODE: 'supabase',
    NEXT_PUBLIC_SUPABASE_URL: ' https://abcdefghijklmnopqrst.supabase.co ',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ' anon-key ',
    VERCEL_GIT_COMMIT_SHA: 'abc123',
    SENATLA_DEPLOYMENT_ENV: 'preview',
    SENATLA_APPROVED_SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
    SENATLA_CANONICAL_ORIGIN: 'https://senatla-ops-uat.vercel.app',
  });

  try {
    assert.equal(supabaseAliasResult.code, 0, supabaseAliasResult.stderr);
    const contents = await readFile(resolve(supabaseAliasResult.cwd, 'src/assets/runtime-config.json'), 'utf8');
    const parsed = JSON.parse(contents);
    assert.equal(parsed.api.mode, 'supabase');
    assert.equal(parsed.api.supabaseUrl, 'https://abcdefghijklmnopqrst.supabase.co');
    assert.equal(parsed.api.supabaseAnonKey, 'anon-key');
    assert.equal(parsed.build.commitSha, 'abc123');
    assert.equal(parsed.build.environment, 'preview');
    assert.equal(parsed.build.projectRef, 'abcdefghijklmnopqrst');
    assert.equal(parsed.seo.canonicalOrigin, 'https://senatla-ops-uat.vercel.app');
    assert.equal(parsed.analytics.measurementId, '');
  } finally {
    await rm(supabaseAliasResult.cwd, { recursive: true, force: true });
  }

  const localModeResult = await runGenerator({});
  try {
    assert.equal(localModeResult.code, 0, localModeResult.stderr);
    const contents = await readFile(resolve(localModeResult.cwd, 'src/assets/runtime-config.json'), 'utf8');
    const parsed = JSON.parse(contents);
    assert.equal(parsed.api.mode, 'local');
    assert.equal(parsed.api.supabaseUrl, '');
    assert.equal(parsed.api.supabaseAnonKey, '');
  } finally {
    await rm(localModeResult.cwd, { recursive: true, force: true });
  }

  const localSupabaseResult = await runGenerator({
    SENATLA_API_MODE: 'local',
    SENATLA_SUPABASE_URL: 'http://127.0.0.1:54321',
    SENATLA_SUPABASE_ANON_KEY: 'local-anon-key',
  });
  try {
    assert.equal(localSupabaseResult.code, 0, localSupabaseResult.stderr);
    const parsed = JSON.parse(await readFile(resolve(localSupabaseResult.cwd, 'src/assets/runtime-config.json'), 'utf8'));
    assert.equal(parsed.api.supabaseUrl, 'http://127.0.0.1:54321');
    assert.equal(parsed.build.projectRef, '');
  } finally {
    await rm(localSupabaseResult.cwd, { recursive: true, force: true });
  }

  const hostedBuildResult = await runGenerator({ VERCEL: '1' });
  try {
    assert.notEqual(hostedBuildResult.code, 0);
    assert.match(hostedBuildResult.stderr, /Hosted Vercel builds require SENATLA_API_MODE=supabase/);
    await assert.rejects(
      readFile(resolve(hostedBuildResult.cwd, 'src/assets/runtime-config.json'), 'utf8'),
      (error) => error?.code === 'ENOENT',
    );
  } finally {
    await rm(hostedBuildResult.cwd, { recursive: true, force: true });
  }

  const hostedMissingBindingResult = await runGenerator({
    VERCEL: '1',
    SENATLA_API_MODE: 'supabase',
    SENATLA_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
    SENATLA_SUPABASE_ANON_KEY: 'anon-key',
    SENATLA_DEPLOYMENT_ENV: 'preview',
    SENATLA_CANONICAL_ORIGIN: 'https://senatla-ops-uat.vercel.app',
  });
  try {
    assert.notEqual(hostedMissingBindingResult.code, 0);
    assert.match(hostedMissingBindingResult.stderr, /SENATLA_APPROVED_SUPABASE_PROJECT_REF/);
  } finally {
    await rm(hostedMissingBindingResult.cwd, { recursive: true, force: true });
  }

  const hostedMismatchedBindingResult = await runGenerator({
    VERCEL: '1',
    SENATLA_API_MODE: 'supabase',
    SENATLA_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
    SENATLA_SUPABASE_ANON_KEY: 'anon-key',
    SENATLA_DEPLOYMENT_ENV: 'preview',
    SENATLA_APPROVED_SUPABASE_PROJECT_REF: 'zyxwvutsrqponmlkjihg',
    SENATLA_CANONICAL_ORIGIN: 'https://senatla-ops-uat.vercel.app',
  });
  try {
    assert.notEqual(hostedMismatchedBindingResult.code, 0);
    assert.match(hostedMismatchedBindingResult.stderr, /does not match/);
  } finally {
    await rm(hostedMismatchedBindingResult.cwd, { recursive: true, force: true });
  }

  const hostedMissingCredentialsResult = await runGenerator({
    VERCEL: '1',
    SENATLA_API_MODE: 'supabase',
  });
  try {
    assert.notEqual(hostedMissingCredentialsResult.code, 0);
    assert.match(hostedMissingCredentialsResult.stderr, /Supabase authentication requires SENATLA_SUPABASE_URL/);
  } finally {
    await rm(hostedMissingCredentialsResult.cwd, { recursive: true, force: true });
  }

  const hostedLocalResult = await runGenerator({
    VERCEL: '1',
    SENATLA_API_MODE: 'local',
    SENATLA_SUPABASE_URL: 'https://example.supabase.co',
    SENATLA_SUPABASE_ANON_KEY: 'anon-key',
  });
  try {
    assert.notEqual(hostedLocalResult.code, 0);
    assert.match(hostedLocalResult.stderr, /Hosted Vercel builds require SENATLA_API_MODE=supabase/);
  } finally {
    await rm(hostedLocalResult.cwd, { recursive: true, force: true });
  }

  const invalidModeResult = await runGenerator({ SENATLA_API_MODE: 'review' });
  try {
    assert.notEqual(invalidModeResult.code, 0);
    assert.match(invalidModeResult.stderr, /SENATLA_API_MODE must be either local or supabase/);
  } finally {
    await rm(invalidModeResult.cwd, { recursive: true, force: true });
  }

  const invalidOriginResult = await runGenerator({ SENATLA_CANONICAL_ORIGIN: 'http://example.com/path' });
  try {
    assert.notEqual(invalidOriginResult.code, 0);
    assert.match(invalidOriginResult.stderr, /SENATLA_CANONICAL_ORIGIN must be an HTTPS origin/);
  } finally {
    await rm(invalidOriginResult.cwd, { recursive: true, force: true });
  }

  const analyticsResult = await runGenerator({ SENATLA_GA4_MEASUREMENT_ID: 'G-ABCDEF12' });
  try {
    assert.equal(analyticsResult.code, 0, analyticsResult.stderr);
    const parsed = JSON.parse(await readFile(resolve(analyticsResult.cwd, 'src/assets/runtime-config.json'), 'utf8'));
    assert.equal(parsed.analytics.measurementId, 'G-ABCDEF12');
  } finally {
    await rm(analyticsResult.cwd, { recursive: true, force: true });
  }

  const config = JSON.parse(await readFile(resolve('vercel.json'), 'utf8'));
  const indexTemplate = await readFile(resolve('src/index.html'), 'utf8');
  assert.match(indexTemplate, /rel="canonical" href="https:\/\/senatla-ops\.vercel\.app\/landing"/);
  assert.match(indexTemplate, /property="og:type" content="website"/);
  assert.match(indexTemplate, /name="twitter:card" content="summary"/);
  const jsonLd = JSON.parse(indexTemplate.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1] || 'null');
  assert.equal(jsonLd['@type'], 'SoftwareApplication');
  assert.equal(jsonLd.name, 'Senatla Ops');
  const sitemap = await readFile(resolve('src/sitemap.xml'), 'utf8');
  const robots = await readFile(resolve('src/robots.txt'), 'utf8');
  assert.match(sitemap, /<loc>https:\/\/senatla-ops\.vercel\.app\/landing<\/loc>/);
  assert.equal((sitemap.match(/<url>/g) || []).length, 1);
  assert.match(robots, /Allow: \/\r?\n/);
  assert.doesNotMatch(robots, /Disallow:/);
  const rewrites = config.rewrites;
  const runtimeIndex = rewrites.findIndex((rule) => rule.source === '/assets/runtime-config.json');
  const apiIndex = rewrites.findIndex((rule) => rule.source === '/api/(.*)');
  const spaIndex = rewrites.findIndex((rule) => rule.source === '/(.*)' && rule.destination === '/index.html');

  assert.ok(runtimeIndex >= 0, 'runtime-config route must be explicit');
  assert.ok(apiIndex >= 0, 'API route must remain present');
  assert.ok(spaIndex >= 0, 'SPA fallback must remain present');
  assert.ok(runtimeIndex < spaIndex, 'runtime-config route must precede SPA fallback');
  assert.ok(apiIndex < spaIndex, 'API route must precede SPA fallback');
  assert.equal(rewrites[runtimeIndex].destination, '/assets/runtime-config.json');
  assert.ok(rewrites.findIndex((rule) => rule.source === '/robots.txt') < spaIndex);
  assert.ok(rewrites.findIndex((rule) => rule.source === '/sitemap.xml') < spaIndex);
  const noindexRoutes = ['/', '/login', '/login/(.*)', '/register', '/site-manager', '/office-admin', '/director', '/asset-register', '/costing-model', '/profile-settings'];
  for (const route of noindexRoutes) {
    assert.ok(config.headers.some((rule) => rule.source === route && rule.headers.some((header) => header.key === 'X-Robots-Tag' && header.value === 'noindex, nofollow, noarchive')), `Missing noindex header for ${route}`);
  }
});
