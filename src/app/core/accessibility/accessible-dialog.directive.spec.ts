import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccessibleDialogDirective } from './accessible-dialog.directive';

@Component({
  standalone: true,
  imports: [CommonModule, AccessibleDialogDirective],
  template: `
    <button id="trigger-btn" (click)="isOpen.set(true)">Open Dialog</button>

    <div
      *ngIf="isOpen()"
      id="modal-root"
      role="dialog"
      aria-modal="true"
      [appAccessibleDialog]="isOpen()"
      [announceError]="errorMsg()"
      (dialogClose)="isOpen.set(false)">
      <h2>Accessible Dialog</h2>
      <input id="input-1" type="text" placeholder="First input" />
      <button id="action-btn">Confirm</button>
      <button id="close-btn" (click)="isOpen.set(false)">Close</button>
    </div>
  `,
})
class TestHostComponent {
  readonly isOpen = signal(false);
  readonly errorMsg = signal('');
}

describe('AccessibleDialogDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let hostEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    hostEl = fixture.nativeElement;
    document.body.appendChild(hostEl);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (hostEl.parentNode) {
      hostEl.parentNode.removeChild(hostEl);
    }
  });

  it('traps focus to the first focusable element and wraps on Tab / Shift+Tab', async () => {
    const trigger = hostEl.querySelector('#trigger-btn') as HTMLButtonElement;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const modal = hostEl.querySelector('#modal-root') as HTMLDivElement;
    expect(modal).toBeTruthy();

    const input1 = hostEl.querySelector('#input-1') as HTMLInputElement;
    const closeBtn = hostEl.querySelector('#close-btn') as HTMLButtonElement;

    expect(document.activeElement).toBe(input1);

    // Tab wraps from last to first
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    modal.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(input1);

    // Shift+Tab wraps from first to last
    input1.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    modal.dispatchEvent(shiftTabEvent);
    expect(document.activeElement).toBe(closeBtn);
  });

  it('emits dialogClose on Escape key press', async () => {
    const trigger = hostEl.querySelector('#trigger-btn') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const modal = hostEl.querySelector('#modal-root') as HTMLDivElement;
    expect(modal).toBeTruthy();

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    modal.dispatchEvent(escapeEvent);
    fixture.detectChanges();

    expect(component.isOpen()).toBeFalse();
  });

  it('restores focus to the trigger element when dialog closes', async () => {
    const trigger = hostEl.querySelector('#trigger-btn') as HTMLButtonElement;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Close dialog
    component.isOpen.set(false);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(document.activeElement).toBe(trigger);
  });

  it('correctly announces error messages in assertive live region', async () => {
    const trigger = hostEl.querySelector('#trigger-btn') as HTMLButtonElement;
    trigger.click();
    component.errorMsg.set('Invalid submission. Please review.');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const modal = hostEl.querySelector('#modal-root') as HTMLDivElement;
    const liveRegion = modal.querySelector('[role="alert"]') as HTMLElement;
    expect(liveRegion).toBeTruthy();
    expect(liveRegion.getAttribute('aria-live')).toBe('assertive');
    expect(liveRegion.textContent).toBe('Invalid submission. Please review.');

    // Clearing error clears live region
    component.errorMsg.set('');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(liveRegion.textContent).toBe('');
  });
});
