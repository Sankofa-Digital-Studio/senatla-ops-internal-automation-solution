export const CORPORATE_EMAIL_DOMAIN = 'senatlatrading.com';
export const DEVELOPER_EMAIL = 'thosontula@gmail.com';

const CORPORATE_EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@senatlatrading\.com$/;
const DEVELOPER_ALIAS_PATTERN = /^thosontula\+[a-z0-9._-]+@gmail\.com$/;

export const ACCESS_EMAIL_ERROR =
  'Access is restricted to provisioned @senatlatrading.com accounts and the authorised developer mailbox.';

export const UAT_EMAIL_PATTERN = /\+uat@/i;
export const UAT_LANDING_URL = 'https://senatla-ops-uat.vercel.app/landing';
export const APPROVED_UAT_ORIGIN = new URL(UAT_LANDING_URL).origin;

export function isUatEmail(value: string): boolean {
  return UAT_EMAIL_PATTERN.test(normalizeAccessEmail(value));
}

export function isApprovedUatOrigin(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.origin === APPROVED_UAT_ORIGIN && parsed.pathname === '/' && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

/** Local review remains available for deterministic development; hosted UAT aliases are exact-origin bound. */
export function isUatEmailAllowedOnOrigin(email: string, origin: string): boolean {
  if (!isUatEmail(email)) return true;
  try {
    const parsed = new URL(origin);
    const isLocalDevelopment = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return isLocalDevelopment || isApprovedUatOrigin(parsed.origin);
  } catch {
    return false;
  }
}

export function normalizeAccessEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isCorporateAccessEmail(value: string): boolean {
  return CORPORATE_EMAIL_PATTERN.test(normalizeAccessEmail(value));
}

export function isDeveloperMailboxEmail(value: string): boolean {
  const email = normalizeAccessEmail(value);
  return email === DEVELOPER_EMAIL || DEVELOPER_ALIAS_PATTERN.test(email);
}

export function isPermanentDeveloperEmail(value: string): boolean {
  return normalizeAccessEmail(value) === DEVELOPER_EMAIL;
}

/** Elevated developer/director access is limited to the two explicitly named UAT identities. */
export function isDeveloperDirectorEmail(value: string): boolean {
  const email = normalizeAccessEmail(value);
  return email === DEVELOPER_EMAIL || email === 'thosontula+tag@gmail.com';
}

export function isAllowedAccessEmail(value: string): boolean {
  return isCorporateAccessEmail(value) || isDeveloperMailboxEmail(value);
}

export function requireAllowedAccessEmail(value: string): string {
  const email = normalizeAccessEmail(value);
  if (!isAllowedAccessEmail(email)) throw new Error(ACCESS_EMAIL_ERROR);
  return email;
}
