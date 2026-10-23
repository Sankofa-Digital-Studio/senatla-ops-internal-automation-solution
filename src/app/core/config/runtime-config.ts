import { InjectionToken, Provider } from '@angular/core';

export type ApiMode = 'local' | 'supabase';

export interface RuntimeConfig {
  api: {
    mode: ApiMode;
    baseUrl: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  api: {
    mode: 'local',
    baseUrl: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
  },
};

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG');

export function provideRuntimeConfig(config: RuntimeConfig): Provider {
  return { provide: RUNTIME_CONFIG, useValue: config };
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch('/assets/runtime-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Runtime configuration request failed with ${response.status}.`);

    const parsed = (await response.json()) as Partial<RuntimeConfig>;
    const config = { api: { ...DEFAULT_RUNTIME_CONFIG.api, ...parsed.api } };
    if (
      config.api.supabaseUrl.includes('your-project.supabase.co') ||
      config.api.supabaseAnonKey === 'your-anon-key'
    ) {
      config.api.mode = 'local';
      config.api.supabaseUrl = '';
      config.api.supabaseAnonKey = '';
    }
    if (config.api.mode === 'supabase' && (!config.api.supabaseUrl || !config.api.supabaseAnonKey)) {
      throw new Error('Supabase runtime configuration is incomplete.');
    }
    return config;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown configuration error.';
    throw new Error(`Senatla Ops cannot start without live backend configuration. ${detail}`);
  }
}
