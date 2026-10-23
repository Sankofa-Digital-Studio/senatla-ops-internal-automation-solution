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
});
