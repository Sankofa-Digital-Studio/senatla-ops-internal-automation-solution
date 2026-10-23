import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AppRole } from '../../core/models/app.models';
import { AuthService } from '../../core/services/auth.service';
import { RUNTIME_CONFIG } from '../../core/config/runtime-config';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class LandingComponent implements OnInit {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly runtimeConfig = inject(RUNTIME_CONFIG);
  readonly landingReady = signal(false);
  readonly testCredentialsVisible = signal(false);
  readonly isLocalMode = computed(() => this.runtimeConfig.api.mode === 'local');
  readonly testCredentials = [
    { role: 'Site Manager', roleKey: 'site' as AppRole, email: 'site.manager@senatlatrading.com', passwordHint: 'Shared UAT password', path: '/site-manager' },
    { role: 'Office Admin', roleKey: 'office' as AppRole, email: 'office.admin@senatlatrading.com', passwordHint: 'Shared UAT password', path: '/office-admin' },
    { role: 'Director', roleKey: 'director' as AppRole, email: 'director.exec@senatlatrading.com', passwordHint: 'Shared UAT password', path: '/director' },
  ];

  async quickLaunchRole(role: AppRole) {
    this.hideTestCredentials();
    await this.auth.loginAsDemoRole(role);
    const path = role === 'site' ? '/site-manager' : role === 'office' ? '/office-admin' : '/director';
    await this.router.navigateByUrl(path);
  }

  async ngOnInit() {
    const startedAt = Date.now();
    await this.auth.ensureReady();
    const remaining = Math.max(0, 900 - (Date.now() - startedAt));
    setTimeout(() => {
      this.landingReady.set(true);
      if (typeof window !== 'undefined' && window.location.hash) {
        const id = window.location.hash.replace('#', '');
        setTimeout(() => this.scrollTo(id), 50);
      }
    }, remaining);
  }

  scrollTo(elementId: string, event?: Event) {
    if (event) {
      event.preventDefault();
    }
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.focus({ preventScroll: true });
    }
  }

  scrollToTop(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  showTestCredentials() {
    this.testCredentialsVisible.set(true);
  }

  hideTestCredentials() {
    this.testCredentialsVisible.set(false);
  }
}
