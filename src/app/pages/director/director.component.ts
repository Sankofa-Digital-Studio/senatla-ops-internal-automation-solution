import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { StaffDataService } from 'src/app/core/services/staff-data.service';
import { OfficeAdminService } from 'src/app/core/services/office-admin.service';
import { CostAttributionService } from 'src/app/core/services/cost-attribution.service';

@Component({
  selector: 'app-director', templateUrl: './director.component.html', styleUrls: ['./director.component.scss'], standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
})
export class DirectorComponent {
  readonly service = inject(StaffDataService);
  readonly office = inject(OfficeAdminService);
  readonly costAttribution = inject(CostAttributionService);
  readonly viewMode = signal<'day' | 'month' | 'year'>('day');
  readonly staff = computed(() => this.office.employees());
  readonly sites = computed(() => this.office.sites());
  readonly presentCount = computed(() => this.attendance('present'));
  readonly absentCount = computed(() => this.attendance('absent'));
  readonly pendingInvoices = computed(() => this.office.vendorInvoices().filter((invoice) => invoice.status === 'pending_director'));
  readonly pendingInvoiceAmount = computed(() => this.pendingInvoices().reduce((total, invoice) => total + invoice.total, 0));
  readonly periodInvoiceAmount = computed(() => this.office.vendorInvoices().filter((invoice) => this.inPeriod(invoice.invoiceDate)).reduce((total, invoice) => total + invoice.total, 0));
  readonly pendingApprovals = computed(() => this.office.approvals().filter((request) => request.status === 'pending' && request.requestType !== 'full_id_payroll_export'));
  private readonly assetStates = computed(() => {
    const blockedByWorkOrder = new Set(this.office.assetWorkOrders()
      .filter((item) => !['completed', 'cancelled'].includes(item.status) && ['critical', 'high'].includes(item.priority))
      .map((item) => item.assetId));
    const dueCompliance = new Set(this.office.assetComplianceRecords()
      .filter((item) => ['due', 'expired'].includes(item.status))
      .map((item) => item.assetId));
    const now = Date.now();
    const states = new Map<string, 'blocked' | 'attention' | 'ready'>();
    for (const asset of this.office.assets()) {
      let state: 'blocked' | 'attention' | 'ready' = 'ready';
      if (asset.status === 'Expired' || ['retired', 'disposed'].includes(asset.lifecycleState || '') || blockedByWorkOrder.has(asset.id)) {
        state = 'blocked';
      } else if (
        asset.status === 'Maintenance' ||
        dueCompliance.has(asset.id) ||
        new Date(`${asset.licenseExpiry}T23:59:59`).getTime() < now
      ) {
        state = 'attention';
      }
      states.set(asset.id, state);
    }
    return states;
  });
  readonly assetSummary = computed(() => {
    const states = [...this.assetStates().values()];
    const blocked = states.filter((state) => state === 'blocked').length;
    const attention = states.filter((state) => state === 'attention').length;
    return { total: states.length, ready: Math.max(0, states.length - blocked - attention), attention, blocked };
  });
  readonly costRows = computed(() => this.costAttribution.report()?.rows || []);
  readonly ppeExpense = computed(() => this.costForCategory('ppe'));
  readonly fuelExpense = computed(() => this.costForCategory('fuel'));
  readonly workOrderExpense = computed(() => this.costForCategory('asset_work_order'));
  readonly vendorInvoiceExpense = computed(() => this.costForCategory('vendor_invoice'));
  readonly operatingExpense = computed(() => this.costRows().reduce((sum, row) => sum + row.recognizedAmount, 0));
  readonly unattributedExpense = computed(() => (this.costAttribution.report()?.unattributedRows || []).reduce((sum, row) => sum + (row.sourceAmount || 0), 0));
  readonly provisionalLabourSources = computed(() => this.costRows().filter((row) => row.sourceType === 'labour_provisional').length);
  readonly siteStats = computed(() => {
    const staffBySite = new Map<string, { count: number; present: number }>();
    const today = this.today();
    for (const employee of this.staff()) {
      const totals = staffBySite.get(employee.siteId) || { count: 0, present: 0 };
      totals.count += 1;
      if (employee.logs[today]?.status === 'present') totals.present += 1;
      staffBySite.set(employee.siteId, totals);
    }

    const costBySite = new Map<string, number>();
    for (const row of this.costRows()) {
      if (!row.siteId || !row.jobNumber) continue;
      costBySite.set(row.siteId, (costBySite.get(row.siteId) || 0) + row.recognizedAmount);
    }

    return this.sites().filter((site) => site.isActive).map((site) => {
      const people = staffBySite.get(site.id);
      return {
      name: site.name,
      location: site.location,
      jobNumber: site.jobNumber || 'Job number missing',
        staffCount: people?.count || 0,
        present: people?.present || 0,
        recognizedCost: costBySite.get(site.id) || 0,
      };
    });
  });
  readonly risks = computed(() => [
    ...this.office.assets().filter((asset) => this.assetStates().get(asset.id) !== 'ready').map((asset) => {
      const severity = this.assetStates().get(asset.id) || 'ready';
      return { label: `${asset.make} ${asset.model}`, detail: severity === 'blocked' ? 'Out of service' : 'Needs attention', severity };
    }),
    ...this.office.integrationOutbox().filter((event) => event.status === 'failed').map((event) => ({ label: 'Integration delivery', detail: `${event.eventType} failed`, severity: 'blocked' })),
  ].slice(0, 6));
  readonly dataAsOf = computed(() => {
    const dates = [this.service.currentTime(), ...this.office.activity().map((item) => new Date(item.occurredAt)), ...this.office.vendorInvoices().map((item) => new Date(item.updatedAt))]
      .filter((date) => !Number.isNaN(date.getTime()));
    return new Date(Math.max(...dates.map((date) => date.getTime())));
  });
  constructor() {
    effect(() => {
      const bounds = this.costPeriodBounds(this.service.currentTime(), this.viewMode());
      void this.costAttribution.loadCosts({ periodStart: bounds.start, periodEndExclusive: bounds.endExclusive }).catch(() => undefined);
    });
  }

  private costForCategory(category: string) {
    return this.costRows().filter((row) => row.sourceType === category).reduce((sum, row) => sum + row.recognizedAmount, 0);
  }

  private costPeriodBounds(now: Date, mode: 'day' | 'month' | 'year') {
    const start = mode === 'day' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : mode === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);
    const end = mode === 'day' ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : mode === 'month' ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : new Date(now.getFullYear() + 1, 0, 1);
    const key = (value: Date) => `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, '0')}-${`${value.getDate()}`.padStart(2, '0')}`;
    return { start: key(start), endExclusive: key(end) };
  }
  vendorName(vendorId: string) { return this.office.vendorAccounts().find((vendor) => vendor.id === vendorId)?.name || 'Unknown vendor'; }
  private attendance(status: 'present' | 'absent') { return this.staff().filter((employee) => employee.logs[this.today()]?.status === status).length; }
  private inPeriod(value: string) { const today = this.today(); return this.viewMode() === 'day' ? value === today : this.viewMode() === 'month' ? value.startsWith(today.slice(0, 7)) : value.startsWith(today.slice(0, 4)); }
  private today() { const now = this.service.currentTime(); return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`; }
}