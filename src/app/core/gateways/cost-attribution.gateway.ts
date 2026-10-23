import { inject, InjectionToken } from '@angular/core';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { CostAttributionRequest } from '../cost-attribution/cost-attribution.models';
import { SupabaseCostAttributionGateway } from './supabase-cost-attribution.gateway';

export interface CostAttributionGateway {
  reconcile(request: Required<CostAttributionRequest>): Promise<unknown>;
}

export const COST_ATTRIBUTION_GATEWAY = new InjectionToken<CostAttributionGateway>('COST_ATTRIBUTION_GATEWAY', {
  providedIn: 'root',
  factory: () => {
    const config = inject(RUNTIME_CONFIG, { optional: true });
    if (!config || config.api.mode === 'local' || !config.api.supabaseUrl) {
      return {
        reconcile: async () => [],
      };
    }
    return inject(SupabaseCostAttributionGateway);
  },
});
