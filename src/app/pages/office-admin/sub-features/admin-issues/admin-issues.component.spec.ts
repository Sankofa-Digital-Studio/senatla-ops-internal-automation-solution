import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminIssuesComponent } from './admin-issues.component';
import { TEST_APP_PROVIDERS } from '../../../../test-providers';

describe('AdminIssuesComponent', () => {
  let fixture: ComponentFixture<AdminIssuesComponent>;
  let component: AdminIssuesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminIssuesComponent],
      providers: [...TEST_APP_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminIssuesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders site escalation form and issues log', () => {
    expect(component).toBeTruthy();
    const h2s = fixture.nativeElement.querySelectorAll('h2');
    const titles = Array.from(h2s).map((h: any) => h.textContent.trim());
    expect(titles).toContain('Log Site Escalation');
    expect(titles).toContain('Active Issues Log');
  });

  it('filters issues based on status selection', () => {
    expect(component.filteredIssues()).toBeDefined();
    component.statusFilter.set('Resolved');
    fixture.detectChanges();
    const resolved = component.filteredIssues();
    expect(Array.isArray(resolved)).toBeTrue();
    resolved.forEach((issue) => {
      expect(issue.status).toBe('Resolved');
    });
  });
});
