import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ErpStatTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-erp-stat-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="flex h-full min-h-[146px] flex-col justify-between rounded-xl border bg-gray-900 p-4 transition-all select-none"
      [ngClass]="[
        borderClass(),
        interactive()
          ? 'cursor-pointer hover:border-yellow-400/80 hover:ring-1 hover:ring-yellow-400/40 hover:shadow-lg hover:shadow-yellow-500/5 group active:scale-[0.99]'
          : 'hover:shadow-md'
      ]"
      [attr.role]="interactive() ? 'button' : null"
      [attr.tabindex]="interactive() ? 0 : null"
      [attr.aria-label]="interactive() ? 'Inspect drill down for ' + title() : null"
      (click)="onCardClick()"
      (keydown)="onKeydown($event)"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <span>{{ title() }}</span>
            @if (interactive()) {
              <svg
                class="w-3.5 h-3.5 text-yellow-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            }
          </p>
          <p class="mt-2 text-2xl font-bold tracking-tight" [ngClass]="valueColorClass()">
            {{ value() }}
          </p>
        </div>
        @if (badge()) {
          <span
            class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border"
            [ngClass]="badgeClass()"
          >
            {{ badge() }}
          </span>
        }
      </div>
      @if (subtext()) {
        <div class="mt-2 text-xs text-gray-400 flex items-center justify-between gap-2">
          <span class="truncate">{{ subtext() }}</span>
          @if (interactive()) {
            <span class="text-[10px] font-bold text-yellow-400/90 group-hover:text-yellow-300 group-hover:underline shrink-0">
              {{ drilldownHint() || 'Trace &rarr;' }}
            </span>
          }
        </div>
      } @else if (interactive()) {
        <div class="mt-2 text-right">
          <span class="text-[10px] font-bold text-yellow-400/90 group-hover:text-yellow-300 group-hover:underline">
            {{ drilldownHint() || 'Trace &rarr;' }}
          </span>
        </div>
      }
      <ng-content></ng-content>
    </article>
  `,
})
export class ErpStatCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtext = input<string>('');
  readonly badge = input<string>('');
  readonly tone = input<ErpStatTone>('default');
  readonly interactive = input<boolean>(false);
  readonly drilldownHint = input<string>('');

  @Output() readonly cardClick = new EventEmitter<void>();

  onCardClick(): void {
    if (this.interactive()) {
      this.cardClick.emit();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.interactive() && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.cardClick.emit();
    }
  }

  readonly borderClass = computed(() => {
    switch (this.tone()) {
      case 'accent':
        return 'border-yellow-600/40 hover:border-yellow-500/70';
      case 'success':
        return 'border-emerald-600/40 hover:border-emerald-500/70';
      case 'warning':
        return 'border-amber-600/40 hover:border-amber-500/70';
      case 'danger':
        return 'border-rose-600/40 hover:border-rose-500/70';
      case 'default':
      default:
        return 'border-gray-800 hover:border-gray-700';
    }
  });

  readonly valueColorClass = computed(() => {
    switch (this.tone()) {
      case 'accent':
        return 'text-yellow-400';
      case 'success':
        return 'text-emerald-400';
      case 'warning':
        return 'text-amber-400';
      case 'danger':
        return 'text-rose-400';
      case 'default':
      default:
        return 'text-white';
    }
  });

  readonly badgeClass = computed(() => {
    switch (this.tone()) {
      case 'accent':
        return 'bg-yellow-950/60 text-yellow-300 border-yellow-700/50';
      case 'success':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50';
      case 'warning':
        return 'bg-amber-950/60 text-amber-300 border-amber-700/50';
      case 'danger':
        return 'bg-rose-950/60 text-rose-300 border-rose-700/50';
      case 'default':
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  });
}
