import { Provider, EnvironmentProviders } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { DEFAULT_RUNTIME_CONFIG, provideRuntimeConfig } from './core/config/runtime-config';
import { SESSION_EXPIRY_SCHEDULER } from './core/auth/session-expiry.scheduler';
import { AUTH_GATEWAY } from './core/gateways/auth.gateway';
import { provideBackendGateways } from './core/gateways/backend.providers';
import { AppRole, AuthSession } from './core/models/app.models';
import { CostAttributionGateway, COST_ATTRIBUTION_GATEWAY } from './core/gateways/cost-attribution.gateway';

class TestAuthGateway {
  private session: AuthSession | null = null;
  private pendingResetEmail = '';
  private readonly credentials = new Map<string, { password: string; role: AppRole; displayName: string; mustChangePassword?: boolean }>([
    ['thosontula@gmail.com', { password: 'test-password', role: 'director', displayName: 'Developer' }],
    ['thosontula+tag@gmail.com', { password: 'temporary-password', role: 'director', displayName: 'Developer Alias', mustChangePassword: true }],
    ['thosontula+site@gmail.com', { password: 'test-password', role: 'site', displayName: 'Site Manager' }],
    ['thosontula+office@gmail.com', { password: 'test-password', role: 'office', displayName: 'Office Admin' }],
    ['thosontula+director@gmail.com', { password: 'test-password', role: 'director', displayName: 'Director' }],
    ['thosontula+temporary@gmail.com', { password: 'temporary-password', role: 'site', displayName: 'Temporary User', mustChangePassword: true }],
    ['brian@senatlatrading.com', { password: 'Sen4t!aOperationsBrian2026', role: 'site', displayName: 'Brian', mustChangePassword: true }],
    ['maggie@senatlatrading.com', { password: 'Sen4t!aOperationsMaggie2026', role: 'office', displayName: 'Maggie', mustChangePassword: true }],
    ['rubinthoso@senatlatrading.com', { password: 'Sen4t!aOperationsRubin2026', role: 'director', displayName: 'Rubin Thoso', mustChangePassword: true }],
  ]);

  async loadSession(): Promise<AuthSession | null> {
    return this.session;
  }

  async login(username: string, password: string): Promise<AuthSession | null> {
    const user = this.credentials.get(username.trim().toLowerCase());
    if (!user || user.password !== password) return null;

    this.session = {
      userId: `${user.role}-user`,
      username: username.trim().toLowerCase(),
      role: user.role,
      displayName: user.displayName,
      organizationId: '00000000-0000-4000-8000-000000000001',
      permittedSiteIds: user.role === 'site' ? ['site-1'] : [],
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      mustChangePassword: user.mustChangePassword === true,
    };

    return this.session;
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!this.credentials.has(normalizedEmail)) {
      throw new Error('No account matches that email.');
    }
    this.pendingResetEmail = normalizedEmail;
    return {
      message: `Mock reset prepared for ${normalizedEmail}.`,
      resetLink: `/login/recovery?mock_user=${encodeURIComponent(normalizedEmail)}`,
    };
  }

  async updatePassword(nextPassword: string, usernameHint?: string) {
    const normalizedEmail = (usernameHint || this.pendingResetEmail).trim().toLowerCase();
    const user = this.credentials.get(normalizedEmail);
    if (!user) throw new Error('Recovery session unavailable.');
    this.credentials.set(normalizedEmail, { ...user, password: nextPassword.trim(), mustChangePassword: false });
    this.pendingResetEmail = '';
    this.session = null;
  }

  async logout(): Promise<void> {
    this.session = null;
    this.pendingResetEmail = '';
  }
}

class TestCostAttributionGateway implements CostAttributionGateway {
  async reconcile(): Promise<unknown> {
    return [];
  }
}

export const TEST_APP_PROVIDERS: (Provider | EnvironmentProviders)[] = [
  provideRouter(routes),
  provideRuntimeConfig(DEFAULT_RUNTIME_CONFIG),
  ...provideBackendGateways(DEFAULT_RUNTIME_CONFIG),
  { provide: AUTH_GATEWAY, useClass: TestAuthGateway },
  { provide: COST_ATTRIBUTION_GATEWAY, useClass: TestCostAttributionGateway },
  { provide: SESSION_EXPIRY_SCHEDULER, useValue: { schedule: () => () => undefined } },
];

export function resetTestStorage(): void {
  sessionStorage.clear();
  localStorage.clear();
}
