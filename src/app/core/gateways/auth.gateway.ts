import { InjectionToken } from '@angular/core';
import { AuthSession } from '../models/app.models';

export interface PasswordResetRequestResult {
  message: string;
  resetLink?: string | null;
}

export interface AuthGateway {
  loadSession(): Promise<AuthSession | null>;
  login(username: string, password: string): Promise<AuthSession | null>;
  requestPasswordReset(email: string, redirectTo?: string): Promise<PasswordResetRequestResult>;
  updatePassword(nextPassword: string, usernameHint?: string): Promise<void>;
  logout(): Promise<void>;
  subscribeToSession?(listener: (session: AuthSession | null) => void): () => void;
}

export const AUTH_GATEWAY = new InjectionToken<AuthGateway>('AUTH_GATEWAY');
