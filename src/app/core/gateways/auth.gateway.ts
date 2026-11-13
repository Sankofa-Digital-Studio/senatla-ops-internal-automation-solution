import { InjectionToken } from '@angular/core';
import { AuthSession } from '../models/app.models';

export class AuthRequestError extends Error {
  constructor(message: string, readonly status?: number, readonly reference?: string) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

export interface PasswordResetRequestResult {
  message: string;
  resetLink?: string | null;
}

export interface AuthGateway {
  loadSession(): Promise<AuthSession | null>;
  login(username: string, password: string): Promise<AuthSession | null>;
  requestPasswordReset(email: string, redirectTo?: string): Promise<PasswordResetRequestResult>;
  updatePassword(nextPassword: string, usernameHint?: string): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
  logout(): Promise<void>;
  subscribeToSession?(listener: (session: AuthSession | null) => void): () => void;
}

export const AUTH_GATEWAY = new InjectionToken<AuthGateway>('AUTH_GATEWAY');
