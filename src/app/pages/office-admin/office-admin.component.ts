import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TimesheetSummaryComponent } from '../../components/timesheet-summary.component';
import { AdminInvitationManagerComponent } from '../../components/admin-invitation-manager/admin-invitation-manager.component';
import { UiButtonComponent } from '../../components/ui-button.component';
import { UiFeedbackComponent } from '../../components/ui-feedback.component';
import { UiTabNavComponent } from '../../components/ui-tab-nav.component';
import {
  Employee,
  EmployeeOnboardingRecord,
  PpeIssueRecord,
  EmploymentStatus,
  FinancialType,
  Issue,
  IssueSeverity,
  ManagedUserProfile,
  Site,
  VendorAccount,
  VendorInvoiceRecord,
  VehicleAsset,
} from '../../core/models/app.models';
import { UserInviteInput } from '../../core/models/office-admin.models';
import { AssignmentDecision, AssignmentReview } from '../../core/assignment/assignment-planning';
import { OfficeAdminService } from '../../core/services/office-admin.service';
import { CostAttributionService } from '../../core/services/cost-attribution.service';
import { TimesheetRegisterService } from '../../core/services/timesheet-register.service';
import { downloadTextFile } from '../../core/utils/browser-file.util';
import { EmployeeImportRow, stageEmployeeCsv } from '../../core/import/employee-import';

type AdminTab = 'overview' | 'users' | 'people' | 'workforce' | 'timesheets' | 'sites' | 'issues' | 'assets' | 'vendors' | 'costs' | 'approvals' | 'recovery' | 'activity' | 'settings' | 'account';

const COST_PERIOD_START = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const COST_PERIOD_END_EXCLUSIVE = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10);

