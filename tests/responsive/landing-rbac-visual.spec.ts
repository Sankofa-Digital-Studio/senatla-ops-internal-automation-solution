import { expect, test } from 'playwright/test';

test.describe('Landing page RBAC visual coverage', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!['mobile', 'desktop'].includes(testInfo.project.name), 'Focused mobile and desktop RBAC coverage');
    await page.goto('/landing', { waitUntil: 'networkidle' });
  });

  test('keeps the three role cards readable, contained, and correctly arranged', async ({ page }, testInfo) => {
    const access = page.locator('#access');
    const cards = access.locator('.role-card');

    await expect(access).toBeVisible();
    await expect(access.getByRole('heading', { name: 'The right view for every level of responsibility.' })).toBeVisible();
    await expect(cards).toHaveCount(3);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const layout = await cards.evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }));
    const sectionBox = await access.boundingBox();
    expect(sectionBox).not.toBeNull();

    for (const card of layout) {
      expect(card.width).toBeGreaterThan(0);
      expect(card.height).toBeGreaterThan(0);
      expect(card.x).toBeGreaterThanOrEqual(sectionBox!.x);
      expect(card.x + card.width).toBeLessThanOrEqual(sectionBox!.x + sectionBox!.width + 1);
    }

    if (testInfo.project.name === 'mobile') {
      expect(layout[1].y).toBeGreaterThan(layout[0].y);
      expect(layout[2].y).toBeGreaterThan(layout[1].y);
      expect(layout[0].width).toBeGreaterThan(viewport!.width * 0.75);
    } else {
      expect(Math.abs(layout[1].y - layout[0].y)).toBeLessThanOrEqual(2);
      expect(Math.abs(layout[2].y - layout[0].y)).toBeLessThanOrEqual(2);
      expect(layout[1].x).toBeGreaterThan(layout[0].x);
      expect(layout[2].x).toBeGreaterThan(layout[1].x);
    }

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    const clippedText = await cards.locator('h3, p').evaluateAll((nodes) => nodes
      .filter((node) => (node.textContent || '').trim())
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      .map((node) => (node.textContent || '').trim()));
    expect(clippedText, `Clipped RBAC text: ${clippedText.join(' | ')}`).toEqual([]);

    for (const card of await cards.all()) {
      await expect(card.locator('h3')).toBeVisible();
      await expect(card.locator('.role-card__summary')).toBeVisible();
      await expect(card.locator('.role-card__expectation')).toBeVisible();
    }

    await page.screenshot({
      path: `output/playwright/${testInfo.project.name}-landing-rbac.png`,
      fullPage: true,
    });
  });

  test('makes the RBAC destination usable from the visible navigation', async ({ page }, testInfo) => {
    const access = page.locator('#access');
    const visibleNavigation = page.locator('nav:visible').filter({ has: page.getByRole('link', { name: 'RBAC' }) }).first();
    const rbacLink = visibleNavigation.getByRole('link', { name: 'RBAC' });

    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await expect(rbacLink).toBeVisible();
    } else {
      await expect(rbacLink).toBeVisible();
    }

    await rbacLink.click();
    await expect(access).toBeFocused();

    await expect.poll(async () => {
      const box = await access.boundingBox();
      return box ? Math.abs(box.y) : Number.POSITIVE_INFINITY;
    })
      .toBeLessThan(48);
  });
});
