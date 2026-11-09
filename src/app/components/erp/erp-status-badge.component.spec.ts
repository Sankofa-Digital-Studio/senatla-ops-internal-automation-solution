import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErpStatusBadgeComponent } from './erp-status-badge.component';

describe('ErpStatusBadgeComponent', () => {
  let fixture: ComponentFixture<ErpStatusBadgeComponent>;
  let component: ErpStatusBadgeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErpStatusBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpStatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('renders neutral badge by default', () => {
    fixture.componentRef.setInput('label', 'Default');
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span[role="status"]');
    expect(span).toBeTruthy();
    expect(span.textContent).toContain('Default');
    expect(span.className).toContain('text-gray-300');
  });

  it('renders success variant with appropriate classes', () => {
    fixture.componentRef.setInput('label', 'Active');
    fixture.componentRef.setInput('variant', 'success');
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span[role="status"]');
    expect(span.className).toContain('text-emerald-300');
    expect(span.textContent).toContain('Active');
  });

  it('renders warning variant with appropriate classes', () => {
    fixture.componentRef.setInput('label', 'Pending');
    fixture.componentRef.setInput('variant', 'warning');
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span[role="status"]');
    expect(span.className).toContain('text-amber-300');
  });

  it('renders danger variant with appropriate classes', () => {
    fixture.componentRef.setInput('label', 'Rejected');
    fixture.componentRef.setInput('variant', 'danger');
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span[role="status"]');
    expect(span.className).toContain('text-rose-300');
  });
});
