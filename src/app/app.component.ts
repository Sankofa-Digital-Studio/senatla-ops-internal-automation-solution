import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../environments/environment';
import { TimeControlsComponent } from './components/time-controls.component';
import { AccessibleDialogDirective } from './core/accessibility/accessible-dialog.directive';
import { AuthService } from './core/services/auth.service';
import { OnboardingFeature, OnboardingService } from './core/services/onboarding.service';
import { SeoService } from './core/services/seo.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, TimeControlsComponent, AccessibleDialogDirective],
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  readonly showDebugControls = !environment.production;
  readonly isOffline = signal(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  readonly currentPath = signal(this.router.url || '/landing');
  readonly showHelp = signal(false);
  readonly showTour = signal(false);
  readonly tourStep = signal(0);
  readonly suppressTour = signal(false);
  readonly signOutError = signal('');
  readonly isSigningOut = signal(false);
  readonly tourFeatures = computed<OnboardingFeature[]>(() => {
    const features = this.onboarding.featuresFor(this.auth.role());
    return this.auth.isDeveloperDirector()
      ? features
      : features.filter((feature) => feature.route !== '/office-admin' && feature.route !== '/asset-register');
  });
  readonly currentTourFeature = computed(() => this.tourFeatures()[this.tourStep()] || null);
  readonly isLastTourStep = computed(() => this.tourStep() >= this.tourFeatures().length - 1);
  private guidedSessionKey: string | null = null;

  readonly workspaceLink = computed(() => {
    const role = this.auth.role();
    if (role === 'site') return { label: 'Site workspace', path: '/site-manager' };
    if (role === 'director') return { label: 'Director workspace', path: '/director' };
    return { label: 'Operations workspace', path: '/office-admin' };
  });

  readonly breadcrumbs = computed(() => {
    const url = this.currentPath().split('?')[0];
    const items: Array<{ label: string; path?: string }> = [
      { label: 'Home', path: this.workspaceLink().path },
    ];
    if (url === '/profile-settings') {
      items.push({ label: 'Profile Settings' });
    } else if (url === '/asset-register') {
      items.push({ label: 'Asset Control' });
    } else if (url === '/director') {
      items.push({ label: 'Director Command' });
    } else if (url === '/site-manager') {
      items.push({ label: 'Site Operations' });
    } else if (url === '/office-admin') {
      items.push({ label: 'Office Administration' });
    } else if (url && url !== '/' && url !== this.workspaceLink().path) {
      const formatted = url.replace('/', '').replace(/-/g, ' ');
      items.push({ label: formatted.charAt(0).toUpperCase() + formatted.slice(1) });
    }
    return items;
  });

  readonly isDeepRoute = computed(() => {
    const url = this.currentPath().split('?')[0];
    return url !== this.workspaceLink().path && !this.isPublicRoute();
  });

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.currentPath.set(e.urlAfterRedirects || e.url);
        this.seo.applyRoute(e.urlAfterRedirects || e.url);
      });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOffline.set(false));
      window.addEventListener('offline', () => this.isOffline.set(true));
    }

    effect(() => {
      const session = this.auth.currentSession();
      if (!session) {
        this.guidedSessionKey = null;
        return;
      }
      if (!session || session.role !== 'director' || !this.onboarding.shouldAutoOpen(session.userId, session.role)) return;
      const key = `${session.userId}:${session.issuedAt}`;
      if (this.guidedSessionKey === key) return;
      this.guidedSessionKey = key;
      this.tourStep.set(0);
      this.showTour.set(true);
      queueMicrotask(() => void this.navigateTourTarget());
    });
  }

  isPublicRoute() {
    const path = this.currentPath().split('?')[0];
    return path === '/landing' || path === '/login' || path.startsWith('/login/');
  }

  async logout() {
    if (this.isSigningOut()) return;
    this.isSigningOut.set(true);
    this.signOutError.set('');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.auth.logout(),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Sign out is taking longer than expected. Your session is closed on this device; try again if needed.')), 10000); }),
      ]);
      await this.router.navigateByUrl('/landing');
    } catch (error) {
      this.signOutError.set(error instanceof Error ? error.message : 'We could not complete sign out. Check your connection and try again.');
      await this.router.navigateByUrl('/landing');
    } finally {
      if (timeout) clearTimeout(timeout);
      this.isSigningOut.set(false);
    }
  }

  openHelp() {
    this.showHelp.set(true);
  }

  closeHelp() {
    this.showHelp.set(false);
  }

  async replayTour() {
    const session = this.auth.currentSession();
    if (!session) return;
    this.onboarding.reset(session.userId, session.role);
    this.closeHelp();
    this.tourStep.set(0);
    this.showTour.set(true);
    await this.navigateTourTarget();
  }

  async nextTourStep() {
    if (!this.isLastTourStep()) {
      this.tourStep.update((step) => step + 1);
      await this.navigateTourTarget();
      return;
    }
    const session = this.auth.currentSession();
    if (session) this.onboarding.complete(session.userId, session.role, this.suppressTour());
    this.showTour.set(false);
  }

  previousTourStep() {
    this.tourStep.update((step) => Math.max(0, step - 1));
    void this.navigateTourTarget();
  }

  private async navigateTourTarget() {
    const feature = this.currentTourFeature();
    if (!feature) return;
    if (this.router.url.split('?')[0] !== feature.route || feature.query) {
      await this.router.navigate([feature.route || '/director'], { queryParams: feature.query || {} });
    }
    setTimeout(() => {
      const target = feature.target ? document.querySelector(feature.target) as HTMLElement | null : null;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.classList.add('senatla-tour-target');
      setTimeout(() => target?.classList.remove('senatla-tour-target'), 1400);
    }, 150);
  }
}
