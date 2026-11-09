import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ErpColumnDef<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  formatter?: (val: unknown, row: T) => string;
}

@Component({
  selector: 'app-erp-data-table',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
      <!-- Table content -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-gray-200">
          <thead class="bg-gray-950/80 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-400">
            <tr>
              @for (col of columns(); track col.key) {
                <th
                  scope="col"
                  class="px-4 py-3 font-semibold select-none"
                  [ngClass]="{
                    'text-center': col.align === 'center',
                    'text-right': col.align === 'right',
                    'cursor-pointer hover:text-white': col.sortable
                  }"
                  (click)="col.sortable ? toggleSort(col.key) : null"
                >
                  <div class="inline-flex items-center gap-1.5">
                    <span>{{ col.label }}</span>
                    @if (col.sortable) {
                      <span class="text-xs text-gray-500">
                        @if (sortKey() === col.key) {
                          {{ sortDirection() === 'asc' ? '▲' : '▼' }}
                        } @else {
                          ⇅
                        }
                      </span>
                    }
                  </div>
                </th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/60">
            @if (paginatedData().length === 0) {
              <tr>
                <td [attr.colspan]="columns().length" class="px-4 py-12 text-center text-sm text-gray-500">
                  {{ emptyMessage() }}
                </td>
              </tr>
            } @else {
              @for (row of paginatedData(); track getRowId(row, $index)) {
                <tr
                  class="hover:bg-gray-800/40 transition-colors"
                  [ngClass]="{ 'cursor-pointer': rowClickable() }"
                  (click)="rowClickable() ? onRowClick(row) : null"
                >
                  @for (col of columns(); track col.key) {
                    <td
                      class="px-4 py-3 whitespace-nowrap text-sm"
                      [ngClass]="{
                        'text-center': col.align === 'center',
                        'text-right': col.align === 'right'
                      }"
                    >
                      {{ getCellValue(row, col) }}
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination bar -->
      @if (totalPages() > 1) {
        <div class="flex items-center justify-between border-t border-gray-800 bg-gray-950/60 px-4 py-3">
          <div class="text-xs text-gray-400">
            Showing <span class="font-medium text-white">{{ startIndex() + 1 }}</span> to
            <span class="font-medium text-white">{{ endIndex() }}</span> of
            <span class="font-medium text-white">{{ sortedData().length }}</span> entries
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              (click)="previousPage()"
              [disabled]="currentPage() === 1"
              class="px-2.5 py-1 text-xs rounded border border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span class="text-xs text-gray-400 px-2">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="currentPage() === totalPages()"
              class="px-2.5 py-1 text-xs rounded border border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ErpDataTableComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly columns = input.required<ErpColumnDef<T>[]>();
  readonly data = input.required<T[]>();
  readonly pageSize = input<number>(10);
  readonly emptyMessage = input<string>('No records available');
  readonly rowClickable = input<boolean>(false);

  @Output() readonly rowSelected = new EventEmitter<T>();

  readonly currentPage = signal<number>(1);
  readonly sortKey = signal<string>('');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly sortedData = computed(() => {
    const items = [...this.data()];
    const key = this.sortKey();
    if (!key) return items;

    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    return items.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      return valA > valB ? dir : -dir;
    });
  });

  readonly totalPages = computed(() => {
    const count = this.sortedData().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(count / size));
  });

  readonly startIndex = computed(() => (this.currentPage() - 1) * this.pageSize());
  readonly endIndex = computed(() => Math.min(this.startIndex() + this.pageSize(), this.sortedData().length));

  readonly paginatedData = computed(() => {
    return this.sortedData().slice(this.startIndex(), this.endIndex());
  });

  toggleSort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  getCellValue(row: T, col: ErpColumnDef<T>): string {
    const raw = row[col.key];
    if (col.formatter) {
      return col.formatter(raw, row);
    }
    if (raw == null) return '-';
    return String(raw);
  }

  getRowId(row: T, fallbackIndex: number): string | number {
    return (row['id'] as string | number) ?? fallbackIndex;
  }

  onRowClick(row: T): void {
    this.rowSelected.emit(row);
  }
}
