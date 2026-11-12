import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { StaffDataService } from 'src/app/core/services/staff-data.service';
import { OfficeAdminService } from 'src/app/core/services/office-admin.service';
import { CostAttributionService } from 'src/app/core/services/cost-attribution.service';
import { AccessibleDialogDirective } from 'src/app/core/accessibility/accessible-dialog.directive';
import { AuthService } from 'src/app/core/services/auth.service';
import { MultiDomainDashboardComponent } from '../dashboards/multi-domain-dashboard.component';
import { ApprovalRequest, ExecutiveOperationalReport, IntegrationOutboxEvent, VendorInvoiceRecord } from 'src/app/core/models/app.models';

export type DirectorViewTab = 'approvals' | 'domains' | 'costs' | 'workforce' | 'all';
type DirectorQueueKind = 'report' | 'approval' | 'invoice' | 'integration';
type DirectorQueueStatus = 'pending' | 'failed';
type DirectorAction = 'approve' | 'reject';
type DirectorActionStatus = 'idle' | 'saving' | 'success' | 'error';

interface DirectorQueueItem {
  id: string;
  kind: DirectorQueueKind;
  status: DirectorQueueStatus;
  label: string;
  detail: string;
  createdAt: string;
  destination: DirectorViewTab;
  evidence: string[];
  report?: ExecutiveOperationalReport;
}

interface DirectorActionState {
  status: DirectorActionStatus;
  action: DirectorAction | null;
  reportId: string | null;
  message: string;
  auditAt: string | null;
}

