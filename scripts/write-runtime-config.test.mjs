import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), 'write-runtime-config.mjs');

async function runGenerator(env) {
  const cwd = await mkdtemp(resolve('/tmp', 'senatla-runtime-config-'));

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
    SENATLA_API_MODE: 'supabase',
    NEXT_PUBLIC_SUPABASE_URL: ' https://example.supabase.co ',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ' anon-key ',
  });

  try {
    assert.equal(supabaseAliasResult.code, 0, supabaseAliasResult.stderr);
    const contents = await readFile(resolve(supabaseAliasResult.cwd, 'src/assets/runtime-config.json'), 'utf8');
    const parsed = JSON.parse(contents);
    assert.equal(parsed.api.mode, 'supabase');
    assert.equal(parsed.api.supabaseUrl, 'https://example.supabase.co');
    assert.equal(parsed.api.supabaseAnonKey, 'anon-key');
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

  const hostedBuildResult = await runGenerator({ VERCEL: '1' });
  try {
    assert.notEqual(hostedBuildResult.code, 0);
    assert.match(hostedBuildResult.stderr, /Supabase authentication requires SENATLA_SUPABASE_URL/);
    await assert.rejects(
      readFile(resolve(hostedBuildResult.cwd, 'src/assets/runtime-config.json'), 'utf8'),
      (error) => error?.code === 'ENOENT',
    );
  } finally {
    await rm(hostedBuildResult.cwd, { recursive: true, force: true });
  }

  const config = JSON.parse(await readFile(resolve('vercel.json'), 'utf8'));
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
});
