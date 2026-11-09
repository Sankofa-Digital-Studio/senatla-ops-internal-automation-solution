import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { resetTestStorage, TEST_APP_PROVIDERS } from '../../test-providers';

import { SiteReadinessRow } from '../../core/gateways/readiness.gateway';
import { ReadinessState, SiteReadinessService } from '../../core/services/site-readiness.service';
import { SiteManagerComponent } from './site-manager.component';

const SITE_ID = '62000000-0000-4000-8000-000000000001';

class SiteReadinessServiceStub {
  readonly sites = signal([{ id: SITE_ID, name: 'Saaiplaas 3', location: 'Free State' }]);
  readonly selectedSiteId = signal(SITE_ID);
  readonly rows = signal<SiteReadinessRow[]>([{ entityType: 'site', entityId: SITE_ID, entityLabel: 'Saaiplaas 3', outcome: 'ready', reasonCodes: [], correctiveActions: [], policyVersion: 'senatla-readiness-v1.0.0', evaluatedAt: new Date().toISOString() }]);
  readonly state = signal<ReadinessState>('ready');
  readonly error = signal<string | null>(null);
  readonly selectedSite = computed(() => this.sites().find((site) => site.id === this.selectedSiteId()) || null);
  readonly canProceed = computed(() => this.state() === 'ready' || this.state() === 'warning');
  readonly assetRows = computed(() => this.rows().filter((row) => row.entityType === 'asset'));
  async initialize() {}
  async refresh() {}
  async selectSite(siteId: string) { this.selectedSiteId.set(siteId); }
  async confirmSelectedSite() { return this.canProceed(); }
}

