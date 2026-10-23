import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { RUNTIME_CONFIG, RuntimeConfig } from 'src/app/core/config/runtime-config';
import { AppRole, AuthSession } from 'src/app/core/models/app.models';
import { AuthService } from 'src/app/core/services/auth.service';
import { OnboardingFeature, OnboardingService } from 'src/app/core/services/onboarding.service';

const LOGIN_PREF_KEY = 'senatla_ops_login_pref_v1';
const RECOVERY_ROUTE = '/login/recovery';

export interface DemoRoleOption {
  role: AppRole;
  title: string;
  badge: string;
  icon: string;
  description: string;
  route: string;
}

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
  readonly config = inject<RuntimeConfig>(RUNTIME_CONFIG);
  readonly auth = inject(AuthService);
  private routeSubscription?: Subscription;

  readonly defaultGoogleEmail = 'director.exec@senatlatrading.com';

  readonly demoRoles: DemoRoleOption[] = [
    {
      role: 'site',
      title: 'Site Manager',
      badge: 'Field Operations',
      icon: 'engineering',
      description: 'Daily readiness checks, employee attendance with GPS & photo, toolbox talks & trip logs.',
      route: '/site-manager',
    },
    {
      role: 'office',
      title: 'Office Admin',
      badge: 'Workforce & Assets',
      icon: 'badge',
      description: 'Employee registration, medicals & red-tickets, asset register with OCR, attendance audits.',
      route: '/office-admin',
    },
    {
      role: 'director',
      title: 'Director',
      badge: 'Executive Oversight',
      icon: 'monitoring',
      description: 'Executive dashboard, multi-site operational metrics, cost attribution & invoice approvals.',
      route: '/director',
    },
  ];

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
  recoveryUsernameHint = '';

  // First login role selection state
  showRolePicker = false;
  selectedOperationalRole: AppRole = 'site';
  pendingProfile?: { userId: string; email: string; displayName: string };

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
    return 'Secure access portal · Google Sign-In & Local review demo roles enabled';
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
      this.recoveryUsernameHint = query.get('mock_user')?.trim().toLowerCase() || '';
      this.recoveryMsg = '';
      if (this.recoveryUsernameHint) this.username = this.recoveryUsernameHint;

      if (this.requestedRole) {
        this.selectedOperationalRole = this.requestedRole;
      }

      if (query.get('onboarding') === '1') {
        void this.openAuthenticatedWizard();
      }
    });
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
  }

  /**
   * One-click demo role login: instantly sets session and navigates directly to workspace.
   */
  async loginAsDemoRole(role: AppRole) {
    if (this.isSubmitting) return;
    this.errorMsg = '';
    this.isSubmitting = true;
    this.isFetchingResources = true;

    try {
      const session = await this.auth.loginAsDemoRole(role);
      await this.fetchRoleResources(session);
      const targetPath = this.redirectUrl || this.getRolePath(role);
      this.onboarding.complete(session.userId, role);
      await this.router.navigateByUrl(targetPath);
    } catch (error) {
      this.errorMsg = error instanceof Error ? error.message : 'Demo role sign-in failed.';
    } finally {
      this.isFetchingResources = false;
      this.isSubmitting = false;
    }
  }

  /**
   * Google Sign-In with operational role assignment on first login.
   */
  async handleGoogleSignIn(customEmail?: string) {
    if (this.isSubmitting || this.showWizard) return;
    this.errorMsg = '';
    this.isSubmitting = true;
    this.isFetchingResources = true;

    try {
      const targetEmail = (customEmail || this.defaultGoogleEmail).trim().toLowerCase();
      if (!targetEmail.endsWith('@senatlatrading.com') && !targetEmail.endsWith('@test.invalid')) {
        this.errorMsg = 'Access restricted: Only provisioned @senatlatrading.com corporate accounts may sign in.';
        return;
      }
      const displayName = targetEmail.split('@')[0] === 'director.exec' ? 'Executive Director' : targetEmail.split('@')[0];
      const result = await this.auth.loginWithGoogle({
        email: targetEmail,
        displayName,
      });

      if (result.session) {
        // User already has an assigned role - enter workspace immediately
        const role = result.session.role;
        await this.fetchRoleResources(result.session);
        this.onboarding.complete(result.session.userId, role);
        const targetPath = this.redirectUrl || this.getRolePath(role);
        await this.router.navigateByUrl(targetPath);
      } else if (result.needsRoleSelection) {
        // First login: prompt user to pick operational role
        this.pendingProfile = result.pendingProfile || {
          userId: `google-${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: targetEmail,
          displayName,
        };
        this.selectedOperationalRole = this.requestedRole || 'site';
        this.showRolePicker = true;
      }
    } catch (error) {
      this.errorMsg = error instanceof Error ? error.message : 'Google sign-in could not be completed.';
    } finally {
      this.isFetchingResources = false;
      this.isSubmitting = false;
    }
  }

  /**
   * Selects operational role in the picker dialog.
   */
  selectOperationalRole(role: AppRole) {
    this.selectedOperationalRole = role;
  }

  /**
   * Confirms operational role selection on first login and enters workspace immediately.
   */
  async confirmOperationalRole() {
    if (!this.selectedOperationalRole || this.isSubmitting) return;
    this.isSubmitting = true;
    this.isFetchingResources = true;
    this.errorMsg = '';

    try {
      const session = await this.auth.assignOperationalRole(
        this.selectedOperationalRole,
        this.pendingProfile,
      );
      this.showRolePicker = false;
      await this.fetchRoleResources(session);
      this.onboarding.complete(session.userId, session.role);
      const targetPath = this.redirectUrl || this.getRolePath(session.role);
      await this.router.navigateByUrl(targetPath);
    } catch (error) {
      this.errorMsg = error instanceof Error ? error.message : 'Operational role could not be assigned.';
    } finally {
      this.isFetchingResources = false;
      this.isSubmitting = false;
    }
  }

  closeRolePicker() {
    this.showRolePicker = false;
    this.pendingProfile = undefined;
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
        this.errorMsg = 'Please enter your work email or username.';
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

  private async fetchRoleResources(_session: AuthSession) {
    await new Promise((resolve) => setTimeout(resolve, 150));
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
    if (query.get('type') === 'recovery') return true;
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    return hash.includes('type=recovery') || hash.includes('access_token=');
  }
}
