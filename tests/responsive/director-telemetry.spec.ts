import { createClient } from '@supabase/supabase-js';
import { expect, test } from 'playwright/test';
import { RESPONSIVE_TEST_ACCOUNTS, RESPONSIVE_TEST_PASSWORD } from './accounts';

test('Director fleet telemetry keeps primary and secondary scan hierarchy', async ({ page }, testInfo) => {
  test.skip(!['mobile', 'desktop'].includes(testInfo.project.name), 'Focused mobile and desktop telemetry journey');
  test.setTimeout(120_000);

  const supabaseUrl = process.env.SENATLA_SUPABASE_URL || 'http://127.0.0.1:54321';
  const anonKey = process.env.SENATLA_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('SENATLA_SUPABASE_ANON_KEY is required.');

  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: RESPONSIVE_TEST_ACCOUNTS.director.email,
    password: RESPONSIVE_TEST_PASSWORD,
  });
  if (error || !data.session) throw new Error(error?.message || 'Director fixture sign-in failed.');

  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  await page.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
    const preferenceKey = `${session.user.id}:director`;
    localStorage.setItem('senatla_ops_onboarding_v1', JSON.stringify([preferenceKey]));
    localStorage.setItem('senatla_ops_onboarding_preferences_v2', JSON.stringify([preferenceKey]));
  }, { key: storageKey, session: data.session });

  await page.goto('/director');
  const card = page.getByTestId('director-fleet-telemetry');
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toContainText('Fleet Utilization');
  await expect(card).toContainText('Under Maintenance');
  await expect(card).toContainText('Aggregate Fuel Burn Rate');
  await expect(card).toContainText('Total Fuel Expense');

  const primary = card.getByTestId('director-fleet-primary-grid');
  const secondary = card.getByTestId('director-fleet-secondary-grid');
  await expect(primary).toContainText('Fleet Utilization');
  await expect(primary).toContainText('Under Maintenance');
  await expect(secondary).toContainText('Aggregate Fuel Burn Rate');
  await expect(secondary).toContainText('Total Fuel Expense');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await card.screenshot({
    path: testInfo.outputPath(`director-telemetry-${testInfo.project.name}.png`),
    animations: 'disabled',
  });
});
