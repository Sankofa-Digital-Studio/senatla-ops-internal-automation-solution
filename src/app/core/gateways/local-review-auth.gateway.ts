import { Injectable } from '@angular/core';
import { isAllowedAccessEmail, normalizeAccessEmail } from '../auth/access-email-policy';
import { cappedSessionExpiry, sessionHasExpired } from '../auth/session-policy';
import { AppRole, AuthSession } from '../models/app.models';
import { AuthGateway, PasswordResetRequestResult } from './auth.gateway';

type ReviewAccount = {
  password: string;
  role: AppRole;
  displayName: string;
  permittedSiteIds: string[];
  mustChangePassword?: boolean;
};

const SESSION_KEY = 'senatla_ops_local_review_session_v2';
const MOCK_RESET_KEY = 'senatla_ops_local_review_reset_v2';
const LOCAL_REVIEW_RECOVERY_PATH = '/login/recovery';
const REVIEW_SITES = ['demo-workshop', 'demo-plant-b', 'demo-shaft-4', 's1', 's2'];

const REVIEW_ACCOUNTS: ReadonlyArray<readonly [string, ReviewAccount]> = [
  [
    'thosontula+site@gmail.com',
    { password: 'test-password', role: 'site', displayName: 'Site Manager', permittedSiteIds: REVIEW_SITES },
  ],
  [
    'thosontula+office@gmail.com',
    { password: 'test-password', role: 'office', displayName: 'Office Admin', permittedSiteIds: REVIEW_SITES },
  ],
  [
    'thosontula+director@gmail.com',
    { password: 'test-password', role: 'director', displayName: 'Director', permittedSiteIds: REVIEW_SITES },
  ],
  [
    'thosontula@gmail.com',
    { password: 'test-password', role: 'director', displayName: 'Developer', permittedSiteIds: REVIEW_SITES },
  ],
  [
    'brian@senatlatrading.com',
    { password: 'Sen4t!aOperationsBrian2026', role: 'site', displayName: 'Brian', permittedSiteIds: ['demo-workshop', 's1'], mustChangePassword: true },
  ],
  [
    'maggie@senatlatrading.com',
    { password: 'Sen4t!aOperationsMaggie2026', role: 'office', displayName: 'Maggie', permittedSiteIds: REVIEW_SITES, mustChangePassword: true },
  ],
  [
    'rubinthoso@senatlatrading.com',
    { password: 'Sen4t!aOperationsRubin2026', role: 'director', displayName: 'Rubin Thoso', permittedSiteIds: REVIEW_SITES, mustChangePassword: true },
  ],
];

@Injectable()
export class LocalReviewAuthGateway implements AuthGateway {
  private readonly listeners = new Set<(session: AuthSession | null) => void>();
  private readonly credentials = new Map<string, ReviewAccount>(REVIEW_ACCOUNTS);

  async loadSession(): Promise<AuthSession | null> {
    return this.readSession();
  }

  async login(username: string, password: string): Promise<AuthSession | null> {
    const email = normalizeAccessEmail(username);
    if (!isAllowedAccessEmail(email)) return null;

    const account = this.credentials.get(email);
    if (!account || account.password !== password) return null;

    const issuedAt = new Date().toISOString();
    const session: AuthSession = {
      userId: email === 'thosontula@gmail.com' ? 'developer-user' : `${account.role}-review-user`,
      username: email,
      role: account.role,
      displayName: account.displayName,
      organizationId: '00000000-0000-4000-8000-000000000001',
      permittedSiteIds: account.permittedSiteIds,
      issuedAt,
      expiresAt: cappedSessionExpiry(issuedAt),
      mustChangePassword: account.mustChangePassword === true,
    };

    this.persistSession(session);
    return session;
  }

  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    const normalizedEmail = normalizeAccessEmail(email);
    if (!isAllowedAccessEmail(normalizedEmail) || !this.credentials.has(normalizedEmail)) {
      throw new Error('No provisioned account matches that email.');
    }
    sessionStorage.setItem(MOCK_RESET_KEY, normalizedEmail);
    return {
      message: `Local recovery prepared for ${normalizedEmail}. Open the one-time link to choose a new password.`,
      resetLink: `${location.origin}${LOCAL_REVIEW_RECOVERY_PATH}?mock_user=${encodeURIComponent(normalizedEmail)}`,
    };
  }

  async updatePassword(nextPassword: string, usernameHint?: string): Promise<void> {
    const password = nextPassword.trim();
    if (password.length < 8) throw new Error('Choose a password with at least 8 characters.');

    const email = normalizeAccessEmail(usernameHint || sessionStorage.getItem(MOCK_RESET_KEY) || '');
    const account = this.credentials.get(email);
    if (!account) throw new Error('Local recovery session is unavailable. Request a new reset link.');

    this.credentials.set(email, { ...account, password, mustChangePassword: false });
    sessionStorage.removeItem(MOCK_RESET_KEY);
    this.emit(null);
  }

  async updateDisplayName(displayName: string): Promise<void> {
    const normalized = displayName.trim();
    if (normalized.length < 2 || normalized.length > 80) {
      throw new Error('Display name must be between 2 and 80 characters.');
    }

    const session = this.readSession();
    const email = normalizeAccessEmail(session?.username || '');
    const account = this.credentials.get(email);
    if (!session || !account) throw new Error('Your local review session is unavailable. Sign in again and try again.');

    this.credentials.set(email, { ...account, displayName: normalized });
    this.persistSession({ ...session, displayName: normalized });
  }

  async logout(): Promise<void> {
    this.clearSession();
    this.emit(null);
  }

  subscribeToSession(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private persistSession(session: AuthSession) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
    this.emit(session);
  }

  private readSession(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      const parsed = JSON.parse(raw || 'null') as AuthSession | null;
      const email = normalizeAccessEmail(parsed?.username || '');
      const account = this.credentials.get(email);
      if (
        !parsed?.expiresAt ||
        sessionHasExpired(parsed) ||
        !isAllowedAccessEmail(email) ||
        !account ||
        account.role !== parsed.role
      ) {
        this.clearSession();
        return null;
      }
      return { ...parsed, username: email };
    } catch {
      this.clearSession();
      return null;
    }
  }

  private clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  private emit(session: AuthSession | null) {
    for (const listener of this.listeners) listener(session);
  }
}
