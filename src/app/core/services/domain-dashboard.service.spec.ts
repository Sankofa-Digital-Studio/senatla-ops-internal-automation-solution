import { TestBed } from '@angular/core/testing';
import { DomainDashboardService } from './domain-dashboard.service';

describe('DomainDashboardService', () => {
  let service: DomainDashboardService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [DomainDashboardService],
    });
    service = TestBed.inject(DomainDashboardService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created and default to overall_macro domain', () => {
    expect(service).toBeTruthy();
    expect(service.activeDomain()).toBe('overall_macro');
  });

  it('should list all 4 operational domains with correct metadata', () => {
    const domains = service.domains();
    expect(domains.length).toBe(4);
    const ids = domains.map((d) => d.id);
    expect(ids).toContain('overall_macro');
    expect(ids).toContain('engineering');
    expect(ids).toContain('demolition_rehabilitation');
    expect(ids).toContain('underground_works');

    const ug = domains.find((d) => d.id === 'underground_works');
    expect(ug?.status).toBe('deferred');
  });

  it('should switch active domains accurately', () => {
    service.selectDomain('engineering');
    expect(service.activeDomain()).toBe('engineering');

    service.selectDomain('demolition_rehabilitation');
    expect(service.activeDomain()).toBe('demolition_rehabilitation');
  });

  describe('Engineering 70:30 Profit Engine', () => {
    it('should compute gross recognized revenue, audited expenses, and net profit', () => {
      const summary = service.engineeringProfitSummary();
      const expectedTotalCost =
        summary.materialsExpense + summary.labourExpense + summary.absorbedOverheadsExpense;
      expect(summary.totalCostIncurred).toBe(expectedTotalCost);
      expect(summary.netOperatingProfit).toBe(summary.totalBilledRevenue - expectedTotalCost);
    });

    it('should accurately calculate the 70:30 split between Senatla and Shareholders', () => {
      const summary = service.engineeringProfitSummary();
      const expected70 = Math.round(summary.netOperatingProfit * 0.7);
      const expected30 = Math.round(summary.netOperatingProfit * 0.3);

      expect(summary.senatlaShare70).toBe(expected70);
      expect(summary.shareholderReturn30).toBe(expected30);
      // The sum should be within rounding error of net profit
      expect(Math.abs(summary.senatlaShare70 + summary.shareholderReturn30 - summary.netOperatingProfit)).toBeLessThanOrEqual(1);
    });

    it('should enforce anti-inflation expense lock while unassigned draws exist', () => {
      expect(service.unassignedDrawsCount()).toBeGreaterThan(0);
      expect(service.expenseLockStatus()).toBe('locked');

      // Attempting to unlock while unassigned draws exist should be prevented
      service.toggleExpenseLock();
      expect(service.expenseLockStatus()).toBe('locked');
      expect(service.engineeringProfitSummary().isDividendDistributionPermitted).toBeFalse();
    });

    it('should permit dividend distribution only once unassigned draws are reconciled and unlocked', () => {
      service.reconcileUnassignedDraws();
      expect(service.unassignedDrawsCount()).toBe(0);
      expect(service.unbilledVendorOrdersCount()).toBe(0);
      expect(service.expenseLockStatus()).toBe('unlocked');
      expect(service.engineeringProfitSummary().isDividendDistributionPermitted).toBeTrue();
    });
  });

  describe('Demolition & Rehabilitation Rollup', () => {
    it('should calculate demolition summary metrics across contracts', () => {
      const summary = service.demolitionSummary();
      expect(summary.activeContracts.length).toBe(3);
      expect(summary.totalContractsValue).toBeGreaterThan(0);
      expect(summary.totalBilledRevenue).toBeGreaterThan(0);
      expect(summary.totalSalvageCredit).toBeGreaterThan(0);
      expect(summary.blendedBoqMarginPercent).toBeGreaterThan(0);
      expect(summary.environmentalClearanceRate).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Macro Executive Rollup', () => {
    it('should consolidate revenue, expenses, and net profit across domains', () => {
      const rollup = service.macroFinancialRollup();
      const eng = service.engineeringProfitSummary();
      const demo = service.demolitionSummary();

      expect(rollup.consolidatedRevenue).toBe(eng.totalBilledRevenue + demo.totalBilledRevenue);
      expect(rollup.domainContributions.length).toBe(3);
      expect(rollup.consolidatedMarginPercent).toBeGreaterThan(0);
    });

    it('should compute working capital and free cash flow', () => {
      const wc = service.workingCapital();
      expect(wc.projectedInflow).toBeGreaterThan(0);
      expect(wc.auditedOutflow).toBeGreaterThan(0);
      expect(wc.workingCapitalRatio).toBeGreaterThan(0);
    });
  });
});
