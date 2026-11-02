import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../environments/environment';
import { TimeControlsComponent } from './components/time-controls.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, TimeControlsComponent],
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly showDebugControls = !environment.production;
  readonly isOffline = signal(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  readonly currentPath = signal(this.router.url || '/landing');

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
      });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOffline.set(false));
      window.addEventListener('offline', () => this.isOffline.set(true));
    }
  }

  isPublicRoute() {
    const path = this.currentPath().split('?')[0];
    return path === '/landing' || path === '/login' || path.startsWith('/login/');
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/landing');
  }
}
