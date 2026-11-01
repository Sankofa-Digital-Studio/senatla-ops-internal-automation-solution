import { expect, test } from 'playwright/test';

test('hosted runtime is Supabase-backed and matches the reviewed commit', async ({ request }) => {
  const response = await request.get('/assets/runtime-config.json');
  expect(response.ok()).toBeTruthy();

  const config = await response.json() as {
    api?: { mode?: string; supabaseUrl?: string; supabaseAnonKey?: string };
    build?: { commitSha?: string; environment?: string };
  };
  expect(config.api?.mode).toBe('supabase');
  expect(new URL(config.api?.supabaseUrl || '').protocol).toBe('https:');
  expect(Boolean(config.api?.supabaseAnonKey?.trim())).toBeTruthy();

  const expectedCommit = process.env.SENATLA_EXPECTED_COMMIT?.trim();
  if (expectedCommit) expect(config.build?.commitSha).toBe(expectedCommit);
  const expectedEnvironment = process.env.SENATLA_EXPECTED_ENVIRONMENT?.trim();
  if (expectedEnvironment) expect(config.build?.environment).toBe(expectedEnvironment);
});

test('unauthenticated Office route redirects to the role-specific login', async ({ page }) => {
  await page.goto('/office-admin');
  await expect(page).toHaveURL(/\/login\/office\?redirect=%2Foffice-admin$/);
  await expect(page.getByRole('heading', { name: 'Senatla Ops' })).toBeVisible();
});

test('authorized Office QA account reaches the protected workspace', async ({ page }) => {
  const email = process.env.SENATLA_HOSTED_QA_EMAIL?.trim();
  const password = process.env.SENATLA_HOSTED_QA_PASSWORD;
  test.skip(!email || !password, 'Dedicated hosted QA credentials are required.');

  await page.goto('/login/office');
  await page.locator('input[name="username"]').fill(email!);
  await page.locator('input[name="password"]').fill(password!);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/office-admin$/);
  await expect(page.getByRole('heading', { name: 'Control Centre' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
