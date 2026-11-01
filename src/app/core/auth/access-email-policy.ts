export const CORPORATE_EMAIL_DOMAIN = '@senatlatrading.com';
export const DEVELOPER_EMAIL = 'thosontula@gmail.com';

const DEVELOPER_ALIAS_PATTERN = /^thosontula\+[a-z0-9._-]+@gmail\.com$/i;

export function normalizeAccessEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isDeveloperEmail(value: string): boolean {
  return normalizeAccessEmail(value) === DEVELOPER_EMAIL;
}

export function isDeveloperAliasEmail(value: string): boolean {
  return DEVELOPER_ALIAS_PATTERN.test(normalizeAccessEmail(value));
}

export function isAllowedAccessEmail(value: string): boolean {
  const email = normalizeAccessEmail(value);
  return email.endsWith(CORPORATE_EMAIL_DOMAIN) || isDeveloperEmail(email) || isDeveloperAliasEmail(email);
}

export const ACCESS_EMAIL_HELP = `Use a registered ${CORPORATE_EMAIL_DOMAIN} account.`;
