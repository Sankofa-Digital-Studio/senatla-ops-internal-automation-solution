import { Injectable } from '@angular/core';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AppRole, AuthSession } from '../models/app.models';
import { cappedSessionExpiry } from '../auth/session-policy';
import { AuthGateway, PasswordResetRequestResult, RegistrationRequest, RegistrationResult } from './auth.gateway';
import { injectSupabaseClient } from './supabase.client';

type ProfileRow = {
  id: string;
  username: string | null;
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
    const { data: sessionData } = await this.supabase.auth.getSession();
    if (!sessionData.session) return null;
    return await this.buildSession(data.user.id, data.user.email ?? '', sessionData.session);
  }

  async login(username: string, password: string): Promise<AuthSession | null> {
    const email = username.trim().toLowerCase();
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password: password.trim() });
    if (error || !data.user || !data.session) return null;

    const session = await this.buildSession(data.user.id, data.user.email ?? email, data.session);
    if (!session) return null;
    void this.recordAuthEvent('login').catch(() => undefined);
    return session;
  }

  async register(request: RegistrationRequest): Promise<RegistrationResult> {
    // Self-registration is intentionally disabled. Office administrators provision accounts
    // through the back-end admin API, which emails one-time temporary credentials.
    return {
      success: false,
      confirmationRequired: false,
      adminGranted: false,
      message: 'Self-registration is disabled. Request an account from your organization\'s office administrator.',
    };
  }

  async redeemAdminCode(code: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('redeem_admin_invitation', { invitation_code: code.trim() });
    return !error && data === true;
  }

  async requestPasswordReset(email: string, redirectTo?: string): Promise<PasswordResetRequestResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Work email is required.');
    }
    const { error } = await this.supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      redirectTo ? { redirectTo } : undefined,
    );
    if (error) {
      throw error;
    }
    return { message: `Password recovery email requested for ${normalizedEmail}.` };
  }

  async updatePassword(nextPassword: string, _usernameHint?: string): Promise<void> {
    const { data: userData, error: userError } = await this.supabase.auth.getUser();
    if (userError) throw userError;
    if (userData.user?.app_metadata?.['must_change_password'] !== true) {
      const { error } = await this.supabase.auth.updateUser({ password: nextPassword });
      if (error) throw error;
      return;
    }

    const { data } = await this.supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error('Your session has expired. Sign in again to set your new password.');

    const response = await fetch(`${location.origin}/api/auth/complete-password-setup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: nextPassword }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(result.error || 'Unable to complete account password setup.');
    }
  }

  async logout(): Promise<void> {
    void this.recordAuthEvent('logout').catch(() => undefined);
    await this.supabase.auth.signOut();
  }

  subscribeToSession(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.add(listener);
    this.ensureAuthSubscription();
    return () => this.listeners.delete(listener);
  }

  private async buildSession(userId: string, fallbackEmail: string, session: Session): Promise<AuthSession | null> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('id, username, display_name, role, is_active, organization_id')
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
      username: profile.username || fallbackEmail || userId,
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
