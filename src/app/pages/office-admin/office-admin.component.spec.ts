import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { SENATLA_TRADING_ORGANIZATION_ID } from '../../core/models/app.models';
import { AuthService } from '../../core/services/auth.service';
import { resetTestStorage, TEST_APP_PROVIDERS } from '../../test-providers';
import { OfficeAdminComponent } from './office-admin.component';

describe('OfficeAdminComponent', () => {
  let component: OfficeAdminComponent;
  let fixture: ComponentFixture<OfficeAdminComponent>;

  beforeEach(waitForAsync(() => {
    resetTestStorage();
    TestBed.configureTestingModule({
      imports: [OfficeAdminComponent],
      providers: TEST_APP_PROVIDERS,
    }).compileComponents();

    fixture = TestBed.createComponent(OfficeAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('forces new email invitations to minimum site access', async () => {
    await TestBed.inject(AuthService).login('office.admin@test.invalid', 'test-password');
    component.inviteForm = { email: 'new@example.com', displayName: 'New User', role: 'director' };
    await component.submitInvite();
    expect(component.service.users()[0].role).toBe('site');
  });

  it('builds a reviewable timesheet register for the selected date', () => {
    component.service.sites.set([{ id: 'site-1', name: 'Workshop', location: 'Yard', isActive: true }]);
    component.service.employees.set([{
      id: 'employee-1', firstName: 'Anele', surname: 'Zulu', idNumber: '9001015009087', role: 'Operator',
      siteId: 'site-1', startDate: '2026-01-01', basicRate: 500, salaryAdvances: 0, financials: {},
      adjustments: {}, logs: { '2026-06-27': { date: '2026-06-27', status: 'absent', reason: 'Sick' } },
    }]);
    component.timesheetDate.set('2026-06-27');

    expect(component.timesheetRows()[0].employeeName).toBe('Zulu, Anele');
    expect(component.timesheetSummary().absent).toBe(1);
    expect(component.timesheetSummary().completionPercent).toBe(100);
  });
  it('reviews assignment blockers and offers an eligible same-role alternative', () => {
    component.service.sites.set([
      { id: 'site-a', name: 'North', location: 'A', isActive: true },
      { id: 'site-b', name: 'South', location: 'B', isActive: true },
    ]);
    component.service.employees.set([
      { id: 'blocked', firstName: 'Mpho', surname: 'Zulu', idNumber: '9001015009087', role: 'Operator', siteId: 'site-a', startDate: '2026-01-01', basicRate: 500, salaryAdvances: 0, financials: {}, logs: {}, adjustments: {}, employmentStatus: 'active' },
      { id: 'alternative', firstName: 'Anele', surname: 'Botha', idNumber: '9001015009088', role: 'Operator', siteId: 'site-a', startDate: '2026-01-01', basicRate: 500, salaryAdvances: 0, financials: {}, logs: {}, adjustments: {}, employmentStatus: 'active' },
    ]);
    component.service.employeeOnboarding.set([
      { id: 'onboarding-alt', organizationId: SENATLA_TRADING_ORGANIZATION_ID, employeeId: 'alternative', criminalCheckStatus: 'pending', fingerprintCheckStatus: 'pending', medicalStatus: 'fit', updatedAt: '2026-08-23T00:00:00Z' },
    ]);
    component.selectedEmployeeIds.set(['blocked']);
    component.setBulkSiteId('site-b');

    component.reviewBulkSiteAssignment();

    expect(component.assignmentReview()?.outcome).toBe('unknown');
    expect(component.assignmentReview()?.items[0].alternatives[0].entityId).toBe('alternative');
  });

  it('shows only pending and failed outbox events in recovery order', () => {
    component.service.integrationOutbox.set([outbox('completed', 8), outbox('failed', 10), outbox('pending', 9)]);
    expect(component.recoveryOutbox().map((event) => event.status)).toEqual(['failed', 'pending']);
  });

  it('retries the existing failed event and preserves its audit context', async () => {
    const failed = { ...outbox('failed', 10), attempts: 1, lastError: 'Remote conflict' };
    component.service.integrationOutbox.set([failed]);
    await component.retryOutboxEvent(failed.id);
    const retried = component.service.integrationOutbox()[0];
    expect(retried.id).toBe(failed.id);
    expect(retried.idempotencyKey).toBe(failed.idempotencyKey);
    expect(retried.status).toBe('pending');
    expect(retried.lastError).toBe('Remote conflict');
  });

  it('blocks another operator retry after a repeated failure', async () => {
    const failed = { ...outbox('failed', 10), attempts: 2 };
    component.service.integrationOutbox.set([failed]);
    await component.retryOutboxEvent(failed.id);
    expect(component.service.integrationOutbox()[0].status).toBe('failed');
    expect(component.feedback()).toContain('requires escalation');
  });

  it('keeps a realistic synthetic employee as a draft until explicit approval, then records POST audit evidence', async () => {
    await TestBed.inject(AuthService).login('office.admin@test.invalid', 'test-password');
    component.service.sites.set([{ id: 'site-1', name: 'North Shaft', location: 'Rustenburg', isActive: true }]);
    component.selectedSiteId.set('site-1');

    component.loadSyntheticEmployeeCandidate();
    expect(component.personForm.designation).toBe('Excavator Operator');
    expect(component.service.employees().length).toBe(0);

    await component.submitEmployee();
    expect(component.pendingEmployeeCandidate()).not.toBeNull();
    expect(component.service.employees().length).toBe(0);

    await component.approveEmployeeCandidate();
    expect(component.service.employees().length).toBe(1);
    expect(component.service.employees()[0].companyNumber).toBe('SEN-DEMO-014');
    expect(component.service.activity()[0].action).toBe('employee_created');
    expect(component.service.activity()[0].details?.['httpMethod']).toBe('POST');
    expect(component.service.activity()[0].details?.['friendlyAction']).toBe('Employee profile created');
    expect(component.service.activity()[0].occurredAt).toBeTruthy();
  });

  it('requires deletion approval and records the approving user, DELETE action, and timestamp', async () => {
    await TestBed.inject(AuthService).login('office.admin@test.invalid', 'test-password');
    const employee = {
      id: 'employee-delete', firstName: 'Synthetic', surname: 'Worker', idNumber: '9001015009087',
      companyNumber: 'SEN-DEL-001', role: 'Operator' as const, siteId: 'site-1', startDate: '2026-08-01',
      basicRate: 600, salaryAdvances: 0, financials: {}, logs: {}, adjustments: {},
    };
    component.service.employees.set([employee]);

    component.stageEmployeeDeletion(employee);
    expect(component.service.employees().length).toBe(1);
    await component.approveEmployeeDeletion();

    expect(component.service.employees().length).toBe(1);
    expect(component.service.employees()[0].employmentStatus).toBe('inactive');
    expect(component.service.activity()[0].actorName).toBe('Office Admin');
    expect(component.service.activity()[0].details?.['httpMethod']).toBe('DELETE');
    expect(component.service.activity()[0].details?.['friendlyAction']).toBe('Employee profile archived');
    expect(component.service.activity()[0].occurredAt).toBeTruthy();
  });

  it('keeps bulk rows staged until import approval and then records a bulk POST action', async () => {
    await TestBed.inject(AuthService).login('office.admin@test.invalid', 'test-password');
    component.employeeImportRows.set([{
      sourceRow: 4, status: 'ready', errors: [], warnings: [], employee: {
        id: '', firstName: 'Kagiso', surname: 'Dlamini', idNumber: 'UAT-EMP-0001', companyNumber: 'SEN-BULK-001',
        role: 'Foreman', designation: 'Crew Supervisor', siteId: 'site-1', startDate: '2026-07-15',
        basicRate: 0, payRateUnit: 'daily', safetyQualifications: ['HIRA'], additionalFields: {},
        salaryAdvances: 0, financials: {}, logs: {}, adjustments: {}, employmentStatus: 'active',
      },
    }]);
    expect(component.service.employees().length).toBe(0);

    await component.commitEmployeeImport();

    expect(component.service.employees().length).toBe(1);
    expect(component.service.activity()[0].action).toBe('employee_bulk_created');
    expect(component.service.activity()[0].details?.['httpMethod']).toBe('POST');
    expect(component.service.activity()[0].details?.['importedCount']).toBe(1);
  });

  it('labels unavailable planned work without creating placeholder records', () => {
    component.showPlannedFeature('Purchase-order workspace');
    expect(component.feedback()).toContain('post-demo upgrade');
    expect(component.feedback()).toContain('No source data');
  });

  it('retains structured invoice references for Director review', async () => {
    await TestBed.inject(AuthService).login('office.admin@test.invalid', 'test-password');
    const vendor = await component.service.saveVendorAccount({ name: 'Demo supplier', description: '', taxNumber: 'VAT-001', totalOwingAmount: 0 });
    const invoice = await component.service.submitVendorInvoice({ vendorId: vendor.id, invoiceDate: '2026-09-01', orderNumber: 'SUP-44', supplierOrderNumber: 'SUP-44', internalOrderNumber: 'INT-44', invoiceNumber: 'INV-44', itemsPurchased: 'Safety equipment', total: 100, responsiblePerson: 'Office requester' });
    expect(invoice.internalOrderNumber).toBe('INT-44');
    expect(invoice.invoiceNumber).toBe('INV-44');
  });
});

function outbox(status: 'pending' | 'processing' | 'completed' | 'failed', hour: number) {
  return {
    id: `event-${status}`, organizationId: SENATLA_TRADING_ORGANIZATION_ID, eventType: 'asset.updated',
    aggregateType: 'asset', aggregateId: 'asset-1', payload: {}, status, idempotencyKey: `key-${status}`,
    attempts: 0, lastError: null, createdAt: `2026-07-07T${hour}:00:00.000Z`, processedAt: null,
  };
}
