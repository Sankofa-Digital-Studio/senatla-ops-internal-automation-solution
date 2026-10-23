import { spawnSync } from 'node:child_process';
import { defineConfig } from 'playwright/test';

const viewports = [
  { name: 'mobile', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mini-pc', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tv', width: 2560, height: 1440 },
];

const responsiveSupabaseEnv = resolveResponsiveSupabaseEnv();
process.env.SENATLA_API_MODE = 'supabase';
process.env.SENATLA_SUPABASE_URL = responsiveSupabaseEnv.SENATLA_SUPABASE_URL;
process.env.SENATLA_SUPABASE_ANON_KEY = responsiveSupabaseEnv.SENATLA_SUPABASE_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = responsiveSupabaseEnv.SUPABASE_SERVICE_ROLE_KEY;

export default defineConfig({
  testDir: './tests/responsive',
  outputDir: 'output/playwright/results',
  globalSetup: './tests/responsive/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'output/playwright/report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: viewports.map(({ name, width, height }) => ({ name, use: { viewport: { width, height } } })),
  webServer: {
    command: 'npm run start -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/login',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      SENATLA_API_MODE: 'supabase',
      SENATLA_SUPABASE_URL: responsiveSupabaseEnv.SENATLA_SUPABASE_URL,
      SENATLA_SUPABASE_ANON_KEY: responsiveSupabaseEnv.SENATLA_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: responsiveSupabaseEnv.SUPABASE_SERVICE_ROLE_KEY,
    },
  },
});

function resolveResponsiveSupabaseEnv() {
  const direct = {
    SENATLA_SUPABASE_URL: process.env.SENATLA_SUPABASE_URL?.trim() || '',
    SENATLA_SUPABASE_ANON_KEY: process.env.SENATLA_SUPABASE_ANON_KEY?.trim() || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
  };

  if (direct.SENATLA_SUPABASE_URL && direct.SENATLA_SUPABASE_ANON_KEY && direct.SUPABASE_SERVICE_ROLE_KEY) {
    return direct;
  }

  const status = spawnSync('npx', ['--yes', 'supabase@2.107.0', 'status', '-o', 'env'], {
    encoding: 'utf8',
    shell: true,
  });

  if (status.status !== 0) {
    throw new Error(
      'Responsive Playwright needs Supabase env vars or a running local stack. ' +
        (status.stderr || status.stdout || 'Supabase status could not be resolved.'),
    );
  }

  const fallback = parseEnvBlock(status.stdout);
  return {
    SENATLA_SUPABASE_URL: direct.SENATLA_SUPABASE_URL || fallback.API_URL || fallback.SENATLA_SUPABASE_URL || '',
    SENATLA_SUPABASE_ANON_KEY:
      direct.SENATLA_SUPABASE_ANON_KEY || fallback.ANON_KEY || fallback.SENATLA_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY:
      direct.SUPABASE_SERVICE_ROLE_KEY || fallback.SERVICE_ROLE_KEY || '',
  };
}

function parseEnvBlock(contents: string) {
  const parsed: Record<string, string> = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = stripQuotes(trimmed.slice(index + 1).trim());
    if (key) parsed[key] = value;
  }

  return parsed;
}

function stripQuotes(value: string) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
