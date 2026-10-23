import { Injectable } from '@angular/core';
import { AccessibleSite, ReadinessGateway, ReadinessOutcome, SiteReadinessRow } from './readiness.gateway';

@Injectable()
export class UnavailableReadinessGateway implements ReadinessGateway {
  async loadAccessibleSites(_permittedSiteIds: string[]): Promise<AccessibleSite[]> {
    throw new Error('Live site readiness is unavailable until the Supabase backend is configured.');
  }

  async evaluateSite(_siteId: string): Promise<SiteReadinessRow[]> {
    throw new Error('Live site readiness is unavailable until the Supabase backend is configured.');
  }

  async confirmSite(_siteId: string): Promise<ReadinessOutcome> {
    throw new Error('Live site readiness is unavailable until the Supabase backend is configured.');
  }
}
