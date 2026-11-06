import { Injectable } from '@angular/core';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AppRole, AuthSession } from '../models/app.models';
import { cappedSessionExpiry } from '../auth/session-policy';
import { isAllowedAccessEmail, normalizeAccessEmail, requireAllowedAccessEmail } from '../auth/access-email-policy';
import { AuthGateway, AuthRequestError, PasswordResetRequestResult } from './auth.gateway';
import { injectSupabaseClient } from './supabase.client';

type ProfileRow = {
  id: string;
  display_name: string | null;
  role: AppRole | null;
  is_active: boolean;
  organization_id: string | null;
};

type SiteAccessRow = {
  site_id: string;
};

@Injectable()
export class SupabaseAuthGateway implements AuthGateway {
  private readonly supabase = injectSupabaseClient();
  private authSubscriptionStarted = false;
  private readonly listeners = new Set<(session: AuthSession | null) => void>();

  async loadSession(): Promise<AuthSession | null> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error || !data.user) return null;
    if (!data.user.email || !isAllowedAccessEmail(data.user.email)) {
      await this.supabase.auth.signOut();
      return null;
    }
    const { data: sessionData } = await this.supabase.auth.getSession();
    if (!sessionData.session) return null;
    return await this.buildSession(data.user.id, data.user.email ?? '', sessionData.session);
  }

  async login(username: string, password: string): Promise<AuthSession | null> {
    const email = normalizeAccessEmail(username);
    if (!isAllowedAccessEmail(email)) return null;
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const status = typeof (error as any).status === 'number' ? (error as any).status : undefined;
      throw new AuthRequestError(this.userSafeMessage(status), status, (error as any).code);
    }
    if (!data.user || !data.session) return null;

    const session = await this.buildSession(data.user.id, data.user.email ?? email, data.session);
    if (!session) return null;
    void this.recordAuthEvent('login').catch(() => undefined);
    return session;
  }

  async requestPasswordReset(email: string, redirectTo?: string): Promise<PasswordResetRequestResult> {
    const normalizedEmail = requireAllowedAccessEmail(email);
    const { error } = await this.supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      redirectTo ? { redirectTo } : undefined,
    );
    if (error) {
      throw error;
    }
    return { message: `Password recovery email requested for ${normalizedEmail}.` };
  }

  async updatePassword(nextPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: nextPassword });
    if (error) {
      throw error;
    }

    const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      throw new Error('Password changed, but the authenticated session could not be verified. Sign in again to continue.');
    }

    const response = await fetch('/api/auth/password-change-complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error || 'Password changed, but account activation could not be completed.');
    }

    const { error: refreshError } = await this.supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error('Password changed. Sign in again to refresh account access.');
    }
  }

  async logout(): Promise<void> {
    void this.recordAuthEvent('logout').catch(() => undefined);
    await this.supabase.auth.signOut();
  }

  private userSafeMessage(status?: number) {
    if (status === 400) return 'The sign-in details could not be accepted. Check your email and password and try again.';
    if (status === 401) return 'The email or password is not correct. Check both fields and try again.';
    if (status === 403) return 'This account is not allowed to enter this workspace. Contact your administrator.';
    if (status === 408) return 'The sign-in request took too long. Check your connection and try again.';
    if (status === 429) return 'There have been too many attempts. Wait a moment and try again.';
    if (status && status >= 500) return 'The sign-in service is temporarily unavailable. Try again shortly.';
    return 'We could not complete sign in. Check your connection and try again.';
  }

  subscribeToSession(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.add(listener);
    this.ensureAuthSubscription();
    return () => this.listeners.delete(listener);
  }

  private async buildSession(userId: string, fallbackEmail: string, session: Session): Promise<AuthSession | null> {
    const accessEmail = normalizeAccessEmail(fallbackEmail);
    if (!isAllowedAccessEmail(accessEmail)) {
      await this.supabase.auth.signOut();
      return null;
    }
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('id, display_name, role, is_active, organization_id')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error || !profile?.role || !profile.is_active || !profile.organization_id) {
      await this.supabase.auth.signOut();
      return null;
    }

    const { data: siteAccess, error: siteAccessError } = await this.supabase
      .from('profile_site_access')
      .select('site_id')
      .eq('profile_id', userId);

    if (siteAccessError) {
      await this.supabase.auth.signOut();
      return null;
    }

    return {
      userId,
      username: accessEmail,
      role: profile.role,
      displayName: profile.display_name || fallbackEmail || 'Unknown User',
      organizationId: profile.organization_id,
      permittedSiteIds: (siteAccess as SiteAccessRow[] | null)?.map((entry) => entry.site_id) || [],
      issuedAt: session.user.last_sign_in_at || session.user.created_at,
      expiresAt: cappedSessionExpiry(
        session.user.last_sign_in_at || session.user.created_at,
        session.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined,
      ),
      mustChangePassword: session.user.app_metadata?.['must_change_password'] === true,
    };
  }

  private ensureAuthSubscription() {
    if (this.authSubscriptionStarted) return;
    this.authSubscriptionStarted = true;
    this.supabase.auth.onAuthStateChange((event, session) => void this.handleAuthStateChange(event, session));
  }

  private async handleAuthStateChange(event: AuthChangeEvent, session: Session | null) {
    if (event === 'SIGNED_OUT' || !session?.user) {
      this.emit(null);
      return;
    }
    if (event !== 'TOKEN_REFRESHED' && event !== 'USER_UPDATED') return;
    const authSession = await this.buildSession(session.user.id, session.user.email ?? '', session);
    this.emit(authSession);
  }

  private async recordAuthEvent(eventType: 'login' | 'logout') {
    const { data } = await this.supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await this.supabase.from('auth_activity_events').insert({
      actor_id: data.user.id,
      target_profile_id: data.user.id,
      event_type: eventType,
      details: {},
    });
    if (error) throw error;
  }

  private emit(session: AuthSession | null) {
    for (const listener of this.listeners) listener(session);
  }
}
