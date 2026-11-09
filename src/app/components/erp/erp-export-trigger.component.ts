import { ChangeDetectionStrategy, Component, EventEmitter, Output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ErpExportFormat = 'xlsx' | 'pdf' | 'csv';

@Component({
  selector: 'app-erp-export-trigger',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-block text-left">
      <button
        type="button"
        (click)="toggleMenu()"
        [disabled]="busy()"
        class="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800 focus:outline-none disabled:opacity-50 transition-colors"
        aria-haspopup="true"
        [attr.aria-expanded]="menuOpen()"
      >
        @if (busy()) {
          <svg class="animate-spin h-3.5 w-3.5 text-yellow-400" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Exporting...</span>
        } @else {
          <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>{{ label() }}</span>
          <svg class="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        }
      </button>

      @if (menuOpen() && !busy()) {
        <div
          class="absolute right-0 mt-1 w-44 rounded-xl border border-gray-800 bg-gray-950 shadow-xl py-1 z-30 animate-fade-in"
          role="menu"
          aria-orientation="vertical"
        >
          @if (formats().includes('xlsx')) {
            <button
              type="button"
              (click)="triggerExport('xlsx')"
              class="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-gray-300 hover:bg-gray-900 hover:text-white transition-colors"
              role="menuitem"
            >
              <span class="text-emerald-400 font-bold">XLSX</span>
              <span>Excel Spreadsheet</span>
            </button>
          }
          @if (formats().includes('pdf')) {
            <button
              type="button"
              (click)="triggerExport('pdf')"
              class="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-gray-300 hover:bg-gray-900 hover:text-white transition-colors"
              role="menuitem"
            >
              <span class="text-rose-400 font-bold">PDF</span>
              <span>Document Report</span>
            </button>
          }
          @if (formats().includes('csv')) {
            <button
              type="button"
              (click)="triggerExport('csv')"
              class="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-gray-300 hover:bg-gray-900 hover:text-white transition-colors"
              role="menuitem"
            >
              <span class="text-sky-400 font-bold">CSV</span>
              <span>Plain CSV Data</span>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ErpExportTriggerComponent {
  readonly label = input<string>('Export');
  readonly busy = input<boolean>(false);
  readonly formats = input<ErpExportFormat[]>(['xlsx', 'pdf', 'csv']);

  @Output() readonly exportRequested = new EventEmitter<ErpExportFormat>();

  readonly menuOpen = signal<boolean>(false);

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  triggerExport(format: ErpExportFormat): void {
    this.menuOpen.set(false);
    this.exportRequested.emit(format);
  }
}
