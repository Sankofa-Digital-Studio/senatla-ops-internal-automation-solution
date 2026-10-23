import { InjectionToken } from '@angular/core';

export type ReadinessOutcome = 'ready' | 'warning' | 'blocked' | 'unknown';

export interface AccessibleSite {
  id: string;
  name: string;
  location: string;
  jobNumber?: string;
  teamName?: string;
}

export interface SiteReadinessRow {
  entityType: 'site' | 'employee' | 'asset';
  entityId: string;
  entityLabel: string;
  outcome: ReadinessOutcome;
  reasonCodes: string[];
  correctiveActions: string[];
  policyVersion: string;
  evaluatedAt: string;
}

export interface ReadinessGateway {
  loadAccessibleSites(permittedSiteIds: string[]): Promise<AccessibleSite[]>;
  evaluateSite(siteId: string): Promise<SiteReadinessRow[]>;
  confirmSite(siteId: string): Promise<ReadinessOutcome>;
}

export const READINESS_GATEWAY = new InjectionToken<ReadinessGateway>('READINESS_GATEWAY');
