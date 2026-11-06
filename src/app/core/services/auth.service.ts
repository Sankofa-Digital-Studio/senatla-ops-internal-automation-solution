import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppRole, AuthSession } from '../models/app.models';
import { AUTH_GATEWAY, AuthGateway, PasswordResetRequestResult } from '../gateways/auth.gateway';
import { SESSION_EXPIRY_SCHEDULER } from '../auth/session-expiry.scheduler';
import { cappedSessionExpiry, sessionHasExpired } from '../auth/session-policy';
import { isAllowedAccessEmail, isDeveloperDirectorEmail, isPermanentDeveloperEmail, normalizeAccessEmail, requireAllowedAccessEmail } from '../auth/access-email-policy';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authGateway = inject<AuthGateway>(AUTH_GATEWAY);
  private readonly router = inject(Router);
  private readonly expiryScheduler = inject(SESSION_EXPIRY_SCHEDULER);
  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly readyState = signal(false);
  private readonly switchedRoleState = signal<AppRole | null>(null);
  private restorePromise: Promise<void> | null = null;
  private cancelExpiryTimer: (() => void) | null = null;

  readonly session = computed(() => this.currentSession());
  readonly isReady = this.readyState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentSession());
  readonly isDeveloper = computed(() => isPermanentDeveloperEmail(this.currentSession()?.username ?? ''));
  readonly isDeveloperDirector = computed(() => {
    const session = this.currentSession();
    return session?.role === 'director' && isDeveloperDirectorEmail(session.username);
  });
  readonly storedRole = computed<AppRole | null>(() => this.currentSession()?.role ?? null);
  readonly role = computed<AppRole | null>(() => {
    const session = this.currentSession();
    if (!session) return null;
    if (this.isDeveloper() && this.switchedRoleState()) {
      return this.switchedRoleState();
    }
    return session.role;
  });
  readonly displayName = computed(() => this.currentSession()?.displayName ?? 'Guest');
  readonly requiresPasswordChange = computed(() => this.currentSession()?.mustChangePassword === true);

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
    const email = normalizeAccessEmail(username);
    if (!isAllowedAccessEmail(email)) return null;
    const session = await this.authGateway.login(email, password);
    this.setSession(session);
    this.readyState.set(true);
    return session;
  }

  async requestPasswordReset(email: string, redirectTo?: string): Promise<PasswordResetRequestResult> {
    return await this.authGateway.requestPasswordReset(requireAllowedAccessEmail(email), redirectTo);
  }

  async updatePassword(nextPassword: string, usernameHint?: string) {
    await this.authGateway.updatePassword(nextPassword, usernameHint);
  }

  async logout() {
    this.setSession(null);
    await this.authGateway.logout();
  }

  switchWorkspace(role: AppRole) {
    const session = this.currentSession();
    if (!session) throw new Error('No active session.');
    if (!isPermanentDeveloperEmail(session.username)) {
      throw new Error('Cross-workspace switching is restricted to the authorized developer account.');
    }
    this.switchedRoleState.set(role);
  }

  resetWorkspace() {
    this.switchedRoleState.set(null);
  }

  canAccess(role?: AppRole) {
    const session = this.currentSession();
    return !!session && (!role || this.role() === role);
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
    if (!session) {
      this.switchedRoleState.set(null);
      return;
    }

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
    return path === '/landing' || path === '/login' || path.startsWith('/login/');
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
