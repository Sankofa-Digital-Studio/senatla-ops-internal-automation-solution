import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { AppRole, AuthSession } from 'src/app/core/models/app.models';
import { AuthService } from 'src/app/core/services/auth.service';
import { OnboardingFeature, OnboardingService } from 'src/app/core/services/onboarding.service';

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
  showPassword = false;
  showRecoveryPassword = false;
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

  ngOnInit() {
    this.restoreLoginPreference();
    this.routeSubscription = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) => {
      this.requestedRole = this.normalizeRole(params.get('role') ?? '');
      this.redirectUrl = this.sanitizeRedirect(query.get('redirect'));
      this.errorMsg = '';
      this.recoveryMode = this.isRecoveryRoute(query);
      this.forcedPasswordChange = query.get('forced') === '1';
      this.recoveryUsernameHint = query.get('mock_user')?.trim().toLowerCase() || '';
      this.recoveryMsg = '';
      if (this.recoveryUsernameHint) this.username = this.recoveryUsernameHint;
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
        await this.fetchRoleResources(session);
        this.onboarding.complete(session.userId, session.role);
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

  async requestPasswordReset() {
    const email = this.username.trim().toLowerCase();
    if (!email) {
      this.errorMsg = 'Enter your work email first, then request recovery.';
      return;
    }
    this.errorMsg = '';
    this.recoveryMsg = '';
    this.isSubmitting = true;
    try {
      const result = await this.auth.requestPasswordReset(email, `${location.origin}${RECOVERY_ROUTE}`);
      this.recoveryMsg = result.resetLink
        ? `${result.message} One-time link: ${result.resetLink}`
        : result.message;
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
    if (this.recoveryPassword.trim().length < 8) {
      this.errorMsg = 'Choose a password with at least 8 characters.';
      return;
    }
    if (this.recoveryPassword !== this.confirmRecoveryPassword) {
      this.errorMsg = 'Password confirmation does not match.';
      return;
    }
    this.errorMsg = '';
    this.recoveryMsg = '';
    this.isRecoveringPassword = true;
    try {
      await this.auth.updatePassword(this.recoveryPassword, this.recoveryUsernameHint || this.username);
      this.recoveryPassword = '';
      this.confirmRecoveryPassword = '';
      this.password = '';
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
    if (this.router.url.split('?')[0] === RECOVERY_ROUTE) return true;
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
