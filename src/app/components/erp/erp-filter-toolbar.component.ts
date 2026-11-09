import { ChangeDetectionStrategy, Component, EventEmitter, Output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ErpFilterOption {
  label: string;
  value: string;
}

export interface ErpFilterState {
  search: string;
  selectedFilter: string;
}

@Component({
  selector: 'app-erp-filter-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-900/80 p-3 rounded-xl border border-gray-800">
      <div class="relative flex-1">
        <label for="erp-search-input" class="sr-only">Search</label>
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          id="erp-search-input"
          type="text"
          [placeholder]="placeholder()"
          [ngModel]="searchQuery()"
          (ngModelChange)="onSearchChange($event)"
          class="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/70 focus:ring-1 focus:ring-yellow-500/70"
        />
      </div>

      <div class="flex items-center gap-2">
        @if (filterOptions().length > 0) {
          <select
            [ngModel]="selectedFilter()"
            (ngModelChange)="onFilterSelect($event)"
            class="px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-yellow-500/70"
            aria-label="Filter category"
          >
            <option value="">{{ filterLabel() }}</option>
            @for (opt of filterOptions(); track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        }

        @if (hasActiveFilters()) {
          <button
            type="button"
            (click)="clearFilters()"
            class="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Clear
          </button>
        }

        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class ErpFilterToolbarComponent {
  readonly placeholder = input<string>('Search records...');
  readonly filterLabel = input<string>('All Statuses');
  readonly filterOptions = input<ErpFilterOption[]>([]);

  @Output() readonly filterChange = new EventEmitter<ErpFilterState>();

  readonly searchQuery = signal<string>('');
  readonly selectedFilter = signal<string>('');

  hasActiveFilters(): boolean {
    return this.searchQuery().trim().length > 0 || this.selectedFilter().length > 0;
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.emitChange();
  }

  onFilterSelect(value: string): void {
    this.selectedFilter.set(value);
    this.emitChange();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedFilter.set('');
    this.emitChange();
  }

  private emitChange(): void {
    this.filterChange.emit({
      search: this.searchQuery(),
      selectedFilter: this.selectedFilter(),
    });
  }
}
