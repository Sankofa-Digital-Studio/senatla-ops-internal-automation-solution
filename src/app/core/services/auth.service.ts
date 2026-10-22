import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppRole, AuthSession } from '../models/app.models';
import { AUTH_GATEWAY, AuthGateway, GoogleAuthResult, PasswordResetRequestResult, RegistrationRequest } from '../gateways/auth.gateway';
import { SESSION_EXPIRY_SCHEDULER } from '../auth/session-expiry.scheduler';
import { cappedSessionExpiry, sessionHasExpired } from '../auth/session-policy';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authGateway = inject<AuthGateway>(AUTH_GATEWAY);
  private readonly router = inject(Router);
  private readonly expiryScheduler = inject(SESSION_EXPIRY_SCHEDULER);
  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly readyState = signal(false);
  private restorePromise: Promise<void> | null = null;
  private cancelExpiryTimer: (() => void) | null = null;

  readonly session = computed(() => this.currentSession());
  readonly isReady = this.readyState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentSession());
  readonly role = computed<AppRole | null>(() => this.currentSession()?.role ?? null);
  readonly displayName = computed(() => this.currentSession()?.displayName ?? 'Guest');

  constructor() {
    this.authGateway.subscribeToSession?.((session) => {
      this.setSession(session);
      this.readyState.set(true);
    });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void this.expireIfNeeded();
      });
    }
    void this.ensureReady();
  }

  async ensureReady() {
    if (this.readyState()) return;
    if (!this.restorePromise) this.restorePromise = this.restoreSession();
    await this.restorePromise;
  }

  async login(username: string, password: string): Promise<AuthSession | null> {
    await this.ensureReady();
    const session = await this.authGateway.login(username, password);
    this.setSession(session);
    this.readyState.set(true);
    return session;
  }

  async loginAsDemoRole(role: AppRole): Promise<AuthSession> {
    await this.ensureReady();
    let session: AuthSession;
    if (this.authGateway.loginAsDemoRole) {
      session = await this.authGateway.loginAsDemoRole(role);
    } else {
      const displayNames: Record<AppRole, string> = { site: 'Site Manager', office: 'Office Admin', director: 'Director' };
      const issuedAt = new Date().toISOString();
      session = {
        userId: `${role}-review-user`,
        username: `${role}.demo@senatla.com`,
        role,
        displayName: displayNames[role],
        organizationId: '00000000-0000-4000-8000-000000000001',
        permittedSiteIds: ['demo-workshop', 'demo-plant-b', 'demo-shaft-4', 's1', 's2'],
        issuedAt,
        expiresAt: cappedSessionExpiry(issuedAt),
      };
    }
    this.setSession(session);
    this.readyState.set(true);
    return session;
  }

  async loginWithGoogle(googleUser?: { email: string; displayName?: string }): Promise<GoogleAuthResult> {
    await this.ensureReady();
    if (this.authGateway.loginWithGoogle) {
      const result = await this.authGateway.loginWithGoogle(googleUser);
      if (result.session) {
        this.setSession(result.session);
        this.readyState.set(true);
      }
      return result;
    }

    const email = (googleUser?.email || 'ntulathoso@gmail.com').trim().toLowerCase();
    const displayName = googleUser?.displayName?.trim() || email.split('@')[0];
    return {
      session: null,
      needsRoleSelection: true,
      pendingProfile: {
        userId: `google-${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email,
        displayName,
      },
    };
  }

  async assignOperationalRole(
    role: AppRole,
    pendingProfile?: { userId: string; email: string; displayName: string },
  ): Promise<AuthSession> {
    await this.ensureReady();
    let session: AuthSession;
    if (this.authGateway.assignRole) {
      session = await this.authGateway.assignRole(role, pendingProfile);
    } else {
      const email = (pendingProfile?.email || 'ntulathoso@gmail.com').trim().toLowerCase();
      const displayName = pendingProfile?.displayName?.trim() || email.split('@')[0];
      const issuedAt = new Date().toISOString();
      session = {
        userId: pendingProfile?.userId || `google-${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        username: email,
        role,
        displayName: displayName || (role === 'site' ? 'Site Manager' : role === 'office' ? 'Office Admin' : 'Director'),
        organizationId: '00000000-0000-4000-8000-000000000001',
        permittedSiteIds: ['demo-workshop', 'demo-plant-b', 'demo-shaft-4', 's1', 's2'],
        issuedAt,
        expiresAt: cappedSessionExpiry(issuedAt),
      };
    }
    this.setSession(session);
    this.readyState.set(true);
    return session;
  }

  async register(request: RegistrationRequest) {
    return await this.authGateway.register(request);
  }

  async redeemAdminCode(code: string) {
    return await this.authGateway.redeemAdminCode(code);
  }

  async requestPasswordReset(email: string, redirectTo?: string): Promise<PasswordResetRequestResult> {
    return await this.authGateway.requestPasswordReset(email, redirectTo);
  }

  async updatePassword(nextPassword: string, usernameHint?: string) {
    await this.authGateway.updatePassword(nextPassword, usernameHint);
  }

  async logout() {
    this.setSession(null);
    await this.authGateway.logout();
  }

  canAccess(role?: AppRole) {
    const session = this.currentSession();
    return !!session && (!role || session.role === role);
  }

  validateSession() {
    const session = this.sessionState();
    if (!session) return false;
    if (!sessionHasExpired(session)) return true;
    void this.expireIfNeeded();
    return false;
  }

  currentSession() {
    return this.validateSession() ? this.sessionState() : null;
  }

  private setSession(session: AuthSession | null) {
    this.clearExpiryTimer();
    this.sessionState.set(session);
    if (!session) return;

    const delay = new Date(session.expiresAt).getTime() - Date.now();
    if (delay <= 0) {
      void this.expireIfNeeded();
      return;
    }
    this.cancelExpiryTimer = this.expiryScheduler.schedule(() => void this.expireIfNeeded(), delay);
  }

  private clearExpiryTimer() {
    this.cancelExpiryTimer?.();
    this.cancelExpiryTimer = null;
  }

  private async expireIfNeeded() {
    const session = this.sessionState();
    if (!session || !sessionHasExpired(session)) return;
    const currentUrl = this.router.url;
    await this.logout();
    if (!this.isPublicRoute(currentUrl)) {
      await this.router.navigate(['/login'], { queryParams: { redirect: currentUrl } });
    }
  }

  private isPublicRoute(url: string) {
    const path = url.split('?')[0];
    return path === '/landing' || path === '/login' || path.startsWith('/login/') || path === '/register';
  }

  private async restoreSession() {
    try {
      this.setSession(await this.authGateway.loadSession());
    } catch {
      this.setSession(null);
    } finally {
      this.readyState.set(true);
      this.restorePromise = null;
    }
  }
}
