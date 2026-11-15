import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspaceActionStripComponent } from './workspace-action-strip.component';

@Component({
  standalone: true,
  imports: [WorkspaceActionStripComponent],
  template: `<app-workspace-action-strip title="Review queue" detail="Two items need evidence." stateLabel="2 open" actionLabel="Open queue" tone="warning" (action)="handled = true" />`,
})
class HostComponent { handled = false; }

describe('WorkspaceActionStripComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders the next action and state together', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.textContent).toContain('Review queue');
    const state = element.querySelector('.workspace-state');
    expect(state?.textContent).toContain('2 open');
    expect(state?.getAttribute('role')).toBe('status');
    expect(state?.getAttribute('aria-live')).toBe('polite');
    expect(element.querySelector('button')?.textContent).toContain('Open queue');
  });

  it('emits the action from the native button', () => {
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.handled).toBeTrue();
  });
});
