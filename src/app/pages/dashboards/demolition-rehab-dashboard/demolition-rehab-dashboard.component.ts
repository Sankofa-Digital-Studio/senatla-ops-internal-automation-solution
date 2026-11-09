import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';
import { DemolitionProject } from '../../../core/models/domain-dashboard.models';
import { ErpStatCardComponent } from '../../../components/erp/erp-stat-card.component';
import { ErpStatusBadgeComponent } from '../../../components/erp/erp-status-badge.component';
import { ErpModalComponent } from '../../../components/erp/erp-modal.component';

export type DemolitionStatType = 'portfolio' | 'revenue' | 'margin' | 'salvage' | 'compliance';
export type ContractDetailTab = 'boq' | 'claims' | 'salvage' | 'compliance';

@Component({
  selector: 'app-demolition-rehab-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ErpStatCardComponent, ErpStatusBadgeComponent, ErpModalComponent],
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
          <button
            type="button"
            (click)="openStatDrilldown('compliance')"
            class="rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-xs font-bold hover:bg-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
            title="Click to view Environmental Clearance Audit"
          >
            <span>Environmental Clearance: {{ summary().environmentalClearanceRate }}%</span>
            <span class="text-[10px] text-emerald-400 font-normal">Audit &rarr;</span>
          </button>
        </div>
      </div>

      <!-- 4 Top Executive Stat Cards (Clickable Drilldowns) -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-erp-stat-card
          title="Total Contract Portfolio"
          [value]="'R ' + (summary().totalContractsValue | number:'1.2-2')"
          subtext="West Gold, Tau Mine & Mine Villages"
          badge="3 Contracts"
          tone="accent"
          [interactive]="true"
          drilldownHint="Audit 3 Contracts &rarr;"
          (cardClick)="openStatDrilldown('portfolio')"
        ></app-erp-stat-card>

        <app-erp-stat-card
          title="Billed Revenue to Date"
          [value]="'R ' + (summary().totalBilledRevenue | number:'1.2-2')"
          subtext="Certified client progress milestones"
          tone="default"
          [interactive]="true"
          drilldownHint="Audit Milestone Claims &rarr;"
          (cardClick)="openStatDrilldown('revenue')"
        ></app-erp-stat-card>

        <app-erp-stat-card
          title="Blended BOQ Margin"
          [value]="summary().blendedBoqMarginPercent + '%'"
          subtext="Outperforming 25.0% baseline margin"
          badge="Profitable"
          tone="success"
          [interactive]="true"
          drilldownHint="Trace 56.6% Formula &rarr;"
          (cardClick)="openStatDrilldown('margin')"
        ></app-erp-stat-card>

        <app-erp-stat-card
          title="Salvage Recovery Credit"
          [value]="'R ' + (summary().totalSalvageCredit | number:'1.2-2')"
          subtext="Steel, copper & concrete rubble offset"
          badge="Credit Offset"
          tone="warning"
          [interactive]="true"
          drilldownHint="Tonnage & Rates &rarr;"
          (cardClick)="openStatDrilldown('salvage')"
        ></app-erp-stat-card>
      </div>

      <!-- Active Contracts Deep-Dive Cards (Clickable Drilldowns) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">
              Active Decommissioning &amp; Rehab Contracts
            </h3>
            <p class="text-xs text-gray-400">
              Click any contract to inspect full BOQ line items, certified milestone claims, salvage yields, and waybill tickets.
            </p>
          </div>
          <span class="text-xs text-amber-400 font-bold hidden sm:inline-block">
            Click any card to drill down
          </span>
        </div>

        <div class="grid gap-5 lg:grid-cols-3">
          @for (contract of summary().activeContracts; track contract.id) {
            <article
              class="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-lg flex flex-col justify-between hover:border-yellow-500/70 hover:ring-1 hover:ring-yellow-500/30 transition-all cursor-pointer group active:scale-[0.99] select-none"
              role="button"
              tabindex="0"
              [attr.aria-label]="'Inspect details for ' + contract.contractName"
              (click)="openContractDetail(contract)"
              (keydown.enter)="openContractDetail(contract)"
              (keydown.space)="openContractDetail(contract); $event.preventDefault()"
            >
              <div>
                <!-- Card Header -->
                <div class="flex items-start justify-between gap-2 border-b border-gray-800 pb-3">
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-wider">{{ contract.id }}</span>
                      <span class="text-[10px] text-gray-500">· {{ contract.siteLocation }}</span>
                    </div>
                    <h4 class="text-sm font-bold text-white mt-1 group-hover:text-yellow-400 transition-colors">
                      {{ contract.contractName }}
                    </h4>
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

              <!-- Card Footer: Credit, Environmental Compliance, and Explicit Drilldown Action -->
              <div class="mt-5 pt-3 border-t border-gray-800 space-y-3">
                <div class="flex items-center justify-between text-xs">
                  <div>
                    <span class="text-[10px] text-gray-500 uppercase">Salvage Credit:</span>
                    <p class="font-mono font-bold text-yellow-300">R {{ contract.salvageRecoveryCredit | number:'1.2-2' }}</p>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-gray-500 uppercase">SHEQ Rating:</span>
                    <p class="font-bold text-emerald-400">{{ contract.environmentalComplianceScore }}% Score</p>
                  </div>
                </div>

                <button
                  type="button"
                  (click)="openContractDetail(contract); $event.stopPropagation()"
                  class="w-full rounded-lg border border-yellow-500/40 bg-yellow-950/20 py-2 text-xs font-bold text-yellow-300 hover:bg-yellow-500 hover:text-black transition flex items-center justify-center gap-1.5 shadow-sm group-hover:bg-yellow-500 group-hover:text-black"
                >
                  <span>Inspect Contract Drilldown</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </article>
          }
        </div>
      </div>

      <!-- Scrap Security & Chain of Custody Protocol Notice (Clickable Drilldown) -->
      <div
        class="rounded-xl border border-sky-900/40 bg-gray-900 p-5 hover:border-sky-500/70 hover:ring-1 hover:ring-sky-500/30 transition-all cursor-pointer group"
        role="button"
        tabindex="0"
        (click)="showWaybillModal.set(true)"
        (keydown.enter)="showWaybillModal.set(true)"
        (keydown.space)="showWaybillModal.set(true); $event.preventDefault()"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Chain of Custody Protocol
              </span>
              <h4 class="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                Scrap Metal Waybill &amp; Joint Liability Sign-off Active
              </h4>
            </div>
            <p class="text-xs text-gray-400 max-w-3xl">
              All copper and salvaged structural steel dispatched from West Gold and Tau Mine undergo 2–3 minute gate entry dwell checks, dual authenticated digital signatures (Driver &amp; Storage Officer), and geofence tracking.
            </p>
          </div>
          <div class="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
            <span class="font-mono text-xs text-cyan-400 font-bold">412t Dispatched · 0 Variances Unreconciled</span>
            <span class="text-[11px] font-bold text-sky-400 group-hover:underline flex items-center gap-1">
              <span>Inspect Waybill Register</span> &rarr;
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================================================= -->
    <!-- MODAL 1: STAT METRIC DRILLDOWN & AUDIT TRACE                      -->
    <!-- ================================================================= -->
    <app-erp-modal
      [isOpen]="statModalType() !== null"
      [title]="statModalTitle()"
      size="lg"
      (closed)="statModalType.set(null)"
    >
      <div class="space-y-5 text-xs text-gray-200">
        <!-- PORTFOLIO DRILLDOWN -->
        @if (statModalType() === 'portfolio') {
          <div class="space-y-4">
            <div class="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4">
              <p class="text-xs font-bold uppercase tracking-wider text-yellow-400">Total Portfolio Consolidation</p>
              <h3 class="text-xl font-mono font-black text-white mt-1">
                R {{ summary().totalContractsValue | number:'1.2-2' }}
              </h3>
              <p class="text-xs text-gray-300 mt-1">
                Authoritative summation of all active mining decommissioning, decontamination, and rehabilitation contracts under Senatla operational command.
              </p>
            </div>

            <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                  <tr>
                    <th class="p-3">Contract / Code</th>
                    <th class="p-3">Client &amp; Location</th>
                    <th class="p-3 text-right">Contract Value</th>
                    <th class="p-3 text-right">Share of Portfolio</th>
                    <th class="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                  @for (c of summary().activeContracts; track c.id) {
                    <tr class="hover:bg-gray-900/60 transition">
                      <td class="p-3">
                        <span class="font-mono text-amber-400 font-bold">{{ c.id }}</span>
                        <p class="font-bold text-white mt-0.5">{{ c.contractName }}</p>
                      </td>
                      <td class="p-3">
                        <span class="text-gray-300 font-semibold">{{ c.client }}</span>
                        <p class="text-[10px] text-gray-500">{{ c.siteLocation }}</p>
                      </td>
                      <td class="p-3 text-right font-mono font-bold text-white">
                        R {{ c.totalContractValue | number:'1.2-2' }}
                      </td>
                      <td class="p-3 text-right font-mono text-emerald-400">
                        {{ ((c.totalContractValue / summary().totalContractsValue) * 100) | number:'1.1-1' }}%
                      </td>
                      <td class="p-3 text-center">
                        <button
                          type="button"
                          (click)="openContractFromStat(c)"
                          class="rounded bg-yellow-500 px-2 py-1 text-[11px] font-bold text-black hover:bg-yellow-400 transition"
                        >
                          Deep Dive &rarr;
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot class="bg-gray-900 border-t border-gray-800 font-bold text-white">
                  <tr>
                    <td colspan="2" class="p-3 uppercase">Total Portfolio Value</td>
                    <td class="p-3 text-right font-mono text-yellow-400">
                      R {{ summary().totalContractsValue | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right font-mono text-emerald-400">100.0%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        }

        <!-- REVENUE DRILLDOWN -->
        @if (statModalType() === 'revenue') {
          <div class="space-y-4">
            <div class="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <p class="text-xs font-bold uppercase tracking-wider text-emerald-400">Certified Milestone Billings</p>
              <h3 class="text-xl font-mono font-black text-white mt-1">
                R {{ summary().totalBilledRevenue | number:'1.2-2' }}
              </h3>
              <p class="text-xs text-gray-300 mt-1">
                Sum of certified client payment certificates. Excludes uncertified provisional claims. Fully audited by consulting engineers and client quantity surveyors.
              </p>
            </div>

            <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                  <tr>
                    <th class="p-3">Certificate / Phase</th>
                    <th class="p-3">Contract &amp; Client</th>
                    <th class="p-3">Certification Date</th>
                    <th class="p-3 text-right">Certified Amount</th>
                    <th class="p-3 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                  @for (claim of allPaymentClaims(); track claim.claimNumber) {
                    <tr class="hover:bg-gray-900/60 transition">
                      <td class="p-3">
                        <span class="font-mono text-emerald-400 font-bold">{{ claim.claimNumber }}</span>
                        <p class="text-gray-300 text-[11px] mt-0.5">{{ claim.phase }}</p>
                      </td>
                      <td class="p-3">
                        <span class="font-semibold text-white">{{ claim.contractName }}</span>
                        <p class="text-[10px] text-gray-500">{{ claim.client }}</p>
                      </td>
                      <td class="p-3 font-mono text-gray-400">
                        {{ claim.certifiedDate || claim.claimDate }}
                      </td>
                      <td class="p-3 text-right font-mono font-bold text-white">
                        R {{ claim.certifiedAmount | number:'1.2-2' }}
                      </td>
                      <td class="p-3 text-center">
                        <span class="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold uppercase">
                          {{ claim.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot class="bg-gray-900 border-t border-gray-800 font-bold text-white">
                  <tr>
                    <td colspan="3" class="p-3 uppercase">Total Certified Billings to Date</td>
                    <td class="p-3 text-right font-mono text-emerald-400">
                      R {{ summary().totalBilledRevenue | number:'1.2-2' }}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        }

        <!-- MARGIN DRILLDOWN -->
        @if (statModalType() === 'margin') {
          <div class="space-y-4">
            <div class="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/30 p-5">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Mathematical Derivation</span>
              <h3 class="text-2xl font-mono font-black text-white mt-1">
                Blended BOQ Margin: {{ summary().blendedBoqMarginPercent }}%
              </h3>
              <p class="text-xs text-gray-300 mt-2 leading-relaxed">
                Why does this outpace the 25.0% standard baseline margin? Demolition generates <strong class="text-yellow-300">R 2,310,000.00 in salvage recovery credits</strong> (recycled steel, heavy copper, and crushed rubble) which directly subsidize site execution costs.
              </p>

              <!-- Waterfall breakdown formula -->
              <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div class="rounded-lg bg-gray-950 p-3 border border-gray-800">
                  <p class="text-[10px] text-gray-500 uppercase">Gross Certified Billings</p>
                  <p class="font-mono font-bold text-white mt-1">R {{ summary().totalBilledRevenue | number:'1.2-2' }}</p>
                </div>
                <div class="rounded-lg bg-gray-950 p-3 border border-gray-800">
                  <p class="text-[10px] text-gray-500 uppercase">Direct Operating Costs</p>
                  <p class="font-mono font-bold text-rose-400 mt-1">-R {{ summary().totalActualCosts | number:'1.2-2' }}</p>
                </div>
                <div class="rounded-lg bg-gray-950 p-3 border border-gray-800">
                  <p class="text-[10px] text-gray-500 uppercase">Salvage Credit Offset</p>
                  <p class="font-mono font-bold text-yellow-300 mt-1">+R {{ summary().totalSalvageCredit | number:'1.2-2' }}</p>
                </div>
                <div class="rounded-lg bg-gray-950 p-3 border border-emerald-500/40">
                  <p class="text-[10px] text-emerald-400 uppercase font-bold">Net Realized Profit</p>
                  <p class="font-mono font-bold text-emerald-300 mt-1">
                    R {{ (summary().totalBilledRevenue - summary().totalActualCosts + summary().totalSalvageCredit) | number:'1.2-2' }}
                  </p>
                </div>
              </div>

              <div class="mt-3 p-3 rounded-lg bg-gray-950/80 border border-gray-800 text-[11px] font-mono text-gray-300">
                Formula: (Net Realized Profit / Gross Certified Billings) &times; 100 = (R {{ (summary().totalBilledRevenue - summary().totalActualCosts + summary().totalSalvageCredit) | number:'1.0-0' }} / R {{ summary().totalBilledRevenue | number:'1.0-0' }}) &times; 100 = <strong class="text-emerald-400">{{ summary().blendedBoqMarginPercent }}%</strong>
              </div>
            </div>

            <!-- Per-Contract Margin Breakdown Table -->
            <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                  <tr>
                    <th class="p-3">Contract</th>
                    <th class="p-3 text-right">Target Margin</th>
                    <th class="p-3 text-right">Actual Margin</th>
                    <th class="p-3 text-right">Salvage Credit</th>
                    <th class="p-3 text-center">Variance vs Target</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                  @for (c of summary().activeContracts; track c.id) {
                    <tr class="hover:bg-gray-900/60 transition">
                      <td class="p-3 font-semibold text-white">
                        <span class="font-mono text-amber-400 mr-1.5 font-bold">{{ c.id }}</span>
                        {{ c.contractName }}
                      </td>
                      <td class="p-3 text-right font-mono text-gray-300">{{ c.boqTargetMarginPercent }}%</td>
                      <td class="p-3 text-right font-mono font-bold text-emerald-400">{{ c.boqActualMarginPercent }}%</td>
                      <td class="p-3 text-right font-mono text-yellow-300">R {{ c.salvageRecoveryCredit | number:'1.2-2' }}</td>
                      <td class="p-3 text-center">
                        <span class="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                          +{{ (c.boqActualMarginPercent - c.boqTargetMarginPercent) | number:'1.1-1' }}%
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- SALVAGE RECOVERY CREDIT DRILLDOWN -->
        @if (statModalType() === 'salvage') {
          <div class="space-y-4">
            <div class="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4">
              <p class="text-xs font-bold uppercase tracking-wider text-yellow-400">Total Salvage Recovery Credit</p>
              <h3 class="text-xl font-mono font-black text-white mt-1">
                R {{ summary().totalSalvageCredit | number:'1.2-2' }}
              </h3>
              <p class="text-xs text-gray-300 mt-1">
                Certified material recovery value audited through registered weighbridge scale slips, metal classification assay, and dual digital sign-offs.
              </p>
            </div>

            <!-- Material Summary Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <span class="text-[10px] uppercase font-bold text-gray-400">Heavy Structural Steel</span>
                <p class="text-lg font-bold text-white mt-1">781.0 t Recovered</p>
                <p class="text-xs font-mono text-yellow-300 mt-1">Rate: R 2,500.00 / ton</p>
                <p class="text-xs text-gray-400 mt-0.5">Yield: R 1,952,500.00</p>
              </div>
              <div class="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <span class="text-[10px] uppercase font-bold text-amber-400">Armored Copper Cable</span>
                <p class="text-lg font-bold text-amber-200 mt-1">29.8 t Recovered</p>
                <p class="text-xs font-mono text-amber-300 mt-1">Avg: R 7,000.00 / ton</p>
                <p class="text-xs text-gray-400 mt-0.5">Yield: R 208,600.00</p>
              </div>
              <div class="rounded-xl border border-gray-800 bg-gray-950 p-4">
                <span class="text-[10px] uppercase font-bold text-cyan-400">Crushed Concrete Rubble</span>
                <p class="text-lg font-bold text-cyan-200 mt-1">6,030.0 m³ Crushed</p>
                <p class="text-xs font-mono text-cyan-300 mt-1">Backfill Credit: G5 Spec</p>
                <p class="text-xs text-gray-400 mt-0.5">Yield: R 148,900.00</p>
              </div>
            </div>

            <!-- Per-Contract Salvage Breakdown -->
            <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                  <tr>
                    <th class="p-3">Site / Contract</th>
                    <th class="p-3 text-right">Steel (t)</th>
                    <th class="p-3 text-right">Copper (t)</th>
                    <th class="p-3 text-right">Rubble (m³)</th>
                    <th class="p-3 text-right">Total Salvage Credit</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                  @for (c of summary().activeContracts; track c.id) {
                    <tr class="hover:bg-gray-900/60 transition">
                      <td class="p-3">
                        <span class="font-bold text-white">{{ c.contractName }}</span>
                        <p class="text-[10px] text-gray-500">{{ c.siteLocation }}</p>
                      </td>
                      <td class="p-3 text-right font-mono text-white">{{ c.salvageTonnageRecovered }} t</td>
                      <td class="p-3 text-right font-mono text-amber-300">{{ c.copperTonnageRecovered }} t</td>
                      <td class="p-3 text-right font-mono text-cyan-300">{{ c.crushedRubbleVolumeM3 | number }} m³</td>
                      <td class="p-3 text-right font-mono font-bold text-yellow-300">
                        R {{ c.salvageRecoveryCredit | number:'1.2-2' }}
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot class="bg-gray-900 border-t border-gray-800 font-bold text-white">
                  <tr>
                    <td class="p-3 uppercase">Total Portfolio Recovery</td>
                    <td class="p-3 text-right font-mono text-white">781.0 t</td>
                    <td class="p-3 text-right font-mono text-amber-300">29.8 t</td>
                    <td class="p-3 text-right font-mono text-cyan-300">6,030 m³</td>
                    <td class="p-3 text-right font-mono text-yellow-400">
                      R {{ summary().totalSalvageCredit | number:'1.2-2' }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        }

        <!-- COMPLIANCE DRILLDOWN -->
        @if (statModalType() === 'compliance') {
          <div class="space-y-4">
            <div class="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <p class="text-xs font-bold uppercase tracking-wider text-emerald-400">DMRE &amp; Environmental Clearance Rating</p>
              <h3 class="text-xl font-mono font-black text-white mt-1">
                {{ summary().environmentalClearanceRate }}% Portfolio Rating
              </h3>
              <p class="text-xs text-gray-300 mt-1">
                Aggregated compliance score verified by Department of Mineral Resources &amp; Energy (DMRE) and municipal hazardous waste environmental inspectors.
              </p>
            </div>

            <div class="grid gap-3">
              @for (c of summary().activeContracts; track c.id) {
                <div class="rounded-xl border border-gray-800 bg-gray-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span class="font-mono text-amber-400 text-xs font-bold">{{ c.id }}</span>
                    <h4 class="text-sm font-bold text-white mt-0.5">{{ c.contractName }}</h4>
                    <p class="text-xs text-gray-400">{{ c.siteLocation }} · {{ c.client }}</p>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    <span class="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 text-xs font-bold">
                      {{ c.environmentalComplianceScore }}% DMRE Score
                    </span>
                    <button
                      type="button"
                      (click)="openContractFromStat(c, 'compliance')"
                      class="rounded bg-gray-800 hover:bg-gray-700 text-white px-2.5 py-1 text-xs font-bold transition"
                    >
                      View Permits &rarr;
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </app-erp-modal>

    <!-- ================================================================= -->
    <!-- MODAL 2: CONTRACT DEEP-DIVE & DETAIL AUDIT                        -->
    <!-- ================================================================= -->
    <app-erp-modal
      [isOpen]="selectedContract() !== null"
      [title]="selectedContractTitle()"
      size="xl"
      (closed)="selectedContract.set(null)"
    >
      @if (selectedContract(); as contract) {
        <div class="space-y-5 text-xs text-gray-200">
          <!-- Contract Overview Top Banner -->
          <div class="rounded-xl border border-gray-800 bg-gray-950 p-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs font-bold text-amber-400">{{ contract.id }}</span>
                  <span class="text-gray-400 font-semibold">· Client: {{ contract.client }}</span>
                  <span class="text-gray-500">· {{ contract.siteLocation }}</span>
                </div>
                <h3 class="text-base font-bold text-white mt-1">{{ contract.contractName }}</h3>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 text-xs font-bold">
                  {{ contract.currentPhase }}
                </span>
                <span class="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 text-xs font-bold">
                  {{ contract.progressPercent }}% Complete
                </span>
              </div>
            </div>

            <!-- Financial Mini Metric Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              <div>
                <p class="text-[10px] uppercase text-gray-500">Total Contract Value</p>
                <p class="font-mono font-bold text-white text-sm mt-0.5">R {{ contract.totalContractValue | number:'1.2-2' }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase text-gray-500">Certified Billed to Date</p>
                <p class="font-mono font-bold text-emerald-400 text-sm mt-0.5">R {{ contract.billedToDate | number:'1.2-2' }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase text-gray-500">Remaining Unbilled Scope</p>
                <p class="font-mono font-bold text-gray-300 text-sm mt-0.5">
                  R {{ (contract.totalContractValue - contract.billedToDate) | number:'1.2-2' }}
                </p>
              </div>
              <div>
                <p class="text-[10px] uppercase text-gray-500">Actual BOQ Margin</p>
                <p class="font-mono font-bold text-emerald-300 text-sm mt-0.5">
                  {{ contract.boqActualMarginPercent }}% <span class="text-[10px] text-gray-500">(Target: {{ contract.boqTargetMarginPercent }}%)</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Tab Navigation for Detail Drilldown -->
          <div class="flex items-center gap-1 border-b border-gray-800 pb-2">
            <button
              type="button"
              (click)="activeContractTab.set('boq')"
              class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
              [ngClass]="activeContractTab() === 'boq' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
            >
              BOQ Breakdown ({{ contract.boqLineItems?.length || 0 }} Sections)
            </button>
            <button
              type="button"
              (click)="activeContractTab.set('claims')"
              class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
              [ngClass]="activeContractTab() === 'claims' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
            >
              Certified Milestone Claims ({{ contract.paymentClaims?.length || 0 }})
            </button>
            <button
              type="button"
              (click)="activeContractTab.set('salvage')"
              class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
              [ngClass]="activeContractTab() === 'salvage' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
            >
              Salvage Yield &amp; Waybills ({{ contract.salvageWaybills?.length || 0 }})
            </button>
            <button
              type="button"
              (click)="activeContractTab.set('compliance')"
              class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
              [ngClass]="activeContractTab() === 'compliance' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
            >
              SHEQ &amp; Environmental ({{ contract.complianceAudits?.length || 0 }})
            </button>
          </div>

          <!-- TAB 1: BOQ Breakdown -->
          @if (activeContractTab() === 'boq') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-xs text-gray-400">Detailed itemization of contract scope, estimated direct cost, and completion progress.</p>
                <span class="font-mono text-xs text-yellow-400 font-bold">Sum: R {{ contract.totalContractValue | number:'1.2-2' }}</span>
              </div>

              <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
                <table class="w-full text-left text-xs">
                  <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                    <tr>
                      <th class="p-3">BOQ Section &amp; Scope</th>
                      <th class="p-3 text-right">Est. Direct Cost</th>
                      <th class="p-3 text-right">Contract Value</th>
                      <th class="p-3 text-right">Margin %</th>
                      <th class="p-3 text-center">Progress</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-800">
                    @for (item of contract.boqLineItems || []; track item.section) {
                      <tr class="hover:bg-gray-900/60 transition">
                        <td class="p-3 max-w-[280px]">
                          <p class="font-bold text-white">{{ item.section }}</p>
                          <p class="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{{ item.description }}</p>
                        </td>
                        <td class="p-3 text-right font-mono text-gray-400">
                          R {{ item.estimatedCost | number:'1.2-2' }}
                        </td>
                        <td class="p-3 text-right font-mono font-bold text-white">
                          R {{ item.contractValue | number:'1.2-2' }}
                        </td>
                        <td class="p-3 text-right font-mono font-semibold text-emerald-400">
                          {{ item.marginPercent }}%
                        </td>
                        <td class="p-3 text-center">
                          <div class="flex items-center justify-center gap-1.5">
                            <span class="font-bold text-yellow-400">{{ item.completionPercent }}%</span>
                            <div class="w-12 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                              <div class="bg-yellow-500 h-1.5 rounded-full" [style.width.%]="item.completionPercent"></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB 2: Certified Milestone Claims -->
          @if (activeContractTab() === 'claims') {
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-xs text-gray-400">Independent certified progress payment certificates issued for this project.</p>
                <span class="font-mono text-xs text-emerald-400 font-bold">Certified Total: R {{ contract.billedToDate | number:'1.2-2' }}</span>
              </div>

              <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
                <table class="w-full text-left text-xs">
                  <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                    <tr>
                      <th class="p-3">Claim #</th>
                      <th class="p-3">Phase Milestone</th>
                      <th class="p-3">Dates</th>
                      <th class="p-3 text-right">Claimed</th>
                      <th class="p-3 text-right">Certified</th>
                      <th class="p-3">Certifying Engineer</th>
                      <th class="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-800">
                    @for (claim of contract.paymentClaims || []; track claim.claimNumber) {
                      <tr class="hover:bg-gray-900/60 transition">
                        <td class="p-3 font-mono font-bold text-yellow-400">{{ claim.claimNumber }}</td>
                        <td class="p-3 font-semibold text-white">{{ claim.phase }}</td>
                        <td class="p-3 text-gray-400 text-[11px]">
                          Claimed: {{ claim.claimDate }}
                          @if (claim.certifiedDate) {
                            <br /><span class="text-emerald-400">Certified: {{ claim.certifiedDate }}</span>
                          }
                        </td>
                        <td class="p-3 text-right font-mono text-gray-300">
                          R {{ claim.claimedAmount | number:'1.2-2' }}
                        </td>
                        <td class="p-3 text-right font-mono font-bold text-emerald-400">
                          R {{ claim.certifiedAmount | number:'1.2-2' }}
                        </td>
                        <td class="p-3 text-gray-300 text-[11px]">{{ claim.certifiedBy }}</td>
                        <td class="p-3 text-center">
                          <span
                            class="rounded px-2 py-0.5 text-[10px] font-bold uppercase border"
                            [ngClass]="claim.status === 'certified' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'"
                          >
                            {{ claim.status }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB 3: Salvage Yield & Waybills -->
          @if (activeContractTab() === 'salvage') {
            <div class="space-y-4">
              <!-- Summary Pill Bar -->
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div class="rounded-lg bg-gray-950 p-3 border border-gray-800">
                  <p class="text-[10px] text-gray-500 uppercase">Structural Steel</p>
                  <p class="font-mono font-bold text-white mt-1">{{ contract.salvageTonnageRecovered }} tons</p>
                </div>
                <div class="rounded-lg bg-gray-950 p-3 border border-gray-800">
                  <p class="text-[10px] text-amber-500 uppercase">Copper Cable</p>
                  <p class="font-mono font-bold text-amber-300 mt-1">{{ contract.copperTonnageRecovered }} tons</p>
                </div>
                <div class="rounded-lg bg-gray-950 p-3 border border-gray-800">
                  <p class="text-[10px] text-cyan-500 uppercase">Crushed Rubble</p>
                  <p class="font-mono font-bold text-cyan-300 mt-1">{{ contract.crushedRubbleVolumeM3 | number }} m³</p>
                </div>
                <div class="rounded-lg bg-gray-950 p-3 border border-yellow-500/40">
                  <p class="text-[10px] text-yellow-400 uppercase font-bold">Total Salvage Credit</p>
                  <p class="font-mono font-bold text-yellow-300 mt-1">R {{ contract.salvageRecoveryCredit | number:'1.2-2' }}</p>
                </div>
              </div>

              <!-- Itemized Waybill Tickets -->
              <div class="space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-white">Dispatched Waybills &amp; Digital Custody Slips</h4>
                <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                      <tr>
                        <th class="p-3">Waybill #</th>
                        <th class="p-3">Dispatch Date</th>
                        <th class="p-3">Material</th>
                        <th class="p-3 text-right">Net Weight</th>
                        <th class="p-3 text-right">Recovered Credit</th>
                        <th class="p-3">Transporter &amp; Vehicle</th>
                        <th class="p-3">Dual Authenticated Signatures</th>
                        <th class="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                      @for (wb of contract.salvageWaybills || []; track wb.waybillNumber) {
                        <tr class="hover:bg-gray-900/60 transition">
                          <td class="p-3 font-mono font-bold text-yellow-400">{{ wb.waybillNumber }}</td>
                          <td class="p-3 text-gray-400 font-mono">{{ wb.dispatchDate }}</td>
                          <td class="p-3 font-semibold text-white">{{ wb.materialType }}</td>
                          <td class="p-3 text-right font-mono font-bold text-white">{{ wb.netWeightTon }} t</td>
                          <td class="p-3 text-right font-mono font-bold text-yellow-300">
                            R {{ wb.totalCreditValue | number:'1.2-2' }}
                          </td>
                          <td class="p-3 text-[11px]">
                            <p class="font-semibold text-gray-300">{{ wb.transporterName }}</p>
                            <p class="font-mono text-gray-500">{{ wb.vehicleRegistration }} ({{ wb.weighbridgeSlipNumber }})</p>
                          </td>
                          <td class="p-3 text-[10px] text-gray-400">
                            <p><strong class="text-gray-300">Driver:</strong> {{ wb.driverSignature }}</p>
                            <p><strong class="text-gray-300">Officer:</strong> {{ wb.storageOfficerSignature }}</p>
                          </td>
                          <td class="p-3 text-center">
                            <span class="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold uppercase">
                              {{ wb.status }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          }

          <!-- TAB 4: SHEQ & Environmental -->
          @if (activeContractTab() === 'compliance') {
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <p class="text-xs text-gray-400">Statutory environmental permits, mine closure certificates, and hazardous waste destruction manifests.</p>
                <span class="font-mono text-xs text-emerald-400 font-bold">Audit Score: {{ contract.environmentalComplianceScore }}%</span>
              </div>

              <div class="grid gap-3">
                @for (audit of contract.complianceAudits || []; track audit.permitNumber) {
                  <div class="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-2">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
                      <div>
                        <span class="font-mono text-xs font-bold text-yellow-400">{{ audit.permitNumber }}</span>
                        <h4 class="text-sm font-bold text-white mt-0.5">{{ audit.certificateType }}</h4>
                        <p class="text-xs text-gray-400">{{ audit.authority }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 text-xs font-bold uppercase">
                          {{ audit.status }}
                        </span>
                        <span class="rounded bg-gray-800 text-white px-2 py-1 text-xs font-mono font-bold">
                          Score: {{ audit.inspectionScore }}%
                        </span>
                      </div>
                    </div>
                    <p class="text-xs text-gray-300">{{ audit.notes }}</p>
                    <p class="text-[10px] text-gray-500">Last statutory inspection: {{ audit.lastInspectedDate }}</p>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </app-erp-modal>

    <!-- ================================================================= -->
    <!-- MODAL 3: SCRAP WAYBILL & CHAIN OF CUSTODY REGISTER               -->
    <!-- ================================================================= -->
    <app-erp-modal
      [isOpen]="showWaybillModal()"
      title="Chain of Custody Protocol: Scrap Metal Waybill & Weighbridge Register"
      size="xl"
      (closed)="showWaybillModal.set(false)"
    >
      <div class="space-y-5 text-xs text-gray-200">
        <!-- Top Protocol Banner -->
        <div class="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-sky-400">Strict Dual-Authentication &amp; Zero Variance Security</span>
              <h3 class="text-base font-bold text-white mt-1">
                Scrap Metal Waybill &amp; Joint Liability Sign-off Audit Register
              </h3>
              <p class="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
                All high-value salvaged structural steel, copper transformers, and plant equipment dispatched from West Gold, Tau Mine, and Mine Villages undergo 2–3 minute gate entry dwell checks, digital weighbridge gross/tare certification, and dual cryptographic signatures (Driver &amp; Senatla Storage Officer).
              </p>
            </div>
            <div class="text-right shrink-0">
              <span class="font-mono text-sm font-bold text-cyan-300">412t Steel Dispatched</span>
              <p class="text-[11px] text-emerald-400 font-bold mt-0.5">0 Unreconciled Variances</p>
            </div>
          </div>
        </div>

        <!-- Full Master Dispatched Waybills Table -->
        <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
              <tr>
                <th class="p-3">Waybill #</th>
                <th class="p-3">Origin Mine Site</th>
                <th class="p-3">Material Category</th>
                <th class="p-3 text-right">Net Weight</th>
                <th class="p-3 text-right">Credit Value</th>
                <th class="p-3">Weighbridge &amp; Transporter</th>
                <th class="p-3">Dual Digital Signatures</th>
                <th class="p-3 text-center">Dwell Time</th>
                <th class="p-3 text-center">Reconciliation</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              @for (wb of allWaybills(); track wb.waybillNumber) {
                <tr class="hover:bg-gray-900/60 transition">
                  <td class="p-3 font-mono font-bold text-yellow-400">{{ wb.waybillNumber }}</td>
                  <td class="p-3">
                    <span class="font-bold text-white">{{ wb.siteName }}</span>
                    <p class="text-[10px] text-gray-500 font-mono">{{ wb.contractId }} · {{ wb.dispatchDate }}</p>
                  </td>
                  <td class="p-3 font-semibold text-white">{{ wb.materialType }}</td>
                  <td class="p-3 text-right font-mono font-bold text-white">{{ wb.netWeightTon }} t</td>
                  <td class="p-3 text-right font-mono font-bold text-yellow-300">
                    R {{ wb.totalCreditValue | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-[11px]">
                    <p class="font-bold text-gray-300">{{ wb.transporterName }}</p>
                    <p class="font-mono text-gray-500">{{ wb.vehicleRegistration }} · Slip #{{ wb.weighbridgeSlipNumber }}</p>
                  </td>
                  <td class="p-3 text-[10px] text-gray-400">
                    <p><strong class="text-cyan-300">Driver:</strong> {{ wb.driverSignature }}</p>
                    <p><strong class="text-emerald-300">Officer:</strong> {{ wb.storageOfficerSignature }}</p>
                  </td>
                  <td class="p-3 text-center font-mono text-gray-300">
                    {{ wb.dwellCheckMinutes }} min
                  </td>
                  <td class="p-3 text-center">
                    <span class="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {{ wb.status }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-erp-modal>
  `,
})
export class DemolitionRehabDashboardComponent {
  readonly service = inject(DomainDashboardService);
  readonly summary = this.service.demolitionSummary;

  // Modal State Signals
  readonly statModalType = signal<DemolitionStatType | null>(null);
  readonly selectedContract = signal<DemolitionProject | null>(null);
  readonly activeContractTab = signal<ContractDetailTab>('boq');
  readonly showWaybillModal = signal<boolean>(false);

  openStatDrilldown(type: DemolitionStatType): void {
    this.statModalType.set(type);
  }

  openContractDetail(contract: DemolitionProject): void {
    this.selectedContract.set(contract);
    this.activeContractTab.set('boq');
  }

  openContractFromStat(contract: DemolitionProject, tab: ContractDetailTab = 'boq'): void {
    this.statModalType.set(null);
    this.selectedContract.set(contract);
    this.activeContractTab.set(tab);
  }

  statModalTitle(): string {
    switch (this.statModalType()) {
      case 'portfolio':
        return 'Audit Trace: Total Contract Portfolio (R 14,200,000.00)';
      case 'revenue':
        return 'Audit Trace: Certified Milestone Billings (R 8,335,000.00)';
      case 'margin':
        return 'Formula & Origin: Blended BOQ Margin (56.6%)';
      case 'salvage':
        return 'Audit Trace: Salvage Recovery Credits (R 2,310,000.00)';
      case 'compliance':
        return 'Audit Trace: DMRE Environmental Clearance (96.0%)';
      default:
        return 'Operational Audit Drilldown';
    }
  }

  selectedContractTitle(): string {
    const c = this.selectedContract();
    return c ? `[${c.id}] ${c.contractName} — Source Audit` : 'Contract Source Audit';
  }

  allPaymentClaims(): Array<any> {
    const claims: any[] = [];
    for (const c of this.summary().activeContracts) {
      for (const claim of c.paymentClaims || []) {
        if (claim.certifiedAmount > 0) {
          claims.push({
            ...claim,
            contractName: c.contractName,
            client: c.client,
          });
        }
      }
    }
    return claims;
  }

  allWaybills(): Array<any> {
    const waybills: any[] = [];
    for (const c of this.summary().activeContracts) {
      for (const wb of c.salvageWaybills || []) {
        waybills.push({
          ...wb,
          contractId: c.id,
          siteName: c.siteLocation,
        });
      }
    }
    return waybills;
  }
}
