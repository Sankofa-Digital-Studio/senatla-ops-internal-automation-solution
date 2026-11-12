import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { resetTestStorage, TEST_APP_PROVIDERS } from '../../test-providers';
import { DirectorComponent } from './director.component';

describe('DirectorComponent', () => {
  let component: DirectorComponent;
  let fixture: ComponentFixture<DirectorComponent>;

  beforeEach(waitForAsync(() => {
    resetTestStorage();
    TestBed.configureTestingModule({
      imports: [DirectorComponent],
      providers: TEST_APP_PROVIDERS,
    }).compileComponents();

    fixture = TestBed.createComponent(DirectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('presents source-backed executive operational sections with a data-as-of state', () => {
    const text = fixture.nativeElement.textContent.toLowerCase();
    expect(text).toContain('data as of');
    expect(text).toContain('asset readiness');
    expect(text).toContain('pending approvals');
    expect(text).toContain('recognized operating cost');
    expect(text).toContain('invoice traceability');
  });
  it('does not expose payroll or wage-derived Director metrics in UAT v1', () => {
    const text = fixture.nativeElement.textContent.toLowerCase();
    for (const forbidden of ['payroll', 'salary', 'basic rate', 'tax', 'actual daily cost', 'actual month cost', 'actual ytd cost', 'cost contribution']) {
      expect(text).not.toContain(forbidden);
    }
    expect(text).toContain('present today');
    expect(text).toContain('absent today');
  });

  it('does not present unsupported executive performance claims as facts', () => {
    const text = fixture.nativeElement.textContent.toLowerCase();
    for (const forbidden of ['100% margin certainty', 'margin target', 'zero-harm record', 'fleet scaling', 'time saved', 'margin integrity', 'executive advantage']) {
      expect(text).not.toContain(forbidden);
    }
    expect(text).toContain('source-backed operations');
    expect(text).toContain('only values recognized by the costing service are included');
  });

  it('places the decision queue before period controls and actual indicators', () => {
    const text = fixture.nativeElement.textContent.toLowerCase();
    expect(text.indexOf('director review queue')).toBeLessThan(text.indexOf('period and actuals'));
    expect(text.indexOf('period and actuals')).toBeLessThan(text.indexOf('recognized operating costs'));
  });

  it('uses document scrolling and exposes an accessible review dialog', () => {
    expect(fixture.nativeElement.firstElementChild.classList).not.toContain('overflow-y-auto');
    component.activeReportModal.set({
      reportNumber: 'OP-PACK-TEST', generatedAt: '2026-11-04T00:00:00Z', generatedByName: 'Office Admin', id: 'report-1',
      records: {
        site: { name: 'Test site', location: 'Test', jobNumber: 'JOB-1', isActive: true },
        employee: { firstName: 'Test', surname: 'User', role: 'Operator', isActive: true },
        asset: { make: 'Test', model: 'Asset', registrationNumber: 'REG-1', type: 'Plant', vin: 'VIN-1', licenseExpiry: '2027-01-01' },
        timesheet: { date: '2026-11-04', status: 'present', hoursWorked: 8, overtimeHours: 0, supervisorSigned: false },
        invoice: { internalOrderNumber: 'INT-1', total: 100, itemsPurchased: 'Fuel', orderNumber: 'PO-1', invoiceNumber: 'INV-1', responsiblePerson: 'Requester' },
      },
    } as any);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('director-report-dialog-title');
    expect(dialog.textContent).toContain('Pending');
  });

  it('associates decision counts with the review queue and exposes navigation actions', () => {
    expect(component.decisionSummary().total).toBe(component.decisionQueueItems().length);
    expect(component.decisionSummary().reports).toBe(component.pendingExecutiveReports().length);
    expect(component.decisionSummary().approvals).toBe(component.pendingApprovals().length);
    expect(component.decisionSummary().invoices).toBe(component.pendingInvoices().length);
    component.setTab('approvals');
    expect(component.activeTab()).toBe('approvals');
    component.setTab('workforce');
    expect(component.activeTab()).toBe('workforce');
    expect(fixture.nativeElement.textContent).toContain('Open review queue');
    expect(fixture.nativeElement.textContent).toContain('Inspect workforce & risks');
  });

  it('reports freshness from source timestamps rather than the injected clock', () => {
    component.service.currentTime.set(new Date('2026-11-10T12:00:00.000Z'));
    component.office.activity.set([{ occurredAt: '2026-11-10T08:00:00.000Z' } as any]);
    component.office.vendorInvoices.set([{ updatedAt: '2026-11-10T08:00:00.000Z' } as any]);

    expect(component.dataAsOf()?.toISOString()).toBe('2026-11-10T08:00:00.000Z');
    expect(component.dataFreshness()).toBe('4 hr old');
  });

  it('keeps the visual decision hierarchy and mobile navigation hooks discoverable', () => {
    const header = fixture.nativeElement.querySelector('header[data-tour="director-overview"]');
    expect(header.classList.contains('sticky')).toBeTrue();
    expect(header.classList.contains('top-0')).toBeTrue();

    const queue = fixture.nativeElement.querySelector('[data-tour="director-review-queue"]');
    expect(queue.textContent.toLowerCase()).toContain('normalized review items');

    const mobileToggle = fixture.nativeElement.querySelector('button[aria-expanded]');
    expect(mobileToggle).not.toBeNull();
    expect(mobileToggle.textContent).toContain('Quick links');

    const tabButtons = fixture.nativeElement.querySelectorAll('nav[aria-label="Director View Modes"] button[aria-selected]');
    expect(tabButtons.length).toBe(5);
    for (const button of Array.from(tabButtons) as HTMLButtonElement[]) {
      expect(button.classList.contains('min-h-11')).toBeTrue();
    }
  });
});
