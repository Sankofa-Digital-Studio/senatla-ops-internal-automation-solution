import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { DemolitionRehabDashboardComponent } from './demolition-rehab-dashboard.component';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';

describe('DemolitionRehabDashboardComponent', () => {
  let component: DemolitionRehabDashboardComponent;
  let fixture: ComponentFixture<DemolitionRehabDashboardComponent>;

  beforeEach(waitForAsync(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [DemolitionRehabDashboardComponent],
      providers: [DomainDashboardService],
    }).compileComponents();

    fixture = TestBed.createComponent(DemolitionRehabDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render active demolition contracts: West Gold, Tau Mine, and Mine Villages', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('West Gold Plant Decommissioning');
    expect(text).toContain('Tau Mine Heavy Industrial Salvage');
    expect(text).toContain('Mine Villages Historical Rehab');
  });

  it('should display BOQ margin and salvage credit metrics', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Blended BOQ Margin');
    expect(text).toContain('Salvage Recovery Credit');
    expect(text).toContain('Environmental Clearance');
  });
});
