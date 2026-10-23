import { SESSION_MAX_AGE_MS, cappedSessionExpiry, sessionHasExpired } from './session-policy';

describe('session policy', () => {
  it('caps every application session at ten minutes', () => {
    const issuedAt = '2026-08-19T10:00:00.000Z';
    expect(cappedSessionExpiry(issuedAt, '2026-08-19T11:00:00.000Z')).toBe('2026-08-19T10:10:00.000Z');
    expect(SESSION_MAX_AGE_MS).toBe(10 * 60 * 1000);
  });

  it('honours a shorter upstream expiry', () => {
    expect(cappedSessionExpiry('2026-08-19T10:00:00.000Z', '2026-08-19T10:05:00.000Z')).toBe('2026-08-19T10:05:00.000Z');
  });

  it('rejects expired or malformed session deadlines', () => {
    expect(sessionHasExpired({ expiresAt: '2026-08-19T10:00:00.000Z' }, Date.parse('2026-08-19T10:00:00.000Z'))).toBeTrue();
    expect(sessionHasExpired({ expiresAt: 'not-a-date' })).toBeTrue();
  });
});