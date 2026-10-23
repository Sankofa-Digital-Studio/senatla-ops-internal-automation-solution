import { TestBed } from '@angular/core/testing';
import { AUTH_GATEWAY } from '../gateways/auth.gateway';
import { AccessibleSite, READINESS_GATEWAY, ReadinessGateway, SiteReadinessRow } from '../gateways/readiness.gateway';
import { AuthSession } from '../models/app.models';
import { SiteReadinessService } from './site-readiness.service';

const SITE_A = '62000000-0000-4000-8000-000000000001';
const SITE_B = '62000000-0000-4000-8000-000000000002';

class AuthGatewayStub {
  async loadSession(): Promise<AuthSession> {
    return {
      userId: '61000000-0000-4000-8000-000000000001', username: 'site@example.test', role: 'site',
      displayName: 'Site Manager', organizationId: '00000000-0000-4000-8000-000000000001',
      permittedSiteIds: [SITE_A], issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
  }
  async login() { return null; }
  async register() { return { success: false, confirmationRequired: false, adminGranted: false }; }
  async redeemAdminCode() { return false; }
  async logout() {}
}

class ReadinessGatewayStub implements ReadinessGateway {
  sites: AccessibleSite[] = [
    { id: SITE_A, name: 'Saaiplaas 3', location: 'Free State' },
    { id: SITE_B, name: 'Restricted Site', location: 'Free State' },
  ];
  rows: SiteReadinessRow[] = [row('site', SITE_A, 'Saaiplaas 3', 'ready')];
  evaluateCalls: string[] = [];

  async loadAccessibleSites(permittedSiteIds: string[]) {
    return this.sites.filter((site) => !permittedSiteIds.length || permittedSiteIds.includes(site.id));
  }
  async evaluateSite(siteId: string) {
    this.evaluateCalls.push(siteId);
    return this.rows;
  }
  async confirmSite(_siteId: string) { return 'ready' as const; }
}

describe('SiteReadinessService', () => {
  let service: SiteReadinessService;
  let gateway: ReadinessGatewayStub;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      SiteReadinessService,
      { provide: AUTH_GATEWAY, useClass: AuthGatewayStub },
      { provide: READINESS_GATEWAY, useClass: ReadinessGatewayStub },
    ] });
    service = TestBed.inject(SiteReadinessService);
    gateway = TestBed.inject(READINESS_GATEWAY) as unknown as ReadinessGatewayStub;
  });

  it('uses the sole authenticated site UUID and never a display name', async () => {
    await service.initialize();
    expect(service.selectedSiteId()).toBe(SITE_A);
    expect(gateway.evaluateCalls).toEqual([SITE_A]);
    expect(service.state()).toBe('ready');
  });

  it('fails closed when a caller tries to select a site outside the loaded access set', async () => {
    await service.initialize();
    await service.selectSite(SITE_B);
    expect(service.state()).toBe('unavailable');
    expect(service.canProceed()).toBeFalse();
    expect(gateway.evaluateCalls).toEqual([SITE_A]);
  });

  it('applies blocked then unknown then warning precedence', async () => {
    gateway.rows = [row('site', SITE_A, 'Saaiplaas 3', 'warning'), row('asset', SITE_B, 'Excavator', 'unknown')];
    await service.initialize();
    expect(service.state()).toBe('unknown');
    expect(service.canProceed()).toBeFalse();

    gateway.rows = [...gateway.rows, row('employee', '63000000-0000-4000-8000-000000000001', 'Worker A', 'blocked')];
    await service.refresh();
    expect(service.state()).toBe('blocked');
  });
});

function row(entityType: SiteReadinessRow['entityType'], entityId: string, entityLabel: string, outcome: SiteReadinessRow['outcome']): SiteReadinessRow {
  return { entityType, entityId, entityLabel, outcome, reasonCodes: [], correctiveActions: [], policyVersion: 'senatla-readiness-v1.0.0', evaluatedAt: new Date().toISOString() };
}
