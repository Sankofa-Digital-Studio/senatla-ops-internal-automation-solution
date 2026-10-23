import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AppRole } from 'src/app/core/models/app.models';
import { AuthService } from 'src/app/core/services/auth.service';
import { OnboardingService } from 'src/app/core/services/onboarding.service';

@Component({
  selector: 'app-profile-settings',
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class ProfileSettingsComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly onboarding = inject(OnboardingService);
  readonly features = computed(() => this.onboarding.featuresFor(this.auth.role()));
  readonly session = computed(() => this.auth.session());
  readonly currentRole = computed(() => this.auth.role());

  async switchRole(newRole: AppRole) {
    const current = this.session();
    if (!current) return;
    await this.auth.assignOperationalRole(newRole, {
      userId: current.userId,
      email: current.username,
      displayName: current.displayName,
    });
    await this.router.navigateByUrl(this.rolePath(newRole));
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