@Component({
  selector: 'app-director',
  templateUrl: './director.component.html',
  styleUrls: ['./director.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, RouterLink, AccessibleDialogDirective, MultiDomainDashboardComponent],
})
export class DirectorComponent {
  readonly auth = inject(AuthService);
  readonly service = inject(StaffDataService);
  readonly office = inject(OfficeAdminService);
  readonly costAttribution = inject(CostAttributionService);

  readonly viewMode = signal<'day' | 'month' | 'year'>('day');
  readonly activeTab = signal<DirectorViewTab>('all');
  readonly showMobileActions = signal<boolean>(false);

  readonly staff = computed(() => this.office.employees());
  readonly sites = computed(() => this.office.sites());
  readonly presentCount = computed(() => this.attendance('present'));
  readonly absentCount = computed(() => this.attendance('absent'));
  readonly pendingInvoices = computed(() => this.office.vendorInvoices().filter((invoice) => invoice.status === 'pending_director'));
  readonly pendingInvoiceAmount = computed(() => this.pendingInvoices().reduce((total, invoice) => total + invoice.total, 0));
  readonly periodInvoiceAmount = computed(() => this.office.vendorInvoices().filter((invoice) => this.inPeriod(invoice.invoiceDate)).reduce((total, invoice) => total + invoice.total, 0));
  readonly pendingApprovals = computed(() => this.office.approvals().filter((request) => request.status === 'pending' && !['full_id_payroll_export', 'director_executive_report', 'vendor_invoice_approval'].includes(request.requestType)));
  readonly pendingExecutiveReports = computed(() => this.office.directorReports().filter((r) => r.status === 'pending_director'));
  readonly failedIntegrations = computed(() => this.office.integrationOutbox().filter((event) => event.status === 'failed'));
  readonly decisionQueueItems = computed<DirectorQueueItem[]>(() => [
    ...this.pendingExecutiveReports().map((report) => this.reportQueueItem(report)),
    ...this.pendingApprovals().map((request) => this.approvalQueueItem(request)),
    ...this.pendingInvoices().map((invoice) => this.invoiceQueueItem(invoice)),
    ...this.failedIntegrations().map((event) => this.integrationQueueItem(event)),
  ]);
  readonly decisionSummary = computed(() => {
    const items = this.decisionQueueItems();
    return {
      reports: items.filter((item) => item.kind === 'report').length,
      approvals: items.filter((item) => item.kind === 'approval').length,
      invoices: items.filter((item) => item.kind === 'invoice').length,
      failedIntegrations: items.filter((item) => item.kind === 'integration').length,
      total: items.length,
    };
  });
  readonly approvedExecutiveReports = computed(() => this.office.directorReports().filter((r) => r.status === 'approved'));
  readonly activeReportModal = signal<ExecutiveOperationalReport | null>(null);
  readonly directorNotes = signal<string>('');
  readonly feedback = signal<string>('');
  readonly reportActionState = signal<DirectorActionState>({ status: 'idle', action: null, reportId: null, message: '', auditAt: null });

  setTab(tab: DirectorViewTab) {
    this.activeTab.set(tab);
  }

  toggleMobileActions() {
    this.showMobileActions.update((v) => !v);
  }

  openReportModal(report: ExecutiveOperationalReport) {
    this.activeReportModal.set(report);
    this.directorNotes.set('');
  }

  closeReportModal() {
    this.activeReportModal.set(null);
  }

  async approveReport(reportId: string) {
    await this.performReportDecision(reportId, 'approve');
  }

  async rejectReport(reportId: string) {
    await this.performReportDecision(reportId, 'reject');
  }

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
    ...this.office.assets().filter((asset) => this.assetState(asset) !== 'ready').map((asset) => ({ label: `${asset.make} ${asset.model}`, detail: this.assetState(asset) === 'blocked' ? 'Out of service' : 'Needs attention', severity: this.assetState(asset), destination: 'workforce' as DirectorViewTab })),
    ...this.office.integrationOutbox().filter((event) => event.status === 'failed').map((event) => ({ label: 'Integration delivery', detail: `${event.eventType} failed`, severity: 'blocked', destination: 'approvals' as DirectorViewTab })),
  ].slice(0, 6));

  readonly dataFreshness = computed(() => {
    const sourceTimestamp = this.dataAsOf();
    if (!sourceTimestamp) return 'No source timestamp';
    const ageMs = this.service.currentTime().getTime() - sourceTimestamp.getTime();
    if (ageMs < 0) return 'Source ahead of clock';
    const ageMinutes = Math.floor(ageMs / 60000);
    return ageMinutes < 5 ? 'Current' : ageMinutes < 60 ? `${ageMinutes} min old` : 'Needs refresh';
  });

  readonly dataAsOf = computed<Date | null>(() => {
    const dates = [
      ...this.office.activity().map((item) => item.occurredAt),
      ...this.office.vendorInvoices().flatMap((item) => [item.createdAt, item.updatedAt]),
      ...this.office.approvals().flatMap((item) => [item.createdAt, item.reviewedAt]),
      ...this.office.directorReports().flatMap((item) => [item.generatedAt, item.directorReviewedAt]),
      ...this.office.integrationOutbox().flatMap((item) => [item.createdAt, item.processedAt]),
    ]
      .filter((value): value is string => !!value)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));
    return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
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

  queueAge(createdAt: string) {
    const timestamp = new Date(createdAt).getTime();
    if (Number.isNaN(timestamp)) return 'Age unavailable';
    const ageMinutes = Math.max(0, Math.floor((this.service.currentTime().getTime() - timestamp) / 60000));
    return ageMinutes < 1 ? 'Just now' : ageMinutes < 60 ? `${ageMinutes} min old` : `${Math.floor(ageMinutes / 60)} hr old`;
  }

  private reportQueueItem(report: ExecutiveOperationalReport): DirectorQueueItem {
    return {
      id: report.id,
      kind: 'report',
      status: 'pending',
      label: `Operational pack ${report.reportNumber}`,
      detail: `${report.records.site.name} · ${report.records.site.jobNumber}`,
      createdAt: report.generatedAt,
      destination: 'approvals',
      evidence: [
        `Site: ${report.records.site.name}`,
        `Operator: ${report.records.employee.surname}, ${report.records.employee.firstName}`,
        `Asset: ${report.records.asset.make} ${report.records.asset.model}`,
        `Shift: ${report.records.timesheet.hoursWorked} hrs`,
        `Invoice: R ${report.records.invoice.total.toFixed(2)}`,
      ],
      report,
    };
  }

  private approvalQueueItem(request: ApprovalRequest): DirectorQueueItem {
    return {
      id: request.id,
      kind: 'approval',
      status: 'pending',
      label: this.approvalLabel(request),
      detail: `Requested by ${request.requestedByName}`,
      createdAt: request.createdAt,
      destination: 'approvals',
      evidence: [`Type: ${request.requestType}`, `Requester: ${request.requestedByName}`],
    };
  }

  private invoiceQueueItem(invoice: VendorInvoiceRecord): DirectorQueueItem {
    return {
      id: invoice.id,
      kind: 'invoice',
      status: 'pending',
      label: `Invoice ${invoice.invoiceNumber || invoice.orderNumber}`,
      detail: `${this.vendorName(invoice.vendorId)} · R ${invoice.total.toFixed(2)}`,
      createdAt: invoice.updatedAt || invoice.createdAt,
      destination: 'costs',
      evidence: [`Order: ${invoice.orderNumber}`, `Requester: ${invoice.responsiblePerson}`, `Items: ${invoice.itemsPurchased}`],
    };
  }

  private integrationQueueItem(event: IntegrationOutboxEvent): DirectorQueueItem {
    return {
      id: event.id,
      kind: 'integration',
      status: 'failed',
      label: 'Integration delivery failed',
      detail: `${event.eventType} · ${event.attempts} attempt(s)`,
      createdAt: event.createdAt,
      destination: 'approvals',
      evidence: [`Aggregate: ${event.aggregateType}`, `Last error: ${event.lastError || 'Unavailable'}`],
    };
  }

  private approvalLabel(request: ApprovalRequest) {
    return request.requestType.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private async performReportDecision(reportId: string, action: DirectorAction) {
    if (this.reportActionState().status === 'saving') return;
    const report = this.office.directorReports().find((entry) => entry.id === reportId);
    if (!report || report.status !== 'pending_director') {
      const message = 'Decision not available: this report is no longer awaiting Director review.';
      this.reportActionState.set({ status: 'error', action, reportId, message, auditAt: null });
      this.feedback.set(message);
      return;
    }

    this.feedback.set('');
    this.reportActionState.set({ status: 'saving', action, reportId, message: 'Saving decision and audit record…', auditAt: null });
    try {
      if (action === 'approve') {
        await this.office.approveDirectorReport(reportId, this.directorNotes());
      } else {
        await this.office.rejectDirectorReport(reportId, this.directorNotes());
      }
      const auditAt = this.service.currentTime().toISOString();
      const message = action === 'approve'
        ? `${report.reportNumber} approved and audit record saved at ${auditAt}.`
        : `${report.reportNumber} returned for revisions and audit record saved at ${auditAt}.`;
      this.reportActionState.set({ status: 'success', action, reportId, message, auditAt });
      this.feedback.set(message);
      this.closeReportModal();
    } catch {
      const message = `Decision not confirmed for ${report.reportNumber}. Check the audit trail before retrying.`;
      this.reportActionState.set({ status: 'error', action, reportId, message, auditAt: null });
      this.feedback.set(message);
    }
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
