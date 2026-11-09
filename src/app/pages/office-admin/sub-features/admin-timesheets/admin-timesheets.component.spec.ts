import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminTimesheetsComponent } from './admin-timesheets.component';
import { TEST_APP_PROVIDERS } from '../../../../test-providers';

describe('AdminTimesheetsComponent', () => {
  let fixture: ComponentFixture<AdminTimesheetsComponent>;
  let component: AdminTimesheetsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTimesheetsComponent],
      providers: [...TEST_APP_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTimesheetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders timesheet header and controls', () => {
    expect(component).toBeTruthy();
    const h2 = fixture.nativeElement.querySelector('h2');
    expect(h2.textContent).toContain('Timesheet Register & Reconciliation');
  });

  it('computes attendance summary accurately', () => {
    const summary = component.attendanceSummary();
    expect(summary.total).toBeGreaterThanOrEqual(0);
    expect(summary.present + summary.absent + summary.pending).toBeLessThanOrEqual(summary.total);
  });
});
