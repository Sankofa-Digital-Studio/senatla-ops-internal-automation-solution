import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
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
  readonly workspaceLink = computed(() => {
    const role = this.auth.role();
    if (role === 'readonly') return { label: 'Read-only workspace', path: '/read-only' };
    if (role === 'site') return { label: 'Site workspace', path: '/site-manager' };
    if (role === 'director') return { label: 'Director workspace', path: '/director' };
    return { label: 'Operations workspace', path: '/office-admin' };
  });

  isPublicRoute() {
    const path = this.router.url.split('?')[0];
    return path === '/landing' || path === '/login' || path.startsWith('/login/') || path === '/register';
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/landing');
  }
}