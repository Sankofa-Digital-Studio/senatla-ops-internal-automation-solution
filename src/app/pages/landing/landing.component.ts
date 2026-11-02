import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { AccessibleDialogDirective } from '../../core/accessibility/accessible-dialog.directive';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, AccessibleDialogDirective],
})
export class LandingComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly runtimeConfig = inject(RUNTIME_CONFIG);
  readonly landingReady = signal(false);
  readonly testCredentialsVisible = signal(false);
  readonly isLocalMode = computed(() => this.runtimeConfig.api.mode === 'local');
  readonly showBackToTop = signal(false);
  readonly testCredentials = [
    { role: 'Site Manager', email: 'thosontula+site@gmail.com', passwordHint: 'Shared UAT password' },
    { role: 'Office Admin', email: 'thosontula+office@gmail.com', passwordHint: 'Shared UAT password' },
    { role: 'Director', email: 'thosontula+director@gmail.com', passwordHint: 'Shared UAT password' },
  ];

  async ngOnInit() {
    await this.auth.ensureReady();
    this.landingReady.set(true);
    if (typeof window !== 'undefined' && window.location.hash) {
      const id = window.location.hash.replace('#', '');
      requestAnimationFrame(() => this.scrollTo(id));
    }
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

  @HostListener('window:scroll')
  onWindowScroll() {
    if (typeof window !== 'undefined') {
      this.showBackToTop.set(window.scrollY > 350);
    }
  }

  showTestCredentials() {
    this.testCredentialsVisible.set(true);
  }

  hideTestCredentials() {
    this.testCredentialsVisible.set(false);
  }
}
