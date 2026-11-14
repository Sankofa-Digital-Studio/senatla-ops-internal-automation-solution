import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { OverallMacroDashboardComponent } from './overall-macro-dashboard.component';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';

describe('OverallMacroDashboardComponent', () => {
  let component: OverallMacroDashboardComponent;
  let fixture: ComponentFixture<OverallMacroDashboardComponent>;

  beforeEach(waitForAsync(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [OverallMacroDashboardComponent],
      providers: [DomainDashboardService],
    }).compileComponents();

    fixture = TestBed.createComponent(OverallMacroDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render consolidated multi-domain financial rollup', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Consolidated Revenue');
    expect(text).toContain('Consolidated Operating Cost');
    expect(text).toContain('Consolidated Net Profit');
    expect(text).toContain('Free Cash Flow');
  });

  it('should render cross-domain bottlenecks and fleet telemetry', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Fleet Utilization');
    expect(text).toContain('Under Maintenance');
    expect(text).toContain('Aggregate Fuel Burn Rate');
    expect(text).toContain('Total Fuel Expense');
    expect(text).toContain('Cross-Domain Operational Bottlenecks & Risk Radar');
    expect(text).toContain('Workshop 2 Axle Ingot Supplier Backlog');
  });

  it('keeps primary fleet KPIs ahead of secondary fuel telemetry', () => {
    const primary = fixture.nativeElement.querySelector('[data-testid="director-fleet-primary-grid"]');
    const secondary = fixture.nativeElement.querySelector('[data-testid="director-fleet-secondary-grid"]');
    const primaryText = primary.textContent as string;
    const secondaryText = secondary.textContent as string;

    expect(primaryText.indexOf('Fleet Utilization')).toBeGreaterThanOrEqual(0);
    expect(primaryText.indexOf('Under Maintenance')).toBeGreaterThanOrEqual(0);
    expect(secondaryText.indexOf('Aggregate Fuel Burn Rate')).toBeGreaterThanOrEqual(0);
    expect(secondaryText.indexOf('Total Fuel Expense')).toBeGreaterThanOrEqual(0);
    expect(primaryText.indexOf('Aggregate Fuel Burn Rate')).toBe(-1);
    expect(primaryText.indexOf('Total Fuel Expense')).toBe(-1);
  });

  it('should open macro stat drilldown modal when clicking stat cards', () => {
    expect(component.statModal()).toBeNull();
    component.statModal.set('revenue');
    fixture.detectChanges();

    expect(component.statModal()).toBe('revenue');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Consolidated Recognized Revenue');
    expect(text).toContain('Engineering Operations');
    expect(text).toContain('Demolition & Rehabilitation');
  });
});
