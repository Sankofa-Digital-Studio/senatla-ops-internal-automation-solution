import { expect, test } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const screenshotDir = path.resolve(process.cwd(), 'output/visual-evidence');

test.beforeAll(() => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

test.describe('Live Visual Testing Suite', () => {
  test('Visual Test 1: Landing Page layout and responsive typography', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    await page.goto('/landing', { waitUntil: 'networkidle' });

    // Verify main landmarks are visible
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();

    // Verify zero horizontal scroll overflow
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    // Save screenshot evidence
    const screenshotPath = path.join(screenshotDir, `01-landing-${projectName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('Visual Test 2: Standard Login Portal form and controls', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Verify primary form controls
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /sign in/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Verify no public registration or Google buttons
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Sign in with Google');
    expect(bodyText).not.toContain('Register here');

    // Save screenshot evidence
    const screenshotPath = path.join(screenshotDir, `02-login-portal-${projectName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('Visual Test 3: Forgot Password Recovery PIN verification prompt', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Enter email and trigger forgot password prompt
    await page.locator('input[type="email"]').fill('maggie@senatlatrading.com');
    const forgotBtn = page.getByRole('button', { name: /forgot password\?/i });
    await expect(forgotBtn).toBeVisible();
    await forgotBtn.click();

    // Recovery PIN prompt should now be rendered
    const pinInput = page.locator('#forgot-recovery-pin');
    await expect(pinInput).toBeVisible();
    await expect(page.getByText('Enter Your Recovery PIN')).toBeVisible();
    await expect(page.getByRole('button', { name: /send recovery link/i })).toBeVisible();

    // Save screenshot evidence
    const screenshotPath = path.join(screenshotDir, `03-forgot-pin-prompt-${projectName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('Visual Test 4: Password Strength Meter & Dynamic Recovery PIN Reveal', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    await page.goto('/login/recovery?mock_user=maggie%40senatlatrading.com', { waitUntil: 'networkidle' });

    // Verify recovery mode heading and inputs
    const newPwdInput = page.locator('#recovery-password');
    await expect(newPwdInput).toBeVisible();

    // Initial state: Recovery PIN must be HIDDEN and strength must be 0% Weak (Red)
    const pinField = page.locator('#recovery-pin');
    await expect(pinField).not.toBeAttached();
    await expect(page.getByText('0% (Weak)')).toBeVisible();

    // Save initial state screenshot
    const initScreenshot = path.join(screenshotDir, `04-recovery-initial-${projectName}.png`);
    await page.screenshot({ path: initScreenshot, fullPage: true });
    expect(fs.existsSync(initScreenshot)).toBe(true);

    // State 1: Invalid password due to adjacent constraints (MYPASSw0RD#)
    await newPwdInput.fill('MYPASSw0RD#');
    await expect(page.getByText(/cannot appear next to each other/i)).toBeVisible();
    // PIN field must remain hidden
    await expect(pinField).not.toBeAttached();

    const invalidScreenshot = path.join(screenshotDir, `04-recovery-invalid-adjacent-${projectName}.png`);
    await page.screenshot({ path: invalidScreenshot, fullPage: true });
    expect(fs.existsSync(invalidScreenshot)).toBe(true);

    // State 2: Valid password with non-adjacent constraints (theSusp3k_t#)
    await newPwdInput.fill('theSusp3k_t#');

    // Strength meter should reach Amber (85%)
    await expect(page.getByText(/85% \(Acceptable · Good\)/i)).toBeVisible();
    const progressBar = page.locator('[role="progressbar"] > div');
    await expect(progressBar).toHaveClass(/bg-amber-400/);

    // Recovery PIN field must now be dynamically REVEALED into view!
    await expect(pinField).toBeVisible();
    await expect(page.getByText('4-5 Digit Recovery PIN')).toBeVisible();

    const amberRevealedScreenshot = path.join(screenshotDir, `04-recovery-amber-pin-revealed-${projectName}.png`);
    await page.screenshot({ path: amberRevealedScreenshot, fullPage: true });
    expect(fs.existsSync(amberRevealedScreenshot)).toBe(true);

    // State 3: High entropy password reaching Green (100%)
    await newPwdInput.fill('theSusp3k_t#SuperLong2026!');
    await expect(page.getByText(/100% \(Acceptable · Strong\)/i)).toBeVisible();
    await expect(progressBar).toHaveClass(/bg-lime-300/);
    await expect(pinField).toBeVisible();

    const greenScreenshot = path.join(screenshotDir, `04-recovery-green-100-${projectName}.png`);
    await page.screenshot({ path: greenScreenshot, fullPage: true });
    expect(fs.existsSync(greenScreenshot)).toBe(true);
  });

  test('Visual Test 5: Role-gated portal presentation', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    await page.goto('/login/director', { waitUntil: 'networkidle' });

    // Verify role header banner
    await expect(page.getByText('Role-gated portal for director')).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    const screenshotPath = path.join(screenshotDir, `05-login-director-role-${projectName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
