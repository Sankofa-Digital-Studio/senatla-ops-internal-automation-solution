import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';
import { ErpStatCardComponent } from '../../../components/erp/erp-stat-card.component';
import { ErpStatusBadgeComponent } from '../../../components/erp/erp-status-badge.component';

@Component({
  selector: 'app-demolition-rehab-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ErpStatCardComponent, ErpStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6" id="panel-demolition_rehabilitation" role="tabpanel" aria-labelledby="tab-demolition_rehabilitation">
      <!-- Section Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
              Operational Scope: Demolition &amp; Rehabilitation
            </span>
            <span class="text-xs text-gray-400">· 3 Active Mine Decommissioning Contracts</span>
          </div>
          <h2 class="mt-1 text-xl font-bold text-white tracking-tight">
            Demolition &amp; Rehabilitation Operational Dashboard
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">
            Phase milestones, BOQ margin recovery, environmental clearance certificates, and salvage rubble credits.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-xs font-bold">
            Environmental Clearance: {{ summary().environmentalClearanceRate }}%
          </span>
        </div>
      </div>

      <!-- 4 Top Executive Stat Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-erp-stat-card
          title="Total Contract Portfolio"
          [value]="'R ' + (summary().totalContractsValue | number:'1.2-2')"
          subtext="West Gold, Tau Mine & Mine Villages"
          badge="3 Contracts"
          tone="accent"
        ></app-erp-stat-card>

        <app-erp-stat-card
          title="Billed Revenue to Date"
          [value]="'R ' + (summary().totalBilledRevenue | number:'1.2-2')"
          subtext="Certified client progress milestones"
          tone="default"
        ></app-erp-stat-card>

        <app-erp-stat-card
          title="Blended BOQ Margin"
          [value]="summary().blendedBoqMarginPercent + '%'"
          subtext="Outperforming 25.0% baseline margin"
          badge="Profitable"
          tone="success"
        ></app-erp-stat-card>

        <app-erp-stat-card
          title="Salvage Recovery Credit"
          [value]="'R ' + (summary().totalSalvageCredit | number:'1.2-2')"
          subtext="Steel, copper & concrete rubble offset"
          badge="Credit Offset"
          tone="warning"
        ></app-erp-stat-card>
      </div>

      <!-- Active Contracts Deep-Dive Cards -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">
              Active Decommissioning &amp; Rehab Contracts
            </h3>
            <p class="text-xs text-gray-400">Milestone completion, BOQ margin recovery, and salvage credit reconciliation.</p>
          </div>
        </div>

        <div class="grid gap-5 lg:grid-cols-3">
          @for (contract of summary().activeContracts; track contract.id) {
            <article class="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between hover:border-gray-700 transition">
              <div>
                <!-- Card Header -->
                <div class="flex items-start justify-between gap-2 border-b border-gray-800 pb-3">
                  <div>
                    <span class="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-wider">{{ contract.id }}</span>
                    <h4 class="text-sm font-bold text-white mt-1">{{ contract.contractName }}</h4>
                    <p class="text-xs text-gray-400">{{ contract.client }}</p>
                  </div>
                  <app-erp-status-badge
                    [status]="contract.status === 'active' ? 'active' : 'completed'"
                    [label]="contract.status === 'active' ? 'Active Site' : 'Completed'"
                  ></app-erp-status-badge>
                </div>

                <!-- Phase Progress Bar -->
                <div class="mt-4 space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400 font-semibold">{{ contract.currentPhase }}</span>
                    <span class="font-bold text-yellow-400">{{ contract.progressPercent }}%</span>
                  </div>
                  <div class="w-full bg-gray-950 rounded-full h-2 overflow-hidden border border-gray-800">
                    <div
                      class="bg-gradient-to-r from-yellow-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                      [style.width.%]="contract.progressPercent"
                    ></div>
                  </div>
                </div>

                <!-- Financial Breakdown -->
                <div class="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-950 p-3 text-xs">
                  <div>
                    <p class="text-[10px] uppercase text-gray-500">Contract Value</p>
                    <p class="font-mono font-bold text-white mt-0.5">R {{ contract.totalContractValue | number:'1.2-2' }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] uppercase text-gray-500">Billed to Date</p>
                    <p class="font-mono font-bold text-emerald-400 mt-0.5">R {{ contract.billedToDate | number:'1.2-2' }}</p>
                  </div>
                  <div class="pt-2 border-t border-gray-800">
                    <p class="text-[10px] uppercase text-gray-500">Target BOQ Margin</p>
                    <p class="font-semibold text-gray-300 mt-0.5">{{ contract.boqTargetMarginPercent }}%</p>
                  </div>
                  <div class="pt-2 border-t border-gray-800">
                    <p class="text-[10px] uppercase text-gray-500">Actual BOQ Margin</p>
                    <p class="font-bold text-emerald-300 mt-0.5">{{ contract.boqActualMarginPercent }}%</p>
                  </div>
                </div>

                <!-- Salvage & Materials Recovered -->
                <div class="mt-4 space-y-1 text-xs">
                  <p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Salvage &amp; Clearance Yield</p>
                  <div class="flex flex-wrap gap-2 pt-1">
                    <span class="rounded bg-gray-800 px-2 py-1 text-[11px] text-gray-300 border border-gray-700">
                      Steel: <strong class="text-white">{{ contract.salvageTonnageRecovered }} t</strong>
                    </span>
                    <span class="rounded bg-gray-800 px-2 py-1 text-[11px] text-amber-300 border border-gray-700">
                      Copper: <strong class="text-amber-200">{{ contract.copperTonnageRecovered }} t</strong>
                    </span>
                    <span class="rounded bg-gray-800 px-2 py-1 text-[11px] text-cyan-300 border border-gray-700">
                      Rubble: <strong class="text-white">{{ contract.crushedRubbleVolumeM3 | number }} m³</strong>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Card Footer: Credit & Environmental Compliance -->
              <div class="mt-5 pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
                <div>
                  <span class="text-[10px] text-gray-500 uppercase">Salvage Credit:</span>
                  <p class="font-mono font-bold text-yellow-300">R {{ contract.salvageRecoveryCredit | number:'1.2-2' }}</p>
                </div>
                <div class="text-right">
                  <span class="text-[10px] text-gray-500 uppercase">SHEQ Rating:</span>
                  <p class="font-bold text-emerald-400">{{ contract.environmentalComplianceScore }}% Score</p>
                </div>
              </div>
            </article>
          }
        </div>
      </div>

      <!-- Scrap Security & Chain of Custody Protocol Notice -->
      <div class="rounded-xl border border-sky-900/40 bg-gray-900 p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Chain of Custody Protocol
              </span>
              <h4 class="text-sm font-bold text-white">Scrap Metal Waybill &amp; Joint Liability Sign-off Active</h4>
            </div>
            <p class="text-xs text-gray-400 max-w-3xl">
              All copper and salvaged structural steel dispatched from West Gold and Tau Mine undergo 2–3 minute gate entry dwell checks, dual authenticated digital signatures (Driver &amp; Storage Officer), and geofence tracking.
            </p>
          </div>
          <div class="shrink-0 text-right">
            <span class="font-mono text-xs text-cyan-400 font-bold">412t Dispatched · 0 Variances Unreconciled</span>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class DemolitionRehabDashboardComponent {
  readonly service = inject(DomainDashboardService);
  readonly summary = this.service.demolitionSummary;
}
