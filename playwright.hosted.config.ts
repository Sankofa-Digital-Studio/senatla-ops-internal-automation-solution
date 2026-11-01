import { defineConfig } from 'playwright/test';

const baseURL = requiredUrl(process.env.SENATLA_HOSTED_URL || 'https://senatla-ops.vercel.app');
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

export default defineConfig({
  testDir: './tests/hosted',
  outputDir: 'output/playwright/hosted-results',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: bypassSecret ? { 'x-vercel-protection-bypass': bypassSecret } : undefined,
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
  },
  projects: [
    { name: 'hosted-desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'hosted-mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
});

function requiredUrl(value: string) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('SENATLA_HOSTED_URL must use HTTP or HTTPS.');
  return parsed.toString().replace(/\/$/, '');
}
