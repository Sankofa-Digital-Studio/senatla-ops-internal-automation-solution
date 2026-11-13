import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { OnboardingFeature, OnboardingService } from 'src/app/core/services/onboarding.service';

@Component({
  selector: 'app-profile-settings',
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
})
export class ProfileSettingsComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly onboarding = inject(OnboardingService);
  readonly features = computed(() => this.onboarding.featuresFor(this.auth.role()));
  readonly session = computed(() => this.auth.session());
  readonly currentRole = computed(() => this.auth.role());
  displayNameDraft = '';
  isSavingDisplayName = false;
  profileMessage = '';
  profileError = '';

  constructor() {
    effect(() => {
      const displayName = this.session()?.displayName;
      if (displayName && !this.isSavingDisplayName) this.displayNameDraft = displayName;
    });
  }

  async saveDisplayName() {
    this.profileMessage = '';
    this.profileError = '';
    this.isSavingDisplayName = true;
    try {
      await this.auth.updateDisplayName(this.displayNameDraft);
      this.displayNameDraft = this.auth.displayName();
      this.profileMessage = 'Display name updated.';
    } catch (error) {
      this.profileError = error instanceof Error ? error.message : 'Display name could not be updated.';
    } finally {
      this.isSavingDisplayName = false;
    }
  }

  async openFeature(feature: OnboardingFeature) {
    if (!feature.route) return;
    await this.router.navigate([feature.route], { queryParams: feature.query || {} });
    if (!feature.target || typeof document === 'undefined') return;
    setTimeout(() => document.querySelector(feature.target!)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async reviewOnboarding() {
    const role = this.auth.role();
    const userId = this.auth.session()?.userId;
    if (!role || !userId) return;

    this.onboarding.reset(userId, role);
    await this.router.navigate(['/login'], {
      queryParams: {
        onboarding: '1',
        redirect: this.rolePath(role),
      },
    });
  }

  rolePath(role: string) {
    if (role === 'site') return '/site-manager';
    if (role === 'office') return '/office-admin';
    return '/director';
  }
}
