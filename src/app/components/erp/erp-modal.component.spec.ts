import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErpModalComponent } from './erp-modal.component';

describe('ErpModalComponent', () => {
  let fixture: ComponentFixture<ErpModalComponent>;
  let component: ErpModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErpModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpModalComponent);
    component = fixture.componentInstance;
  });

  it('does not render when isOpen is false', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('title', 'Test Modal');
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('renders modal with title when isOpen is true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('title', 'Assign Employee');
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Assign Employee');
  });

  it('emits closed event when close button is clicked', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('title', 'Test Dialog');
    fixture.detectChanges();

    spyOn(component.closed, 'emit');
    const closeBtn = fixture.nativeElement.querySelector('button[aria-label="Close dialog"]');
    closeBtn.click();

    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('emits closed event on Escape key', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('title', 'Test Dialog');
    fixture.detectChanges();

    spyOn(component.closed, 'emit');
    component.onEscape();

    expect(component.closed.emit).toHaveBeenCalled();
  });
});
