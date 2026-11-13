import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SESSION_MAX_AGE_MS } from '../auth/session-policy';
import { SESSION_EXPIRY_SCHEDULER } from '../auth/session-expiry.scheduler';
import { AUTH_GATEWAY, AuthGateway } from '../gateways/auth.gateway';
import { AuthSession } from '../models/app.models';
import { AuthService } from './auth.service';

const baseSession = (expiresAt: string): AuthSession => ({
  userId: 'uat-user',
  username: 'uat@senatlatrading.com',
  role: 'office',
  displayName: 'UAT User',
  organizationId: 'org-1',
  permittedSiteIds: [],
  issuedAt: '2026-11-11T08:00:00.000Z',
  expiresAt,
});

class RefreshableAuthGateway implements AuthGateway {
  session: AuthSession | null = null;
  logoutCount = 0;
  private listener?: (session: AuthSession | null) => void;

  async loadSession() {
    return this.session;
  }

  async login() {
    return this.session;
  }

  async requestPasswordReset() {
    return { message: 'not used' };
  }

  async updatePassword() {}

  async updateDisplayName() {}

  async logout() {
    this.logoutCount += 1;
    this.session = null;
  }

  subscribeToSession(listener: (session: AuthSession | null) => void) {
    this.listener = listener;
    return () => undefined;
  }

  emitRefresh(session: AuthSession) {
    this.session = session;
    this.listener?.(session);
  }
}

describe('AuthService session restore and refresh', () => {
  let gateway: RefreshableAuthGateway;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    gateway = new RefreshableAuthGateway();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AUTH_GATEWAY, useValue: gateway },
        { provide: SESSION_EXPIRY_SCHEDULER, useValue: { schedule: () => () => undefined } },
      ],
    });
  });

  it('keeps a restored session alive when the provider token deadline is newer than sign-in', async () => {
    gateway.session = baseSession(new Date(Date.now() + 60 * 60 * 1000).toISOString());
    const auth = TestBed.inject(AuthService);

    await auth.ensureReady();

    expect(auth.isAuthenticated()).toBeTrue();
    expect(gateway.logoutCount).toBe(0);
  });

  it('updates the authenticated session display name without changing its role', async () => {
    gateway.session = baseSession(new Date(Date.now() + 60 * 60 * 1000).toISOString());
    const auth = TestBed.inject(AuthService);
    await auth.ensureReady();

    await auth.updateDisplayName('Updated UAT User');

    expect(auth.displayName()).toBe('Updated UAT User');
    expect(auth.role()).toBe('office');
  });

  it('keeps the restored inactivity clock across a provider token refresh', async () => {
    gateway.session = baseSession(new Date(Date.now() + 60 * 60 * 1000).toISOString());
    const auth = TestBed.inject(AuthService);
    await auth.ensureReady();

    gateway.emitRefresh(baseSession(new Date(Date.now() + 60 * 60 * 1000).toISOString()));
    await Promise.resolve();

    expect(auth.isAuthenticated()).toBeTrue();
    expect(auth.role()).toBe('office');
    expect(gateway.logoutCount).toBe(0);
  });

  it('expires a restored session when its persisted inactivity window has elapsed', async () => {
    gateway.session = baseSession(new Date(Date.now() + 60 * 60 * 1000).toISOString());
    sessionStorage.setItem('senatla_ops_last_activity', String(Date.now() - SESSION_MAX_AGE_MS - 1));
    const auth = TestBed.inject(AuthService);

    await auth.ensureReady();

    expect(auth.isAuthenticated()).toBeFalse();
    expect(gateway.logoutCount).toBe(1);
  });
});
