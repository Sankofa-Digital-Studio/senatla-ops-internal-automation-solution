import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ErpStatTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-erp-stat-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="rounded-xl border p-4 bg-gray-900 transition-shadow hover:shadow-md"
      [ngClass]="borderClass()"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {{ title() }}
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
        <p class="mt-2 text-xs text-gray-400">
          {{ subtext() }}
        </p>
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
