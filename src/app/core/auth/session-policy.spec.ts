import { SESSION_MAX_AGE_MS, INACTIVITY_TIMEOUT_MS, cappedSessionExpiry, sessionHasExpired, upstreamSessionExpiry } from './session-policy';

describe('session policy', () => {
  it('caps every application session at 2 hours and 30 minutes of inactivity', () => {
    const issuedAt = '2026-08-19T10:00:00.000Z';
    // 2 hours and 30 minutes after 10:00 is 12:30
    expect(cappedSessionExpiry(issuedAt, '2026-08-19T14:00:00.000Z')).toBe('2026-08-19T12:30:00.000Z');
    expect(SESSION_MAX_AGE_MS).toBe((2 * 60 + 30) * 60 * 1000);
    expect(INACTIVITY_TIMEOUT_MS).toBe(9000000);
  });

  it('honours a shorter upstream expiry', () => {
    expect(cappedSessionExpiry('2026-08-19T10:00:00.000Z', '2026-08-19T11:00:00.000Z')).toBe('2026-08-19T11:00:00.000Z');
  });

  it('does not treat a stale sign-in timestamp as a refreshed token expiry', () => {
    const staleSignIn = Date.parse('2026-08-19T10:00:00.000Z');
    const refreshedToken = Date.parse('2026-08-19T14:00:00.000Z');
    expect(cappedSessionExpiry(new Date(staleSignIn).toISOString(), new Date(refreshedToken).toISOString())).toBe('2026-08-19T12:30:00.000Z');
    expect(upstreamSessionExpiry(new Date(refreshedToken).toISOString())).toBe('2026-08-19T14:00:00.000Z');
    expect(refreshedToken).toBeGreaterThan(staleSignIn + SESSION_MAX_AGE_MS);
  });

  it('rejects expired or malformed session deadlines', () => {
    expect(sessionHasExpired({ expiresAt: '2026-08-19T10:00:00.000Z' }, Date.parse('2026-08-19T10:00:00.000Z'))).toBeTrue();
    expect(sessionHasExpired({ expiresAt: 'not-a-date' })).toBeTrue();
  });
});
