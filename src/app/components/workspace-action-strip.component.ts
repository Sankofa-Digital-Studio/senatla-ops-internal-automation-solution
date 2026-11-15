import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, input, Output } from '@angular/core';

export type WorkspaceActionTone = 'neutral' | 'success' | 'warning' | 'danger';
let nextWorkspaceActionId = 0;

@Component({
  selector: 'app-workspace-action-strip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="workspace-action-strip" [ngClass]="'workspace-action-strip--' + tone()" [attr.aria-labelledby]="headingId">
      <div class="workspace-action-strip__copy">
        <p class="workspace-eyebrow">{{ eyebrow() }}</p>
        <h2 [id]="headingId">{{ title() }}</h2>
        <p>{{ detail() }}</p>
      </div>
      <div class="workspace-action-strip__action">
        <span class="workspace-state" [attr.data-tone]="tone()" role="status" aria-live="polite">{{ stateLabel() }}</span>
        <button type="button" [disabled]="actionDisabled()" (click)="action.emit()">{{ actionLabel() }}</button>
      </div>
    </section>
  `,
})
export class WorkspaceActionStripComponent {
  readonly headingId = `workspace-action-title-${++nextWorkspaceActionId}`;
  readonly eyebrow = input('Next safe action');
  readonly title = input.required<string>();
  readonly detail = input.required<string>();
  readonly stateLabel = input.required<string>();
  readonly actionLabel = input.required<string>();
  readonly actionDisabled = input(false);
  readonly tone = input<WorkspaceActionTone>('neutral');

  @Output() readonly action = new EventEmitter<void>();
}
