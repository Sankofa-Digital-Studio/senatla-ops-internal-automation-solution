import { InjectionToken } from '@angular/core';
import { AppRole, AuthSession } from '../models/app.models';

export interface RegistrationRequest {
  email: string;
  password: string;
  displayName: string;
  adminCode?: string;
}

export interface RegistrationResult {
  success: boolean;
  confirmationRequired: boolean;
  adminGranted: boolean;
  message?: string;
}

export interface PasswordResetRequestResult {
  message: string;
  resetLink?: string | null;
}

export interface GoogleAuthResult {
  session: AuthSession | null;
  needsRoleSelection: boolean;
  pendingProfile?: {
    userId: string;
    email: string;
    displayName: string;
    photoUrl?: string;
  };
}

export interface AuthGateway {
  loadSession(): Promise<AuthSession | null>;
  login(username: string, password: string): Promise<AuthSession | null>;
  loginWithGoogle?(googleUser?: { email: string; displayName?: string }): Promise<GoogleAuthResult>;
  loginAsDemoRole?(role: AppRole): Promise<AuthSession>;
  assignRole?(role: AppRole, pendingProfile?: { userId: string; email: string; displayName: string }): Promise<AuthSession>;
  register(request: RegistrationRequest): Promise<RegistrationResult>;
  redeemAdminCode(code: string): Promise<boolean>;
  requestPasswordReset(email: string, redirectTo?: string): Promise<PasswordResetRequestResult>;
  updatePassword(nextPassword: string, usernameHint?: string): Promise<void>;
  logout(): Promise<void>;
  subscribeToSession?(listener: (session: AuthSession | null) => void): () => void;
}

export const AUTH_GATEWAY = new InjectionToken<AuthGateway>('AUTH_GATEWAY');
