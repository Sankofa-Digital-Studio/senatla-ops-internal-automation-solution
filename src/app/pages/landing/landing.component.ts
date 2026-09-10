import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
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
  readonly auth = inject(AuthService);
  readonly runtimeConfig = inject(RUNTIME_CONFIG);
  readonly landingReady = signal(false);
  readonly testCredentialsVisible = signal(false);
  readonly isLocalMode = computed(() => this.runtimeConfig.api.mode === 'local');
  readonly testCredentials = [
    { role: 'Site Manager', email: 'site.manager@test.invalid', passwordHint: 'Shared UAT password', path: '/site-manager' },
    { role: 'Office Admin', email: 'office.admin@test.invalid', passwordHint: 'Shared UAT password', path: '/office-admin' },
    { role: 'Director', email: 'director.exec@test.invalid', passwordHint: 'Shared UAT password', path: '/director' },
  ];

  async ngOnInit() {
    const startedAt = Date.now();
    await this.auth.ensureReady();
    const remaining = Math.max(0, 900 - (Date.now() - startedAt));
    setTimeout(() => this.landingReady.set(true), remaining);
  }

  showTestCredentials() {
    this.testCredentialsVisible.set(true);
  }

  hideTestCredentials() {
    this.testCredentialsVisible.set(false);
  }
}
