import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';

@Component({
  selector: 'app-underground-works-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6" id="panel-underground_works" role="tabpanel" aria-labelledby="tab-underground_works">
      <!-- Section Header with Deferred Badge -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded bg-gray-800 px-2 py-0.5 text-xs font-bold text-gray-400 border border-gray-700">
              Operational Scope: Underground Works
            </span>
            <span class="rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase">
              Phase 1 Scope Deferred
            </span>
          </div>
          <h2 class="mt-1 text-xl font-bold text-white tracking-tight">
            Underground Shaft Operations &amp; Safety Readiness
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">
            Shaft operations, underground safety blocks, and consumable burn are placed on administrative standby.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="service.selectDomain('engineering')"
            class="rounded-lg bg-yellow-500 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-yellow-400 transition shadow"
          >
            Return to Active Engineering &rarr;
          </button>
        </div>
      </div>

      <!-- Deferred Scope Executive Notice Callout -->
      <div class="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-gray-900 via-gray-900 to-yellow-950/20 p-6 shadow-xl space-y-3">
        <div class="flex items-start gap-3">
          <div class="rounded-xl bg-yellow-500/20 p-3 border border-yellow-500/30 text-yellow-400 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <div>
            <span class="text-xs font-extrabold uppercase tracking-widest text-yellow-500">Executive Scope Notice</span>
            <h3 class="text-lg font-bold text-white mt-0.5">Initial Phase Operations Prioritized</h3>
            <p class="text-xs text-gray-300 mt-1 max-w-3xl leading-relaxed">
              {{ summary().statusMessage }}
            </p>
            <p class="text-xs font-semibold text-yellow-400 mt-2">
              Planned Scope Resumption Target: {{ summary().resumptionQuarter }}
            </p>
          </div>
        </div>
      </div>

      <!-- Planned Shaft Blueprints on Standby -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">
              Prepared Shaft Configurations (Standby Architecture)
            </h3>
            <p class="text-xs text-gray-400">Pre-configured operational parameters ready for immediate activation upon executive authorization.</p>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          @for (shaft of summary().plannedShafts; track shaft.shaftNumber) {
            <article class="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-sm space-y-3">
              <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <span class="font-mono text-xs font-bold text-gray-400">{{ shaft.shaftNumber }}</span>
                  <h4 class="text-sm font-bold text-white mt-0.5">{{ shaft.name }}</h4>
                </div>
                <span class="rounded bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Standby
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2 rounded-lg bg-gray-950 p-3 text-xs">
                <div>
                  <p class="text-[10px] text-gray-500 uppercase tracking-wider">Planned Crew</p>
                  <p class="font-bold text-white mt-0.5">{{ shaft.plannedCrew }} Miners</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-500 uppercase tracking-wider">Target Milling</p>
                  <p class="font-bold text-gray-300 mt-0.5">{{ shaft.targetMillingTons | number }} tons</p>
                </div>
                <div class="col-span-2 pt-2 border-t border-gray-800 flex items-center justify-between">
                  <span class="text-[10px] text-gray-400 uppercase tracking-wider">Safety Protocol:</span>
                  <span class="font-bold text-emerald-400">{{ shaft.safetyComplianceScore }}% Verified</span>
                </div>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class UndergroundWorksDashboardComponent {
  readonly service = inject(DomainDashboardService);
  readonly summary = this.service.undergroundSummary;
}
