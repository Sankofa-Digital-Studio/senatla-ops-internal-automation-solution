import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { DomainNavigationSwitcherComponent } from './domain-navigation-switcher.component';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';

describe('DomainNavigationSwitcherComponent', () => {
  let component: DomainNavigationSwitcherComponent;
  let fixture: ComponentFixture<DomainNavigationSwitcherComponent>;
  let service: DomainDashboardService;

  beforeEach(waitForAsync(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [DomainNavigationSwitcherComponent],
      providers: [DomainDashboardService],
    }).compileComponents();

    fixture = TestBed.createComponent(DomainNavigationSwitcherComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(DomainDashboardService);
    fixture.detectChanges();
  }));

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all 4 operational domains', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button[role="tab"]');
    expect(buttons.length).toBe(4);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Overall Macro Scope');
    expect(text).toContain('Engineering Operations');
    expect(text).toContain('Demolition & Rehab');
    expect(text).toContain('Underground Works');
  });

  it('should switch active domain on button click', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button[role="tab"]');
    // Button 1 is Engineering
    buttons[1].click();
    fixture.detectChanges();
    expect(service.activeDomain()).toBe('engineering');

    // Button 2 is Demolition
    buttons[2].click();
    fixture.detectChanges();
    expect(service.activeDomain()).toBe('demolition_rehabilitation');
  });
});
