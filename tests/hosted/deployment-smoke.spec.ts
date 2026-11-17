import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type APIRequestContext, type Page, type TestInfo } from 'playwright/test';
import { isUatEmailAllowedOnOrigin } from '../../src/app/core/auth/access-email-policy';

const MAX_REDIRECT_HOPS = 8;
const baseUrl = requiredBaseUrl(process.env.SENATLA_HOSTED_URL || 'https://senatla-ops.vercel.app');
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

type RedirectHop = {
  url: string;
  status: number;
  location?: string;
  setCookieNames: string[];
  bypassHeaderConfigured: boolean;
  bypassCookieHeaderConfigured: boolean;
};

function requiredBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('SENATLA_HOSTED_URL must use HTTP or HTTPS.');
  return parsed.toString().replace(/\/$/, '');
}

function safeUrl(value: string): string {
  const parsed = new URL(value, baseUrl);
  return `${parsed.pathname || '/'}${parsed.search ? '?[query]' : ''}`;
}

function cookieNames(headers: Array<{ name: string; value: string }>): string[] {
  return headers
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value.split('=', 1)[0]?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 16);
}

async function traceRedirectChain(request: APIRequestContext, path: string): Promise<{
  startUrl: string;
  finalUrl: string;
  hops: RedirectHop[];
  truncated: boolean;
  externalRedirect: boolean;
}> {
  const startUrl = new URL(path, baseUrl).toString();
  const hops: RedirectHop[] = [];
  let currentUrl = startUrl;
  let externalRedirect = false;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const response = await request.get(currentUrl, { failOnStatusCode: false, maxRedirects: 0 });
    const headers = await response.headersArray();
    const location = response.headers().location;
    hops.push({
      url: safeUrl(currentUrl),
      status: response.status(),
      ...(location ? { location: safeUrl(location) } : {}),
      setCookieNames: cookieNames(headers),
      bypassHeaderConfigured: Boolean(bypassSecret),
      bypassCookieHeaderConfigured: Boolean(bypassSecret),
    });

    if (response.status() < 300 || response.status() > 399 || !location) {
      return { startUrl: safeUrl(startUrl), finalUrl: safeUrl(currentUrl), hops, truncated: false, externalRedirect };
    }

    const nextUrl = new URL(location, currentUrl);
    if (nextUrl.origin !== new URL(baseUrl).origin) {
      externalRedirect = true;
      return { startUrl: safeUrl(startUrl), finalUrl: safeUrl(nextUrl.toString()), hops, truncated: false, externalRedirect };
    }
    currentUrl = nextUrl.toString();
  }

  return { startUrl: safeUrl(startUrl), finalUrl: safeUrl(currentUrl), hops, truncated: true, externalRedirect };
}

