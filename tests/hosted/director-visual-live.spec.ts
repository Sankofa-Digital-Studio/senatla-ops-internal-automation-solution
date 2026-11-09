import { expect, test } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const screenshotDir = path.resolve(process.cwd(), 'output/visual-evidence/director');

test.beforeAll(() => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

test.describe('Director Workflow Live Visual Suite', () => {
  test('Director Workspace: visual rendering, overflow audit, and layout density check', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const projectName = testInfo.project.name;

    // Route runtime-config to local mode so authenticated Director workspace renders immediately
    await page.route('**/assets/runtime-config.json', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          api: { mode: 'local', baseUrl: '', supabaseUrl: '', supabaseAnonKey: '' },
          build: { commitSha: 'e5279f4be0fd4e6ab0a6622a1f0efda47014cde4', environment: 'uat' },
          seo: { canonicalOrigin: 'https://senatla-ops.vercel.app' },
          analytics: { measurementId: '' },
        }),
      });
    });

    // Inject active Director developer session & completed tour flags
    await page.addInitScript(() => {
      const session = {
        userId: 'thosontula@gmail.com',
        username: 'thosontula@gmail.com',
        displayName: 'Thoso Ntula',
        role: 'director',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        permittedSiteIds: ['demo-workshop', 'demo-plant-b', 'demo-shaft-4', 's1', 's2'],
      };
      localStorage.setItem('senatla_ops_local_review_session_v2', JSON.stringify(session));
      localStorage.setItem('senatla_ops_onboarding_v1', JSON.stringify(['thosontula@gmail.com:director']));
      localStorage.setItem('senatla_ops_onboarding_preferences_v2', JSON.stringify(['thosontula@gmail.com:director']));
    });

    await page.goto('/director', { waitUntil: 'networkidle' });

    // Verify Director header landmarks are visible
    const headerTitle = page.locator('h1', { hasText: 'Director operations review' });
    await expect(headerTitle).toBeVisible({ timeout: 15000 });

    // Verify Actionable Decision Center / Review Queue is visible
    const reviewQueue = page.locator('[data-tour="director-review-queue"]');
    await expect(reviewQueue).toBeVisible();

    // Verify Multi-Domain Dashboards are loaded
    const multiDomainSection = page.locator('[data-tour="director-multi-domain-dashboards"]');
    await expect(multiDomainSection).toBeVisible();

    // Verify Operating Indicators are present
    await expect(page.getByText('Recognized operating cost', { exact: true })).toBeVisible();

    // Verify zero horizontal scroll overflow
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    // Capture Full Page Screenshot
    const fullPagePath = path.join(screenshotDir, `01-director-fullpage-${projectName}.png`);
    await page.screenshot({ path: fullPagePath, fullPage: true });
    expect(fs.existsSync(fullPagePath)).toBe(true);

    // Capture Viewport Hero / Above-the-Fold Screenshot
    const heroPath = path.join(screenshotDir, `02-director-hero-${projectName}.png`);
    await page.screenshot({ path: heroPath, fullPage: false });
    expect(fs.existsSync(heroPath)).toBe(true);

    // Capture Multi-Domain Operations Section
    const multiDomainPath = path.join(screenshotDir, `03-director-multidomain-${projectName}.png`);
    await multiDomainSection.screenshot({ path: multiDomainPath });
    expect(fs.existsSync(multiDomainPath)).toBe(true);

    // Capture Review Queue Section
    const reviewQueuePath = path.join(screenshotDir, `04-director-reviewqueue-${projectName}.png`);
    await reviewQueue.screenshot({ path: reviewQueuePath });
    expect(fs.existsSync(reviewQueuePath)).toBe(true);

    // Capture Operating Costs Section
    const costsSection = page.locator('section[aria-labelledby="recognized-costs-heading"]');
    if (await costsSection.isVisible()) {
      const costsPath = path.join(screenshotDir, `05-director-operating-costs-${projectName}.png`);
      await costsSection.screenshot({ path: costsPath });
      expect(fs.existsSync(costsPath)).toBe(true);
    }

    // Capture Invoice Traceability Section
    const invoiceSection = page.locator('section', { hasText: 'Invoice traceability' });
    if (await invoiceSection.isVisible()) {
      const invoicePath = path.join(screenshotDir, `06-director-invoices-${projectName}.png`);
      await invoiceSection.screenshot({ path: invoicePath });
      expect(fs.existsSync(invoicePath)).toBe(true);
    }
  });
});
