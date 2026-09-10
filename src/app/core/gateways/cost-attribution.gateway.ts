import { inject, InjectionToken } from '@angular/core';
import { CostAttributionRequest } from '../cost-attribution/cost-attribution.models';
import { SupabaseCostAttributionGateway } from './supabase-cost-attribution.gateway';

export interface CostAttributionGateway {
  reconcile(request: Required<CostAttributionRequest>): Promise<unknown>;
}

export const COST_ATTRIBUTION_GATEWAY = new InjectionToken<CostAttributionGateway>('COST_ATTRIBUTION_GATEWAY', {
  providedIn: 'root',
  factory: () => inject(SupabaseCostAttributionGateway),
});
