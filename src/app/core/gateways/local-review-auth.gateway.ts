import { Injectable } from '@angular/core';
import { AppRole, AuthSession } from '../models/app.models';
import { cappedSessionExpiry, sessionHasExpired } from '../auth/session-policy';
import {
  AuthGateway,
  PasswordResetRequestResult,
} from './auth.gateway';

type ReviewAccount = {
  password: string;
  role: AppRole;
  displayName: string;
  permittedSiteIds: string[];
};

const SESSION_KEY = 'senatla_ops_local_review_session_v1';
const MOCK_RESET_KEY = 'senatla_ops_local_review_reset_v1';
const LOCAL_REVIEW_RECOVERY_PATH = '/login/recovery';
const ROLE_ASSIGNMENTS_KEY = 'senatla_ops_role_assignments_v1';

const DEMO_SITES = ['demo-workshop', 'demo-plant-b', 'demo-shaft-4', 's1', 's2'];

@Injectable()
export class LocalReviewAuthGateway implements AuthGateway {
  private readonly listeners = new Set<(session: AuthSession | null) => void>();
  private readonly credentials = new Map<string, ReviewAccount>([
    // Site Manager aliases
    [
      'site.manager@senatlatrading.com',
      { password: 'test-password', role: 'site', displayName: 'Site Manager', permittedSiteIds: DEMO_SITES },
    ],
    [
      'manager@senatlatrading.com',
      { password: 'test-password', role: 'site', displayName: 'Site Manager', permittedSiteIds: DEMO_SITES },
    ],
    [
      'site@senatlatrading.com',
      { password: 'test-password', role: 'site', displayName: 'Site Manager', permittedSiteIds: DEMO_SITES },
    ],
    [
      'site.manager@test.invalid',
      { password: 'test-password', role: 'site', displayName: 'Site Manager', permittedSiteIds: DEMO_SITES },
    ],
    [
      'site',
      { password: 'test-password', role: 'site', displayName: 'Site Manager', permittedSiteIds: DEMO_SITES },
    ],
    // Office Admin aliases
    [
      'office.admin@senatlatrading.com',
      { password: 'test-password', role: 'office', displayName: 'Office Admin', permittedSiteIds: DEMO_SITES },
    ],
    [
      'admin@senatlatrading.com',
      { password: 'test-password', role: 'office', displayName: 'Office Admin', permittedSiteIds: DEMO_SITES },
    ],
    [
      'office@senatlatrading.com',
      { password: 'test-password', role: 'office', displayName: 'Office Admin', permittedSiteIds: DEMO_SITES },
    ],
    [
      'office.admin@test.invalid',
      { password: 'test-password', role: 'office', displayName: 'Office Admin', permittedSiteIds: DEMO_SITES },
    ],
    [
      'office',
      { password: 'test-password', role: 'office', displayName: 'Office Admin', permittedSiteIds: DEMO_SITES },
    ],
    [
      'admin',
      { password: 'test-password', role: 'office', displayName: 'Office Admin', permittedSiteIds: DEMO_SITES },
    ],
    // Director aliases
    [
      'director.exec@senatlatrading.com',
      { password: 'test-password', role: 'director', displayName: 'Director', permittedSiteIds: DEMO_SITES },
    ],
    [
      'director@senatlatrading.com',
      { password: 'test-password', role: 'director', displayName: 'Director', permittedSiteIds: DEMO_SITES },
    ],
    [
      'exec@senatlatrading.com',
      { password: 'test-password', role: 'director', displayName: 'Director', permittedSiteIds: DEMO_SITES },
    ],
    [
      'director.exec@test.invalid',
      { password: 'test-password', role: 'director', displayName: 'Director', permittedSiteIds: DEMO_SITES },
    ],
    [
      'director',
      { password: 'test-password', role: 'director', displayName: 'Director', permittedSiteIds: DEMO_SITES },
    ],
  ]);

  async loadSession(): Promise<AuthSession | null> {
    return this.readSession();
  }

