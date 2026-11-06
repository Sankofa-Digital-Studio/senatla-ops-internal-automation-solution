import {
  ACCESS_EMAIL_ERROR,
  isAllowedAccessEmail,
  isDeveloperDirectorEmail,
  isPermanentDeveloperEmail,
  normalizeAccessEmail,
  requireAllowedAccessEmail,
} from './access-email-policy';

describe('access email policy', () => {
  it('allows normalized corporate email addresses', () => {
    expect(requireAllowedAccessEmail(' Manager@SenatlaTrading.com ')).toBe('manager@senatlatrading.com');
  });

  it('allows the developer mailbox and Gmail plus aliases', () => {
    expect(isAllowedAccessEmail('thosontula@gmail.com')).toBeTrue();
    expect(isAllowedAccessEmail('thosontula+site@gmail.com')).toBeTrue();
    expect(isAllowedAccessEmail('thosontula+release-2026.11@gmail.com')).toBeTrue();
  });

  it('grants permanent developer identity only to the exact base address', () => {
    expect(isPermanentDeveloperEmail('thosontula@gmail.com')).toBeTrue();
    expect(isPermanentDeveloperEmail('thosontula+director@gmail.com')).toBeFalse();
  });

  it('limits elevated developer-director access to the exact base and named UAT alias', () => {
    expect(isDeveloperDirectorEmail('thosontula@gmail.com')).toBeTrue();
    expect(isDeveloperDirectorEmail('thosontula+tag@gmail.com')).toBeTrue();
    expect(isDeveloperDirectorEmail('thosontula+director@gmail.com')).toBeFalse();
    expect(isDeveloperDirectorEmail('director@senatlatrading.com')).toBeFalse();
  });

  it('rejects lookalike and unrelated addresses', () => {
    const rejected = [
      'manager@senatlatrading.com.attacker.test',
      'manager@gmail.com',
      'thosontula@senatlatrading.com.gmail.com',
      'other+site@gmail.com',
      'site.manager@test.invalid',
      '',
    ];
    for (const email of rejected) expect(isAllowedAccessEmail(email)).withContext(email).toBeFalse();
    expect(() => requireAllowedAccessEmail('manager@gmail.com')).toThrowError(ACCESS_EMAIL_ERROR);
  });

  it('normalizes casing and surrounding whitespace only', () => {
    expect(normalizeAccessEmail(' Thosontula+Site@GMAIL.COM ')).toBe('thosontula+site@gmail.com');
  });
});
