import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomainDashboardService } from '../../../core/services/domain-dashboard.service';
import { EngineeringOrderRecord, JobCardDetail, JobCardLabourItem, JobCardMaterialItem } from '../../../core/models/domain-dashboard.models';
import { ErpStatusBadgeComponent } from '../../../components/erp/erp-status-badge.component';
import { ErpModalComponent } from '../../../components/erp/erp-modal.component';

export type ProfitMetricType = 'senatla' | 'shareholder' | 'revenue' | 'materials' | 'labour' | 'overheads';
export type JobCardTabType = 'materials' | 'labour' | 'commercial';

@Component({
  selector: 'app-engineering-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, ErpStatusBadgeComponent, ErpModalComponent],
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

      <!-- ========================================================================= -->
      <!-- JOB CARD & PURCHASE ORDER TRACEABILITY PIPELINE                           -->
      <!-- ========================================================================= -->
      <div class="rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Full-Cycle Traceability
              </span>
              <h3 class="text-sm font-bold uppercase tracking-wider text-white">
                Job Card &amp; Purchase Order Traceability Pipeline
              </h3>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">
              Capture details on the job card level: vendor material procurement, quantities, totals, artisan labour, and hours worked linked to client Purchase Orders.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="openCreateJobCardModal()"
              class="rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Capture New Job Card</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[780px] text-left text-xs">
            <thead class="bg-gray-950 uppercase text-gray-500 font-bold">
              <tr>
                <th class="p-3">Linked Client P/O #</th>
                <th class="p-3">Job Card #</th>
                <th class="p-3">Scope &amp; Workshop</th>
                <th class="p-3 text-right">Procured Materials</th>
                <th class="p-3 text-right">Labour &amp; Hours</th>
                <th class="p-3 text-right">P/O Value</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              @for (order of service.engineeringOrders(); track order.id) {
                <tr
                  class="hover:bg-gray-800/80 transition cursor-pointer group"
                  (click)="openJobCardDetail(order)"
                >
                  <td class="p-3">
                    <span class="font-mono font-bold text-yellow-400 group-hover:underline">{{ order.poNumber }}</span>
                    <p class="text-[10px] text-gray-500 mt-0.5">{{ order.client }}</p>
                  </td>
                  <td class="p-3">
                    <span class="font-mono font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                      {{ order.jobCardNumber }}
                    </span>
                  </td>
                  <td class="p-3 max-w-[220px]">
                    <p class="font-semibold text-white line-clamp-1">{{ order.scopeDescription }}</p>
                    <p class="text-[11px] text-gray-400">{{ order.workshop }}</p>
                  </td>
                  <td class="p-3 text-right font-mono">
                    <p class="font-bold text-white">R {{ order.materialsCost | number:'1.2-2' }}</p>
                    <p class="text-[10px] text-gray-400">
                      {{ order.jobCardDetails?.materials?.length || 0 }} vendor item(s)
                    </p>
                  </td>
                  <td class="p-3 text-right font-mono">
                    <p class="font-bold text-emerald-400">{{ order.labourHours }} hrs</p>
                    <p class="text-[10px] text-gray-400">
                      R {{ (order.labourCost || order.labourHours * 350) | number:'1.2-2' }}
                    </p>
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-white">
                    R {{ order.value | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-center">
                    <app-erp-status-badge
                      [status]="order.status === 'completed' ? 'completed' : order.status === 'in_progress' ? 'active' : 'pending'"
                      [label]="order.status === 'completed' ? 'Completed' : order.status === 'in_progress' ? 'In Fabrication' : 'Awaiting Parts'"
                    ></app-erp-status-badge>
                  </td>
                  <td class="p-3 text-center">
                    <span class="rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2.5 py-1 text-[11px] font-bold group-hover:bg-yellow-500 group-hover:text-black transition">
                      Trace &amp; Capture &rarr;
                    </span>
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
                    class="text-xs font-bold text-yellow-400 hover:text-yellow-300 cursor-pointer"
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

    <!-- ========================================================================= -->
    <!-- MODAL 1: JOB CARD DETAIL & DIRECT CAPTURE MODAL                           -->
    <!-- ========================================================================= -->
    <app-erp-modal
      [isOpen]="selectedOrder() !== null"
      [title]="selectedJobCardTitle()"
      size="xl"
      (closed)="selectedOrder.set(null)"
    >
      @if (activeJobCard(); as card) {
        <div class="space-y-5 text-xs text-gray-200">
          <!-- Top Card Header & P/O Linkage Bar -->
          <div class="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                    Job Card: {{ card.jobCardNumber }}
                  </span>
                  <span class="font-mono text-xs font-bold text-yellow-400 bg-yellow-950/60 border border-yellow-800/60 px-2 py-0.5 rounded">
                    Linked P/O: {{ card.purchaseOrderNumber }}
                  </span>
                  <span class="font-mono text-xs font-bold text-violet-300 bg-violet-950/60 border border-violet-800/60 px-2 py-0.5 rounded">
                    Quote: {{ card.quoteNumber || 'Pending quote' }}
                  </span>
                  <span class="text-gray-400">· Client: <strong class="text-white">{{ card.client }}</strong></span>
                </div>
                <h3 class="text-base font-bold text-white mt-1.5">{{ card.scopeDescription }}</h3>
                <p class="text-gray-400 text-[11px] mt-0.5">
                  Workshop: <strong class="text-gray-300">{{ card.workshop }}</strong> · Supervisor: {{ card.assignedSupervisor }} · Target Delivery: {{ card.targetDeliveryDate }}
                </p>
              </div>

              <div class="shrink-0">
                <app-erp-status-badge
                  [status]="card.status === 'completed' ? 'completed' : card.status === 'in_progress' ? 'active' : 'pending'"
                  [label]="card.status === 'completed' ? 'Completed' : card.status === 'in_progress' ? 'In Fabrication' : 'Pending Materials'"
                ></app-erp-status-badge>
              </div>
            </div>

            <!-- Financial Traceability Mini Metrics -->
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div class="rounded-lg bg-gray-900 p-2.5 border border-gray-800">
                <p class="text-[10px] uppercase text-gray-500 font-bold">Linked P/O Value</p>
                <p class="font-mono font-bold text-white text-sm mt-0.5">R {{ card.linkedPoValue | number:'1.2-2' }}</p>
              </div>
              <div class="rounded-lg bg-gray-900 p-2.5 border border-gray-800">
                <p class="text-[10px] uppercase text-gray-500 font-bold">Procured Materials</p>
                <p class="font-mono font-bold text-yellow-400 text-sm mt-0.5">R {{ card.totalMaterialsCost | number:'1.2-2' }}</p>
              </div>
              <div class="rounded-lg bg-gray-900 p-2.5 border border-gray-800">
                <p class="text-[10px] uppercase text-gray-500 font-bold">Labour Cost ({{ card.totalLabourHours }} hrs)</p>
                <p class="font-mono font-bold text-emerald-400 text-sm mt-0.5">R {{ card.totalLabourCost | number:'1.2-2' }}</p>
              </div>
              <div class="rounded-lg bg-gray-900 p-2.5 border border-gray-800">
                <p class="text-[10px] uppercase text-gray-500 font-bold">Total Direct Cost</p>
                <p class="font-mono font-bold text-rose-300 text-sm mt-0.5">R {{ card.totalDirectCost | number:'1.2-2' }}</p>
              </div>
              <div class="rounded-lg bg-gray-900 p-2.5 border border-emerald-500/40">
                <p class="text-[10px] uppercase text-emerald-400 font-bold">Realized Profit Margin</p>
                <p class="font-mono font-bold text-emerald-300 text-sm mt-0.5">
                  {{ card.marginPercent }}%
                </p>
              </div>
            </div>
          </div>

          <!-- Tab Bar Navigation -->
          <div class="flex items-center gap-1 border-b border-gray-800 pb-2">
            <button
              type="button"
              (click)="activeJobCardTab.set('materials')"
              class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
              [ngClass]="activeJobCardTab() === 'materials' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
            >
              Procured Materials &amp; Vendors ({{ card.materials.length }})
            </button>
            <button
              type="button"
              (click)="activeJobCardTab.set('labour')"
              class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
              [ngClass]="activeJobCardTab() === 'labour' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
            >
              Artisan Labour &amp; Hours Worked ({{ card.labour.length }})
            </button>
            <button
              type="button"
              (click)="activeJobCardTab.set('commercial')"
              class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
              [ngClass]="activeJobCardTab() === 'commercial' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'"
            >
              P/O Commercial Traceability
            </button>
          </div>

          <!-- TAB 1: PROCURED MATERIALS -->
          @if (activeJobCardTab() === 'materials') {
            <div class="space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-white">Itemized Materials Procured for this Job Card</h4>
                  <p class="text-xs text-gray-400">Vendor procurement traceability, quantities, unit prices, and delivery note receipts.</p>
                </div>

                <button
                  type="button"
                  (click)="showAddMaterialForm.set(!showAddMaterialForm())"
                  class="rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500 hover:text-black px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  {{ showAddMaterialForm() ? 'Hide Form' : '+ Capture Procured Material' }}
                </button>
              </div>

              <!-- INLINE MATERIAL CAPTURE FORM -->
              @if (showAddMaterialForm()) {
                <div class="rounded-xl border border-yellow-500/40 bg-yellow-950/10 p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                      Capture Material Procurement Line Item
                    </span>
                    <span class="text-[11px] text-gray-400">Linked to Job Card: {{ card.jobCardNumber }}</span>
                  </div>

                  <!-- Quick Vendor Pills -->
                  <div class="space-y-1">
                    <label class="text-[10px] uppercase font-bold text-gray-400">Quick Select Common Vendors</label>
                    <div class="flex flex-wrap gap-1.5">
                      @for (vendor of commonVendors; track vendor) {
                        <button
                          type="button"
                          (click)="matVendor.set(vendor)"
                          class="rounded px-2 py-0.5 text-[10px] font-semibold border transition cursor-pointer"
                          [ngClass]="matVendor() === vendor ? 'bg-yellow-500 text-black border-yellow-400 font-bold' : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-500'"
                        >
                          {{ vendor }}
                        </button>
                      }
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Vendor Name *</label>
                      <input
                        type="text"
                        [ngModel]="matVendor()"
                        (ngModelChange)="matVendor.set($event)"
                        placeholder="e.g. Scaw Metals Group"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Vendor P/O or Invoice #</label>
                      <input
                        type="text"
                        [ngModel]="matPoRef()"
                        (ngModelChange)="matPoRef.set($event)"
                        placeholder="e.g. VND-PO-8812 / INV-9021"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Delivery Note / Waybill #</label>
                      <input
                        type="text"
                        [ngModel]="matDeliveryNote()"
                        (ngModelChange)="matDeliveryNote.set($event)"
                        placeholder="e.g. DN-SCAW-4410"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div class="sm:col-span-2">
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Item / Material Description *</label>
                      <input
                        type="text"
                        [ngModel]="matDescription()"
                        (ngModelChange)="matDescription.set($event)"
                        placeholder="e.g. Hardox 500 Wear Resistant Plates 16mm"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Quantity &amp; Unit</label>
                      <div class="flex gap-1.5">
                        <input
                          type="number"
                          min="1"
                          [ngModel]="matQuantity()"
                          (ngModelChange)="matQuantity.set($event)"
                          class="w-20 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                        />
                        <select
                          [ngModel]="matUnit()"
                          (ngModelChange)="matUnit.set($event)"
                          class="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
                        >
                          <option value="units">units</option>
                          <option value="sheets">sheets</option>
                          <option value="kg">kg</option>
                          <option value="lengths">lengths</option>
                          <option value="drums">drums</option>
                          <option value="sets">sets</option>
                          <option value="meters">meters</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Unit Rate (R) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        [ngModel]="matUnitRate()"
                        (ngModelChange)="matUnitRate.set($event)"
                        placeholder="0.00"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-800">
                    <div class="text-xs font-mono text-yellow-300">
                      Calculated Total: <strong>R {{ (matQuantity() * matUnitRate()) | number:'1.2-2' }}</strong>
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        (click)="showAddMaterialForm.set(false)"
                        class="rounded px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        (click)="submitMaterial()"
                        class="rounded bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1.5 text-xs font-bold transition shadow"
                      >
                        + Add Material to Job Card
                      </button>
                    </div>
                  </div>
                </div>
              }

              <!-- MATERIALS TABLE -->
              <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
                <table class="w-full text-left text-xs">
                  <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                    <tr>
                      <th class="p-3">Vendor &amp; PO Reference</th>
                      <th class="p-3">Item Description</th>
                      <th class="p-3 text-right">Quantity</th>
                      <th class="p-3 text-right">Unit Rate</th>
                      <th class="p-3 text-right">Total Cost</th>
                      <th class="p-3">Delivery Note #</th>
                      <th class="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-800">
                    @for (m of card.materials; track m.id) {
                      <tr class="hover:bg-gray-900/60 transition">
                        <td class="p-3">
                          <span class="font-bold text-white">{{ m.vendorName }}</span>
                          <p class="text-[10px] font-mono text-gray-400 mt-0.5">{{ m.vendorPoOrInvoice || 'Direct Procurement' }}</p>
                        </td>
                        <td class="p-3 max-w-[240px]">
                          <p class="font-semibold text-gray-200">{{ m.itemDescription }}</p>
                          <p class="text-[10px] text-gray-500">Date: {{ m.procuredDate || 'Current Shift' }}</p>
                        </td>
                        <td class="p-3 text-right font-mono text-white">
                          {{ m.quantity }} {{ m.unitOfMeasure }}
                        </td>
                        <td class="p-3 text-right font-mono text-gray-400">
                          R {{ m.unitRate | number:'1.2-2' }}
                        </td>
                        <td class="p-3 text-right font-mono font-bold text-yellow-300">
                          R {{ m.totalCost | number:'1.2-2' }}
                        </td>
                        <td class="p-3 font-mono text-gray-400 text-[11px]">
                          {{ m.deliveryNoteNumber || 'Verified' }}
                        </td>
                        <td class="p-3 text-center">
                          <button
                            type="button"
                            (click)="deleteMaterial(m.id)"
                            class="text-rose-400 hover:text-rose-300 text-[11px] font-bold"
                            title="Remove material entry"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    }
                    @if (!card.materials.length) {
                      <tr>
                        <td colspan="7" class="p-6 text-center text-gray-500">
                          No materials recorded for this job card yet. Click "+ Capture Procured Material" to add.
                        </td>
                      </tr>
                    }
                  </tbody>
                  @if (card.materials.length) {
                    <tfoot class="bg-gray-900 border-t border-gray-800 font-bold text-white">
                      <tr>
                        <td colspan="4" class="p-3 uppercase">Total Procured Materials</td>
                        <td class="p-3 text-right font-mono text-yellow-400">
                          R {{ card.totalMaterialsCost | number:'1.2-2' }}
                        </td>
                        <td colspan="2"></td>
                      </tr>
                    </tfoot>
                  }
                </table>
              </div>
            </div>
          }

          <!-- TAB 2: ARTISAN LABOUR & HOURS WORKED -->
          @if (activeJobCardTab() === 'labour') {
            <div class="space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-white">Artisan Labour &amp; Shift Hours Booked</h4>
                  <p class="text-xs text-gray-400">Boilermakers, coded welders, machinists, and NDT inspector shift allocations.</p>
                </div>

                <button
                  type="button"
                  (click)="showAddLabourForm.set(!showAddLabourForm())"
                  class="rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500 hover:text-black px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  {{ showAddLabourForm() ? 'Hide Form' : '+ Capture Labour & Hours' }}
                </button>
              </div>

              <!-- INLINE LABOUR CAPTURE FORM -->
              @if (showAddLabourForm()) {
                <div class="rounded-xl border border-emerald-500/40 bg-emerald-950/10 p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Capture Artisan Labour &amp; Hours Worked
                    </span>
                    <span class="text-[11px] text-gray-400">Linked to Job Card: {{ card.jobCardNumber }}</span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Artisan / Personnel Name *</label>
                      <input
                        type="text"
                        [ngModel]="labArtisan()"
                        (ngModelChange)="labArtisan.set($event)"
                        placeholder="e.g. S. Dlamini"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Trade Role / Specialization *</label>
                      <select
                        [ngModel]="labRole()"
                        (ngModelChange)="labRole.set($event)"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
                      >
                        <option value="Boilermaker (Red Seal)">Boilermaker (Red Seal)</option>
                        <option value="Coded Welder">Coded Welder (Flux-Core / TIG)</option>
                        <option value="Wheel Lathe Turner / Machinist">Wheel Lathe Turner / Machinist</option>
                        <option value="Ultrasonic NDT Inspector">Ultrasonic NDT Inspector</option>
                        <option value="Mechanical Fitter">Mechanical Fitter &amp; Aligning</option>
                        <option value="Artisan Assistant">Artisan Assistant</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Timesheet Reference</label>
                      <input
                        type="text"
                        [ngModel]="labTimesheet()"
                        (ngModelChange)="labTimesheet.set($event)"
                        placeholder="e.g. TS-2026-W44"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Hours Worked *</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        [ngModel]="labHours()"
                        (ngModelChange)="labHours.set($event)"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Hourly Rate (R) *</label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        [ngModel]="labRate()"
                        (ngModelChange)="labRate.set($event)"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Shift Date</label>
                      <input
                        type="date"
                        [ngModel]="labShiftDate()"
                        (ngModelChange)="labShiftDate.set($event)"
                        class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-800">
                    <div class="text-xs font-mono text-emerald-400">
                      Calculated Labour: <strong>R {{ (labHours() * labRate()) | number:'1.2-2' }}</strong> ({{ labHours() }} hrs @ R {{ labRate() }}/hr)
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        (click)="showAddLabourForm.set(false)"
                        class="rounded px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        (click)="submitLabour()"
                        class="rounded bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-1.5 text-xs font-bold transition shadow"
                      >
                        + Add Labour Entry
                      </button>
                    </div>
                  </div>
                </div>
              }

              <!-- LABOUR TABLE -->
              <div class="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
                <table class="w-full text-left text-xs">
                  <thead class="bg-gray-900 text-gray-400 uppercase font-bold text-[11px]">
                    <tr>
                      <th class="p-3">Artisan / Personnel</th>
                      <th class="p-3">Trade Role</th>
                      <th class="p-3">Shift Date</th>
                      <th class="p-3 text-right">Hours Worked</th>
                      <th class="p-3 text-right">Hourly Rate</th>
                      <th class="p-3 text-right">Total Labour Cost</th>
                      <th class="p-3">Timesheet Ref</th>
                      <th class="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-800">
                    @for (l of card.labour; track l.id) {
                      <tr class="hover:bg-gray-900/60 transition">
                        <td class="p-3 font-bold text-white">{{ l.artisanName }}</td>
                        <td class="p-3 text-gray-300">{{ l.role }}</td>
                        <td class="p-3 font-mono text-gray-400 text-[11px]">{{ l.shiftDate || 'Shift Logged' }}</td>
                        <td class="p-3 text-right font-mono font-bold text-yellow-300">{{ l.hoursWorked }} hrs</td>
                        <td class="p-3 text-right font-mono text-gray-400">R {{ l.hourlyRate | number:'1.2-2' }}/hr</td>
                        <td class="p-3 text-right font-mono font-bold text-emerald-400">
                          R {{ l.totalLabourCost | number:'1.2-2' }}
                        </td>
                        <td class="p-3 font-mono text-gray-400 text-[11px]">{{ l.timesheetReference || 'Verified' }}</td>
                        <td class="p-3 text-center">
                          <button
                            type="button"
                            (click)="deleteLabour(l.id)"
                            class="text-rose-400 hover:text-rose-300 text-[11px] font-bold"
                            title="Remove labour entry"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    }
                    @if (!card.labour.length) {
                      <tr>
                        <td colspan="8" class="p-6 text-center text-gray-500">
                          No labour shifts recorded for this job card yet. Click "+ Capture Labour & Hours" to add.
                        </td>
                      </tr>
                    }
                  </tbody>
                  @if (card.labour.length) {
                    <tfoot class="bg-gray-900 border-t border-gray-800 font-bold text-white">
                      <tr>
                        <td colspan="3" class="p-3 uppercase">Total Direct Labour</td>
                        <td class="p-3 text-right font-mono text-yellow-300">{{ card.totalLabourHours }} hrs</td>
                        <td></td>
                        <td class="p-3 text-right font-mono text-emerald-400">
                          R {{ card.totalLabourCost | number:'1.2-2' }}
                        </td>
                        <td colspan="2"></td>
                      </tr>
                    </tfoot>
                  }
                </table>
              </div>
            </div>
          }

          <!-- TAB 3: P/O COMMERCIAL TRACEABILITY -->
          @if (activeJobCardTab() === 'commercial') {
            <div class="space-y-4">
              <div class="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-white">Purchase Order Commercial Chain</h4>
                <p class="text-xs text-gray-400">
                  Parent-child link between client Purchase Order, Quote, Sales Invoice, and this Job Card.
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div class="p-3 rounded-lg bg-gray-900 border border-gray-800">
                    <span class="text-[10px] text-gray-500 uppercase font-bold">Client Purchase Order</span>
                    <p class="font-mono font-bold text-yellow-400 text-sm mt-0.5">{{ card.purchaseOrderNumber }}</p>
                    <p class="text-[11px] text-gray-400 mt-1">Client: {{ card.client }}</p>
                  </div>

                  <div class="p-3 rounded-lg bg-gray-900 border border-gray-800">
                    <span class="text-[10px] text-gray-500 uppercase font-bold">Total P/O Value</span>
                    <p class="font-mono font-bold text-white text-sm mt-0.5">R {{ card.linkedPoValue | number:'1.2-2' }}</p>
                    <p class="text-[11px] text-gray-400 mt-1">Target Delivery: {{ card.targetDeliveryDate }}</p>
                  </div>

                  <div class="p-3 rounded-lg bg-gray-900 border border-gray-800">
                    <span class="text-[10px] text-gray-500 uppercase font-bold">Quote Reference</span>
                    <p class="font-mono font-bold text-gray-300 text-sm mt-0.5">{{ card.quoteNumber || 'QUO-26-XXXX' }}</p>
                    <p class="text-[11px] text-gray-400 mt-1">Workshop: {{ card.workshop }}</p>
                  </div>

                  <div class="p-3 rounded-lg bg-gray-900 border border-gray-800">
                    <span class="text-[10px] text-gray-500 uppercase font-bold">Sales Invoice Status</span>
                    <p class="font-mono font-bold text-emerald-400 text-sm mt-0.5">{{ card.invoiceNumber || 'INV-PENDING' }}</p>
                    <p class="text-[11px] text-gray-400 mt-1">Supervisor: {{ card.assignedSupervisor }}</p>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </app-erp-modal>

    <!-- ========================================================================= -->
    <!-- MODAL 2: CAPTURE NEW JOB CARD MODAL                                       -->
    <!-- ========================================================================= -->
    <app-erp-modal
      [isOpen]="showCreateJobCardModal()"
      title="Capture New Engineering Job Card (Link to Purchase Order)"
      size="lg"
      (closed)="showCreateJobCardModal.set(false)"
    >
      <div class="space-y-4 text-xs text-gray-200">
        <div class="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-3.5">
          <p class="text-xs text-yellow-300 font-semibold">
            Issue an authoritative fabrication Job Card linked directly to a Client Purchase Order. Once created, you can immediately capture itemized vendor material procurements and artisan labour hours.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Job Card # *</label>
            <input
              type="text"
              [ngModel]="newJobCardNumber()"
              (ngModelChange)="newJobCardNumber.set($event)"
              placeholder="e.g. JC-ENG-215"
              class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Client Purchase Order # *</label>
            <input
              type="text"
              [ngModel]="newPoNumber()"
              (ngModelChange)="newPoNumber.set($event)"
              placeholder="e.g. HAR-PO-2026-8890"
              class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Client Name *</label>
            <input
              type="text"
              [ngModel]="newClient()"
              (ngModelChange)="newClient.set($event)"
              class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Workshop *</label>
            <select
              [ngModel]="newWorkshop()"
              (ngModelChange)="newWorkshop.set($event)"
              class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="Workshop 1 (Boilermaking)">Workshop 1: Heavy Boilermaking</option>
              <option value="Workshop 2 (Train Wheels)">Workshop 2: Train Wheel Manufacturing</option>
              <option value="Workshop 3 (Assembly)">Workshop 3: General Assembly &amp; Finishing</option>
            </select>
          </div>

          <div class="sm:col-span-2">
            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Scope Description *</label>
            <textarea
              rows="2"
              [ngModel]="newScope()"
              (ngModelChange)="newScope.set($event)"
              placeholder="Describe the fabrication scope, components, and client specifications..."
              class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">P/O Contract Value (ZAR) *</label>
            <input
              type="number"
              min="0"
              step="5000"
              [ngModel]="newValue()"
              (ngModelChange)="newValue.set($event)"
              class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Target Delivery Date *</label>
            <input
              type="date"
              [ngModel]="newDeliveryDate()"
              (ngModelChange)="newDeliveryDate.set($event)"
              class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div class="sm:col-span-2">
            <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1">Assigned Supervisor / Trade Lead</label>
            <input
              type="text"
              [ngModel]="newSupervisor()"
              (ngModelChange)="newSupervisor.set($event)"
              placeholder="e.g. M. Sithole (Boilermaker Master)"
              class="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
          <button
            type="button"
            (click)="showCreateJobCardModal.set(false)"
            class="rounded px-4 py-2 text-xs text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="submitNewJobCard()"
            class="rounded bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 text-xs font-bold uppercase transition shadow"
          >
            Create Job Card &amp; Start Capture &rarr;
          </button>
        </div>
      </div>
    </app-erp-modal>

    <!-- ========================================================================= -->
    <!-- MODAL 3: PROFIT METRIC DRILLDOWN MODAL                                    -->
    <!-- ========================================================================= -->
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
  readonly activeJobCardTab = signal<JobCardTabType>('materials');
  readonly showCreateJobCardModal = signal<boolean>(false);

  // Forms Visibility
  readonly showAddMaterialForm = signal<boolean>(false);
  readonly showAddLabourForm = signal<boolean>(false);

  // Material Form Models
  readonly matVendor = signal<string>('Scaw Metals Group');
  readonly matPoRef = signal<string>('');
  readonly matDescription = signal<string>('');
  readonly matQuantity = signal<number>(1);
  readonly matUnit = signal<string>('units');
  readonly matUnitRate = signal<number>(0);
  readonly matDeliveryNote = signal<string>('');

  // Labour Form Models
  readonly labArtisan = signal<string>('');
  readonly labRole = signal<string>('Boilermaker (Red Seal)');
  readonly labHours = signal<number>(8);
  readonly labRate = signal<number>(350);
  readonly labShiftDate = signal<string>(new Date().toISOString().slice(0, 10));
  readonly labTimesheet = signal<string>('');

  // New Job Card Models
  readonly newJobCardNumber = signal<string>('JC-ENG-215');
  readonly newPoNumber = signal<string>('HAR-PO-2026-8890');
  readonly newClient = signal<string>('Harmony Gold Mining Co.');
  readonly newScope = signal<string>('');
  readonly newWorkshop = signal<string>('Workshop 1 (Boilermaking)');
  readonly newValue = signal<number>(650000);
  readonly newDeliveryDate = signal<string>('2026-12-15');
  readonly newSupervisor = signal<string>('M. Sithole (Boilermaker Master)');

  readonly commonVendors = [
    'Scaw Metals Group',
    'Macsteel Trading (Pty) Ltd',
    'Timken South Africa',
    'Lincoln Electric SA',
    'Columbus Stainless',
    'Afrox South Africa',
    'SKF South Africa',
  ];

  activeJobCard(): JobCardDetail | null {
    const order = this.selectedOrder();
    if (!order) return null;
    return order.jobCardDetails || null;
  }

  selectedJobCardTitle(): string {
    const order = this.selectedOrder();
    if (!order) return 'Job Card Traceability';
    return `[${order.jobCardNumber}] Job Card & Purchase Order Traceability`;
  }

  openJobCardDetail(order: EngineeringOrderRecord): void {
    this.selectedOrder.set(order);
    this.activeJobCardTab.set('materials');
    this.showAddMaterialForm.set(false);
    this.showAddLabourForm.set(false);
  }

  openCreateJobCardModal(): void {
    const randomSuffix = Math.floor(215 + Math.random() * 40);
    this.newJobCardNumber.set(`JC-ENG-${randomSuffix}`);
    this.newPoNumber.set(`HAR-PO-2026-${Math.floor(8880 + Math.random() * 100)}`);
    this.newScope.set('');
    this.showCreateJobCardModal.set(true);
  }

  submitMaterial(): void {
    const jc = this.activeJobCard();
    if (!jc) return;
    if (!this.matDescription() || !this.matVendor() || this.matQuantity() <= 0 || this.matUnitRate() <= 0) {
      return;
    }

    this.service.addMaterialToJobCard(jc.jobCardNumber, {
      vendorName: this.matVendor(),
      vendorPoOrInvoice: this.matPoRef() || undefined,
      itemDescription: this.matDescription(),
      quantity: Number(this.matQuantity()),
      unitOfMeasure: this.matUnit(),
      unitRate: Number(this.matUnitRate()),
      deliveryNoteNumber: this.matDeliveryNote() || undefined,
      procuredDate: new Date().toISOString().slice(0, 10),
    });

    // Refresh active order signal
    const updated = this.service.engineeringOrders().find((o) => o.jobCardNumber === jc.jobCardNumber);
    if (updated) {
      this.selectedOrder.set(updated);
    }

    // Reset form
    this.matDescription.set('');
    this.matQuantity.set(1);
    this.matUnitRate.set(0);
    this.matDeliveryNote.set('');
    this.showAddMaterialForm.set(false);
  }

  deleteMaterial(materialId: string): void {
    const jc = this.activeJobCard();
    if (!jc) return;

    this.service.removeMaterialFromJobCard(jc.jobCardNumber, materialId);
    const updated = this.service.engineeringOrders().find((o) => o.jobCardNumber === jc.jobCardNumber);
    if (updated) {
      this.selectedOrder.set(updated);
    }
  }

  submitLabour(): void {
    const jc = this.activeJobCard();
    if (!jc) return;
    if (!this.labArtisan() || this.labHours() <= 0 || this.labRate() <= 0) {
      return;
    }

    this.service.addLabourToJobCard(jc.jobCardNumber, {
      artisanName: this.labArtisan(),
      role: this.labRole(),
      hoursWorked: Number(this.labHours()),
      hourlyRate: Number(this.labRate()),
      shiftDate: this.labShiftDate(),
      timesheetReference: this.labTimesheet() || undefined,
    });

    // Refresh active order signal
    const updated = this.service.engineeringOrders().find((o) => o.jobCardNumber === jc.jobCardNumber);
    if (updated) {
      this.selectedOrder.set(updated);
    }

    // Reset form
    this.labArtisan.set('');
    this.labHours.set(8);
    this.labTimesheet.set('');
    this.showAddLabourForm.set(false);
  }

  deleteLabour(labourId: string): void {
    const jc = this.activeJobCard();
    if (!jc) return;

    this.service.removeLabourFromJobCard(jc.jobCardNumber, labourId);
    const updated = this.service.engineeringOrders().find((o) => o.jobCardNumber === jc.jobCardNumber);
    if (updated) {
      this.selectedOrder.set(updated);
    }
  }

  submitNewJobCard(): void {
    if (!this.newJobCardNumber() || !this.newPoNumber() || !this.newScope()) {
      return;
    }

    const created = this.service.createJobCard({
      jobCardNumber: this.newJobCardNumber(),
      poNumber: this.newPoNumber(),
      client: this.newClient(),
      scopeDescription: this.newScope(),
      workshop: this.newWorkshop(),
      value: Number(this.newValue()),
      deliveryDate: this.newDeliveryDate(),
    });

    this.showCreateJobCardModal.set(false);
    this.openJobCardDetail(created);
  }

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
