import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-erp-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId()"
        (click)="onBackdropClick($event)"
      >
        <div
          class="relative w-full max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col"
          [ngClass]="sizeClasses()"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-800 px-6 py-4">
            <h2 [id]="titleId()" class="text-lg font-bold text-white">
              {{ title() }}
            </h2>
            <button
              type="button"
              (click)="close()"
              class="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors focus:outline-none"
              aria-label="Close dialog"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 flex-1 overflow-y-auto">
            <ng-content></ng-content>
          </div>

          <!-- Optional Footer -->
          @if (hasFooter()) {
            <div class="border-t border-gray-800 px-6 py-3 bg-gray-950/60 flex items-center justify-end gap-3">
              <ng-content select="[modal-footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ErpModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly title = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly hasFooter = input<boolean>(false);

  @Output() readonly closed = new EventEmitter<void>();

  readonly titleId = () => `erp-modal-${Math.random().toString(36).substring(2, 9)}`;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  sizeClasses(): string {
    switch (this.size()) {
      case 'sm':
        return 'max-w-md';
      case 'lg':
        return 'max-w-3xl';
      case 'xl':
        return 'max-w-5xl';
      case 'md':
      default:
        return 'max-w-xl';
    }
  }
}