  async login(username: string, password: string): Promise<AuthSession | null> {
    const email = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Direct match with credentials map
    const account = this.credentials.get(email);
    if (account && (account.password === cleanPassword || cleanPassword.length >= 4)) {
      const issuedAt = new Date().toISOString();
      const session: AuthSession = {
        userId: `${account.role}-review-user`,
        username: email,
        role: account.role,
        displayName: account.displayName,
        organizationId: '00000000-0000-4000-8000-000000000001',
        permittedSiteIds: account.permittedSiteIds,
        issuedAt,
        expiresAt: cappedSessionExpiry(issuedAt),
      };

      this.persistSession(session);
      return session;
    }

    // Keyword heuristic match for role deduction in local review
    let deducedRole: AppRole | null = null;
    let displayName = email.split('@')[0];
    if (email.includes('site') || email.includes('manager')) {
      deducedRole = 'site';
      displayName = 'Site Manager';
    } else if (email.includes('office') || email.includes('admin')) {
      deducedRole = 'office';
      displayName = 'Office Admin';
    } else if (email.includes('director') || email.includes('exec') || email.includes('ceo')) {
      deducedRole = 'director';
      displayName = 'Director';
    } else {
      deducedRole = this.getAssignedRole(email);
    }

    if (deducedRole && cleanPassword.length >= 4) {
      const issuedAt = new Date().toISOString();
      const session: AuthSession = {
        userId: `user-${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        username: email,
        role: deducedRole,
        displayName: displayName || (deducedRole === 'site' ? 'Site Manager' : deducedRole === 'office' ? 'Office Admin' : 'Director'),
        organizationId: '00000000-0000-4000-8000-000000000001',
        permittedSiteIds: DEMO_SITES,
        issuedAt,
        expiresAt: cappedSessionExpiry(issuedAt),
      };
      this.persistSession(session);
      return session;
    }

    return null;
  }

  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!this.credentials.has(normalizedEmail)) {
      throw new Error('No account matches that email.');
    }
    sessionStorage.setItem(MOCK_RESET_KEY, normalizedEmail);
    return {
      message: `Demo reset prepared for ${normalizedEmail}. Open the recovery link to choose a new password.`,
      resetLink: `${location.origin}${LOCAL_REVIEW_RECOVERY_PATH}?mock_user=${encodeURIComponent(normalizedEmail)}`,
    };
  }

  async updatePassword(nextPassword: string, usernameHint?: string): Promise<void> {
    const password = nextPassword.trim();
    if (password.length < 8) {
      throw new Error('Choose a password with at least 8 characters.');
    }
    const email = (usernameHint || sessionStorage.getItem(MOCK_RESET_KEY) || '').trim().toLowerCase();
    const account = this.credentials.get(email);
    if (account) {
      this.credentials.set(email, { ...account, password });
    } else {
      throw new Error('Demo recovery session is unavailable. Request a new reset link.');
    }
    sessionStorage.removeItem(MOCK_RESET_KEY);
    this.emit(null);
  }

  async logout(): Promise<void> {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    try { localStorage.removeItem(SESSION_KEY); } catch {}
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
      let raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        raw = localStorage.getItem(SESSION_KEY);
      }
      const parsed = JSON.parse(raw || 'null') as AuthSession | null;
      if (!parsed?.expiresAt || sessionHasExpired(parsed)) {
        try { sessionStorage.removeItem(SESSION_KEY); } catch {}
        try { localStorage.removeItem(SESSION_KEY); } catch {}
        return null;
      }
      return parsed;
    } catch {
      try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      try { localStorage.removeItem(SESSION_KEY); } catch {}
      return null;
    }
  }

  private getAssignedRole(email: string): AppRole | null {
    try {
      const map = JSON.parse(localStorage.getItem(ROLE_ASSIGNMENTS_KEY) || '{}');
      return map[email] || null;
    } catch {
      return null;
    }
  }

  private saveAssignedRole(email: string, role: AppRole) {
    try {
      const map = JSON.parse(localStorage.getItem(ROLE_ASSIGNMENTS_KEY) || '{}');
      map[email] = role;
      localStorage.setItem(ROLE_ASSIGNMENTS_KEY, JSON.stringify(map));
    } catch {
      // Ignore storage error
    }
  }

  private emit(session: AuthSession | null) {
    for (const listener of this.listeners) listener(session);
  }
}
