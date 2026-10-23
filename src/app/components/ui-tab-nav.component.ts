import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface UiTabItem {
  id: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-ui-tab-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="tab-nav" [attr.aria-label]="ariaLabel">
      <div *ngFor="let group of groupedTabs; trackBy: trackByGroup" class="tab-group">
        <span *ngIf="group.label" class="group-label">{{ group.label }}</span>
        <div class="group-actions">
          <button
            *ngFor="let tab of group.tabs; trackBy: trackById"
            type="button"
            [attr.aria-current]="activeId === tab.id ? 'page' : null"
            [class.active]="activeId === tab.id"
            [disabled]="tab.disabled"
            (click)="selected.emit(tab.id)"
          >{{ tab.label }}</button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .tab-nav { display: flex; gap: 14px; overflow-x: auto; padding: 2px 0 8px; scrollbar-width: thin; }
    .tab-group { flex: 0 0 auto; }
    .group-label { display: block; margin: 0 0 5px 2px; color: #718096; font-size: 9px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .group-actions { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(7.5rem, 1fr); gap: 6px; }
    button { width: 100%; min-height: 36px; border: 1px solid #3b4652; border-radius: 6px; background: transparent; color: #c5ced7; padding: 7px 12px; font: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0; text-transform: uppercase; cursor: pointer; }
    button:hover:not(:disabled) { border-color: #657483; color: #fff; }
    button.active { border-color: #f5a800; background: #f5a800; color: #171000; }
    button:focus-visible { outline: 2px solid #f5a800; outline-offset: 2px; }
    button:disabled { cursor: not-allowed; opacity: .4; }
  `],
})
export class UiTabNavComponent {
  @Input() tabs: UiTabItem[] = [];
  @Input() activeId = '';
  @Input() ariaLabel = 'Sections';
  @Output() readonly selected = new EventEmitter<string>();

  get groupedTabs() {
    const visibleTabs = this.tabs
      .filter((tab) => tab.id !== 'payroll')
      .map((tab) => tab.id === 'timesheets' ? { ...tab, label: 'Timesheets' } : tab);
    const groups = new Map<string, UiTabItem[]>();
    for (const tab of visibleTabs) {
      const key = tab.group || '';
      groups.set(key, [...(groups.get(key) || []), tab]);
    }
    return [...groups.entries()].map(([label, tabs]) => ({ label, tabs }));
  }

  trackByGroup(_: number, group: { label: string }) { return group.label; }

  trackById(_: number, tab: UiTabItem) {
    return tab.id;
  }
}
