import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminOverviewComponent } from './admin-overview.component';
import { TEST_APP_PROVIDERS } from '../../../../test-providers';

describe('AdminOverviewComponent', () => {
  let fixture: ComponentFixture<AdminOverviewComponent>;
  let component: AdminOverviewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOverviewComponent],
      providers: [...TEST_APP_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders overview layout and priorities cards', () => {
    expect(component).toBeTruthy();
    const headers = fixture.nativeElement.querySelectorAll('h2');
    const headerTexts = Array.from(headers).map((h: any) => h.textContent.trim());
    expect(headerTexts).toContain('Admin Priorities');
    expect(headerTexts).toContain('Recent Activity');
    expect(headerTexts).toContain('Saved Views');
    expect(headerTexts).toContain('Anomaly Detection');
  });

  it('calculates onboarding and sync progress properly', () => {
    expect(component.onboardingProgress()).toBeGreaterThanOrEqual(0);
    expect(component.onboardingProgress()).toBeLessThanOrEqual(100);
    expect(component.syncProgress()).toBeGreaterThanOrEqual(0);
    expect(component.syncProgress()).toBeLessThanOrEqual(100);
  });
});
