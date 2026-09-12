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
    if (error) {
      throw new Error(this.loginErrorMessage(error.message));
    }
    if (!data.user || !data.session) return null;

    const session = await this.buildSession(data.user.id, data.user.email ?? email, data.session);
    if (!session) return null;
    void this.recordAuthEvent('login').catch(() => undefined);
    return session;
  }

  async register(request: RegistrationRequest): Promise<RegistrationResult> {
    const email = request.email.trim().toLowerCase();
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password: request.password,
      options: { data: { display_name: request.displayName.trim() } },
    });
    if (error) {
      return {
        success: false,
        confirmationRequired: false,
        adminGranted: false,
        message: this.registrationErrorMessage(error.message),
      };
    }
    if (!data.user) {
      return { success: false, confirmationRequired: false, adminGranted: false, message: 'Registration did not create an account. Try again.' };
    }

    const adminGranted = data.session && request.adminCode ? await this.redeemAdminCode(request.adminCode) : false;
    return {
      success: true,
      confirmationRequired: !data.session,
      adminGranted,
      message: data.session ? undefined : 'Check your email to confirm the account. Invitation codes are never stored; sign in before redeeming a new code.',
    };
  }

  async redeemAdminCode(code: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('redeem_admin_invitation', { invitation_code: code.trim() });
    return !error && data === true;
  }

  async requestPasswordReset(email: string, redirectTo?: string): Promise<PasswordResetRequestResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Work email is required.');
    const { error } = await this.supabase.auth.resetPasswordForEmail(normalizedEmail, redirectTo ? { redirectTo } : undefined);
    if (error) throw new Error(this.recoveryErrorMessage(error.message));
    return { message: `Password recovery email requested for ${normalizedEmail}.` };
  }

  async updatePassword(nextPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: nextPassword });
    if (error) throw new Error(this.recoveryErrorMessage(error.message));
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

  private loginErrorMessage(message: string) {
    const normalized = message.toLowerCase();
    if (normalized.includes('invalid login credentials')) return 'Email or password is incorrect.';
    if (normalized.includes('email not confirmed')) return 'Confirm your email before signing in.';
    if (normalized.includes('rate limit') || normalized.includes('too many')) return 'Too many sign-in attempts. Wait a moment and try again.';
    return 'Sign-in service is unavailable right now. Check your connection and try again.';
  }

  private registrationErrorMessage(message: string) {
    const normalized = message.toLowerCase();
    if (normalized.includes('already registered') || normalized.includes('already been registered')) return 'An account already exists for this email. Sign in or use password recovery.';
    if (normalized.includes('password') && (normalized.includes('weak') || normalized.includes('short') || normalized.includes('characters'))) return 'The password does not meet the secure account policy. Use a longer passphrase and try again.';
    if (normalized.includes('email') && normalized.includes('invalid')) return 'Enter a valid work email address.';
    if (normalized.includes('rate limit') || normalized.includes('too many')) return 'Too many registration attempts. Wait a moment and try again.';
    return 'Registration service is unavailable right now. Check your connection and try again.';
  }

  private recoveryErrorMessage(message: string) {
    const normalized = message.toLowerCase();
    if (normalized.includes('rate limit') || normalized.includes('too many')) return 'Too many recovery attempts. Wait a moment and try again.';
    if (normalized.includes('password') && normalized.includes('same')) return 'Choose a password different from the current password.';
    return 'Password recovery could not be completed. Check the details and try again.';
  }

  private emit(session: AuthSession | null) {
    for (const listener of this.listeners) listener(session);
  }
}
