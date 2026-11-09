import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';
import { OperationalDomain } from '../../../core/models/domain-dashboard.models';

@Component({
  selector: 'app-domain-navigation-switcher',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="rounded-2xl border border-gray-800 bg-gray-900/90 p-2 shadow-lg backdrop-blur"
      role="tablist"
      aria-label="Operational Domain Switcher"
    >
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        @for (domain of service.domains(); track domain.id) {
          <button
            type="button"
            role="tab"
            [id]="'tab-' + domain.id"
            [attr.aria-selected]="service.activeDomain() === domain.id"
            [attr.aria-controls]="'panel-' + domain.id"
            (click)="select(domain.id)"
            class="group relative flex flex-col justify-between rounded-xl p-3 text-left transition-all duration-200 border"
            [ngClass]="buttonClasses(domain.id)"
          >
            <!-- Top Row: Short Code & Status Badge -->
            <div class="flex items-center justify-between gap-2">
              <span
                class="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                [ngClass]="codeClasses(domain.id)"
              >
                {{ domain.shortCode }}
              </span>

              @if (domain.badge) {
                <span
                  class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border"
                  [ngClass]="badgeClasses(domain.badgeTone, service.activeDomain() === domain.id)"
                >
                  {{ domain.badge }}
                </span>
              }
            </div>

            <!-- Domain Title & Subtitle -->
            <div class="mt-2.5">
              <p class="text-xs sm:text-sm font-bold tracking-tight text-white group-hover:text-yellow-400 transition-colors">
                {{ domain.label }}
              </p>
              <p class="mt-0.5 line-clamp-1 text-[11px] text-gray-400">
                {{ domain.description }}
              </p>
            </div>

            <!-- Active Indicator Pill -->
            @if (service.activeDomain() === domain.id) {
              <div
                class="absolute bottom-1 right-2 w-1.5 h-1.5 rounded-full bg-yellow-400 ring-2 ring-yellow-400/40"
                aria-hidden="true"
              ></div>
            }
          </button>
        }
      </div>
    </nav>
  `,
})
export class DomainNavigationSwitcherComponent {
  readonly service = inject(DomainDashboardService);

  select(id: OperationalDomain): void {
    this.service.selectDomain(id);
  }

  buttonClasses(id: OperationalDomain): string {
    const isSelected = this.service.activeDomain() === id;
    if (isSelected) {
      return 'bg-gray-950 border-yellow-500/80 shadow-md ring-1 ring-yellow-500/30';
    }
    return 'bg-gray-950/40 border-gray-800/80 hover:bg-gray-950/80 hover:border-gray-700';
  }

  codeClasses(id: OperationalDomain): string {
    const isSelected = this.service.activeDomain() === id;
    return isSelected
      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
      : 'bg-gray-800 text-gray-400 border border-gray-700';
  }

  badgeClasses(tone: string | undefined, isSelected: boolean): string {
    if (isSelected) {
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    }
    switch (tone) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'accent':
        return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
      default:
        return 'bg-gray-800/60 text-gray-400 border-gray-700/60';
    }
  }
}
