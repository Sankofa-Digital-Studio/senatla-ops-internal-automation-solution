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
  readonly assetSummary = computed(() => {
    const assets = this.office.assets();
    const blocked = assets.filter((asset) => this.assetState(asset) === 'blocked').length;
    const attention = assets.filter((asset) => this.assetState(asset) === 'attention').length;
    return { total: assets.length, ready: Math.max(0, assets.length - blocked - attention), attention, blocked };
  });
  readonly costRows = computed(() => this.costAttribution.report()?.rows || []);
  readonly ppeExpense = computed(() => this.costForCategory('ppe'));
  readonly fuelExpense = computed(() => this.costForCategory('fuel'));
  readonly workOrderExpense = computed(() => this.costForCategory('asset_work_order'));
  readonly vendorInvoiceExpense = computed(() => this.costForCategory('vendor_invoice'));
  readonly operatingExpense = computed(() => this.costRows().reduce((sum, row) => sum + row.recognizedAmount, 0));
  readonly unattributedExpense = computed(() => (this.costAttribution.report()?.unattributedRows || []).reduce((sum, row) => sum + (row.sourceAmount || 0), 0));
  readonly provisionalLabourSources = computed(() => this.costRows().filter((row) => row.sourceType === 'labour_provisional').length);
  readonly siteStats = computed(() => this.sites().filter((site) => site.isActive).map((site) => {
    const people = this.staff().filter((employee) => employee.siteId === site.id);
    const recognizedCost = this.costRows().filter((row) => row.siteId === site.id && !!row.jobNumber).reduce((sum, row) => sum + row.recognizedAmount, 0);
    return {
      name: site.name,
      location: site.location,
      jobNumber: site.jobNumber || 'Job number missing',
      staffCount: people.length,
      present: people.filter((employee) => employee.logs[this.today()]?.status === 'present').length,
      recognizedCost,
    };
  }));
  readonly risks = computed(() => [
    ...this.office.assets().filter((asset) => this.assetState(asset) !== 'ready').map((asset) => ({ label: `${asset.make} ${asset.model}`, detail: this.assetState(asset) === 'blocked' ? 'Out of service' : 'Needs attention', severity: this.assetState(asset) })),
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
  private assetState(asset: { id: string; status: string; lifecycleState?: string; licenseExpiry: string }) {
    if (asset.status === 'Expired' || ['retired', 'disposed'].includes(asset.lifecycleState || '')) return 'blocked';
    const work = this.office.assetWorkOrders().some((item) => item.assetId === asset.id && !['completed', 'cancelled'].includes(item.status) && ['critical', 'high'].includes(item.priority));
    if (work) return 'blocked';
    const compliance = this.office.assetComplianceRecords().some((item) => item.assetId === asset.id && ['due', 'expired'].includes(item.status));
    return asset.status === 'Maintenance' || compliance || new Date(`${asset.licenseExpiry}T23:59:59`).getTime() < Date.now() ? 'attention' : 'ready';
  }
  private inPeriod(value: string) { const today = this.today(); return this.viewMode() === 'day' ? value === today : this.viewMode() === 'month' ? value.startsWith(today.slice(0, 7)) : value.startsWith(today.slice(0, 4)); }
  private today() { const now = this.service.currentTime(); return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`; }
}