describe('SiteManagerComponent', () => {
  let component: SiteManagerComponent;
  let fixture: ComponentFixture<SiteManagerComponent>;

  beforeEach(waitForAsync(() => {
    resetTestStorage();
    TestBed.configureTestingModule({
      imports: [SiteManagerComponent],
      providers: [...TEST_APP_PROVIDERS, { provide: SiteReadinessService, useClass: SiteReadinessServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sets an employee to absent directly from the register', () => {
    component.service.setTime(10, 0);
    const employee = component.service.employees()[0];

    component.setAttendanceStatus(employee, 'absent');

    expect(component.getLog(component.service.employees()[0]).status).toBe('absent');
    expect(component.registerSummary().absent).toBeGreaterThan(0);
  });

  it('surfaces the recent immutable attendance audit feed', () => {
    component.service.setTime(10, 0);
    const employee = component.service.employees()[0];

    component.setAttendanceStatus(employee, 'absent');
    fixture.detectChanges();

    expect(component.recentAttendanceAudit().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Recent Audit Evidence');
    expect(fixture.nativeElement.textContent).toContain('attendance_marked_absent');
  });

  it('fails closed when live readiness is blocked', async () => {
    component.readiness.state.set('blocked');
    component.plannedTargets = 'Authorized work';
    component.siteLocationLabel = '-28.12345, 26.12345';

    await component.confirmDailySetup();

    expect(component.showDailySetup).toBeTrue();
    expect(component.siteLocationWarning).toContain('authorized ready site');
  });

  it('allows warning readiness and binds the real site UUID to the existing flow', async () => {
    component.readiness.state.set('warning');
    component.plannedTargets = 'Authorized work';
    component.siteLocationLabel = '-28.12345, 26.12345';

    await component.confirmDailySetup();

    expect(component.showDailySetup).toBeFalse();
    expect(component.service.currentSiteId()).toBe(SITE_ID);
    expect(component.service.siteName()).toBe('Saaiplaas 3');
  });

  it('retains confirmed site setup and trip evidence in the versioned site-day draft', async () => {
    const assetId = '64000000-0000-4000-8000-000000000001';
    component.readiness.rows.set([
      ...component.readiness.rows(),
      {
        entityType: 'asset',
        entityId: assetId,
        entityLabel: 'LDV 01',
        outcome: 'ready',
        reasonCodes: [],
        correctiveActions: [],
        policyVersion: 'senatla-readiness-v1.0.0',
        evaluatedAt: new Date().toISOString(),
      },
    ]);
    component.plannedTargets = 'Inspect and service the assigned equipment';
    component.siteLocationLabel = '-28.12345, 26.12345';

    await component.confirmDailySetup();

    component.tripAssetId = assetId;
    component.tripCurrentKm = 1234;
    component.tripReason = 'Delivery';
    component.tripLocationLabel = '-28.22345, 26.22345';
    component.logTripAway();

    const draft = component.service.siteDayDraft();
    expect(draft?.version).toBe(1);
    expect(draft?.siteId).toBe(SITE_ID);
    expect(draft?.plannedTargets).toBe('Inspect and service the assigned equipment');
    expect(draft?.trips.length).toBe(1);
    expect(draft?.trips[0].assetId).toBe(assetId);
    expect(draft?.trips[0].location.latitude).toBeCloseTo(-28.22345, 5);
  });

  it('renders only sanitized readiness labels and corrective actions', () => {
    component.readiness.state.set('warning');
    component.readiness.rows.set([{
      entityType: 'employee', entityId: '63000000-0000-4000-8000-000000000001', entityLabel: 'Worker A',
      outcome: 'warning', reasonCodes: ['EMPLOYEE_AUTHORIZATION_DUE'], correctiveActions: ['Ask Office Admin to schedule renewal.'],
      policyVersion: 'senatla-readiness-v1.0.0', evaluatedAt: new Date().toISOString(),
    }]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Worker A');
    expect(text).toContain('Ask Office Admin to schedule renewal.');
    expect(text).not.toContain('medical_status');
    expect(text).not.toContain('id_number');
  });

  it('navigates through workflow steps using the workflow stepper', () => {
    expect(component.activeTab()).toBe('attendance');
    expect(component.activeStepIndex()).toBe(2);

    component.selectTab('operations');
    expect(component.activeTab()).toBe('operations');
    expect(component.activeStepIndex()).toBe(3);

    component.setStep(1);
    expect(component.activeTab()).toBe('safety');
    expect(component.activeStepIndex()).toBe(1);

    component.setStep(4);
    expect(component.activeTab()).toBe('signoff');
    expect(component.activeStepIndex()).toBe(4);
  });

  it('records field fuel telemetry with cost calculation for site machinery (ISSUE-11)', () => {
    const assetId = '64000000-0000-4000-8000-000000000001';
    component.fuelAssetId = assetId;
    component.fuelType = 'Diesel 50ppm';
    component.fuelLitres = 80;
    component.fuelUnitCost = 25.00;
    component.fuelReading = 1450;
    component.fuelSlipNumber = 'SLIP-9901';

    component.logFuel();

    expect(component.fuelLogs.length).toBe(1);
    const entry = component.fuelLogs[0];
    expect(entry.assetId).toBe(assetId);
    expect(entry.litres).toBe(80);
    expect(entry.totalCost).toBe(2000.00);
    expect(entry.engineHours).toBe(1450);
    expect(entry.referenceNumber).toBe('SLIP-9901');
    expect(component.fuelSuccessMessage).toContain('Logged 80L');
  });

  it('reports equipment breakdown and flags downtime (ISSUE-10)', () => {
    const assetId = '64000000-0000-4000-8000-000000000001';
    component.breakdownAssetId = assetId;
    component.breakdownPriority = 'critical';
    component.breakdownCategory = 'Hydraulics';
    component.breakdownDescription = 'Hydraulic hose rupture on excavator arm';

    component.reportBreakdown();

    expect(component.breakdownLogs.length).toBe(1);
    const log = component.breakdownLogs[0];
    expect(log.assetId).toBe(assetId);
    expect(log.priority).toBe('critical');
    expect(log.category).toBe('Hydraulics');
    expect(log.description).toBe('Hydraulic hose rupture on excavator arm');
    expect(component.breakdownSuccessMessage).toContain('CRITICAL breakdown');
  });

  it('executes gate dwell verification for scrap material transit (ISSUE-12)', () => {
    component.gateDwellWaybill = 'WB-HMY-2026-991';
    component.gateDwellDriver = 'Sipho Zulu';
    component.gateDwellVehicle = 'FS 44 HMY';

    component.startGateDwell();

    expect(component.gateDwellActive).toBeTrue();
    expect(component.gateDwellRemaining).toBe(150);

    component.finishGateDwell();

    expect(component.gateDwellActive).toBeFalse();
    expect(component.gateDwellLogs.length).toBe(1);
    expect(component.gateDwellLogs[0].waybill).toBe('WB-HMY-2026-991');
    expect(component.gateDwellLogs[0].driver).toBe('Sipho Zulu');
  });

  it('rapidly marks all pending crew members as present', () => {
    component.service.setTime(10, 0);
    const employees = component.service.employees();
    for (const emp of employees) {
      component.setAttendanceStatus(emp, 'pending');
    }
    const initialSummary = component.registerSummary();
    expect(initialSummary.pending).toBe(employees.length);

    component.markAllPendingPresent();

    const updatedSummary = component.registerSummary();
    expect(updatedSummary.pending).toBe(0);
    expect(updatedSummary.present).toBe(employees.length);
  });
});
