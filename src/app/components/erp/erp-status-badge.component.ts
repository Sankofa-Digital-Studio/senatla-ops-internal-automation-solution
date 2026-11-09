import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ErpStatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-erp-status-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border transition-colors uppercase"
      [ngClass]="classes()"
      role="status"
    >
      <span class="h-1.5 w-1.5 rounded-full shrink-0" [ngClass]="dotClasses()" aria-hidden="true"></span>
      <span><ng-content>{{ displayLabel() }}</ng-content></span>
    </span>
  `,
})
export class ErpStatusBadgeComponent {
  readonly label = input<string>('');
  readonly status = input<string>('');
  readonly variant = input<ErpStatusVariant | ''>('');

  readonly displayLabel = computed(() => {
    return this.label() || this.status() || '';
  });

  readonly effectiveVariant = computed<ErpStatusVariant>(() => {
    const v = this.variant();
    if (v) return v;
    const s = (this.status() || this.label() || '').toLowerCase();
    if (
      s === 'completed' ||
      s === 'active' ||
      s === 'nominal' ||
      s === 'ready' ||
      s === 'success' ||
      s === 'synced' ||
      s === 'accepted' ||
      s === 'unlocked'
    ) {
      return 'success';
    }
    if (
      s === 'pending' ||
      s === 'warning' ||
      s === 'unsynced' ||
      s === 'retryable' ||
      s === 'dwell active' ||
      s === 'unknown'
    ) {
      return 'warning';
    }
    if (
      s === 'failed' ||
      s === 'rejected' ||
      s === 'blocked' ||
      s === 'danger' ||
      s === 'critical' ||
      s === 'locked' ||
      s === 'unavailable'
    ) {
      return 'danger';
    }
    if (s === 'info' || s === 'processing') {
      return 'info';
    }
    return 'neutral';
  });

  readonly classes = computed(() => {
    switch (this.effectiveVariant()) {
      case 'success':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50';
      case 'warning':
        return 'bg-amber-950/70 text-amber-300 border-amber-700/50';
      case 'danger':
        return 'bg-rose-950/70 text-rose-300 border-rose-700/50';
      case 'info':
        return 'bg-sky-950/70 text-sky-300 border-sky-700/50';
      case 'neutral':
      default:
        return 'bg-gray-900 text-gray-300 border-gray-700/60';
    }
  });

  readonly dotClasses = computed(() => {
    switch (this.effectiveVariant()) {
      case 'success':
        return 'bg-emerald-400';
      case 'warning':
        return 'bg-amber-400';
      case 'danger':
        return 'bg-rose-400';
      case 'info':
        return 'bg-sky-400';
      case 'neutral':
      default:
        return 'bg-gray-400';
    }
  });
}
