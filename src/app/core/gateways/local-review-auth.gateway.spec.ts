import { LocalReviewAuthGateway } from './local-review-auth.gateway';

describe('LocalReviewAuthGateway access policy', () => {
  let gateway: LocalReviewAuthGateway;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    gateway = new LocalReviewAuthGateway();
  });

  it('signs in deterministic role accounts with the exact password', async () => {
    const site = await gateway.login(' Thosontula+Site@Gmail.com ', 'test-password');
    const office = await gateway.login('thosontula+office@gmail.com', 'test-password');
    const director = await gateway.login('thosontula+director@gmail.com', 'test-password');

    expect(site?.role).toBe('site');
    expect(office?.role).toBe('office');
    expect(director?.role).toBe('director');
  });

  it('keeps the exact developer mailbox as one stored Director role', async () => {
    const developer = await gateway.login('thosontula@gmail.com', 'test-password');
    expect(developer?.userId).toBe('developer-user');
    expect(developer?.role).toBe('director');
  });

  it('rejects unprovisioned, legacy, lookalike, and wrong-password attempts', async () => {
    expect(await gateway.login('site.manager@test.invalid', 'test-password')).toBeNull();
    expect(await gateway.login('unprovisioned@senatlatrading.com', 'test-password')).toBeNull();
    expect(await gateway.login('thosontula+site@gmail.com.attacker.test', 'test-password')).toBeNull();
    expect(await gateway.login('thosontula+site@gmail.com', 'any-four-character-password')).toBeNull();
  });

  it('discards a forged persisted session', async () => {
    localStorage.setItem('senatla_ops_local_review_session_v2', JSON.stringify({
      userId: 'attacker',
      username: 'attacker@gmail.com',
      role: 'director',
      displayName: 'Attacker',
      organizationId: 'organization',
      permittedSiteIds: ['*'],
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }));

    expect(await gateway.loadSession()).toBeNull();
    expect(localStorage.getItem('senatla_ops_local_review_session_v2')).toBeNull();
  });
});