@Component({
  selector: 'app-office-admin',
  templateUrl: './office-admin.component.html',
  styleUrls: ['./office-admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, RouterLink, TimesheetSummaryComponent, AdminInvitationManagerComponent, UiButtonComponent, UiFeedbackComponent, UiTabNavComponent],
})
export class OfficeAdminComponent {
  readonly service = inject(OfficeAdminService);
  readonly costAttribution = inject(CostAttributionService);
  private readonly timesheetRegister = inject(TimesheetRegisterService);

  readonly tabs: { id: AdminTab; label: string; group: string }[] = [
    { id: 'overview', label: 'Overview', group: 'Workspace' },
    { id: 'people', label: 'Current', group: 'Workforce' },
    { id: 'workforce', label: 'New Hires & PPE', group: 'Workforce' },
    { id: 'timesheets', label: 'Timesheets', group: 'Workforce' },
    { id: 'users', label: 'Access Control', group: 'Administration' },
    { id: 'sites', label: 'Sites', group: 'Operations' },
    { id: 'assets', label: 'Assets', group: 'Operations' },
    { id: 'issues', label: 'Issues', group: 'Operations' },
    { id: 'vendors', label: 'Vendors', group: 'Finance' },
    { id: 'costs', label: 'Cost Attribution', group: 'Finance' },
    { id: 'approvals', label: 'Approvals', group: 'Finance' },
    { id: 'recovery', label: 'Recovery', group: 'System' },
    { id: 'activity', label: 'Activity', group: 'System' },
    { id: 'settings', label: 'Settings', group: 'System' },
    { id: 'account', label: 'Account', group: 'System' },
  ];
  readonly activeTab = signal<AdminTab>('overview');
  readonly searchTerm = signal('');
  readonly selectedSiteId = signal('');
  readonly costPeriodStart = signal(COST_PERIOD_START);
  readonly costPeriodEndExclusive = signal(COST_PERIOD_END_EXCLUSIVE);
  readonly costSiteId = signal('');
  readonly costRows = computed(() => this.costAttribution.report()?.rows || []);
  readonly costSourceTotal = computed(() => this.costRows().reduce((sum, row) => sum + (row.sourceAmount || 0), 0));
  readonly costRecognizedTotal = computed(() => this.costRows().reduce((sum, row) => sum + row.recognizedAmount, 0));
  readonly unattributedCosts = computed(() => this.costAttribution.report()?.unattributedRows || []);
  readonly costUnattributedTotal = computed(() => this.unattributedCosts().reduce((sum, row) => sum + (row.sourceAmount || 0), 0));
  readonly attributedSiteCosts = computed(() => {
    const groups = new Map<string, { siteId: string; siteName: string; jobNumber: string; recognizedAmount: number; sourceCount: number }>();
    for (const row of this.costRows().filter((entry) => !!entry.siteId && !!entry.jobNumber)) {
      const key = `${row.siteId}:${row.jobNumber || ''}`;
      const current = groups.get(key) || { siteId: row.siteId!, siteName: this.service.getSiteName(row.siteId!), jobNumber: row.jobNumber || 'Job number missing', recognizedAmount: 0, sourceCount: 0 };
      current.recognizedAmount += row.recognizedAmount; current.sourceCount += 1; groups.set(key, current);
    }
    return [...groups.values()].sort((left, right) => left.siteName.localeCompare(right.siteName));
  });
  readonly timesheetDate = signal(this.timesheetRegister.toDateKey(new Date()));
  readonly selectedEmployeeIds = signal<string[]>([]);
  readonly selectedEmployeeId = signal('');
  readonly showEmployeeForm = signal(false);
  readonly bulkSiteId = signal('');
  readonly assignmentReview = signal<AssignmentReview | null>(null);
  readonly assignmentReasonCode = signal('');
  readonly month = signal(new Date().getMonth());
  readonly year = signal(new Date().getFullYear());
  readonly includeFullIds = signal(false);
  readonly busy = signal(false);
  readonly feedback = signal('');
  readonly employeeImportRows = signal<EmployeeImportRow[]>([]);
  readonly pendingEmployeeCandidate = signal<Employee | null>(null);
  readonly pendingEmployeeDeletion = signal<Employee | null>(null);
  readonly employeeImportSummary = computed(() => ({
    ready: this.employeeImportRows().filter((row) => row.status === 'ready').length,
    warning: this.employeeImportRows().filter((row) => row.status === 'warning').length,
    error: this.employeeImportRows().filter((row) => row.status === 'error').length,
  }));
  readonly resetLink = signal('');
  readonly onboardingProgress = computed(() => {
    const records = this.service.employeeOnboarding();
    if (!records.length) return 0;
    const completed = records.filter((record) => record.criminalCheckStatus === 'clear' && record.fingerprintCheckStatus === 'clear' && record.medicalStatus === 'fit').length;
    return Math.round((completed / records.length) * 100);
  });
  readonly attendanceDeliverySummary = computed(() => ({
    pending: this.service.attendanceQueue().filter((entry) => entry.status === 'pending' || entry.status === 'processing').length,
    failed: this.service.attendanceQueue().filter((entry) => entry.status === 'failed').length,
    completed: this.service.attendanceQueue().filter((entry) => entry.status === 'completed').length,
  }));
  readonly syncProgress = computed(() => {
    const records = this.service.integrationOutbox();
    if (!records.length) return 100;
    return Math.round((records.filter((record) => record.status === 'completed').length / records.length) * 100);
  });
  viewName = '';

  inviteForm: UserInviteInput = {
    email: '',
    displayName: '',
    role: 'site',
  };
  siteForm: Site = {
    id: '',
    name: '',
    location: '',
    managerId: undefined,
    teamName: '',
    jobNumber: '',
    estimatedDuration: '',
    complianceChecklist: [],
    isActive: true,
  };
  personForm: Employee & { employmentStatus?: EmploymentStatus } = {
    id: '',
    firstName: '',
    surname: '',
    idNumber: '',
    companyNumber: '',
    role: 'General Worker',
    designation: '',
    siteId: '',
    startDate: new Date().toISOString().slice(0, 10),
    basicRate: 0,
    payRateUnit: 'daily',
    safetyQualifications: [],
    additionalFields: {},
    salaryAdvances: 0,
    financials: { travel: 0, housing: 0, advance: 0 },
    logs: {},
    adjustments: {},
    employmentStatus: 'active',
  };
  issueForm: Issue & { severity?: IssueSeverity; ownerProfileId?: string | null; dueAt?: string | null } = {
    id: '',
    siteId: '',
    reportedBy: '',
    dateReported: new Date(),
    category: 'Operations',
    description: '',
    status: 'Open',
    auditTrail: [],
    severity: 'medium',
    ownerProfileId: null,
    dueAt: null,
  };
  onboardingForm: Omit<EmployeeOnboardingRecord, 'id' | 'organizationId' | 'updatedAt'> & { id?: string } = {
    employeeId: '', criminalCheckStatus: 'pending', fingerprintCheckStatus: 'pending', medicalStatus: 'pending', redTicketNumber: '', redTicketIssuedAt: null, redTicketExpiresAt: null, notes: '',
  };
  ppeForm: Omit<PpeIssueRecord, 'id' | 'organizationId' | 'requestedAt'> & { id?: string; requestedAt?: string } = {
    employeeId: '', itemType: 'overall_pants', brand: '', size: '', unitCost: 0, orderDate: null, collectionDate: null, status: 'requested', officeConfirmedAt: null, officeConfirmedBy: null, employeeConfirmedAt: null, employeeConfirmedBy: null,
  };
  financialTypeForm: FinancialType = {
    id: '',
    name: '',
    category: 'Allowance',
    isActive: true,
  };
  vendorForm: Omit<VendorAccount, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> & { id?: string } = {
    name: '',
    description: '',
    totalOwingAmount: 0,
  };
  vendorInvoiceForm: Omit<VendorInvoiceRecord, 'id' | 'organizationId' | 'status' | 'requestedBy' | 'requestedByName' | 'directorReviewedBy' | 'directorReviewedAt' | 'createdAt' | 'updatedAt'> & { id?: string } = {
    vendorId: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    orderNumber: '',
    itemsPurchased: '',
    total: 0,
    responsiblePerson: '',
  };
  siteComplianceText = '';

  readonly selectedEmployee = computed(() => {
    const selectedId = this.selectedEmployeeId();
    return this.service.employees().find((employee) => employee.id === selectedId) || this.filteredEmployees()[0] || null;
  });
  readonly selectedEmployeeAssets = computed<VehicleAsset[]>(() => {
    const employee = this.selectedEmployee();
    if (!employee) return [];
    const fullName = `${employee.firstName} ${employee.surname}`.trim().toLowerCase();
    return this.service.assets().filter((asset) => (asset.custodianName || '').trim().toLowerCase() === fullName);
  });
  readonly selectedEmployeeOpenIssues = computed(() => {
    const employee = this.selectedEmployee();
    if (!employee) return [];
    const fullName = `${employee.firstName} ${employee.surname}`.trim().toLowerCase();
    return this.service.issues().filter((issue) => issue.status === 'Open' && (issue.reportedBy.trim().toLowerCase() === fullName || issue.description.toLowerCase().includes(employee.surname.toLowerCase())));
  });
  readonly filteredEmployees = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const siteId = this.selectedSiteId();
    return this.service.employees().filter((employee) => {
      const matchesTerm = !term
        || employee.firstName.toLowerCase().includes(term)
        || employee.surname.toLowerCase().includes(term)
        || this.service.maskIdNumber(employee.idNumber).toLowerCase().includes(term);
      const matchesSite = !siteId || employee.siteId === siteId;
      return matchesTerm && matchesSite;
    });
  });

  employeeName(employeeId: string) {
    const employee = this.service.employees().find((entry) => entry.id === employeeId);
    return employee ? `${employee.firstName} ${employee.surname}` : 'Unknown employee';
  }

  async importEmployees(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.busy.set(true); this.feedback.set(''); this.employeeImportRows.set([]);
    try {
      const rows = stageEmployeeCsv(await file.text(), this.selectedSiteId(), this.service.employees());
      this.employeeImportRows.set(rows);
      this.feedback.set(`Preview ready: ${rows.length} row(s). Review warnings and errors before import.`);
    } catch (error) { this.feedback.set(error instanceof Error ? error.message : 'Employee import failed.'); }
    finally { this.busy.set(false); input.value = ''; }
  }

  async commitEmployeeImport() {
    const accepted = this.employeeImportRows().filter((row) => row.status !== 'error').map((row) => row.employee);
    if (!accepted.length) { this.feedback.set('No valid employee rows are available to import.'); return; }
    await this.runAction(async () => {
      await this.service.saveEmployees(accepted);
      this.feedback.set(`${accepted.length} employee(s) imported. Error rows were not changed.`);
      this.employeeImportRows.set([]);
    });
  }

  async submitOnboarding() { await this.runAction(async () => { await this.service.saveEmployeeOnboarding(this.onboardingForm); this.feedback.set('New-hire checks saved.'); }); }
  async submitPpe() { await this.runAction(async () => { await this.service.savePpeIssue(this.ppeForm); this.feedback.set('PPE record saved.'); }); }
  async confirmPpe(id: string, party: 'office' | 'employee') { await this.runAction(async () => { await this.service.confirmPpeIssue(id, party); this.feedback.set(party === 'office' ? 'Office confirmation recorded.' : 'Employee confirmation recorded.'); }); }

  readonly payrollPeriod = computed(() => {
    const key = `${this.year()}-${`${this.month() + 1}`.padStart(2, '0')}`;
    return this.service.payrollPeriods().find((entry) => entry.periodKey === key) || null;
  });
  readonly openIssuesCount = computed(() => this.service.issues().filter((issue) => issue.status === 'Open').length);
  readonly timesheetRows = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const siteId = this.selectedSiteId();
    return this.timesheetRegister
      .buildRows(this.service.activeEmployees(), this.service.sites(), this.timesheetDate())
      .filter((row) => (!term || row.employeeName.toLowerCase().includes(term) || row.employeeRole.toLowerCase().includes(term))
        && (!siteId || row.siteId === siteId));
  });
  readonly timesheetSummary = computed(() => this.timesheetRegister.summarize(this.timesheetRows()));
  readonly recoveryOutbox = computed(() => this.service.integrationOutbox()
    .filter((event) => event.status === 'pending' || event.status === 'failed')
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === 'failed' ? -1 : 1;
      return right.createdAt.localeCompare(left.createdAt);
    }));

  async submitInvite() {
    await this.runAction(async () => {
      const created = await this.service.inviteUser(this.inviteForm);
      this.feedback.set(`User invited: ${created.username}`);
      this.inviteForm = { email: '', displayName: '', role: 'site' };
    });
  }

  async submitSite() {
    await this.runAction(async () => {
      await this.service.saveSite({ ...this.siteForm, complianceChecklist: this.parseChecklist(this.siteComplianceText) });
      this.feedback.set('Site saved.');
      this.siteForm = { id: '', name: '', location: '', managerId: undefined, teamName: '', jobNumber: '', estimatedDuration: '', complianceChecklist: [], isActive: true };
      this.siteComplianceText = '';
    });
  }

  async submitEmployee() {
    this.pendingEmployeeCandidate.set({
      ...this.personForm,
      safetyQualifications: [...(this.personForm.safetyQualifications || [])],
      additionalFields: { ...(this.personForm.additionalFields || {}) },
    });
    this.feedback.set('Employee candidate staged. Review and approve before saving.');
  }

  async approveEmployeeCandidate() {
    const candidate = this.pendingEmployeeCandidate();
    if (!candidate) return;
    await this.runAction(async () => {
      await this.service.saveEmployee(candidate);
      this.feedback.set(candidate.id ? 'Employee update approved and saved.' : 'Employee creation approved and saved.');
      this.pendingEmployeeCandidate.set(null);
      this.resetEmployeeForm();
      this.showEmployeeForm.set(false);
    });
  }

  cancelEmployeeCandidate() {
    this.pendingEmployeeCandidate.set(null);
    this.feedback.set('Staged employee change discarded. No record was written.');
  }

  stageEmployeeDeletion(employee: Employee) {
    this.pendingEmployeeDeletion.set(employee);
    this.feedback.set('Employee removal staged. Approve the deletion to continue.');
  }

  async approveEmployeeDeletion() {
    const employee = this.pendingEmployeeDeletion();
    if (!employee) return;
    await this.runAction(async () => {
      await this.service.deleteEmployee(employee.id);
      this.pendingEmployeeDeletion.set(null);
      this.selectedEmployeeId.set('');
      this.feedback.set('Employee archive approved and recorded.');
    });
  }

  loadSyntheticEmployeeCandidate() {
    const siteId = this.selectedSiteId() || this.service.activeSites()[0]?.id || '';
    this.personForm = {
      id: '', firstName: 'Lerato', surname: 'Mokoena', idNumber: 'UAT-EMP-0001', companyNumber: 'SEN-DEMO-014',
      role: 'Operator', designation: 'Excavator Operator', siteId, startDate: '2026-08-01', basicRate: 0,
      payRateUnit: 'daily', safetyQualifications: ['First Aid Level 1', 'HIRA', 'Excavator Operator'],
      additionalFields: { source: 'Synthetic approval test candidate' }, salaryAdvances: 0,
      financials: { travel: 0, housing: 0, advance: 0 }, logs: {}, adjustments: {}, employmentStatus: 'active',
    };
    this.pendingEmployeeCandidate.set(null);
    this.showEmployeeForm.set(true);
    this.activeTab.set('people');
    this.feedback.set('Synthetic candidate loaded for review. Nothing has been saved.');
  }

  async submitIssue() {
    await this.runAction(async () => {
      await this.service.saveIssue(this.issueForm);
      this.feedback.set('Issue saved.');
      this.issueForm = {
        id: '',
        siteId: '',
        reportedBy: '',
        dateReported: new Date(),
        category: 'Operations',
        description: '',
        status: 'Open',
        auditTrail: [],
        severity: 'medium',
        ownerProfileId: null,
        dueAt: null,
      };
    });
  }

  showPlannedFeature(feature: string) {
    this.feedback.set(`${feature} is planned for the post-demo upgrade. No source data has been supplied, so no placeholder records are shown.`);
  }

  async submitVendorAccount() {
    await this.runAction(async () => {
      const vendor = await this.service.saveVendorAccount(this.vendorForm);
      this.feedback.set(`Vendor saved: ${vendor.name}`);
      this.vendorInvoiceForm.vendorId = vendor.id;
      this.vendorForm = { name: '', description: '', totalOwingAmount: 0 };
    });
  }

  async submitVendorInvoice() {
    await this.runAction(async () => {
      await this.service.submitVendorInvoice(this.vendorInvoiceForm);
      this.feedback.set('Invoice submitted to Director approval queue.');
      this.vendorInvoiceForm = { vendorId: '', invoiceDate: new Date().toISOString().slice(0, 10), orderNumber: '', itemsPurchased: '', total: 0, responsiblePerson: '' };
    });
  }
  async submitFinancialType() {
    await this.runAction(async () => {
      await this.service.saveFinancialType(this.financialTypeForm);
      this.feedback.set('Financial type saved.');
      this.financialTypeForm = { id: '', name: '', category: 'Allowance', isActive: true };
    });
  }

  async updateUser(user: ManagedUserProfile, role: string, isActive: boolean) {
    await this.runAction(async () => {
      const normalizedRole = role === 'site' || role === 'office' || role === 'director' ? role : user.role;
      await this.service.saveUser({ ...user, role: normalizedRole, isActive });
      this.feedback.set(`User updated: ${user.username}`);
    });
  }

  async suspendUser(user: ManagedUserProfile) {
    await this.runAction(async () => {
      await this.service.submitApprovalRequest('user_suspension', {
        userId: user.id,
        username: user.username,
      });
      this.feedback.set(`Suspension request submitted for ${user.username}`);
    });
  }

  async reactivateUser(user: ManagedUserProfile) {
    await this.runAction(async () => {
      await this.service.setUserAccessState(user.id, true);
      this.feedback.set(`Reactivated ${user.username}`);
    });
  }

  async resetUserPassword(user: ManagedUserProfile) {
    await this.runAction(async () => {
      const result = await this.service.requestPasswordReset(user.id);
      this.resetLink.set(result.resetLink || '');
      this.feedback.set(result.message);
    });
  }

  async setEmployeeStatus(employeeId: string, employmentStatus: EmploymentStatus) {
    await this.runAction(async () => {
      await this.service.updateEmployeeStatus(employeeId, employmentStatus);
      this.feedback.set('Employee status updated.');
    });
  }

  toggleSelectedEmployee(employeeId: string, checked: boolean) {
    const current = new Set(this.selectedEmployeeIds());
    if (checked) current.add(employeeId);
    else current.delete(employeeId);
    this.selectedEmployeeIds.set([...current]);
    this.assignmentReview.set(null);
  }

  setBulkSiteId(siteId: string) {
    this.bulkSiteId.set(siteId);
    this.assignmentReview.set(null);
    this.assignmentReasonCode.set('');
  }

  reviewBulkSiteAssignment() {
    this.feedback.set('');
    this.assignmentReasonCode.set('');
    this.assignmentReview.set(this.service.reviewEmployeeSiteAssignment(this.selectedEmployeeIds(), this.bulkSiteId()));
  }

  selectAssignmentAlternative(blockedEmployeeId: string, alternativeEmployeeId: string) {
    this.selectedEmployeeIds.set(this.selectedEmployeeIds().map((id) => id === blockedEmployeeId ? alternativeEmployeeId : id));
    this.reviewBulkSiteAssignment();
  }

  async runBulkSiteAssignment(decision: AssignmentDecision) {
    await this.runAction(async () => {
      await this.service.decideEmployeeSiteAssignment(this.selectedEmployeeIds(), this.bulkSiteId(), decision, this.assignmentReasonCode());
      if (decision === 'reject') {
        this.feedback.set('Assignment suggestion rejected and audited.');
        this.assignmentReview.set(null);
        return;
      }
      this.feedback.set(decision === 'override' ? 'Assignment warning overridden and audited.' : 'Employees reassigned and audited.');
      this.selectedEmployeeIds.set([]);
      this.bulkSiteId.set('');
      this.assignmentReasonCode.set('');
      this.assignmentReview.set(null);
    });
  }

  async exportPayroll() {
    await this.runAction(async () => {
      if (this.includeFullIds()) {
        await this.service.submitApprovalRequest('full_id_payroll_export', {
          month: this.month(),
          year: this.year(),
        });
        this.feedback.set('Full-ID export sent for approval.');
        return;
      }

      const csv = this.service.generatePayrollCsv(this.month(), this.year(), this.includeFullIds());
      const periodKey = `${this.year()}-${`${this.month() + 1}`.padStart(2, '0')}`;
      const fileName = `senatla-payroll-${periodKey}${this.includeFullIds() ? '-full' : '-masked'}.csv`;
      downloadTextFile(csv, fileName, 'text/csv;charset=utf-8');
      await this.service.recordPayrollExport(periodKey, this.includeFullIds(), fileName);
      await this.service.setPayrollPeriodStatus(this.month(), this.year(), 'exported');
      this.feedback.set(`Payroll exported: ${fileName}`);
    });
  }

  exportTimesheetRegister() {
    const fileName = `senatla-timesheet-${this.timesheetDate()}.csv`;
    downloadTextFile(this.timesheetRegister.toCsv(this.timesheetRows()), fileName, 'text/csv;charset=utf-8');
    this.feedback.set(`Timesheet register exported: ${fileName}`);
  }

  async approveRequest(requestId: string) {
    await this.runAction(async () => {
      await this.service.approveRequest(requestId);
      this.feedback.set('Approval processed.');
    });
  }

  async rejectRequest(requestId: string) {
    await this.runAction(async () => {
      await this.service.rejectRequest(requestId);
      this.feedback.set('Approval rejected.');
    });
  }

  async retryAttendanceSubmission(submissionId: string) {
    await this.runAction(async () => {
      await this.service.retryAttendanceSubmission(submissionId);
      this.feedback.set('Attendance delivery retry completed.');
    });
  }
  async retryOutboxEvent(eventId: string) {
    await this.runAction(async () => {
      await this.service.retryOutboxEvent(eventId);
      this.feedback.set('Retry requested. Monitor this audit reference for the next result.');
    });
  }

  async saveView() {
    await this.runAction(async () => {
      await this.service.saveCurrentView(this.viewName, {
        tab: this.activeTab(),
        searchTerm: this.searchTerm(),
        siteId: this.selectedSiteId(),
      });
      this.feedback.set('View saved.');
      this.viewName = '';
    });
  }

  applyView(viewId: string) {
    const view = this.service.savedViews().find((entry) => entry.id === viewId);
    if (!view) return;
    this.activeTab.set((view.filters.tab as AdminTab) || 'overview');
    this.searchTerm.set(view.filters.searchTerm || '');
    this.selectedSiteId.set(view.filters.siteId || '');
    this.feedback.set(`Applied view: ${view.name}`);
  }

  async lockPayroll() {
    await this.runAction(async () => {
      await this.service.setPayrollPeriodStatus(this.month(), this.year(), 'locked');
      this.feedback.set('Payroll period locked.');
    });
  }

  editEmployee(employee: Employee) {
    this.personForm = { ...employee, employmentStatus: employee.employmentStatus || 'active' };
    this.selectedEmployeeId.set(employee.id);
    this.showEmployeeForm.set(true);
    this.activeTab.set('people');
  }

  selectEmployee(employeeId: string) {
    this.selectedEmployeeId.set(employeeId);
    this.showEmployeeForm.set(false);
  }

  activityLabel(action: string, details?: Record<string, unknown> | null) {
    const friendly = details?.['friendlyAction'];
    if (typeof friendly === 'string') return friendly;
    return action.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  activityMethod(details?: Record<string, unknown> | null) {
    const method = details?.['httpMethod'];
    return typeof method === 'string' ? method : 'EVENT';
  }

  createEmployeeProfile() {
    this.resetEmployeeForm();
    this.showEmployeeForm.set(true);
    this.feedback.set(this.service.activeSites().length ? '' : 'Create at least one site before creating an employee profile.');
  }

  editSite(site: Site) {
    this.siteForm = { ...site, complianceChecklist: site.complianceChecklist || [] };
    this.siteComplianceText = (site.complianceChecklist || []).join(', ');
    this.activeTab.set('sites');
  }

  editIssue(issue: Issue) {
    this.issueForm = {
      ...issue,
      severity: issue.severity || 'medium',
      ownerProfileId: issue.ownerProfileId ?? null,
      dueAt: issue.dueAt ?? null,
    };
    this.activeTab.set('issues');
  }

  selectTab(id: string) {
    if (!this.tabs.some((tab) => tab.id === id)) return;
    this.activeTab.set(id as AdminTab);
    if (id === 'costs' && !this.costAttribution.report() && !this.costAttribution.isLoading()) void this.refreshCostAttribution();
  }

  async refreshCostAttribution() {
    try {
      await this.costAttribution.loadCosts({ periodStart: this.costPeriodStart(), periodEndExclusive: this.costPeriodEndExclusive(), siteId: this.costSiteId() || undefined });
    } catch {
      // The service exposes the sanitized failure through its error signal.
    }
  }

  costLabel(value: string) { return value.replace(/_/g, ' '); }

  getPayroll(employeeId: string) {
    return this.service.calculateMonthlyPayroll(employeeId, this.month(), this.year());
  }

  private parseChecklist(value: string) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  private async runAction(action: () => Promise<void>) {
    this.busy.set(true);
    this.feedback.set('');
    this.resetLink.set('');
    try {
      await action();
    } catch (error) {
      this.feedback.set(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      this.busy.set(false);
    }
  }

  private resetEmployeeForm() {
    this.personForm = {
      id: '',
      firstName: '',
      surname: '',
      idNumber: '',
      companyNumber: '',
      role: 'General Worker',
      designation: '',
      siteId: this.service.activeSites()[0]?.id || '',
      startDate: new Date().toISOString().slice(0, 10),
      basicRate: 0,
      payRateUnit: 'daily',
      safetyQualifications: [],
      additionalFields: {},
      salaryAdvances: 0,
      financials: { travel: 0, housing: 0, advance: 0 },
      logs: {},
      adjustments: {},
      employmentStatus: 'active',
    };
  }
}
