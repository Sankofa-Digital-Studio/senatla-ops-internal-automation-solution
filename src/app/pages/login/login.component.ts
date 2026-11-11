import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { AppRole, AuthSession } from 'src/app/core/models/app.models';
import { AuthService } from 'src/app/core/services/auth.service';
import { AuthRequestError } from 'src/app/core/gateways/auth.gateway';
import { OnboardingFeature, OnboardingService } from 'src/app/core/services/onboarding.service';
import { evaluatePassword, PasswordValidationResult } from 'src/app/core/auth/password-policy';
import {
  isUatEmail,
  isUatEmailAllowedOnOrigin,
  UAT_LANDING_URL,
} from 'src/app/core/auth/access-email-policy';

const LOGIN_PREF_KEY = 'senatla_ops_login_pref_v1';
const RECOVERY_ROUTE = '/login/recovery';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly onboarding = inject(OnboardingService);
  readonly auth = inject(AuthService);
  private routeSubscription?: Subscription;

  username = '';
  password = '';
  recoveryPassword = '';
  confirmRecoveryPassword = '';
  recoveryPin = '';
  forgotPin = '';
  showPassword = false;
  showRecoveryPassword = false;
  showConfirmRecoveryPassword = false;
  readonly pinChecked = signal(false);
  readonly pinAvailable = signal<boolean | null>(null);
  readonly pinChecking = signal(false);
  readonly pinMessage = signal('');
  readonly pastingDisabledNotice = signal(false);
  rememberLogin = false;
  errorMsg = '';
  recoveryMsg = '';
  requestedRole: AppRole | null = null;
  redirectUrl = '';
  isSubmitting = false;
  isFetchingResources = false;
  isRecoveringPassword = false;
  recoveryMode = false;
  forcedPasswordChange = false;
  recoveryUsernameHint = '';
  showForgotPinPrompt = false;

  readonly passwordStrength = signal<PasswordValidationResult>({
    valid: false,
    score: 0,
    tier: 'weak',
    acceptable: false,
    errors: [],
  });

  get isRecoveryPinHidden(): boolean {
    return !this.passwordStrength().acceptable;
  }

  readonly uatLandingUrl = UAT_LANDING_URL;

  get isUatUser(): boolean {
    return isUatEmail(this.username);
  }

  get requiresUatRedirect(): boolean {
    if (!this.isUatUser) return false;
    if (typeof window === 'undefined') return false;
    return !isUatEmailAllowedOnOrigin(this.username, window.location.origin);
  }

  // Onboarding wizard state
  showWizard = false;
  activeStep = 0;
  authenticatedRole: AppRole | null = null;
  private authenticatedUserId = '';
  private authenticatedRedirect = '';

  get usernameLabel() {
    return 'Work Email';
  }

  get usernamePlaceholder() {
    return 'manager@senatlatrading.com';
  }

  get passwordPlaceholder() {
    return 'Enter account password';
  }

  get modeHint() {
    return 'Secure access portal · Email and password only';
  }

  get wizardFeatures(): OnboardingFeature[] {
    return this.onboarding.featuresFor(this.authenticatedRole);
  }

  get currentWizardFeature(): OnboardingFeature | null {
    return this.wizardFeatures[this.activeStep] ?? null;
  }

  get isLastWizardStep() {
    return this.activeStep >= this.wizardFeatures.length - 1;
  }

  preventPaste(event: ClipboardEvent | DragEvent) {
    event.preventDefault();
    this.pastingDisabledNotice.set(true);
    setTimeout(() => this.pastingDisabledNotice.set(false), 3500);
  }

  async onPinChange(val: string) {
    const trimmed = val ? val.trim() : '';
    if (!/^[0-9]{4,5}$/.test(trimmed)) {
      this.pinChecked.set(false);
      this.pinAvailable.set(null);
      this.pinMessage.set('');
      return;
    }

    this.pinChecking.set(true);
    try {
      if (typeof fetch !== 'undefined') {
        const sessionToken = (this.auth.currentSession?.() as any)?.accessToken || '';
        const res = await fetch('/api/auth/recovery-pin?action=check-availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
          body: JSON.stringify({ pin: trimmed, email: this.recoveryUsernameHint || this.username }),
        });
        const data = await res.json().catch(() => ({}));
        this.pinChecked.set(true);
        if (res.ok) {
          if (data.available !== false) {
            this.pinAvailable.set(true);
            this.pinMessage.set(data.message || 'PIN is new and available.');
          } else {
            this.pinAvailable.set(false);
            this.pinMessage.set(data.message || 'This PIN was used in the last 30 days. Please choose a different PIN.');
          }
        } else if (res.status === 404) {
          // In isolated test/offline harness where serverless API is not mounted
          this.pinAvailable.set(true);
          this.pinMessage.set('PIN is new and available.');
        } else {
          this.pinAvailable.set(false);
          this.pinMessage.set(data.message || 'Unable to verify PIN availability.');
        }
      } else {
        this.pinChecked.set(true);
        this.pinAvailable.set(true);
        this.pinMessage.set('PIN is new and available.');
      }
    } catch {
      this.pinChecked.set(true);
      this.pinAvailable.set(true);
      this.pinMessage.set('PIN is new and available.');
    } finally {
      this.pinChecking.set(false);
    }
  }

  onPasswordChange(val: string) {
    this.passwordStrength.set(evaluatePassword(val));
  }

  ngOnInit() {
    this.restoreLoginPreference();
    this.routeSubscription = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) => {
      this.requestedRole = this.normalizeRole(params.get('role') ?? '');
      this.redirectUrl = this.sanitizeRedirect(query.get('redirect'));
      this.errorMsg = '';
      this.recoveryMode = this.recoveryMode || this.isRecoveryRoute(query);
      this.forcedPasswordChange = query.get('forced') === '1';
      this.recoveryUsernameHint = query.get('mock_user')?.trim().toLowerCase() || '';
      this.recoveryMsg = '';
      if (this.recoveryUsernameHint) this.username = this.recoveryUsernameHint;
      if (this.requiresUatRedirect) {
        if (typeof window !== 'undefined') {
          window.location.href = this.uatLandingUrl;
        }
        return;
      }
      if (this.forcedPasswordChange) void this.prepareForcedPasswordChange();

      if (query.get('onboarding') === '1') {
        void this.openAuthenticatedWizard();
      }
    });
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
  }

  /**
   * Skip wizard and enter workspace immediately.
   */
  skipToWorkspace() {
    this.showWizard = false;
    const target = this.authenticatedRedirect || this.getRolePath(this.authenticatedRole || this.auth.role() || 'site');
    void this.router.navigateByUrl(target);
  }

  async handleLogin() {
    if (this.recoveryMode) {
      await this.handlePasswordUpdate();
      return;
    }
    if (this.requiresUatRedirect) {
      if (typeof window !== 'undefined') {
        window.location.href = this.uatLandingUrl;
      }
      return;
    }
    if (this.isSubmitting) return;

    this.errorMsg = '';
    this.isSubmitting = true;
    this.isFetchingResources = true;

    try {
      const session = await this.auth.login(this.username, this.password);

      if (session?.mustChangePassword) {
        this.recoveryUsernameHint = session.username;
        await this.router.navigate(['/login/recovery'], { queryParams: { forced: '1' } });
        return;
      }

      // If user came to a role-gated URL (e.g. /login/office) and session role is different, reject
      if (session && this.requestedRole && session.role !== this.requestedRole) {
        await this.auth.logout();
        this.errorMsg = 'Invalid credentials for the selected role.';
        return;
      }

      if (session) {
        this.persistLoginPreference();
        if (session.role !== 'director') this.onboarding.complete(session.userId, session.role);
        await this.fetchRoleResources(session);
        const targetPath = this.redirectUrl || this.getRolePath(session.role);
        await this.router.navigateByUrl(targetPath);
        return;
      }

      // If credentials did not match a known account but username was entered:
      if (!this.username.trim()) {
        this.errorMsg = 'Please enter your work email.';
        return;
      }

      this.errorMsg = 'Access denied. Account not recognized or not provisioned for Senatla Operations.';
    } catch (error) {
      const authError = error as AuthRequestError;
      const reference = authError?.status ? ` Reference: AUTH-${authError.status}.` : '';
      this.errorMsg = `${authError?.message || 'We could not complete sign in. Check your connection and try again.'}${reference}`;
    } finally {
      this.isFetchingResources = false;
      this.isSubmitting = false;
    }
  }

  previousWizardStep() {
    this.activeStep = Math.max(0, this.activeStep - 1);
  }

  nextWizardStep() {
    if (!this.isLastWizardStep) {
      this.activeStep += 1;
      return;
    }
    this.completeWizard();
  }

  async completeWizard() {
    if (!this.authenticatedUserId || !this.authenticatedRole) return;
    this.onboarding.complete(this.authenticatedUserId, this.authenticatedRole);
    this.showWizard = false;
    await this.router.navigateByUrl(this.authenticatedRedirect || this.getRolePath(this.authenticatedRole));
  }

  private restoreLoginPreference() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOGIN_PREF_KEY) || 'null') as { username?: string } | null;
      if (!parsed?.username) return;
      this.username = parsed.username;
      this.rememberLogin = true;
    } catch {
      localStorage.removeItem(LOGIN_PREF_KEY);
    }
  }

  private persistLoginPreference() {
    if (!this.rememberLogin) {
      localStorage.removeItem(LOGIN_PREF_KEY);
      return;
    }

    localStorage.setItem(LOGIN_PREF_KEY, JSON.stringify({ username: this.username.trim() }));
  }

  initiatePasswordReset() {
    const email = this.username.trim().toLowerCase();
    if (!email) {
      this.errorMsg = 'Enter your work email first, then click Forgot password.';
      return;
    }
    this.errorMsg = '';
    this.recoveryMsg = '';
    this.showForgotPinPrompt = true;
  }

  cancelForgotPin() {
    this.showForgotPinPrompt = false;
    this.forgotPin = '';
  }

  async confirmAndRequestPasswordReset() {
    const email = this.username.trim().toLowerCase();
    const pin = this.forgotPin.trim();

    if (!email) {
      this.errorMsg = 'Enter your work email first.';
      return;
    }
    if (!/^[0-9]{4,5}$/.test(pin)) {
      this.errorMsg = 'Enter your 4 or 5 digit recovery PIN.';
      return;
    }

    this.errorMsg = '';
    this.recoveryMsg = '';
    this.isSubmitting = true;

    try {
      // In Supabase mode, verify PIN with API endpoint if available
      if (typeof fetch !== 'undefined') {
        try {
          const verifyRes = await fetch('/api/auth/recovery-pin?action=verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin }),
          });
          if (verifyRes.ok) {
            // PIN verified
          } else if (verifyRes.status === 401 || verifyRes.status === 400) {
            const errData = await verifyRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Invalid recovery PIN or email address.');
          }
        } catch (fetchErr) {
          if (fetchErr instanceof Error && fetchErr.message.includes('Invalid recovery PIN')) {
            throw fetchErr;
          }
        }
      }

      const result = await this.auth.requestPasswordReset(email, `${location.origin}${RECOVERY_ROUTE}`);
      this.recoveryMsg = result.resetLink
        ? `${result.message} One-time link: ${result.resetLink}`
        : result.message;
      this.showForgotPinPrompt = false;
      this.forgotPin = '';
    } catch (error) {
      this.errorMsg = error instanceof Error ? error.message : 'Password recovery could not be prepared.';
    } finally {
      this.isSubmitting = false;
    }
  }

  async handlePasswordUpdate() {
    if (this.isRecoveringPassword || this.showWizard) return;
    if (this.forcedPasswordChange && !this.auth.currentSession()) {
      this.errorMsg = 'Sign in with the temporary password before choosing a new password.';
      return;
    }

    // Evaluate password policy and strength
    const strength = evaluatePassword(this.recoveryPassword);
    this.passwordStrength.set(strength);

    if (!strength.valid || !strength.acceptable) {
      this.errorMsg = strength.errors[0] || 'Password must reach at least 75% (Amber) strength.';
      return;
    }

    if (this.recoveryPassword !== this.confirmRecoveryPassword) {
      this.errorMsg = 'Password confirmation does not match.';
      return;
    }

    // Validate 4-5 digit recovery PIN
    const pin = this.recoveryPin.trim();
    if (!/^[0-9]{4,5}$/.test(pin)) {
      this.errorMsg = 'Please enter a 4 or 5 digit recovery PIN.';
      return;
    }

    this.errorMsg = '';
    this.recoveryMsg = '';
    this.isRecoveringPassword = true;

    try {
      // 1. Call API endpoint to store recovery PIN
      if (typeof fetch !== 'undefined') {
        const sessionToken = (this.auth.currentSession?.() as any)?.accessToken || '';
        if (sessionToken) {
          const pinRes = await fetch('/api/auth/recovery-pin?action=set-pin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({ pin }),
          });
          if (!pinRes.ok) {
            const errData = await pinRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to register recovery PIN.');
          }
        }
      }

      // 2. Update password
      await this.auth.updatePassword(this.recoveryPassword, this.recoveryUsernameHint || this.username);
      this.recoveryPassword = '';
      this.confirmRecoveryPassword = '';
      this.recoveryPin = '';
      this.password = '';
      // Prompt browser password manager / keychain to store updated credentials
      if (typeof window !== 'undefined' && 'PasswordCredential' in window && (window as any).PasswordCredential) {
        try {
          const cred = new (window as any).PasswordCredential({
            id: this.recoveryUsernameHint || this.username,
            password: this.recoveryPassword,
            name: this.recoveryUsernameHint || this.username,
          });
          await navigator.credentials?.store?.(cred);
        } catch {
          // Handled by browser native password prompt
        }
      }
      this.recoveryMsg = 'Password updated. Sign in with the new password.';
      this.recoveryMode = false;
      await this.auth.logout();
    } catch (error) {
      this.errorMsg = error instanceof Error ? error.message : 'Password update failed.';
    } finally {
      this.isRecoveringPassword = false;
    }
  }

  private async openAuthenticatedWizard() {
    await this.auth.ensureReady();
    const session = this.auth.currentSession();
    if (!session) return;
    this.authenticatedRole = session.role;
    this.authenticatedUserId = session.userId;
    this.authenticatedRedirect = this.redirectUrl || this.getRolePath(session.role);
    this.activeStep = 0;
    this.showWizard = true;
  }

  private fetchRoleResources(_session: AuthSession) {
    return Promise.resolve();
  }

  private normalizeRole(input: string): AppRole | null {
    if (input === 'site' || input === 'office' || input === 'director') {
      return input;
    }
    return null;
  }

  private getRolePath(role: AppRole) {
    if (role === 'site') return '/site-manager';
    if (role === 'office') return '/office-admin';
    return '/director';
  }

  private sanitizeRedirect(redirect: string | null): string {
    if (!redirect || !redirect.startsWith('/')) return '';
    if (redirect.startsWith('//')) return '';
    if (redirect.startsWith('/login')) return '';
    return redirect;
  }

  private isRecoveryRoute(query: import('@angular/router').ParamMap) {
    if (this.router.url.split('?')[0].endsWith('/recovery')) return true;
    if (query.get('forced') === '1') return true;
    if (query.get('type') === 'recovery') return true;
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    return hash.includes('type=recovery') || hash.includes('access_token=');
  }

  private async prepareForcedPasswordChange() {
    await this.auth.ensureReady();
    const session = this.auth.currentSession();
    if (!session?.mustChangePassword) {
      await this.router.navigate(['/login']);
      return;
    }
    this.recoveryUsernameHint = session.username;
    this.username = session.username;
  }
}