async function writeEvidence(testInfo: TestInfo, evidence: unknown): Promise<void> {
  const evidencePath = testInfo.outputPath('hosted-redirect-evidence.json');
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

function captureDocumentResponses(page: Page): Array<{ url: string; status: number; location?: string }> {
  const responses: Array<{ url: string; status: number; location?: string }> = [];
  page.on('response', (response) => {
    if (response.request().resourceType() !== 'document') return;
    const headers = response.headers();
    responses.push({
      url: safeUrl(response.url()),
      status: response.status(),
      ...(headers.location ? { location: safeUrl(headers.location) } : {}),
    });
  });
  return responses;
}

test('hosted runtime is Supabase-backed and matches the reviewed commit', async ({ request }, testInfo) => {
  const response = await request.get('/assets/runtime-config.json');
  expect(response.ok()).toBeTruthy();
  expect(response.url()).toBe(`${baseUrl}/assets/runtime-config.json`);

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

  await writeEvidence(testInfo, {
    kind: 'runtime-config',
    runtimeUrl: '/assets/runtime-config.json',
    status: response.status(),
    finalUrl: safeUrl(response.url()),
    apiMode: config.api?.mode,
    supabaseOrigin: config.api?.supabaseUrl ? new URL(config.api.supabaseUrl).origin : null,
    anonKeyPresent: Boolean(config.api?.supabaseAnonKey?.trim()),
    commitSha: config.build?.commitSha || null,
    environment: config.build?.environment || null,
    bypassHeadersConfigured: Boolean(bypassSecret),
  });
});

test('preview landing is reachable at the exact URL and exposes the public RBAC overview', async ({ page }, testInfo) => {
  const landingUrl = `${baseUrl}/landing`;
  const response = await page.goto(landingUrl, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  expect(page.url()).toBe(landingUrl);

  const rbacSection = page.locator('#access');
  await expect(rbacSection).toBeVisible();
  await expect(rbacSection).toContainText('Role-based access');
  await expect(rbacSection).toContainText('Site Manager');
  await expect(rbacSection).toContainText('Administrator');
  await expect(rbacSection).toContainText('Director');
  await expect(rbacSection).toContainText('Expected to');
  await expect(rbacSection).toContainText('before sign-in');

  await writeEvidence(testInfo, {
    kind: 'public-landing-rbac',
    requestedUrl: landingUrl,
    finalUrl: page.url(),
    status: response?.status() ?? null,
    unauthenticated: true,
    bypassHeadersConfigured: Boolean(bypassSecret),
    roles: ['Site Manager', 'Administrator', 'Director'],
  });
});

test('unauthenticated Office route redirects to sign-in and preserves the destination', async ({ page, request }, testInfo) => {
  const requestTrace = await traceRedirectChain(request, '/office-admin');
  const documentResponses = captureDocumentResponses(page);
  await page.goto('/office-admin');
  const browserCookies = (await page.context().cookies()).map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
  }));
  await writeEvidence(testInfo, {
    kind: 'protected-route-redirect',
    requestTrace,
    browser: {
      finalUrl: safeUrl(page.url()),
      documentResponses: documentResponses.slice(0, MAX_REDIRECT_HOPS + 1),
      documentResponsesTruncated: documentResponses.length > MAX_REDIRECT_HOPS + 1,
      cookies: browserCookies.slice(0, 32),
      cookiesTruncated: browserCookies.length > 32,
    },
    vercel: {
      bypassSecretConfigured: Boolean(bypassSecret),
      bypassHeaderNames: ['x-vercel-protection-bypass', 'x-vercel-set-bypass-cookie'],
      bypassCookieSetObserved: browserCookies.some((cookie) => cookie.name.toLowerCase().includes('vercel')),
    },
  });
  await expect(page).toHaveURL(new URL('/login?redirect=%2Foffice-admin', baseUrl).toString());
  await expect(page.getByRole('heading', { name: 'Senatla Ops' })).toBeVisible();
});

test('authorized Office QA account reaches the protected workspace', async ({ page }) => {
  const email = process.env.SENATLA_HOSTED_QA_EMAIL?.trim();
  const password = process.env.SENATLA_HOSTED_QA_PASSWORD;
  test.skip(!email || !password, 'Dedicated hosted QA credentials are required.');
  expect(isUatEmailAllowedOnOrigin(email!, new URL(baseUrl).origin),
    'The QA identity is restricted to the UAT origin. An exact deployment URL requires an approved QA identity allowed on that host.',
  ).toBe(true);

  await page.goto('/login/office');
  await page.locator('input[name="username"]').fill(email!);
  await page.locator('input[name="password"]').fill(password!);
  await page.getByRole('button', { name: 'Sign In' }).click();
  try {
    await expect(page).toHaveURL(new URL('/office-admin', baseUrl).toString());
  } catch (error) {
    const path = new URL(page.url()).pathname;
    if (path === '/login/recovery') {
      throw new Error('The Office QA account was sent to password recovery or a required password change.');
    }
    if (path === '/login/office' && await page.getByRole('alert').isVisible()) {
      throw new Error('The Office sign-in form displayed an error. Verify the QA account credentials, provisioning, and Office role in the preview Supabase project.');
    }
    throw error;
  }
  await expect(page.getByRole('heading', { name: 'Control Centre' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
