import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, computed, inject, signal, HostListener } from '@angular/core';
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

  @ViewChild('testCredentialsModal') modalRef?: ElementRef<HTMLDivElement>;
  @ViewChild('testCredentialsCloseBtn') closeBtnRef?: ElementRef<HTMLButtonElement>;

  private triggerElement: HTMLElement | null = null;

  async ngOnInit() {
    const startedAt = Date.now();
    await this.auth.ensureReady();
    const remaining = Math.max(0, 900 - (Date.now() - startedAt));
    setTimeout(() => this.landingReady.set(true), remaining);
  }

  showTestCredentials(event: Event) {
    this.triggerElement = event.target as HTMLElement;
    this.testCredentialsVisible.set(true);
    setTimeout(() => this.moveFocusToModal(), 0);
  }

  hideTestCredentials() {
    this.testCredentialsVisible.set(false);
    this.restoreFocus();
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (this.testCredentialsVisible()) {
      event.preventDefault();
      this.hideTestCredentials();
    }
  }

  private moveFocusToModal() {
    const closeBtn = this.closeBtnRef?.nativeElement;
    if (closeBtn) {
      closeBtn.focus();
    } else if (this.modalRef?.nativeElement) {
      this.modalRef.nativeElement.focus();
    }
  }

  private restoreFocus() {
    if (this.triggerElement) {
      this.triggerElement.focus();
      this.triggerElement = null;
    }
  }
}
