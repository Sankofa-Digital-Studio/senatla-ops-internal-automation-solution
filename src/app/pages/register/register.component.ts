import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  readonly auth = inject(AuthService);

  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  adminCode = '';
  showPassword = false;
  showAdminCode = false;
  isSubmitting = false;
  message = '';
  isSuccess = false;

  async handleRegistration() {
    if (this.isSubmitting) return;
    this.message = '';
    this.isSuccess = false;

    if (!this.displayName.trim() || !this.email.includes('@')) {
      this.message = 'Enter your name and a valid work email.';
      return;
    }
    if (this.password.length < 12) {
      this.message = 'Use a password with at least 12 characters.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.message = 'Passwords do not match.';
      return;
    }
    if (this.showAdminCode && this.adminCode.trim().length < 12) {
      this.message = 'Enter the complete invitation code.';
      return;
    }
    const cleanEmail = this.email.trim().toLowerCase();
    if (
      !cleanEmail.endsWith('@senatlatrading.com') &&
      !cleanEmail.endsWith('@test.invalid') &&
      !cleanEmail.endsWith('@example.com')
    ) {
      this.message = 'Registration is restricted to @senatlatrading.com employee accounts.';
      return;
    }

    this.isSubmitting = true;
    try {
      const result = await this.auth.register({
        displayName: this.displayName,
        email: this.email,
        password: this.password,
        adminCode: this.showAdminCode ? this.adminCode : undefined,
      });
      this.isSuccess = result.success;
      this.message = result.success
        ? result.adminGranted
          ? 'Account created and the verified administrator invitation was applied.'
          : result.message || 'Account created with minimum access. You can sign in now.'
        : result.message || 'Registration could not be completed.';
      if (result.success) {
        this.password = '';
        this.confirmPassword = '';
        this.adminCode = '';
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  async handleAdminRedemption() {
    if (this.isSubmitting) return;
    if (this.adminCode.trim().length < 12) {
      this.isSuccess = false;
      this.message = 'Enter the complete invitation code.';
      return;
    }
    this.isSubmitting = true;
    try {
      this.isSuccess = await this.auth.redeemAdminCode(this.adminCode);
      this.message = this.isSuccess
        ? 'The verified administrator invitation was applied. Sign out and back in to refresh access.'
        : 'The invitation code is invalid, expired, or already used.';
      if (this.isSuccess) this.adminCode = '';
    } finally {
      this.isSubmitting = false;
    }
  }
}