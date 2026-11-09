import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MultiDomainDashboardComponent } from './multi-domain-dashboard.component';
import { DomainDashboardService } from '../../core/services/domain-dashboard.service';

describe('MultiDomainDashboardComponent', () => {
  let component: MultiDomainDashboardComponent;
  let fixture: ComponentFixture<MultiDomainDashboardComponent>;
  let service: DomainDashboardService;

  beforeEach(waitForAsync(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [MultiDomainDashboardComponent],
      providers: [DomainDashboardService],
    }).compileComponents();

    fixture = TestBed.createComponent(MultiDomainDashboardComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(DomainDashboardService);
    fixture.detectChanges();
  }));

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and render the switcher', () => {
    expect(component).toBeTruthy();
    const switcher = fixture.nativeElement.querySelector('app-domain-navigation-switcher');
    expect(switcher).not.toBeNull();
  });

  it('should switch between domain views dynamically', () => {
    // Default is overall_macro
    expect(fixture.nativeElement.querySelector('app-overall-macro-dashboard')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-engineering-dashboard')).toBeNull();

    // Switch to engineering
    service.selectDomain('engineering');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-overall-macro-dashboard')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-engineering-dashboard')).not.toBeNull();

    // Switch to demolition
    service.selectDomain('demolition_rehabilitation');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-demolition-rehab-dashboard')).not.toBeNull();

    // Switch to underground
    service.selectDomain('underground_works');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-underground-works-dashboard')).not.toBeNull();
  });
});
