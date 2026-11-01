import {
  isAllowedAccessEmail,
  isDeveloperAliasEmail,
  isDeveloperEmail,
  normalizeAccessEmail,
} from './access-email-policy';

describe('access email policy', () => {
  it('allows registered corporate addresses and normalizes casing', () => {
    expect(normalizeAccessEmail(' Manager@SenatlaTrading.com ')).toBe('manager@senatlatrading.com');
    expect(isAllowedAccessEmail('manager@senatlatrading.com')).toBeTrue();
  });

  it('allows the developer mailbox and deterministic plus aliases', () => {
    expect(isDeveloperEmail('thosontula@gmail.com')).toBeTrue();
    expect(isDeveloperAliasEmail('thosontula+site@gmail.com')).toBeTrue();
    expect(isAllowedAccessEmail('thosontula+director@gmail.com')).toBeTrue();
  });

  it('rejects other public and lookalike domains', () => {
    expect(isAllowedAccessEmail('person@gmail.com')).toBeFalse();
    expect(isAllowedAccessEmail('person@senatlatrading.com.example.org')).toBeFalse();
  });
});
