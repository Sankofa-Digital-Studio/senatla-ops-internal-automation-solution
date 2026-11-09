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
    expect(text).toContain('Cross-Domain Operational Bottlenecks & Risk Radar');
    expect(text).toContain('Workshop 2 Axle Ingot Supplier Backlog');
  });
});
