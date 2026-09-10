import { TestBed } from '@angular/core/testing';
import { COST_ATTRIBUTION_POLICY_VERSION } from '../cost-attribution/cost-attribution.validation';
import { COST_ATTRIBUTION_GATEWAY, CostAttributionGateway } from '../gateways/cost-attribution.gateway';
import { CostAttributionService } from './cost-attribution.service';

class FakeCostAttributionGateway implements CostAttributionGateway {
  calls = 0;
  response: unknown = [];
  failure: Error | null = null;
  async reconcile(): Promise<unknown> { this.calls += 1; if (this.failure) throw this.failure; return this.response; }
}

describe('CostAttributionService', () => {
  let gateway: FakeCostAttributionGateway;
  let service: CostAttributionService;

  beforeEach(() => {
    gateway = new FakeCostAttributionGateway();
    TestBed.configureTestingModule({ providers: [CostAttributionService, { provide: COST_ATTRIBUTION_GATEWAY, useValue: gateway }] });
    service = TestBed.inject(CostAttributionService);
  });

  it('loads validated authoritative rows without a local fallback', async () => {
    gateway.response = [{
      source_type: 'vendor_invoice', source_id: '11000000-0000-4000-8000-000000000001', cost_date: '2026-08-10',
      site_id: '12000000-0000-4000-8000-000000000001', job_number: 'JOB-001', currency_code: 'ZAR',
      source_amount: 500, recognized_amount: 500, recognition_status: 'recognized', source_status: 'approved',
      allocation_metadata: { mode: 'direct' }, quality_reasons: [], policy_version: COST_ATTRIBUTION_POLICY_VERSION,
      evaluated_at: '2026-08-23T12:00:00Z',
    }];
    const report = await service.loadCosts({ periodStart: '2026-08-01', periodEndExclusive: '2026-09-01' });
    expect(report.rows.length).toBe(1);
    expect(report.totalsByCurrency[0].recognizedAmount).toBe(500);
    expect(service.report()).toBe(report);
    expect(service.error()).toBeNull();
  });

  it('fails before the gateway for an invalid request', async () => {
    await expectAsync(service.loadCosts({ periodStart: '2026-09-01', periodEndExclusive: '2026-09-01' })).toBeRejected();
    expect(gateway.calls).toBe(0);
  });

  it('clears stale reports and exposes an error when the authoritative gateway fails', async () => {
    await service.loadCosts({ periodStart: '2026-08-01', periodEndExclusive: '2026-09-01' });
    gateway.failure = new Error('Authoritative database unavailable.');
    await expectAsync(service.loadCosts({ periodStart: '2026-08-01', periodEndExclusive: '2026-09-01' })).toBeRejected();
    expect(service.report()).toBeNull();
    expect(service.error()).toBe('Authoritative database unavailable.');
    expect(service.isLoading()).toBeFalse();
  });
});
