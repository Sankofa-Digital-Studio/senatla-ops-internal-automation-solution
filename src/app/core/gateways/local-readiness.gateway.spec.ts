import { TestBed } from '@angular/core/testing';
import { LocalReadinessGateway } from './local-readiness.gateway';

describe('LocalReadinessGateway', () => {
  let gateway: LocalReadinessGateway;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalReadinessGateway],
    });
    gateway = TestBed.inject(LocalReadinessGateway);
    sessionStorage.clear();
  });

  it('loads seeded demo sites when permittedSiteIds is empty or wildcarded', async () => {
    const sites = await gateway.loadAccessibleSites([]);
    expect(sites.length).toBeGreaterThanOrEqual(3);
    expect(sites.some((s) => s.id === 'demo-workshop')).toBeTrue();
    expect(sites.some((s) => s.name.includes('Shaft 1'))).toBeTrue();
  });

  it('loads permitted demo site when specific ID is requested', async () => {
    const sites = await gateway.loadAccessibleSites(['demo-workshop']);
    expect(sites.length).toBe(1);
    expect(sites[0].id).toBe('demo-workshop');
    expect(sites[0].location).toContain('Welkom');
  });

  it('evaluates seeded demo site with site, employee, and asset readiness rows', async () => {
    const rows = await gateway.evaluateSite('demo-workshop');
    expect(rows.length).toBeGreaterThanOrEqual(4);

    const siteRows = rows.filter((r) => r.entityType === 'site');
    const empRows = rows.filter((r) => r.entityType === 'employee');
    const assetRows = rows.filter((r) => r.entityType === 'asset');

    expect(siteRows.length).toBeGreaterThan(0);
    expect(empRows.length).toBeGreaterThan(0);
    expect(assetRows.length).toBeGreaterThan(0);
  });

  it('confirms seeded demo site with ready or warning status so operations can proceed', async () => {
    const outcome = await gateway.confirmSite('demo-workshop');
    expect(outcome === 'ready' || outcome === 'warning').toBeTrue();
  });
});
