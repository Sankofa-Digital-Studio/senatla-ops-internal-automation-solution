import { createClient } from '@supabase/supabase-js';
import { expect, Locator, Page, test } from 'playwright/test';
import { RESPONSIVE_TEST_ACCOUNTS, RESPONSIVE_TEST_PASSWORD } from './accounts';

const credentials = {
  office: { email: RESPONSIVE_TEST_ACCOUNTS.office.email, password: RESPONSIVE_TEST_PASSWORD },
  site: { email: RESPONSIVE_TEST_ACCOUNTS.site.email, password: RESPONSIVE_TEST_PASSWORD },
  director: { email: RESPONSIVE_TEST_ACCOUNTS.director.email, password: RESPONSIVE_TEST_PASSWORD },
};

test('Office Admin attendance queue renders without responsive regressions', async ({ page }, testInfo) => {
  await seedAuthenticatedPage(page, 'office');
  const recovery = page.getByRole('button', { name: 'Recovery' });
  await expect(recovery).toBeVisible({ timeout: 120000 });
  await recovery.click();
  await expect(page.getByRole('heading', { name: 'Attendance delivery queue' })).toBeVisible();
  const visibleQueue = page.locator('.delivery-table:visible, .delivery-cards:visible');
  await expect(visibleQueue.getByText('Responsive Test Site').first()).toBeVisible();
  await expect(visibleQueue.getByText('pending', { exact: true }).first()).toBeVisible();
  await expect(visibleQueue.getByText('retryable', { exact: true }).first()).toBeVisible();
  await expect(visibleQueue.getByText('rejected', { exact: true }).first()).toBeVisible();
  await expect(visibleQueue.getByText('accepted', { exact: true }).first()).toBeVisible();
  await assertResponsiveSurface(page);

  const wide = testInfo.project.use.viewport!.width >= 1024;
  if (wide) {
    await expect(page.locator('.delivery-table')).toBeVisible();
    await expect(page.locator('.delivery-cards')).toBeHidden();
  } else {
    await expect(page.locator('.delivery-table')).toBeHidden();
    await expect(page.locator('.delivery-cards')).toBeVisible();
  }
  await page.screenshot({ path: `output/playwright/${testInfo.project.name}-office-attendance.png`, fullPage: true });
});

test('Site Manager delivery status renders without exposing other sites', async ({ page }, testInfo) => {
  await seedAuthenticatedPage(page, 'site');
  await expect(page.getByRole('heading', { name: 'Timesheet Register' })).toBeVisible();
  await expect(page.getByText('Current site')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Current authorized site' })).toHaveValue('Responsive Test Site');
  await expect(page.getByText('Attendance delivery')).toBeVisible();
  await expect(page.getByText('accepted').first()).toBeVisible();
  await expect(page.getByText('Forbidden Test Site')).toHaveCount(0);
  await assertResponsiveSurface(page);
  await page.screenshot({ path: `output/playwright/${testInfo.project.name}-site-attendance.png`, fullPage: true });
});

test('Director review is actual-only, keyboard reachable, and uses document scrolling', async ({ page }, testInfo) => {
  await seedAuthenticatedPage(page, 'director');
  await expect(page.getByRole('heading', { name: 'Director operations review' })).toBeVisible({ timeout: 120000 });
  await expect(page.getByRole('heading', { name: 'Director review queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Period and actuals' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recognized operating costs' })).toBeVisible();
  await expect(page.getByText('Margin Target')).toHaveCount(0);
  await expect(page.getByText('Time Saved')).toHaveCount(0);

  const day = page.getByRole('button', { name: 'day' });
  await day.focus();
  await expect(day).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'month' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'year' })).toBeFocused();

  const nestedVerticalScrollers = await page.locator('body *').evaluateAll((nodes) => nodes.filter((node) => {
    const element = node as HTMLElement;
    const overflowY = getComputedStyle(element).overflowY;
    return (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight + 1;
  }).map((node) => (node as HTMLElement).className).slice(0, 10));
  expect(nestedVerticalScrollers, `Unexpected nested vertical scrollers: ${nestedVerticalScrollers.join(', ')}`).toEqual([]);
  await assertResponsiveSurface(page);
  await page.screenshot({ path: `output/playwright/${testInfo.project.name}-director-review.png`, fullPage: true });
});

async function seedAuthenticatedPage(page: Page, role: 'office' | 'site' | 'director') {
  const supabaseUrl = process.env.SENATLA_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey = process.env.SENATLA_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) throw new Error('SENATLA_SUPABASE_ANON_KEY is required for responsive browser fixtures.');

  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: credentials[role].email,
    password: credentials[role].password,
  });
  if (error || !data.session) {
    throw new Error(error?.message || 'Failed to create a deterministic Supabase browser session.');
  }

  await page.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, { key: storageKey, session: data.session });

  const path = role === 'office' ? '/office-admin' : role === 'director' ? '/director' : '/site-manager';
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function assertResponsiveSurface(page: Page) {
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  const primarySurface = page.locator('main, [role="main"], [role="banner"], header').first();
  await expect(primarySurface).toBeVisible();
  const controls = primarySurface.locator('button:visible, a:visible, input:visible, select:visible');
  const controlTargets = await controls.evaluateAll((nodes) => nodes.slice(0, 80).map((node) => {
    const isCheckControl = node.matches('input[type="checkbox"], input[type="radio"]');
    const target = isCheckControl ? node.closest('label') || node : node;
    const { width, height } = target.getBoundingClientRect();
    return { width, height, control: node.outerHTML.slice(0, 160) };
  }));
  for (const target of controlTargets) {
    expect(target.width, `Narrow control target: ${target.control}`).toBeGreaterThanOrEqual(11);
    expect(target.height, `Short control target: ${target.control}`).toBeGreaterThanOrEqual(20);
  }
  const clipped = await page.locator('h1:visible, h2:visible, h3:visible, button:visible, a:visible').evaluateAll((nodes) => nodes
    .filter((node) => node.textContent?.trim())
    .filter((node) => !node.matches('a[href="#main-content"]'))
    .filter((node) => node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflowX !== 'auto')
    .map((node) => node.textContent?.trim()).slice(0, 10));
  expect(clipped, `Clipped labels: ${clipped.join(', ')}`).toEqual([]);
}

async function expectModalFitsViewport(page: Page, heading: Locator) {
  const modal = heading.locator('xpath=ancestor::div[contains(@class,"fixed")][1]');
  await expect(modal).toBeVisible();
  const box = await modal.locator('> div').first().boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}
