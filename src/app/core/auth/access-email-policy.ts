export const CORPORATE_EMAIL_DOMAIN = 'senatlatrading.com';
export const DEVELOPER_EMAIL = 'thosontula@gmail.com';

const CORPORATE_EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@senatlatrading\.com$/;
const DEVELOPER_ALIAS_PATTERN = /^thosontula\+[a-z0-9._-]+@gmail\.com$/;

export const ACCESS_EMAIL_ERROR =
  'Access is restricted to provisioned @senatlatrading.com accounts and the authorised developer mailbox.';

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

export function isAllowedAccessEmail(value: string): boolean {
  return isCorporateAccessEmail(value) || isDeveloperMailboxEmail(value);
}

export function requireAllowedAccessEmail(value: string): string {
  const email = normalizeAccessEmail(value);
  if (!isAllowedAccessEmail(email)) throw new Error(ACCESS_EMAIL_ERROR);
  return email;
}
