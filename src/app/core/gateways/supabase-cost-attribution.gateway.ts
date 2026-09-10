import { Injectable } from '@angular/core';
import { CostAttributionRequest } from '../cost-attribution/cost-attribution.models';
import type { CostAttributionGateway } from './cost-attribution.gateway';
import { injectSupabaseClient } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabaseCostAttributionGateway implements CostAttributionGateway {
  private readonly supabase = injectSupabaseClient();

  async reconcile(request: Required<CostAttributionRequest>): Promise<unknown> {
    const { data, error } = await this.supabase.rpc('reconcile_site_job_costs', {
      p_period_start: request.periodStart,
      p_period_end_exclusive: request.periodEndExclusive,
      p_site_id: request.siteId,
    });

    if (error) throw new Error('Cost attribution could not be loaded from the authoritative database contract.');
    return data;
  }
}
