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
    });
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('director-report-dialog-title');
    expect(dialog.textContent).toContain('Pending');
  });
});
