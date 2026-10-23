import { Provider } from '@angular/core';
import { APP_STATE_GATEWAY } from './app-state.gateway';
import { AUTH_GATEWAY } from './auth.gateway';
import { LocalAppStateGateway } from './local-app-state.gateway';
import { LocalReviewAuthGateway } from './local-review-auth.gateway';
import { RuntimeConfig } from '../config/runtime-config';
import { SupabaseAppStateGateway } from './supabase-app-state.gateway';
import { SupabaseAuthGateway } from './supabase-auth.gateway';
import { READINESS_GATEWAY } from './readiness.gateway';
import { SupabaseReadinessGateway } from './supabase-readiness.gateway';
import { LocalReadinessGateway } from './local-readiness.gateway';

export function provideBackendGateways(config: RuntimeConfig): Provider[] {
  const isSupabaseConfigured =
    config.api.mode === 'supabase' &&
    !!config.api.supabaseUrl &&
    !config.api.supabaseUrl.includes('your-project.supabase.co') &&
    !!config.api.supabaseAnonKey &&
    !config.api.supabaseAnonKey.includes('your-anon-key');

  const appStateGateway = isSupabaseConfigured
    ? SupabaseAppStateGateway
    : LocalAppStateGateway;
  const authGateway = isSupabaseConfigured
    ? SupabaseAuthGateway
    : LocalReviewAuthGateway;
  const readinessGateway = isSupabaseConfigured
    ? SupabaseReadinessGateway
    : LocalReadinessGateway;

  return [
    { provide: APP_STATE_GATEWAY, useClass: appStateGateway },
    { provide: AUTH_GATEWAY, useClass: authGateway },
    { provide: READINESS_GATEWAY, useClass: readinessGateway },
    { provide: LocalReadinessGateway, useClass: LocalReadinessGateway },
  ];
}
