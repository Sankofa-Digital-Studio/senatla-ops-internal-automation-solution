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
  ExecutiveOperationalReport,
} from '../../core/models/app.models';
import { UserInviteInput } from '../../core/models/office-admin.models';
import { AssignmentDecision, AssignmentReview } from '../../core/assignment/assignment-planning';
import { OfficeAdminService } from '../../core/services/office-admin.service';
import { CostAttributionService } from '../../core/services/cost-attribution.service';
import { TimesheetRegisterService } from '../../core/services/timesheet-register.service';
import { downloadTextFile } from '../../core/utils/browser-file.util';
import { EmployeeImportRow, stageEmployeeCsv } from '../../core/import/employee-import';

type AdminTab = 'overview' | 'users' | 'people' | 'workforce' | 'timesheets' | 'sites' | 'issues' | 'assets' | 'vendors' | 'costs' | 'approvals' | 'recovery' | 'activity' | 'settings' | 'account';
export type PrimaryTab = 'workspace' | 'workforce' | 'administration' | 'operations' | 'finance' | 'system';

interface PrimaryTabDefinition {
  id: PrimaryTab;
  label: string;
  icon: string;
  badge?: () => number | string;
  subTabs: { id: AdminTab; label: string; icon: string }[];
}

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

  readonly primaryTab = signal<PrimaryTab>('workspace');
  readonly accountMenuOpen = signal<boolean>(false);

  readonly primaryTabs: PrimaryTabDefinition[] = [
    {
      id: 'workspace',
      label: 'Workspace',
      icon: 'dashboard',
      subTabs: [
        { id: 'overview', label: 'Executive Pulse & Audit', icon: 'speed' },
      ],
    },
    {
      id: 'workforce',
      label: 'Workforce',
      icon: 'groups',
      subTabs: [
        { id: 'people', label: 'Current Workforce', icon: 'badge' },
        { id: 'workforce', label: 'New Hires & PPE', icon: 'security' },
        { id: 'timesheets', label: 'Timesheet & Shifts', icon: 'schedule' },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      icon: 'admin_panel_settings',
      subTabs: [
        { id: 'users', label: 'Access Control', icon: 'manage_accounts' },
        { id: 'issues', label: 'Issues & Disciplinary', icon: 'warning' },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: 'precision_manufacturing',
      subTabs: [
        { id: 'sites', label: 'Site Details', icon: 'location_on' },
        { id: 'assets', label: 'Assets & Fleet', icon: 'local_shipping' },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: 'account_balance',
      subTabs: [
        { id: 'costs', label: 'Cost Attribution', icon: 'pie_chart' },
        { id: 'approvals', label: 'Approvals Queue', icon: 'rule' },
        { id: 'vendors', label: 'Vendors', icon: 'storefront' },
      ],
    },
    {
      id: 'system',
      label: 'System',
      icon: 'tune',
      subTabs: [
        { id: 'recovery', label: 'Sync & Recovery', icon: 'sync' },
        { id: 'activity', label: 'Activity Audit', icon: 'history' },
        { id: 'settings', label: 'Settings', icon: 'settings' },
        { id: 'account', label: 'Account Profile', icon: 'person' },
      ],
    },
  ];

  readonly currentSubTabs = computed(() => {
    const primary = this.primaryTabs.find((t) => t.id === this.primaryTab());
    return primary?.subTabs || [];
  });

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
  readonly employeeRoleFilter = signal('');
  readonly employeeStatusFilter = signal('');
  readonly showEmployeeModal = signal(false);
  readonly employeeModalMode = signal<'create' | 'edit'>('create');
  readonly pendingEmployeeModalDeletion = signal<Employee | null>(null);

  readonly showAssetModal = signal(false);
  readonly assetModalMode = signal<'create' | 'edit'>('create');
  assetForm: VehicleAsset = {
    id: '', registrationNumber: '', serialNumber: '', vin: '', make: '', model: '',
    type: 'Heavy Duty', assetClass: 'Excavator', licenseExpiry: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    status: 'Active', lifecycleState: 'active', assignedSiteId: '', custodianName: '', notes: '',
  };
  readonly pendingAssetDeletion = signal<VehicleAsset | null>(null);
  readonly assetSearchTerm = signal('');
  readonly assetSiteFilter = signal('');
  readonly assetTypeFilter = signal('');
  readonly assetStatusFilter = signal('');

  readonly showSiteModal = signal(false);
  readonly siteModalMode = signal<'create' | 'edit'>('create');
  readonly pendingSiteDeletion = signal<Site | null>(null);
  readonly siteSearchTerm = signal('');
  readonly siteStatusFilter = signal('');

  readonly generatingReport = signal(false);
  readonly lastGeneratedReport = signal<ExecutiveOperationalReport | null>(null);
  readonly directorReports = computed(() => this.service.directorReports());

  readonly filteredEmployees = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const siteId = this.selectedSiteId();
    const role = this.employeeRoleFilter();
    const status = this.employeeStatusFilter();
    return this.service.employees().filter((employee) => {
      const matchesTerm = !term
        || employee.firstName.toLowerCase().includes(term)
        || employee.surname.toLowerCase().includes(term)
        || this.service.maskIdNumber(employee.idNumber).toLowerCase().includes(term);
      const matchesSite = !siteId || employee.siteId === siteId;
      const matchesRole = !role || employee.role === role;
      const matchesStatus = !status || (employee.employmentStatus || 'active') === status;
      return matchesTerm && matchesSite && matchesRole && matchesStatus;
    });
  });

  readonly filteredSites = computed(() => {
    const term = this.siteSearchTerm().trim().toLowerCase();
    const status = this.siteStatusFilter();
    return this.service.sites().filter((site) => {
      const matchesTerm = !term
        || site.name.toLowerCase().includes(term)
        || site.location.toLowerCase().includes(term)
        || (site.jobNumber || '').toLowerCase().includes(term)
        || (site.teamName || '').toLowerCase().includes(term);
      const matchesStatus = !status || (status === 'active' ? site.isActive : !site.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly filteredAssets = computed(() => {
    const term = this.assetSearchTerm().trim().toLowerCase();
    const siteId = this.assetSiteFilter();
    const type = this.assetTypeFilter();
    const status = this.assetStatusFilter();
    return this.service.assets().filter((asset) => {
      const matchesTerm = !term
        || (asset.registrationNumber || '').toLowerCase().includes(term)
        || (asset.vin || '').toLowerCase().includes(term)
        || (asset.serialNumber || '').toLowerCase().includes(term)
        || asset.make.toLowerCase().includes(term)
        || asset.model.toLowerCase().includes(term)
        || (asset.custodianName || '').toLowerCase().includes(term);
      const matchesSite = !siteId || asset.assignedSiteId === siteId;
      const matchesType = !type || asset.type === type;
      const matchesStatus = !status || asset.status === status;
      return matchesTerm && matchesSite && matchesType && matchesStatus;
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

    // Keep primaryTab in sync
    const matched = this.primaryTabs.find((pt) => pt.subTabs.some((st) => st.id === id));
    if (matched && matched.id !== this.primaryTab()) {
      this.primaryTab.set(matched.id);
    }

    if (id === 'costs' && !this.costAttribution.report() && !this.costAttribution.isLoading()) void this.refreshCostAttribution();
  }

  selectPrimaryTab(tabId: PrimaryTab) {
    this.primaryTab.set(tabId);
    const def = this.primaryTabs.find((t) => t.id === tabId);
    if (def?.subTabs.length) {
      this.selectTab(def.subTabs[0].id);
    }
  }

  toggleAccountMenu() {
    this.accountMenuOpen.update((open) => !open);
  }

  closeAccountMenu() {
    this.accountMenuOpen.set(false);
  }

  async generateDirectorReportAction() {
    await this.runAction(async () => {
      this.generatingReport.set(true);
      try {
        const report = await this.service.generateDirectorReport();
        this.lastGeneratedReport.set(report);
        this.feedback.set(`Executive Report Pack ${report.reportNumber} generated with 5 verified records and sent to Director Awaiting Review!`);
      } finally {
        this.generatingReport.set(false);
      }
    });
  }

  // Asset CRUD
  createEmptyAsset(): VehicleAsset {
    return {
      id: '',
      registrationNumber: '',
      serialNumber: '',
      vin: '',
      make: '',
      model: '',
      type: 'Heavy Duty',
      assetClass: 'Excavator',
      licenseExpiry: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
      status: 'Active',
      lifecycleState: 'active',
      assignedSiteId: this.service.activeSites()[0]?.id || '',
      custodianName: '',
      notes: '',
    };
  }

  openCreateAssetModal() {
    this.assetForm = this.createEmptyAsset();
    this.assetModalMode.set('create');
    this.showAssetModal.set(true);
  }

  openEditAssetModal(asset: VehicleAsset) {
    this.assetForm = { ...asset };
    this.assetModalMode.set('edit');
    this.showAssetModal.set(true);
  }

  closeAssetModal() {
    this.showAssetModal.set(false);
  }

  async saveAssetModal() {
    await this.runAction(async () => {
      await this.service.saveAsset(this.assetForm);
      this.feedback.set(`Asset ${this.assetForm.registrationNumber || this.assetForm.make} saved.`);
      this.closeAssetModal();
    });
  }

  stageAssetDeletion(asset: VehicleAsset) {
    this.pendingAssetDeletion.set(asset);
  }

  cancelAssetDeletion() {
    this.pendingAssetDeletion.set(null);
  }

  async confirmAssetDeletion() {
    const asset = this.pendingAssetDeletion();
    if (!asset) return;
    await this.runAction(async () => {
      await this.service.deleteAsset(asset.id);
      this.feedback.set(`Asset ${asset.registrationNumber || asset.make} removed.`);
      this.pendingAssetDeletion.set(null);
    });
  }

  async quickToggleAssetStatus(asset: VehicleAsset) {
    await this.runAction(async () => {
      const nextStatus = asset.status === 'Active' ? 'Maintenance' : 'Active';
      await this.service.saveAsset({ ...asset, status: nextStatus });
      this.feedback.set(`Asset status set to ${nextStatus}.`);
    });
  }

  // Site CRUD
  openCreateSiteModal() {
    this.siteForm = {
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
    this.siteComplianceText = '';
    this.siteModalMode.set('create');
    this.showSiteModal.set(true);
  }

  openEditSiteModal(site: Site) {
    this.siteForm = { ...site, complianceChecklist: site.complianceChecklist || [] };
    this.siteComplianceText = (site.complianceChecklist || []).join(', ');
    this.siteModalMode.set('edit');
    this.showSiteModal.set(true);
  }

  openSiteModal(site?: Site) {
    if (site) {
      this.openEditSiteModal(site);
    } else {
      this.openCreateSiteModal();
    }
  }

  closeSiteModal() {
    this.showSiteModal.set(false);
  }

  async saveSiteModal() {
    await this.runAction(async () => {
      await this.service.saveSite({
        ...this.siteForm,
        complianceChecklist: this.parseChecklist(this.siteComplianceText),
      });
      this.feedback.set(`Site ${this.siteForm.name} saved.`);
      this.closeSiteModal();
    });
  }

  stageSiteDeletion(site: Site) {
    this.pendingSiteDeletion.set(site);
  }

  cancelSiteDeletion() {
    this.pendingSiteDeletion.set(null);
  }

  async confirmSiteDeletion() {
    const site = this.pendingSiteDeletion();
    if (!site) return;
    await this.runAction(async () => {
      await this.service.deleteSite(site.id);
      this.feedback.set(`Site ${site.name} deleted.`);
      this.pendingSiteDeletion.set(null);
    });
  }

  async quickToggleSiteActive(site: Site) {
    await this.runAction(async () => {
      await this.service.saveSite({ ...site, isActive: !site.isActive });
      this.feedback.set(`Site ${site.name} is now ${!site.isActive ? 'active' : 'inactive'}.`);
    });
  }

  // Employee CRUD Modal
  openCreateEmployeeModal() {
    this.resetEmployeeForm();
    this.employeeModalMode.set('create');
    this.showEmployeeModal.set(true);
  }

  openEditEmployeeModal(employee: Employee) {
    this.personForm = { ...employee, employmentStatus: employee.employmentStatus || 'active' };
    this.employeeModalMode.set('edit');
    this.showEmployeeModal.set(true);
  }

  closeEmployeeModal() {
    this.showEmployeeModal.set(false);
  }

  async saveEmployeeModal() {
    await this.runAction(async () => {
      await this.service.saveEmployee(this.personForm);
      this.feedback.set(`Employee ${this.personForm.firstName} ${this.personForm.surname} saved.`);
      this.closeEmployeeModal();
    });
  }

  stageEmployeeModalDeletion(employee: Employee) {
    this.pendingEmployeeModalDeletion.set(employee);
  }

  cancelEmployeeModalDeletion() {
    this.pendingEmployeeModalDeletion.set(null);
  }

  async confirmEmployeeModalDeletion() {
    const employee = this.pendingEmployeeModalDeletion();
    if (!employee) return;
    await this.runAction(async () => {
      await this.service.deleteEmployee(employee.id);
      this.feedback.set(`Employee ${employee.firstName} ${employee.surname} archived.`);
      this.pendingEmployeeModalDeletion.set(null);
    });
  }

  async toggleEmployeeStatus(employee: Employee) {
    await this.runAction(async () => {
      const nextStatus = (employee.employmentStatus || 'active') === 'active' ? 'inactive' : 'active';
      await this.service.updateEmployeeStatus(employee.id, nextStatus as EmploymentStatus);
      this.feedback.set(`${employee.firstName} ${employee.surname} status changed to ${nextStatus}.`);
    });
  }

  quickToggleEmployeeStatus(employee: Employee) {
    void this.toggleEmployeeStatus(employee);
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
