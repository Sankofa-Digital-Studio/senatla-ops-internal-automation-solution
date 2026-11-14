import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';
import { ErpStatCardComponent } from '../../../components/erp/erp-stat-card.component';
import { ErpStatusBadgeComponent } from '../../../components/erp/erp-status-badge.component';
import { ErpModalComponent } from '../../../components/erp/erp-modal.component';

export type MacroStatType = 'revenue' | 'costs' | 'profit' | 'cashflow';

@Component({
  selector: 'app-overall-macro-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ErpStatCardComponent, ErpStatusBadgeComponent, ErpModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6" id="panel-overall_macro" role="tabpanel" aria-labelledby="tab-overall_macro">
      <!-- Section Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-400 border border-sky-500/20">
              Macro Scope: Executive Rollup
            </span>
            <span class="text-xs text-gray-400">· Multi-Domain Consolidated Operations</span>
          </div>
          <h2 class="mt-1 text-xl font-bold text-white tracking-tight">
            Overall Macro Scope Dashboard
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">
            Cross-domain P&amp;L consolidation, cash flow working capital, fleet utilization, and operational risk radar.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="service.selectDomain('engineering')"
            class="rounded-lg border border-yellow-500/40 bg-yellow-950/20 px-3 py-1.5 text-xs font-bold text-yellow-300 hover:bg-yellow-900/40 transition"
          >
            Drilldown: Engineering &rarr;
          </button>
          <button
            type="button"
            (click)="service.selectDomain('demolition_rehabilitation')"
            class="rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/40 transition"
          >
            Drilldown: Demolition &rarr;
          </button>
        </div>
      </div>

      <!-- 4 Top Executive Rollup Stat Cards (Interactive Drilldowns) -->
      <div class="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-erp-stat-card
          title="Consolidated Revenue"
          [value]="'R ' + (macro().consolidatedRevenue | number:'1.2-2')"
          subtext="Engineering + Demolition certified billings"
          tone="accent"
          [interactive]="true"
          drilldownHint="Audit Rollup &rarr;"
          (cardClick)="statModal.set('revenue')"
        ></app-erp-stat-card>

        <app-erp-stat-card
          title="Consolidated Operating Cost"
          [value]="'R ' + (macro().consolidatedOperatingCosts | number:'1.2-2')"
          subtext="Materials, direct labour & workshop overheads"
          tone="default"
          [interactive]="true"
          drilldownHint="Audit Rollup &rarr;"
          (cardClick)="statModal.set('costs')"
        ></app-erp-stat-card>

        <app-erp-stat-card
          title="Consolidated Net Profit"
          [value]="'R ' + (macro().consolidatedNetProfit | number:'1.2-2')"
          [subtext]="macro().consolidatedMarginPercent + '% Blended Margin'"
          badge="High Margin"
          tone="success"
          [interactive]="true"
          drilldownHint="Audit Rollup &rarr;"
          (cardClick)="statModal.set('profit')"
        ></app-erp-stat-card>

        <app-erp-stat-card
          title="Free Cash Flow"
          [value]="'R ' + (workingCapital().netFreeCashFlow | number:'1.2-2')"
          [subtext]="'Working Capital Ratio: ' + workingCapital().workingCapitalRatio + 'x'"
          badge="Liquid"
          tone="success"
          [interactive]="true"
          drilldownHint="Audit Cash Flow &rarr;"
          (cardClick)="statModal.set('cashflow')"
        ></app-erp-stat-card>
      </div>

      <!-- Domain Contribution Comparison Table -->
      <div class="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">
              Domain Financial Contribution &amp; P&amp;L Rollup
            </h3>
            <p class="text-xs text-gray-400">Direct comparison across Engineering, Demolition &amp; Rehabilitation, and Underground Works. Click any row to switch domain.</p>
          </div>
          <span class="text-xs font-semibold text-gray-400">
            Total Multi-Domain Headcount: 147 Active Personnel
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[650px] text-left text-xs">
            <thead class="bg-gray-950 uppercase text-gray-500 font-bold">
              <tr>
                <th class="p-3">Operational Domain</th>
                <th class="p-3 text-center">Active Projects</th>
                <th class="p-3 text-right">Recognized Revenue</th>
                <th class="p-3 text-right">Audited Costs</th>
                <th class="p-3 text-right">Net Profit</th>
                <th class="p-3 text-right">Margin %</th>
                <th class="p-3 text-center">Operational Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              @for (item of macro().domainContributions; track item.domain) {
                <tr
                  class="hover:bg-gray-950/60 transition cursor-pointer group"
                  (click)="item.domain !== 'underground_works' ? service.selectDomain(item.domain) : null"
                >
                  <td class="p-3 font-semibold text-white flex items-center gap-2 group-hover:text-yellow-400 transition-colors">
                    <span
                      class="w-2 h-2 rounded-full"
                      [ngClass]="item.domain === 'engineering' ? 'bg-yellow-400' : item.domain === 'demolition_rehabilitation' ? 'bg-amber-400' : 'bg-gray-500'"
                    ></span>
                    {{ item.label }}
                    <span class="text-[10px] text-gray-500 font-normal">(&rarr;)</span>
                  </td>
                  <td class="p-3 text-center font-bold text-gray-300">
                    {{ item.activeProjectsCount }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-white">
                    R {{ item.revenue | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono text-gray-300">
                    R {{ item.costs | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-emerald-400">
                    R {{ item.profit | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-bold" [ngClass]="item.marginPercent > 0 ? 'text-emerald-300' : 'text-gray-500'">
                    {{ item.marginPercent }}%
                  </td>
                  <td class="p-3 text-center">
                    <app-erp-status-badge
                      [status]="item.status === 'nominal' ? 'completed' : 'pending'"
                      [label]="item.status === 'nominal' ? 'Active Scope' : 'Scope Deferred'"
                    ></app-erp-status-badge>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Working Capital & Fleet Telemetry Two-Column Grid -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Cash Flow & Working Capital -->
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-sm space-y-4">
          <div class="border-b border-gray-800 pb-3">
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">
              Cash Flow &amp; Working Capital Position
            </h3>
            <p class="text-xs text-gray-400">Receivables collection efficiency and audited operating cash reserves.</p>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="rounded-lg bg-gray-950 p-3">
              <p class="text-[10px] text-gray-500 uppercase tracking-wider">Projected Inflow (92%)</p>
              <p class="font-mono text-lg font-bold text-emerald-400 mt-1">
                R {{ workingCapital().projectedInflow | number:'1.2-2' }}
              </p>
            </div>
            <div class="rounded-lg bg-gray-950 p-3">
              <p class="text-[10px] text-gray-500 uppercase tracking-wider">Audited Outflow (+5%)</p>
              <p class="font-mono text-lg font-bold text-rose-400 mt-1">
                R {{ workingCapital().auditedOutflow | number:'1.2-2' }}
              </p>
            </div>
            <div class="rounded-lg bg-gray-950 p-3">
              <p class="text-[10px] text-gray-500 uppercase tracking-wider">Net Free Cash Flow</p>
              <p class="font-mono text-lg font-bold text-white mt-1">
                R {{ workingCapital().netFreeCashFlow | number:'1.2-2' }}
              </p>
            </div>
            <div class="rounded-lg bg-gray-950 p-3">
              <p class="text-[10px] text-gray-500 uppercase tracking-wider">Unallocated Reserve (35%)</p>
              <p class="font-mono text-lg font-bold text-yellow-300 mt-1">
                R {{ workingCapital().unallocatedReserve | number:'1.2-2' }}
              </p>
            </div>
          </div>
        </article>

        <!-- Fleet Telemetry & Utilization: primary KPIs follow the dashboard scan path. -->
        <article data-testid="director-fleet-telemetry" class="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-sm space-y-4">
          <div class="border-b border-gray-800 pb-3">
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">
              Fleet &amp; Heavy Machinery Telemetry
            </h3>
            <p class="text-xs text-gray-400">Excavators, wheel loaders, drill rigs, and mobile cranes.</p>
          </div>

          <div data-testid="director-fleet-primary-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div data-testid="fleet-utilization-metric" class="min-h-[96px] rounded-lg border border-yellow-500/20 bg-gray-950 p-3 flex flex-col justify-between">
              <p class="text-[10px] text-gray-500 uppercase tracking-wider">Fleet Utilization</p>
              <p class="font-mono text-lg font-bold text-yellow-400 mt-1">
                {{ fleet().utilizationPercent }}%
              </p>
              <p class="text-[11px] text-gray-400 mt-1">{{ fleet().activeInField }} of {{ fleet().totalHeavyMachinery }} deployed</p>
            </div>
            <div data-testid="fleet-maintenance-metric" class="min-h-[96px] rounded-lg border border-amber-500/20 bg-gray-950 p-3 flex flex-col justify-between">
              <p class="text-[10px] text-gray-500 uppercase tracking-wider">Under Maintenance</p>
              <p class="font-mono text-lg font-bold text-amber-400 mt-1">
                {{ fleet().underMaintenance }} Units
              </p>
              <p class="text-[11px] text-gray-400 mt-1">Spares &amp; servicing active</p>
            </div>
          </div>

          <div data-testid="director-fleet-secondary-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-800 pt-3 text-xs">
            <div data-testid="fleet-fuel-burn-metric" class="min-h-[84px] rounded-lg bg-gray-950 p-3">
              <p class="text-[10px] text-gray-500 uppercase tracking-wider">Aggregate Fuel Burn Rate</p>
              <p class="font-mono text-lg font-bold text-white mt-1">
                R {{ fleet().hourlyFuelBurnRateTotal }}/hr
              </p>
              <p class="text-[11px] text-gray-400 mt-0.5">Operating hours logged</p>
            </div>
            <div data-testid="fleet-fuel-expense-metric" class="min-h-[84px] rounded-lg bg-gray-950 p-3">
              <p class="text-[10px] text-gray-500 uppercase tracking-wider">Total Fuel Expense</p>
              <p class="font-mono text-lg font-bold text-white mt-1">
                R {{ fleet().fuelCostToDate | number:'1.2-2' }}
              </p>
              <p class="text-[11px] text-gray-400 mt-0.5">Diesel telemetry reconciled</p>
            </div>
          </div>
        </article>
      </div>

      <!-- Cross-Domain Bottlenecks & Risk Radar -->
      <div class="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">
              Cross-Domain Operational Bottlenecks &amp; Risk Radar
            </h3>
            <p class="text-xs text-gray-400">Consolidated friction points impacting delivery schedules, profit recognition, or site safety.</p>
          </div>
          <span class="rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 px-3 py-1 text-xs font-bold">
            {{ service.bottlenecks().length }} Active Risks Tracked
          </span>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          @for (bn of service.bottlenecks(); track bn.id) {
            <div class="rounded-lg border border-gray-800 bg-gray-950 p-4 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                    {{ bn.domainLabel }} · {{ bn.id }}
                  </span>
                  <span
                    class="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                    [ngClass]="bn.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'"
                  >
                    {{ bn.severity }} severity
                  </span>
                </div>
                <h4 class="text-xs font-bold text-white mt-1.5">{{ bn.title }}</h4>
                <p class="text-xs text-gray-400 mt-1">{{ bn.detail }}</p>
              </div>

              <div class="mt-4 pt-2 border-t border-gray-800 text-[11px] space-y-1">
                <p class="text-yellow-300/90 font-semibold">
                  <strong>Action Required:</strong> {{ bn.actionRequired }}
                </p>
                <div class="flex items-center justify-between text-gray-500 pt-0.5">
                  <span>Owner: {{ bn.owner }}</span>
                  <span>Impact: {{ bn.impactDays }} day(s)</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Macro Stat Drilldown Modal -->
    <app-erp-modal
      [isOpen]="statModal() !== null"
      [title]="statModalTitle()"
      size="lg"
      (closed)="statModal.set(null)"
    >
      <div class="space-y-4 text-xs text-gray-200">
        @if (statModal() === 'revenue') {
          <div class="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4">
            <span class="text-xs font-bold uppercase text-yellow-400">Consolidated Recognized Revenue</span>
            <h3 class="text-xl font-mono font-bold text-white mt-1">R {{ macro().consolidatedRevenue | number:'1.2-2' }}</h3>
            <p class="text-xs text-gray-300 mt-1">Consolidation across all active operational divisions.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                <tr>
                  <th class="p-3">Domain</th>
                  <th class="p-3 text-right">Revenue</th>
                  <th class="p-3 text-right">Share %</th>
                  <th class="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800">
                @for (d of macro().domainContributions; track d.domain) {
                  @if (d.revenue > 0) {
                    <tr>
                      <td class="p-3 font-semibold text-white">{{ d.label }}</td>
                      <td class="p-3 text-right font-mono font-bold text-white">R {{ d.revenue | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-mono text-emerald-400">{{ ((d.revenue / macro().consolidatedRevenue) * 100) | number:'1.1-1' }}%</td>
                      <td class="p-3 text-center">
                        <button type="button" (click)="statModal.set(null); service.selectDomain(d.domain)" class="rounded bg-yellow-500 text-black px-2 py-1 text-[11px] font-bold">
                          Go to {{ d.label }} &rarr;
                        </button>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }

        @if (statModal() === 'costs') {
          <div class="rounded-xl border border-gray-800 bg-gray-950 p-4">
            <span class="text-xs font-bold uppercase text-gray-400">Consolidated Operating Costs</span>
            <h3 class="text-xl font-mono font-bold text-white mt-1">R {{ macro().consolidatedOperatingCosts | number:'1.2-2' }}</h3>
            <p class="text-xs text-gray-300 mt-1">Total operational expenditure incurred in delivery across workshops and decommissioning sites.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                <tr>
                  <th class="p-3">Domain</th>
                  <th class="p-3 text-right">Incurred Operating Cost</th>
                  <th class="p-3 text-right">Cost Share</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800">
                @for (d of macro().domainContributions; track d.domain) {
                  @if (d.costs > 0) {
                    <tr>
                      <td class="p-3 font-semibold text-white">{{ d.label }}</td>
                      <td class="p-3 text-right font-mono font-bold text-rose-400">R {{ d.costs | number:'1.2-2' }}</td>
                      <td class="p-3 text-right font-mono text-gray-400">{{ ((d.costs / macro().consolidatedOperatingCosts) * 100) | number:'1.1-1' }}%</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }

        @if (statModal() === 'profit') {
          <div class="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4">
            <span class="text-xs font-bold uppercase text-emerald-400">Consolidated Net Profit</span>
            <h3 class="text-xl font-mono font-bold text-white mt-1">R {{ macro().consolidatedNetProfit | number:'1.2-2' }}</h3>
            <p class="text-xs text-emerald-300 font-semibold mt-0.5">{{ macro().consolidatedMarginPercent }}% Consolidated Blended Margin</p>
            <p class="text-xs text-gray-300 mt-2">Combined net operating margin after audited material costs, workshop overhead absorption, and salvage credits.</p>
          </div>
        }

        @if (statModal() === 'cashflow') {
          <div class="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-2">
            <span class="text-xs font-bold uppercase text-gray-400">Cash Flow &amp; Free Capital Audit</span>
            <h3 class="text-xl font-mono font-bold text-white">R {{ workingCapital().netFreeCashFlow | number:'1.2-2' }} Free Cash Flow</h3>
            <p class="text-xs text-gray-300">Working Capital Ratio: {{ workingCapital().workingCapitalRatio }}x. Total unallocated cash reserve held: R {{ workingCapital().unallocatedReserve | number:'1.2-2' }}.</p>
          </div>
        }
      </div>
    </app-erp-modal>
  `,
})
export class OverallMacroDashboardComponent {
  readonly service = inject(DomainDashboardService);
  readonly macro = this.service.macroFinancialRollup;
  readonly workingCapital = this.service.workingCapital;
  readonly fleet = this.service.fleetTelemetry;

  readonly statModal = signal<MacroStatType | null>(null);

  statModalTitle(): string {
    switch (this.statModal()) {
      case 'revenue':
        return 'Consolidated Revenue Rollup Audit';
      case 'costs':
        return 'Consolidated Operating Costs Audit';
      case 'profit':
        return 'Consolidated Net Profit Audit';
      case 'cashflow':
        return 'Working Capital & Free Cash Flow Audit';
      default:
        return 'Macro Rollup Audit';
    }
  }
}
