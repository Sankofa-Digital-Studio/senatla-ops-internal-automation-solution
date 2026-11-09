import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';
import { EngineeringOrderRecord } from '../../../core/models/domain-dashboard.models';
import { ErpStatusBadgeComponent } from '../../../components/erp/erp-status-badge.component';
import { ErpModalComponent } from '../../../components/erp/erp-modal.component';

export type ProfitMetricType = 'senatla' | 'shareholder' | 'revenue' | 'materials' | 'labour' | 'overheads';

@Component({
  selector: 'app-engineering-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ErpStatusBadgeComponent, ErpModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6" id="panel-engineering" role="tabpanel" aria-labelledby="tab-engineering">
      <!-- Section Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded bg-yellow-500/10 px-2 py-0.5 text-xs font-bold text-yellow-400 border border-yellow-500/20">
              Operational Scope: Engineering
            </span>
            <span class="text-xs text-gray-400">· Harmony Gold Mining Client Contract</span>
          </div>
          <h2 class="mt-1 text-xl font-bold text-white tracking-tight">
            Engineering Operations &amp; 70:30 Profit Engine
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">
            Full-cycle P/O fulfillment, Workshops 1–3 boilermaking &amp; train wheel fabrication, and audited dividend protection.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          @if (profit().unassignedDrawsCount > 0 || profit().unbilledVendorOrdersCount > 0) {
            <button
              type="button"
              (click)="reconcileDraws()"
              class="rounded-lg bg-yellow-500 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-yellow-400 transition shadow"
            >
              Reconcile All Open Draws
            </button>
          } @else {
            <span class="rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-xs font-bold">
              All Orders Reconciled
            </span>
          }
        </div>
      </div>

      <!-- 70:30 Profit Split Hero Banner & Key Financial Cards -->
      <div class="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-gray-900 via-gray-900 to-yellow-950/30 p-6 shadow-xl">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-800 pb-5">
          <div>
            <span class="text-xs font-extrabold uppercase tracking-widest text-yellow-500">Contract Profit Accounting</span>
            <h3 class="text-2xl font-black text-white mt-1">
              R {{ profit().netOperatingProfit | number:'1.2-2' }}
              <span class="text-sm font-semibold text-emerald-400 ml-2">({{ profit().grossMarginPercent }}% Gross Margin)</span>
            </h3>
            <p class="text-xs text-gray-400 mt-1">
              Gross recognized revenue (R {{ profit().totalBilledRevenue | number:'1.2-2' }}) minus audited materials, direct labour, and absorbed overheads.
            </p>
          </div>

          <!-- 70:30 Split Visual Pill Meters (Interactive) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
            <div
              (click)="selectedProfitMetric.set('senatla')"
              class="rounded-xl border border-yellow-500/40 bg-gray-950 p-4 cursor-pointer hover:border-yellow-400 hover:ring-1 hover:ring-yellow-400/40 transition group"
              role="button"
              tabindex="0"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs font-bold uppercase tracking-wider text-yellow-400 group-hover:underline">Senatla Share (70%) &rarr;</span>
                <span class="text-[10px] font-bold text-gray-400">Reinvestment</span>
              </div>
              <p class="mt-2 font-mono text-xl font-black text-white">
                R {{ profit().senatlaShare70 | number:'1.2-2' }}
              </p>
              <p class="text-[11px] text-gray-400 mt-1">Allocated to working capital, workshop tooling, and fleet reserve.</p>
            </div>

            <div
              (click)="selectedProfitMetric.set('shareholder')"
              class="rounded-xl border border-emerald-500/40 bg-gray-950 p-4 cursor-pointer hover:border-emerald-400 hover:ring-1 hover:ring-emerald-400/40 transition group"
              role="button"
              tabindex="0"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-400 group-hover:underline">Shareholders Return (30%) &rarr;</span>
                <span class="text-[10px] font-bold text-gray-400">Dividend</span>
              </div>
              <p class="mt-2 font-mono text-xl font-black text-white">
                R {{ profit().shareholderReturn30 | number:'1.2-2' }}
              </p>
              <p class="text-[11px] text-gray-400 mt-1">Transparent distribution pool available for shareholder declaration.</p>
            </div>
          </div>
        </div>

        <!-- 4 Supporting Financial Metrics (Interactive) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div
            (click)="selectedProfitMetric.set('revenue')"
            class="cursor-pointer hover:bg-gray-800/60 p-2.5 -m-2.5 rounded-lg transition group"
          >
            <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 group-hover:text-yellow-400">Gross Recognized Revenue &rarr;</p>
            <p class="mt-1 font-mono text-lg font-bold text-white">R {{ profit().totalBilledRevenue | number:'1.2-2' }}</p>
            <p class="text-[10px] text-gray-500">Client P/O recognized invoices</p>
          </div>
          <div
            (click)="selectedProfitMetric.set('materials')"
            class="cursor-pointer hover:bg-gray-800/60 p-2.5 -m-2.5 rounded-lg transition group"
          >
            <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 group-hover:text-yellow-400">Materials Incurred &rarr;</p>
            <p class="mt-1 font-mono text-lg font-bold text-white">R {{ profit().materialsExpense | number:'1.2-2' }}</p>
            <p class="text-[10px] text-gray-500">Plate, axles, welding consumables</p>
          </div>
          <div
            (click)="selectedProfitMetric.set('labour')"
            class="cursor-pointer hover:bg-gray-800/60 p-2.5 -m-2.5 rounded-lg transition group"
          >
            <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 group-hover:text-yellow-400">Direct Labour &rarr;</p>
            <p class="mt-1 font-mono text-lg font-bold text-white">R {{ profit().labourExpense | number:'1.2-2' }}</p>
            <p class="text-[10px] text-gray-500">Boilermakers &amp; machinists</p>
          </div>
          <div
            (click)="selectedProfitMetric.set('overheads')"
            class="cursor-pointer hover:bg-gray-800/60 p-2.5 -m-2.5 rounded-lg transition group"
          >
            <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 group-hover:text-yellow-400">Absorbed Overheads &rarr;</p>
            <p class="mt-1 font-mono text-lg font-bold text-white">R {{ profit().absorbedOverheadsExpense | number:'1.2-2' }}</p>
            <p class="text-[10px] text-gray-500">Power, gas, rent, PPE (Workshops 1-3)</p>
          </div>
        </div>
      </div>

      <!-- Anti-Inflation Expense Lock & Governance Card -->
      <div
        class="rounded-xl border p-5 transition"
        [ngClass]="profit().expenseLockStatus === 'locked' ? 'border-amber-600/50 bg-amber-950/20' : 'border-emerald-600/50 bg-emerald-950/20'"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border"
                [ngClass]="profit().expenseLockStatus === 'locked' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'"
              >
                {{ profit().expenseLockStatus === 'locked' ? 'Dividend Declaration Locked' : 'Verified for Distribution' }}
              </span>
              <span class="text-xs text-gray-300 font-semibold">Anti-Inflation Integrity Check</span>
            </div>
            <p class="text-xs text-gray-400 max-w-2xl">
              {{ profit().expenseLockStatus === 'locked'
                ? 'Profit distribution cannot be declared for dividends while unbilled vendor orders or open material draws remain unassigned. Reconcile all outstanding items to ensure net profit is not artificially inflated.'
                : 'All material draws and supplier invoices are reconciled to active job cards. 70:30 profit split is authoritative and unlocked for dividend declaration.'
              }}
            </p>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <div class="text-right">
              <p class="text-[10px] uppercase tracking-wider text-gray-400">Open Variances</p>
              <p class="text-sm font-bold text-white">
                {{ profit().unassignedDrawsCount }} draw(s) · {{ profit().unbilledVendorOrdersCount }} unbilled PO(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Workshops 1–3 Operational Status & Overhead Absorption -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">
              Workshops 1–3 Activity &amp; Monthly Overhead Absorption
            </h3>
            <p class="text-xs text-gray-400">Real-time batch progress, capacity utilization, and monthly utility cost allocation.</p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          @for (ws of service.workshops(); track ws.id) {
            <article class="rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm hover:border-gray-700 transition">
              <div class="flex items-center justify-between gap-2 border-b border-gray-800 pb-3">
                <div>
                  <span class="font-mono text-xs font-bold text-yellow-400">{{ ws.code }}</span>
                  <h4 class="text-sm font-bold text-white mt-0.5">{{ ws.name }}</h4>
                </div>
                <app-erp-status-badge
                  [status]="ws.status === 'nominal' ? 'completed' : 'pending'"
                  [label]="ws.status === 'nominal' ? 'Nominal' : 'Attention'"
                ></app-erp-status-badge>
              </div>

              <p class="text-xs text-gray-400 mt-3 line-clamp-2">{{ ws.primaryActivity }}</p>

              <div class="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-950 p-3 text-xs">
                <div>
                  <p class="text-[10px] text-gray-500 uppercase tracking-wider">Active Batches</p>
                  <p class="font-bold text-white mt-0.5">{{ ws.activeBatches }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-500 uppercase tracking-wider">Capacity Util.</p>
                  <p class="font-bold text-emerald-400 mt-0.5">{{ ws.nominalCapacityUtilization }}%</p>
                </div>
                <div class="col-span-2 pt-2 border-t border-gray-800 flex items-center justify-between">
                  <span class="text-[10px] text-gray-400 uppercase tracking-wider">Monthly Overhead:</span>
                  <span class="font-mono font-bold text-yellow-300">R {{ ws.monthlyOverhead | number:'1.2-2' }}</span>
                </div>
                <div class="col-span-2 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Job Absorption:</span>
                  <span class="font-semibold text-white">{{ ws.overheadAbsorptionRate }}%</span>
                </div>
              </div>
            </article>
          }
        </div>
      </div>

      <!-- Order Management Hierarchy Pipeline (Clickable Table Rows) -->
      <div class="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">
              Client P/O &rarr; Quote &rarr; Invoice &rarr; Job Card Pipeline
            </h3>
            <p class="text-xs text-gray-400">Click any order to inspect complete fabrication details, materials draw, and delivery dates.</p>
          </div>
          <span class="rounded-full bg-gray-800 text-gray-300 px-3 py-1 text-xs font-semibold">
            {{ service.engineeringOrders().length }} Active Tracked Orders
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[700px] text-left text-xs">
            <thead class="bg-gray-950 uppercase text-gray-500 font-bold">
              <tr>
                <th class="p-3">Client P/O #</th>
                <th class="p-3">Quote #</th>
                <th class="p-3">Job Card #</th>
                <th class="p-3">Scope &amp; Workshop</th>
                <th class="p-3 text-right">Value</th>
                <th class="p-3 text-right">Materials</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              @for (order of service.engineeringOrders(); track order.id) {
                <tr
                  class="hover:bg-gray-800/80 transition cursor-pointer group"
                  (click)="selectedOrder.set(order)"
                >
                  <td class="p-3 font-mono font-bold text-yellow-400 group-hover:underline">{{ order.poNumber }}</td>
                  <td class="p-3 font-mono text-gray-300">{{ order.quoteNumber }}</td>
                  <td class="p-3 font-mono text-cyan-300">{{ order.jobCardNumber }}</td>
                  <td class="p-3 max-w-[240px]">
                    <p class="font-semibold text-white line-clamp-1">{{ order.scopeDescription }}</p>
                    <p class="text-[11px] text-gray-400">{{ order.workshop }}</p>
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-white">
                    R {{ order.value | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono text-gray-300">
                    R {{ order.materialsCost | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-center">
                    <app-erp-status-badge
                      [status]="order.status === 'completed' ? 'completed' : order.status === 'in_progress' ? 'active' : 'pending'"
                      [label]="order.status === 'completed' ? 'Completed' : order.status === 'in_progress' ? 'In Fabrication' : 'Awaiting Parts'"
                    ></app-erp-status-badge>
                  </td>
                  <td class="p-3 text-center">
                    <span class="text-xs font-bold text-yellow-400 group-hover:text-yellow-300">Inspect &rarr;</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Wasted Expenditure & Anomaly Alerts -->
      @if (profit().wastedExpenditureAlerts.length > 0) {
        <div class="rounded-xl border border-rose-900/40 bg-gray-900 p-5 space-y-3">
          <div class="flex items-center justify-between border-b border-gray-800 pb-3">
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-rose-400">
                Wasted Expenditure &amp; Scrap Variance Flags
              </h4>
              <p class="text-xs text-gray-400">Unabsorbed costs, scrap thresholds exceeded, or idle tooling events.</p>
            </div>
            <span class="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 text-xs font-bold">
              {{ profit().wastedExpenditureAlerts.length }} Active Alert(s)
            </span>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            @for (alert of profit().wastedExpenditureAlerts; track alert.id) {
              <div class="rounded-lg border border-gray-800 bg-gray-950 p-3.5 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">{{ alert.siteOrWorkshop }}</span>
                    <span class="font-mono text-xs font-bold text-rose-400">R {{ alert.amount | number:'1.2-2' }}</span>
                  </div>
                  <p class="mt-2 text-xs text-gray-200">{{ alert.description }}</p>
                </div>
                <div class="mt-3 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                  <span class="text-gray-500">{{ alert.occurredAt | date:'shortDate' }}</span>
                  <button
                    type="button"
                    (click)="dismissAlert(alert.id)"
                    class="text-xs font-bold text-yellow-400 hover:text-yellow-300"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </section>

    <!-- Order Detail Deep-Dive Modal -->
    <app-erp-modal
      [isOpen]="selectedOrder() !== null"
      [title]="selectedOrder() ? 'Order Trace: ' + selectedOrder()?.poNumber : ''"
      size="lg"
      (closed)="selectedOrder.set(null)"
    >
      @if (selectedOrder(); as order) {
        <div class="space-y-4 text-xs text-gray-200">
          <div class="rounded-xl border border-gray-800 bg-gray-950 p-4">
            <span class="text-[10px] font-mono text-yellow-400 font-bold uppercase tracking-wider">{{ order.id }}</span>
            <h3 class="text-base font-bold text-white mt-1">{{ order.scopeDescription }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">Client: <strong class="text-white">{{ order.client }}</strong> · Workshop: {{ order.workshop }}</p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <span class="text-[10px] uppercase text-gray-500">P/O Value</span>
              <p class="font-mono font-bold text-white text-sm mt-1">R {{ order.value | number:'1.2-2' }}</p>
            </div>
            <div class="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <span class="text-[10px] uppercase text-gray-500">Materials Cost</span>
              <p class="font-mono font-bold text-emerald-400 text-sm mt-1">R {{ order.materialsCost | number:'1.2-2' }}</p>
            </div>
            <div class="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <span class="text-[10px] uppercase text-gray-500">Labour Hours</span>
              <p class="font-mono font-bold text-white text-sm mt-1">{{ order.labourHours }} hrs</p>
            </div>
            <div class="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <span class="text-[10px] uppercase text-gray-500">Delivery Target</span>
              <p class="font-mono font-bold text-yellow-300 text-sm mt-1">{{ order.deliveryDate }}</p>
            </div>
          </div>

          <div class="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-white">Full Traceability Chain</h4>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <p><strong class="text-gray-400">Client P/O #:</strong> <span class="font-mono text-yellow-400">{{ order.poNumber }}</span></p>
              <p><strong class="text-gray-400">Quote #:</strong> <span class="font-mono text-gray-300">{{ order.quoteNumber }}</span></p>
              <p><strong class="text-gray-400">Job Card #:</strong> <span class="font-mono text-cyan-300">{{ order.jobCardNumber }}</span></p>
              <p><strong class="text-gray-400">Invoice Status:</strong> <span class="font-mono text-emerald-400">{{ order.invoiceNumber }}</span></p>
            </div>
          </div>
        </div>
      }
    </app-erp-modal>

    <!-- Profit Metric Drilldown Modal -->
    <app-erp-modal
      [isOpen]="selectedProfitMetric() !== null"
      [title]="profitMetricTitle()"
      size="md"
      (closed)="selectedProfitMetric.set(null)"
    >
      <div class="space-y-4 text-xs text-gray-200">
        @if (selectedProfitMetric() === 'senatla') {
          <div class="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4">
            <span class="text-xs font-bold uppercase text-yellow-400">Senatla 70% Reinvestment Pool</span>
            <h3 class="text-xl font-mono font-bold text-white mt-1">R {{ profit().senatlaShare70 | number:'1.2-2' }}</h3>
            <p class="text-xs text-gray-300 mt-2">
              70% of audited net operating profit retained in Senatla operational reserve for workshop capital expenditure, machine tool maintenance, and working capital buffers.
            </p>
          </div>
        }

        @if (selectedProfitMetric() === 'shareholder') {
          <div class="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4">
            <span class="text-xs font-bold uppercase text-emerald-400">Shareholders Return 30% Dividend Pool</span>
            <h3 class="text-xl font-mono font-bold text-white mt-1">R {{ profit().shareholderReturn30 | number:'1.2-2' }}</h3>
            <p class="text-xs text-gray-300 mt-2">
              Audited dividend distribution pool. Gated strictly by the Anti-Inflation Expense Lock: can only be declared once 100% of vendor invoices and material draws are reconciled.
            </p>
            <div class="mt-3 p-3 rounded-lg bg-gray-950 border border-gray-800">
              <span class="font-bold text-gray-400">Current Distribution Status:</span>
              <span class="ml-2 font-bold uppercase" [ngClass]="profit().isDividendDistributionPermitted ? 'text-emerald-400' : 'text-amber-400'">
                {{ profit().isDividendDistributionPermitted ? 'Unlocked & Ready for Sign-Off' : 'Locked Pending Reconciliation' }}
              </span>
            </div>
          </div>
        }

        @if (selectedProfitMetric() === 'revenue') {
          <div class="p-4 rounded-xl border border-gray-800 bg-gray-950 space-y-2">
            <h4 class="text-sm font-bold text-white">Gross Recognized Revenue</h4>
            <p class="font-mono text-lg font-bold text-yellow-400">R {{ profit().totalBilledRevenue | number:'1.2-2' }}</p>
            <p class="text-gray-400">Recognized billings across Harmony Gold purchase orders currently in progress and delivered.</p>
          </div>
        }

        @if (selectedProfitMetric() === 'materials') {
          <div class="p-4 rounded-xl border border-gray-800 bg-gray-950 space-y-2">
            <h4 class="text-sm font-bold text-white">Materials Expense</h4>
            <p class="font-mono text-lg font-bold text-white">R {{ profit().materialsExpense | number:'1.2-2' }}</p>
            <p class="text-gray-400">Audited plate steel, forged axles, plasma consumables, and epoxy primers.</p>
          </div>
        }

        @if (selectedProfitMetric() === 'labour') {
          <div class="p-4 rounded-xl border border-gray-800 bg-gray-950 space-y-2">
            <h4 class="text-sm font-bold text-white">Direct Boilermaker &amp; Machinist Labour</h4>
            <p class="font-mono text-lg font-bold text-white">R {{ profit().labourExpense | number:'1.2-2' }}</p>
            <p class="text-gray-400">Hours logged across fabrication shifts in Workshops 1, 2, and 3.</p>
          </div>
        }

        @if (selectedProfitMetric() === 'overheads') {
          <div class="p-4 rounded-xl border border-gray-800 bg-gray-950 space-y-2">
            <h4 class="text-sm font-bold text-white">Workshop Absorbed Overheads</h4>
            <p class="font-mono text-lg font-bold text-white">R {{ profit().absorbedOverheadsExpense | number:'1.2-2' }}</p>
            <p class="text-gray-400">Allocation of rent, municipal high-voltage power, industrial gases, and PPE.</p>
          </div>
        }
      </div>
    </app-erp-modal>
  `,
})
export class EngineeringDashboardComponent {
  readonly service = inject(DomainDashboardService);
  readonly profit = this.service.engineeringProfitSummary;

  readonly selectedOrder = signal<EngineeringOrderRecord | null>(null);
  readonly selectedProfitMetric = signal<ProfitMetricType | null>(null);

  reconcileDraws(): void {
    this.service.reconcileUnassignedDraws();
  }

  dismissAlert(id: string): void {
    this.service.dismissWastedAlert(id);
  }

  profitMetricTitle(): string {
    switch (this.selectedProfitMetric()) {
      case 'senatla':
        return 'Senatla 70% Reinvestment Pool Audit';
      case 'shareholder':
        return 'Shareholders Return 30% Pool Audit';
      case 'revenue':
        return 'Recognized Engineering Revenue Audit';
      case 'materials':
        return 'Materials Incurred Audit';
      case 'labour':
        return 'Direct Workshop Labour Audit';
      case 'overheads':
        return 'Absorbed Overheads Audit';
      default:
        return 'Financial Breakdown Audit';
    }
  }
}
