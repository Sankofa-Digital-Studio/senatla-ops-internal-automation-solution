import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppRole, AuthSession } from '../models/app.models';
import { AUTH_GATEWAY, AuthGateway, PasswordResetRequestResult } from '../gateways/auth.gateway';
import { SESSION_EXPIRY_SCHEDULER } from '../auth/session-expiry.scheduler';
import { SESSION_MAX_AGE_MS, sessionHasExpired } from '../auth/session-policy';
import {
  isAllowedAccessEmail,
  isDeveloperDirectorEmail,
  isPermanentDeveloperEmail,
  normalizeAccessEmail,
  requireAllowedAccessEmail,
} from '../auth/access-email-policy';

const LAST_ACTIVITY_KEY = 'senatla_ops_last_activity';
const LOCAL_SESSION_KEY = 'senatla_ops_local_review_session_v2';
const ACTIVITY_THROTTLE_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authGateway = inject<AuthGateway>(AUTH_GATEWAY);
  private readonly router = inject(Router);
  private readonly expiryScheduler = inject(SESSION_EXPIRY_SCHEDULER);
  private readonly zone = inject(NgZone);

  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly readyState = signal(false);
  private readonly switchedRoleState = signal<AppRole | null>(null);

  private restorePromise: Promise<void> | null = null;
  private cancelExpiryTimer: (() => void) | null = null;
  private removeActivityListeners: (() => void) | null = null;

  private lastActivityTimestamp = Date.now();
  private lastActivityRecordedTime = 0;
  private activityDeadline = 0;

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
    const isInactive = Date.now() >= this.activityDeadline;
    if (isInactive || sessionHasExpired(session)) {
      void this.expireIfNeeded();
      return false;
    }
    return true;
  }

  currentSession() {
    return this.validateSession() ? this.sessionState() : null;
  }

  /**
   * Resets the inactivity countdown when the user interacts with the application.
   */
  recordActivity(): void {
    const now = Date.now();
    if (now - this.lastActivityRecordedTime < ACTIVITY_THROTTLE_MS) return;
    this.lastActivityRecordedTime = now;
    this.lastActivityTimestamp = now;

    const session = this.sessionState();
    if (!session) return;

    this.activityDeadline = now + SESSION_MAX_AGE_MS;
    this.zone.run(() => {
      this.sessionState.set(session);
    });

    this.scheduleExpiryTimer();

    try {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      const rawLocalSession = sessionStorage.getItem(LOCAL_SESSION_KEY);
      if (rawLocalSession) {
        const parsed = JSON.parse(rawLocalSession) as AuthSession;
        parsed.expiresAt = new Date(this.activityDeadline).toISOString();
        sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(parsed));
      }
    } catch {
      // Storage access may fail in sandboxed or non-browser environments
    }
  }

  private setSession(session: AuthSession | null) {
    this.clearExpiryTimer();
    this.sessionState.set(session);
    if (!session) {
      this.switchedRoleState.set(null);
      this.teardownActivityTracking();
      this.activityDeadline = 0;
      try {
        sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch {
        // Ignore
      }
      return;
    }

    let storedLastActivity = Number.NaN;
    try {
      const raw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
      if (raw) storedLastActivity = Number(raw);
    } catch {
      // Ignore
    }

    const now = Date.now();
    this.lastActivityTimestamp =
      Number.isFinite(storedLastActivity) && storedLastActivity > 0 ? storedLastActivity : now;
    this.lastActivityRecordedTime = this.lastActivityTimestamp;
    this.activityDeadline = this.lastActivityTimestamp + SESSION_MAX_AGE_MS;

    this.setupActivityTracking();
    this.scheduleExpiryTimer();
  }

  private scheduleExpiryTimer() {
    this.clearExpiryTimer();
    const session = this.sessionState();
    if (!session) return;

    const remaining = Math.max(0, this.activityDeadline - Date.now());
    if (remaining <= 0) {
      void this.expireIfNeeded();
      return;
    }
    this.cancelExpiryTimer = this.expiryScheduler.schedule(() => void this.expireIfNeeded(), remaining);
  }

  private clearExpiryTimer() {
    this.cancelExpiryTimer?.();
    this.cancelExpiryTimer = null;
  }

  private setupActivityTracking() {
    if (typeof window === 'undefined') return;
    this.teardownActivityTracking();

    const activityHandler = () => {
      this.recordActivity();
    };

    this.zone.runOutsideAngular(() => {
      const options: AddEventListenerOptions = { passive: true, capture: true };
      window.addEventListener('mousedown', activityHandler, options);
      window.addEventListener('keydown', activityHandler, options);
      window.addEventListener('touchstart', activityHandler, options);
      window.addEventListener('scroll', activityHandler, options);

      this.removeActivityListeners = () => {
        window.removeEventListener('mousedown', activityHandler, options);
        window.removeEventListener('keydown', activityHandler, options);
        window.removeEventListener('touchstart', activityHandler, options);
        window.removeEventListener('scroll', activityHandler, options);
      };
    });
  }

  private teardownActivityTracking() {
    this.removeActivityListeners?.();
    this.removeActivityListeners = null;
  }

  private async expireIfNeeded() {
    const session = this.sessionState();
    if (!session) return;
    const isInactive = Date.now() >= this.activityDeadline;
    if (!isInactive && !sessionHasExpired(session)) return;
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
