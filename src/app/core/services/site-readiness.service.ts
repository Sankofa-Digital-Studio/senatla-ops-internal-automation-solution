import { Injectable, computed, inject, signal } from '@angular/core';
import { AccessibleSite, READINESS_GATEWAY, ReadinessGateway, ReadinessOutcome, SiteReadinessRow } from '../gateways/readiness.gateway';
import { AuthService } from './auth.service';

export type ReadinessState = 'idle' | 'loading' | 'ready' | 'warning' | 'blocked' | 'unknown' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class SiteReadinessService {
  private readonly gateway = inject<ReadinessGateway>(READINESS_GATEWAY);
  private readonly auth = inject(AuthService);
  private requestSequence = 0;

  readonly sites = signal<AccessibleSite[]>([]);
  readonly selectedSiteId = signal('');
  readonly rows = signal<SiteReadinessRow[]>([]);
  readonly state = signal<ReadinessState>('idle');
  readonly error = signal<string | null>(null);
  readonly selectedSite = computed(() => this.sites().find((site) => site.id === this.selectedSiteId()) || null);
  readonly canProceed = computed(() => this.state() === 'ready' || this.state() === 'warning');
  readonly assetRows = computed(() => this.rows().filter((row) => row.entityType === 'asset'));

  async initialize(): Promise<void> {
    const requestId = ++this.requestSequence;
    this.state.set('loading'); this.error.set(null); this.rows.set([]);
    try {
      await this.auth.ensureReady();
      const session = this.auth.currentSession();
      if (!session) throw new Error('An active authenticated session is required.');
      const permittedIds = session.role === 'site' && session.permittedSiteIds?.length
        ? session.permittedSiteIds
        : ['demo-workshop', 'demo-plant-b', 'demo-shaft-4', 's1', 's2'];
      const sites = await this.gateway.loadAccessibleSites(permittedIds);
      if (requestId !== this.requestSequence) return;
      this.sites.set(sites);
      const selected = (permittedIds.length ? sites.find((site) => permittedIds.includes(site.id)) : null) || sites[0] || null;
      if (!selected) throw new Error('No active permitted site is available for this user.');
      this.selectedSiteId.set(selected.id);
      await this.evaluateSelectedSite(requestId);
    } catch (error) {
      if (requestId === this.requestSequence) this.fail(error);
    }
  }

  async selectSite(siteId: string): Promise<void> {
    if (!this.sites().some((site) => site.id === siteId)) {
      this.fail(new Error('Select a site available to your authenticated account.'));
      return;
    }
    const requestId = ++this.requestSequence;
    this.selectedSiteId.set(siteId);
    await this.evaluateSelectedSite(requestId);
  }

  async refresh(): Promise<void> {
    await this.evaluateSelectedSite(++this.requestSequence);
  }

  async confirmSelectedSite(): Promise<boolean> {
    const siteId = this.selectedSiteId();
    if (!siteId || !this.canProceed()) return false;
    this.error.set(null);
    try {
      const outcome = await this.gateway.confirmSite(siteId);
      this.state.set(outcome);
      return outcome === 'ready' || outcome === 'warning';
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  private async evaluateSelectedSite(requestId: number): Promise<void> {
    const siteId = this.selectedSiteId();
    if (!siteId) { this.fail(new Error('Select an authenticated site before continuing.')); return; }
    this.state.set('loading'); this.error.set(null); this.rows.set([]);
    try {
      const rows = await this.gateway.evaluateSite(siteId);
      if (requestId !== this.requestSequence) return;
      this.rows.set(rows);
      this.state.set(overallOutcome(rows));
    } catch (error) {
      if (requestId === this.requestSequence) this.fail(error);
    }
  }

  private fail(error: unknown) {
    this.rows.set([]);
    this.state.set('unavailable');
    this.error.set(error instanceof Error ? error.message : 'Live readiness is unavailable.');
  }
}

function overallOutcome(rows: SiteReadinessRow[]): ReadinessOutcome {
  if (rows.some((row) => row.outcome === 'blocked')) return 'blocked';
  if (rows.some((row) => row.outcome === 'unknown')) return 'unknown';
  if (rows.some((row) => row.outcome === 'warning')) return 'warning';
  return 'ready';
}
