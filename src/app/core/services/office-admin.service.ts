import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config/runtime-config';
import {
  AdminActivityEvent,
  AdminAnomaly,
  AssetImportPreview,
  AssetComplianceRecord,
  AssetCustodyEvent,
  AssetMaintenancePlan,
  AssetMeterReading,
  AssetWorkOrder,
  AssetFuelEntry,
  AppRole,
  ApprovalRequest,
  AttendanceQueueSubmission,
  ApprovalRequestType,
  ApprovalStatus,
  Employee,
  EmployeeOnboardingRecord,
  EmploymentStatus,
  FinancialType,
  Group,
  Issue,
  IssueSeverity,
  IntegrationOutboxEvent,
  ManagedUserProfile,
  Organization,
  PayrollExportRecord,
  PayrollPeriod,
  PayrollPeriodStatus,
  PpeIssueRecord,
  SENATLA_TRADING_ORGANIZATION_ID,
  SavedAdminView,
  Site,
  VendorAccount,
  VendorInvoiceRecord,
  VehicleAsset,
} from '../models/app.models';
import { OfficeAdminWorkspace, UserInviteInput } from '../models/office-admin.models';
import { AssignmentDecision, AssignmentReview, planAssetSiteTransfer, planEmployeeSiteAssignment } from '../assignment/assignment-planning';
import { AuthService } from './auth.service';
import { injectSupabaseClient } from '../gateways/supabase.client';

type SiteRow = {
  id: string;
  organization_id: string | null;
  name: string;
  location: string;
  manager_profile_id: string | null;
  team_name: string | null;
  job_number: string | null;
  estimated_duration: string | null;
  compliance_checklist: string[] | null;
  is_active: boolean;
};

type GroupRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type EmployeeRow = {
  id: string;
  organization_id: string | null;
  first_name: string;
  surname: string;
  id_number: string;
  company_number: string | null;
  role: Employee['role'];
  designation: string | null;
  site_id: string;
  group_id: string | null;
  employment_status: EmploymentStatus;
  start_date: string;
  basic_rate: number;
  pay_rate_unit: Employee['payRateUnit'] | null;
  safety_qualifications: string[] | null;
  additional_fields: Record<string, string> | null;
  salary_advances: number;
  financials: Record<string, number>;
  logs: Employee['logs'];
  adjustments: Employee['adjustments'];
  tax_ref_number: string | null;
};

type FinancialTypeRow = {
  id: string;
  name: string;
  category: FinancialType['category'];
  is_active: boolean;
  is_system: boolean;
};

type IssueRow = {
  id: string;
  organization_id: string | null;
  site_id: string | null;
  reported_by: string;
  category: Issue['category'];
  description: string;
  status: Issue['status'];
  severity: IssueSeverity;
  owner_profile_id: string | null;
  due_at: string | null;
  audit_trail: Issue['auditTrail'];
  created_at: string;
};

type AssetRow = {
  id: string;
  organization_id: string | null;
  registration_number: string | null;
  serial_number: string | null;
  vin: string | null;
  make: string;
  model: string;
  type: VehicleAsset['type'];
  license_expiry: string;
  status: VehicleAsset['status'];
  assigned_site_id: string | null;
  notes: string | null;
  custodian_name: string | null;
  asset_class: string | null;
  lifecycle_state: VehicleAsset['lifecycleState'] | null;
  retired_at: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
};

type ActivityRow = {
  id: string;
  organization_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string;
  actor_name: string;
  details: Record<string, unknown> | null;
  occurred_at: string;
};

type PayrollPeriodRow = {
  id: string;
  organization_id: string | null;
  period_key: string;
  month: number;
  year: number;
  status: PayrollPeriodStatus;
  locked_at: string | null;
  locked_by: string | null;
};

type PayrollExportRow = {
  id: string;
  organization_id: string | null;
  period_key: string;
  include_full_ids: boolean;
  requested_by: string;
  file_name: string;
  created_at: string;
};

type ApprovalRequestRow = {
  id: string;
  organization_id: string | null;
  request_type: ApprovalRequestType;
  status: ApprovalStatus;
  requested_by: string;
  requested_by_name: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  payload: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type SavedViewRow = {
  id: string;
  organization_id: string | null;
  name: string;
  filters: Record<string, unknown>;
  created_by: string;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

type AssetCustodyRow = { id: string; organization_id: string; asset_id: string; from_site_id: string | null; to_site_id: string | null; from_custodian: string | null; to_custodian: string | null; accepted_by: string | null; notes: string | null; occurred_at: string };
type AssetComplianceRow = { id: string; organization_id: string; asset_id: string; compliance_type: AssetComplianceRecord['complianceType']; reference_number: string | null; issued_at: string | null; expires_at: string | null; status: AssetComplianceRecord['status']; document_path: string | null; notes: string | null };
type AssetMeterRow = { id: string; organization_id: string; asset_id: string; meter_type: AssetMeterReading['meterType']; reading: number; recorded_at: string; recorded_by: string; source: AssetMeterReading['source'] };
type AssetWorkOrderRow = { id: string; organization_id: string; asset_id: string; title: string; description: string | null; status: AssetWorkOrder['status']; priority: AssetWorkOrder['priority']; due_at: string | null; completed_at: string | null; cost: number };
type AssetPlanRow = { id: string; organization_id: string; asset_id: string; name: string; interval_days: number | null; interval_meter: number | null; meter_type: AssetMaintenancePlan['meterType']; next_due_at: string | null; next_due_meter: number | null; is_active: boolean };
type EmployeeOnboardingRow = { id: string; organization_id: string; employee_id: string; criminal_check_status: EmployeeOnboardingRecord['criminalCheckStatus']; fingerprint_check_status: EmployeeOnboardingRecord['fingerprintCheckStatus']; medical_status: EmployeeOnboardingRecord['medicalStatus']; red_ticket_number: string | null; red_ticket_issued_at: string | null; red_ticket_expires_at: string | null; notes: string | null; updated_at: string };
type PpeIssueRow = { id: string; organization_id: string; employee_id: string; item_type: PpeIssueRecord['itemType']; brand: string | null; size: string; unit_cost: number; order_date: string | null; collection_date: string | null; status: PpeIssueRecord['status']; requested_at: string; office_confirmed_at: string | null; office_confirmed_by: string | null; employee_confirmed_at: string | null; employee_confirmed_by: string | null };
type AssetFuelRow = { id: string; organization_id: string; asset_id: string; fuel_date: string; litres: number; unit_cost: number; total_cost: number; odometer_km: number | null; engine_hours: number | null; supplier: string | null; reference_number: string | null; recorded_by: string; created_at: string };
type AttendanceQueueRow = { id: string; organization_id: string; submitted_by: string; site_id: string; work_date: string; status: AttendanceQueueSubmission['status']; outcome: AttendanceQueueSubmission['outcome']; attempts: number; idempotency_key: string; last_error: string | null; diagnostic_context: Record<string, unknown> | null; created_at: string; processed_at: string | null };
type OutboxRow = { id: string; organization_id: string; event_type: string; aggregate_type: string; aggregate_id: string; payload: Record<string, unknown>; status: IntegrationOutboxEvent['status']; idempotency_key: string; attempts: number; last_error: string | null; created_at: string; processed_at: string | null };
type VendorAccountRow = { id: string; organization_id: string; name: string; description: string; tax_number: string | null; is_active: boolean; total_owing_amount: number; created_at: string; updated_at: string };
type VendorInvoiceRow = { id: string; organization_id: string; vendor_id: string; invoice_date: string; order_number: string; invoice_number: string | null; supplier_order_number: string | null; internal_order_number: string | null; items_purchased: string; total: number; responsible_person: string; status: VendorInvoiceRecord['status']; requested_by: string; requested_by_name: string; director_reviewed_by: string | null; director_reviewed_at: string | null; created_at: string; updated_at: string };

const LOCAL_STORAGE_KEY = 'senatla_office_workspace_v1';
const SENATLA_TRADING_ORGANIZATION: Organization = {
  id: SENATLA_TRADING_ORGANIZATION_ID,
  name: 'Senatla Trading',
  slug: 'senatla-trading',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

@Injectable({ providedIn: 'root' })
export class OfficeAdminService {
  private readonly auth = inject(AuthService);
  private readonly config = inject<RuntimeConfig>(RUNTIME_CONFIG);
  private readonly supabase = this.config.api.mode === 'supabase' ? injectSupabaseClient() : null;
  private readonly hydratedState = signal(false);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');
  private loadSequence = 0;

  readonly users = signal<ManagedUserProfile[]>([]);
  readonly sites = signal<Site[]>([]);
  readonly groups = signal<Group[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly employeeOnboarding = signal<EmployeeOnboardingRecord[]>([]);
  readonly ppeIssues = signal<PpeIssueRecord[]>([]);
  readonly financialTypes = signal<FinancialType[]>([]);
  readonly issues = signal<Issue[]>([]);
  readonly assets = signal<VehicleAsset[]>([]);
  readonly assetCustodyEvents = signal<AssetCustodyEvent[]>([]);
  readonly assetComplianceRecords = signal<AssetComplianceRecord[]>([]);
  readonly assetMeterReadings = signal<AssetMeterReading[]>([]);
  readonly assetWorkOrders = signal<AssetWorkOrder[]>([]);
  readonly assetMaintenancePlans = signal<AssetMaintenancePlan[]>([]);
  readonly assetFuelEntries = signal<AssetFuelEntry[]>([]);
  readonly vendorAccounts = signal<VendorAccount[]>([]);
  readonly vendorInvoices = signal<VendorInvoiceRecord[]>([]);
  readonly integrationOutbox = signal<IntegrationOutboxEvent[]>([]);
  readonly attendanceQueue = signal<AttendanceQueueSubmission[]>([]);
  readonly activity = signal<AdminActivityEvent[]>([]);
  readonly payrollPeriods = signal<PayrollPeriod[]>([]);
  readonly payrollExports = signal<PayrollExportRecord[]>([]);
  readonly approvals = signal<ApprovalRequest[]>([]);
  readonly savedViews = signal<SavedAdminView[]>([]);
  readonly organizations = signal<Organization[]>([]);

  readonly isHydrated = this.hydratedState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly isOfficeAdmin = computed(() => this.auth.role() === 'office');
  readonly activeSites = computed(() => this.sites().filter((site) => site.isActive));
  readonly activeEmployees = computed(() =>
    this.employees().filter((employee) => (employee as Employee & { employmentStatus?: EmploymentStatus }).employmentStatus !== 'inactive'),
  );
  readonly attentionItems = computed(() => {
    const expiredAssets = this.assets().filter((asset) => this.isExpired(asset.licenseExpiry)).length;
    const openCriticalIssues = this.issues().filter((issue: Issue & { severity?: IssueSeverity }) => issue.status === 'Open' && issue.severity === 'critical').length;
    const inactiveUsers = this.users().filter((user) => !user.isActive).length;
    const duplicateIds = this.findDuplicateIds().length;
    return [
      { label: 'Expired assets', value: expiredAssets },
      { label: 'Critical issues', value: openCriticalIssues },
      { label: 'Inactive users', value: inactiveUsers },
      { label: 'Duplicate IDs', value: duplicateIds },
    ];
  });
  readonly pendingApprovals = computed(() => this.approvals().filter((approval) => approval.status === 'pending'));
  readonly pendingVendorInvoices = computed(() => this.vendorInvoices().filter((invoice) => invoice.status === 'pending_director'));
  readonly totalVendorOwing = computed(() => this.vendorAccounts().reduce((total, vendor) => total + vendor.totalOwingAmount, 0));
  readonly anomalies = computed<AdminAnomaly[]>(() => {
    const anomalies: AdminAnomaly[] = [];

    const duplicateIds = this.findDuplicateIds();
    for (const idNumber of duplicateIds) {
      anomalies.push({
        id: `dup-${idNumber}`,
        type: 'duplicate_id',
        severity: 'critical',
        title: 'Duplicate employee ID',
        detail: `More than one employee uses ID ${this.maskIdNumber(idNumber)}.`,
        entityId: idNumber,
      });
    }

    for (const asset of this.assets()) {
      if (!this.isExpired(asset.licenseExpiry)) continue;
      anomalies.push({
        id: `asset-${asset.id}`,
        type: 'expired_asset',
        severity: 'high',
        title: 'Expired asset licence',
        detail: `${asset.registrationNumber || asset.vin || asset.serialNumber || 'Unidentified asset'} has an expired licence.`,
        entityId: asset.id,
      });
    }

    for (const issue of this.issues()) {
      if (issue.status !== 'Open' || issue.severity !== 'critical') continue;
      anomalies.push({
        id: `issue-${issue.id}`,
        type: 'critical_issue',
        severity: 'critical',
        title: 'Critical issue still open',
        detail: issue.description,
        entityId: issue.id,
      });
    }

    for (const user of this.users()) {
      if (user.isActive) continue;
      anomalies.push({
        id: `user-${user.id}`,
        type: 'inactive_user',
        severity: 'medium',
        title: 'Inactive admin account',
        detail: `${user.displayName} is inactive.`,
        entityId: user.id,
      });
    }

    for (const employee of this.employees()) {
      if (employee.siteId) continue;
      anomalies.push({
        id: `emp-${employee.id}`,
        type: 'unassigned_employee',
        severity: 'high',
        title: 'Employee missing site assignment',
        detail: `${employee.firstName} ${employee.surname} is not assigned to a site.`,
        entityId: employee.id,
      });
    }

    return anomalies.slice(0, 25);
  });

  constructor() {
    effect(() => {
      const ready = this.auth.isReady();
      const role = this.auth.role();
      const userId = this.auth.session()?.userId ?? null;
      if (!ready || !role || !['site', 'office', 'director'].includes(role)) return;
      void this.loadWorkspace(userId);
    });
  }

  async requestPasswordReset(userId: string) {
    const user = this.users().find((entry) => entry.id === userId);
    if (!user) throw new Error('User not found.');

    if (!this.supabase) {
      const mockLink = `${location.origin}/login/recovery?mock_user=${encodeURIComponent(user.username)}`;
      await this.logActivity('password_reset_requested', 'profile', user.id, { username: user.username });
      return { message: `Mock reset link generated for ${user.username}.`, resetLink: mockLink };
    }

    const payload = await this.callAdminUserApi('PATCH', {
      action: 'send_reset',
      userId,
      redirectTo: `${location.origin}/login/recovery`,
    });

    await this.logActivity('password_reset_requested', 'profile', user.id, { username: user.username });
    return {
      message: (payload['message'] as string | undefined) || `Password reset prepared for ${user.username}.`,
      resetLink: typeof payload['resetLink'] === 'string' ? (payload['resetLink'] as string) : null,
    };
  }

  async setUserAccessState(userId: string, active: boolean) {
    const user = this.users().find((entry) => entry.id === userId);
    if (!user) throw new Error('User not found.');

    if (!this.supabase) {
      const nextUser = { ...user, isActive: active };
      this.users.update((users) => [nextUser, ...users.filter((entry) => entry.id !== userId)]);
      await this.persistLocalWorkspace();
      await this.logActivity(active ? 'user_reactivated' : 'user_suspended', 'profile', userId, { username: user.username });
      return nextUser;
    }

    const payload = await this.callAdminUserApi('PATCH', {
      action: active ? 'activate' : 'suspend',
      userId,
    });

    const updatedUser: ManagedUserProfile = {
      ...user,
      isActive: active,
      username: (payload['user'] as { username?: string } | undefined)?.username || user.username,
      displayName: (payload['user'] as { displayName?: string } | undefined)?.displayName || user.displayName,
      role: (payload['user'] as { role?: AppRole } | undefined)?.role || user.role,
    };

    this.users.update((users) => [updatedUser, ...users.filter((entry) => entry.id !== userId)]);
    await this.logActivity(active ? 'user_reactivated' : 'user_suspended', 'profile', userId, { username: user.username });
    return updatedUser;
  }

  async submitApprovalRequest(requestType: ApprovalRequestType, payload: Record<string, unknown>, notes?: string) {
    const session = this.auth.currentSession();
    if (!session) throw new Error('You must be signed in.');

    const request: ApprovalRequest = {
      id: this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      requestType,
      status: 'pending',
      requestedBy: session.userId,
      requestedByName: session.displayName,
      reviewedBy: null,
      reviewedByName: null,
      payload,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      notes: notes?.trim() || null,
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('approval_requests').insert({
        id: request.id,
        organization_id: SENATLA_TRADING_ORGANIZATION_ID,
        request_type: request.requestType,
        status: request.status,
        requested_by: request.requestedBy,
        requested_by_name: request.requestedByName,
        payload: request.payload,
        notes: request.notes,
      });
      if (error) throw error;
    }

    this.approvals.update((approvals) => [request, ...approvals]);
    await this.persistLocalWorkspace();
    await this.logActivity('approval_requested', 'approval_request', request.id, {
      requestType,
      payload,
    });
    return request;
  }

  async approveRequest(requestId: string) {
    const session = this.auth.currentSession();
    const request = this.approvals().find((entry) => entry.id === requestId);
    if (!session || !request) throw new Error('Approval request not found.');
    if (request.requestedBy === session.userId) {
      throw new Error('Maker-checker enforced: you cannot approve your own request.');
    }
    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be approved.');
    }

    const approved: ApprovalRequest = {
      ...request,
      status: 'approved',
      reviewedBy: session.userId,
      reviewedByName: session.displayName,
      reviewedAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('approval_requests').update({
        status: approved.status,
        reviewed_by: approved.reviewedBy,
        reviewed_by_name: approved.reviewedByName,
        reviewed_at: approved.reviewedAt,
      }).eq('id', requestId);
      if (error) throw error;
    }

    this.approvals.update((approvals) => [approved, ...approvals.filter((entry) => entry.id !== requestId)]);
    await this.persistLocalWorkspace();
    await this.logActivity('approval_approved', 'approval_request', requestId, { requestType: request.requestType });
    await this.executeApproval(approved);
  }

  async rejectRequest(requestId: string, notes?: string) {
    const session = this.auth.currentSession();
    const request = this.approvals().find((entry) => entry.id === requestId);
    if (!session || !request) throw new Error('Approval request not found.');
    if (request.requestedBy === session.userId) {
      throw new Error('Maker-checker enforced: you cannot reject your own request.');
    }
    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be rejected.');
    }

    const rejected: ApprovalRequest = {
      ...request,
      status: 'rejected',
      reviewedBy: session.userId,
      reviewedByName: session.displayName,
      reviewedAt: new Date().toISOString(),
      notes: notes?.trim() || request.notes || null,
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('approval_requests').update({
        status: rejected.status,
        reviewed_by: rejected.reviewedBy,
        reviewed_by_name: rejected.reviewedByName,
        reviewed_at: rejected.reviewedAt,
        notes: rejected.notes,
      }).eq('id', requestId);
      if (error) throw error;
    }

    this.approvals.update((approvals) => [rejected, ...approvals.filter((entry) => entry.id !== requestId)]);
    await this.persistLocalWorkspace();
    await this.logActivity('approval_rejected', 'approval_request', requestId, { requestType: request.requestType });
  }

  async saveCurrentView(name: string, filters: SavedAdminView['filters']) {
    const session = this.auth.currentSession();
    const normalizedName = name.trim();
    if (!session || !normalizedName) throw new Error('View name is required.');

    const view: SavedAdminView = {
      id: this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      name: normalizedName,
      filters,
      createdBy: session.userId,
      createdAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('saved_admin_views').insert({
        id: view.id,
        organization_id: SENATLA_TRADING_ORGANIZATION_ID,
        created_by: view.createdBy,
        name: view.name,
        filters: view.filters,
      });
      if (error) throw error;
    }

    this.savedViews.update((views) => [view, ...views]);
    await this.persistLocalWorkspace();
    await this.logActivity('saved_view_created', 'saved_view', view.id, { name: view.name });
    return view;
  }

  async inviteUser(input: UserInviteInput) {
    const session = this.auth.currentSession();
    if (!session) throw new Error('You must be signed in.');

    if (!this.supabase) {
      const localUser: ManagedUserProfile = {
        id: this.createId(),
        username: input.email.toLowerCase(),
        displayName: input.displayName,
        role: 'site',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      this.users.update((users) => [localUser, ...users]);
      await this.persistLocalWorkspace();
      return localUser;
    }

    const { data } = await this.supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error('Missing access token.');

    const response = await fetch(`${this.getBaseUrl()}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as { user?: ManagedUserProfile; error?: string };
    if (!response.ok || !payload.user) {
      throw new Error(payload.error || 'Unable to create user.');
    }

    this.users.update((users) => [payload.user!, ...users.filter((user) => user.id !== payload.user!.id)]);
    await this.logActivity('user_invited', 'profile', payload.user.id, {
      username: payload.user.username,
      role: payload.user.role,
    });
    return payload.user;
  }

  async saveUser(user: ManagedUserProfile) {
    const normalized: ManagedUserProfile = {
      ...user,
      username: user.username.trim().toLowerCase(),
      displayName: user.displayName.trim(),
    };

    if (!normalized.username || !normalized.displayName) {
      throw new Error('Display name and username are required.');
    }

    if (this.supabase) {
      await this.callAdminUserApi('PATCH', {
        action: 'update_profile',
        userId: normalized.id,
        email: normalized.username,
        displayName: normalized.displayName,
        role: normalized.role,
      });
    }

    this.users.update((users) => [normalized, ...users.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity('user_updated', 'profile', normalized.id, {
      role: normalized.role,
      isActive: normalized.isActive,
    });
  }

  async saveSite(site: Site) {
    const normalized = {
      id: site.id || this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      name: site.name.trim(),
      location: site.location.trim(),
      managerId: site.managerId?.trim() || undefined,
      teamName: site.teamName?.trim() || undefined,
      jobNumber: site.jobNumber?.trim() || undefined,
      estimatedDuration: site.estimatedDuration?.trim() || undefined,
      complianceChecklist: (site.complianceChecklist || []).map((item) => item.trim()).filter(Boolean),
      isActive: site.isActive ?? true,
    };

    if (!normalized.name || !normalized.location) {
      throw new Error('Site name and location are required.');
    }

    if (this.supabase) {
      const { error } = await this.supabase.from('sites').upsert({
        id: normalized.id,
        organization_id: normalized.organizationId,
        name: normalized.name,
        location: normalized.location,
        manager_profile_id: normalized.managerId ?? null,
        team_name: normalized.teamName ?? null,
        job_number: normalized.jobNumber ?? null,
        estimated_duration: normalized.estimatedDuration ?? null,
        compliance_checklist: normalized.complianceChecklist ?? [],
        is_active: normalized.isActive,
      });
      if (error) throw error;
    }

    this.sites.update((sites) => [
      { ...normalized },
      ...sites.filter((entry) => entry.id !== normalized.id),
    ]);
    await this.persistLocalWorkspace();
    await this.logActivity('site_saved', 'site', normalized.id, normalized);
  }

  async saveEmployee(employee: Employee & { employmentStatus?: EmploymentStatus }) {
    const operation = employee.id ? 'employee_updated' : 'employee_created';
    const normalized = this.normalizeEmployee(employee);
    if (!normalized.firstName || !normalized.surname || !/^(?:\d{13}|UAT-EMP-\d{4,})$/i.test(normalized.idNumber)) {
      throw new Error('Employee details are incomplete.');
    }

    if (this.supabase) {
      const { error } = await this.supabase.from('employees').upsert({
        id: normalized.id,
        organization_id: normalized.organizationId,
        first_name: normalized.firstName,
        surname: normalized.surname,
        id_number: normalized.idNumber,
        company_number: normalized.companyNumber ?? null,
        role: normalized.role,
        designation: normalized.designation ?? null,
        site_id: normalized.siteId,
        group_id: normalized.groupId ?? null,
        employment_status: normalized.employmentStatus ?? 'active',
        start_date: normalized.startDate,
        basic_rate: normalized.basicRate,
        pay_rate_unit: normalized.payRateUnit ?? 'daily',
        safety_qualifications: normalized.safetyQualifications ?? [],
        additional_fields: normalized.additionalFields ?? {},
        salary_advances: normalized.salaryAdvances,
        financials: normalized.financials,
        logs: normalized.logs,
        adjustments: normalized.adjustments,
        tax_ref_number: normalized.taxRefNumber ?? null,
      });
      if (error) throw error;
    }

    this.employees.update((employees) => [normalized, ...employees.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity(operation, 'employee', normalized.id, {
      httpMethod: employee.id ? 'PUT' : 'POST',
      friendlyAction: employee.id ? 'Employee profile updated' : 'Employee profile created',
      siteId: normalized.siteId,
      role: normalized.role,
      employmentStatus: normalized.employmentStatus ?? 'active',
    });
  }

  async saveEmployees(employees: Employee[]) {
    const normalized = employees.map((employee) => this.normalizeEmployee(employee));
    if (normalized.some((employee) => !employee.firstName || !employee.surname || !/^(?:\d{13}|UAT-EMP-\d{4,})$/i.test(employee.idNumber))) throw new Error('Employee import contains invalid rows.');
    if (this.supabase) {
      const { error } = await this.supabase.from('employees').upsert(normalized.map((employee) => ({
        id: employee.id, organization_id: employee.organizationId, first_name: employee.firstName, surname: employee.surname,
        id_number: employee.idNumber, company_number: employee.companyNumber ?? null, role: employee.role, designation: employee.designation ?? null,
        site_id: employee.siteId, group_id: employee.groupId ?? null, employment_status: employee.employmentStatus ?? 'active',
        start_date: employee.startDate, basic_rate: employee.basicRate, pay_rate_unit: employee.payRateUnit ?? 'daily',
        safety_qualifications: employee.safetyQualifications ?? [], additional_fields: employee.additionalFields ?? {},
        salary_advances: employee.salaryAdvances, financials: employee.financials, logs: employee.logs,
        adjustments: employee.adjustments, tax_ref_number: employee.taxRefNumber ?? null,
      })));
      if (error) throw error;
    }
    const importedIds = new Set(normalized.map((employee) => employee.id));
    this.employees.update((current) => [...normalized, ...current.filter((employee) => !importedIds.has(employee.id))]);
    await this.persistLocalWorkspace();
    await this.logActivity('employee_bulk_created', 'employee_import', this.createId(), {
      httpMethod: 'POST', friendlyAction: 'Employee bulk import approved', importedCount: normalized.length,
    });
  }

  async deleteEmployee(employeeId: string) {
    const employee = this.employees().find((entry) => entry.id === employeeId);
    if (!employee) throw new Error('Employee record was not found.');
    if (this.supabase) {
      const { error } = await this.supabase.from('employees').update({ employment_status: 'inactive' }).eq('id', employeeId);
      if (error) throw error;
    }
    this.employees.update((employees) => employees.map((entry) => entry.id === employeeId ? { ...entry, employmentStatus: 'inactive' } : entry));
    await this.persistLocalWorkspace();
    await this.logActivity('employee_archived', 'employee', employeeId, {
      httpMethod: 'DELETE', friendlyAction: 'Employee profile archived', companyNumber: employee.companyNumber ?? null,
    });
  }

  async updateEmployeeStatus(employeeId: string, employmentStatus: EmploymentStatus) {
    const current = this.employees().find((employee) => employee.id === employeeId);
    if (!current) return;
    await this.saveEmployee({ ...current, employmentStatus });
  }

  async bulkAssignSite(employeeIds: string[], siteId: string) {
    await this.decideEmployeeSiteAssignment(employeeIds, siteId, 'accept', '');
  }

  reviewEmployeeSiteAssignment(employeeIds: string[], siteId: string) {
    return planEmployeeSiteAssignment({
      employeeIds,
      targetSiteId: siteId,
      employees: this.employees(),
      onboarding: this.employeeOnboarding(),
      sites: this.sites(),
    });
  }

  async decideEmployeeSiteAssignment(employeeIds: string[], siteId: string, decision: AssignmentDecision, reasonCode: string) {
    const review = this.reviewEmployeeSiteAssignment(employeeIds, siteId);
    this.assertAssignmentDecision(review, decision, reasonCode);
    if (!this.supabase) throw new Error('Controlled assignment requires the real Supabase runtime.');

    const { error } = await this.supabase.rpc('apply_employee_site_assignment', {
      p_employee_ids: employeeIds,
      p_target_site_id: siteId,
      p_decision: decision,
      p_reason_code: reasonCode || null,
    });
    if (error) throw error;
    if (decision !== 'reject') this.employees.update((employees) => employees.map((employee) => employeeIds.includes(employee.id) ? { ...employee, siteId } : employee));
    return review;
  }

  async saveEmployeeOnboarding(record: Omit<EmployeeOnboardingRecord, 'id' | 'organizationId' | 'updatedAt'> & { id?: string }) {
    const session = this.auth.currentSession();
    if (!session) throw new Error('You must be signed in.');
    const normalized: EmployeeOnboardingRecord = { ...record, id: record.id || this.createId(), organizationId: SENATLA_TRADING_ORGANIZATION_ID, notes: record.notes?.trim() || '', updatedAt: new Date().toISOString() };
    if (this.supabase) {
      const { error } = await this.supabase.from('employee_onboarding_records').upsert({ id: normalized.id, organization_id: normalized.organizationId, employee_id: normalized.employeeId, criminal_check_status: normalized.criminalCheckStatus, fingerprint_check_status: normalized.fingerprintCheckStatus, medical_status: normalized.medicalStatus, red_ticket_number: normalized.redTicketNumber || null, red_ticket_issued_at: normalized.redTicketIssuedAt || null, red_ticket_expires_at: normalized.redTicketExpiresAt || null, notes: normalized.notes, updated_by: session.userId });
      if (error) throw error;
    }
    this.employeeOnboarding.update((records) => [normalized, ...records.filter((entry) => entry.id !== normalized.id && entry.employeeId !== normalized.employeeId)]);
    await this.persistLocalWorkspace();
    await this.logActivity('employee_onboarding_updated', 'employee', normalized.employeeId, { criminalCheckStatus: normalized.criminalCheckStatus, fingerprintCheckStatus: normalized.fingerprintCheckStatus, medicalStatus: normalized.medicalStatus });
    return normalized;
  }

  async savePpeIssue(record: Omit<PpeIssueRecord, 'id' | 'organizationId' | 'requestedAt'> & { id?: string; requestedAt?: string }) {
    const session = this.auth.currentSession();
    if (!session) throw new Error('You must be signed in.');
    const normalized: PpeIssueRecord = { ...record, id: record.id || this.createId(), organizationId: SENATLA_TRADING_ORGANIZATION_ID, brand: record.brand?.trim() || '', size: record.size.trim(), unitCost: Math.max(0, Number(record.unitCost) || 0), requestedAt: record.requestedAt || new Date().toISOString() };
    if (!normalized.employeeId || !normalized.size) throw new Error('Employee and PPE size are required.');
    if (this.supabase) {
      const { error } = await this.supabase.from('ppe_issue_records').upsert({ id: normalized.id, organization_id: normalized.organizationId, employee_id: normalized.employeeId, item_type: normalized.itemType, brand: normalized.brand || null, size: normalized.size, unit_cost: normalized.unitCost, order_date: normalized.orderDate || null, collection_date: normalized.collectionDate || null, status: normalized.status, requested_at: normalized.requestedAt, office_confirmed_at: normalized.officeConfirmedAt || null, office_confirmed_by: normalized.officeConfirmedBy || null, employee_confirmed_at: normalized.employeeConfirmedAt || null, employee_confirmed_by: normalized.employeeConfirmedBy || null });
      if (error) throw error;
    }
    this.ppeIssues.update((records) => [normalized, ...records.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity('ppe_issue_updated', 'employee', normalized.employeeId, { itemType: normalized.itemType, status: normalized.status, unitCost: normalized.unitCost });
    return normalized;
  }

  async confirmPpeIssue(issueId: string, party: 'office' | 'employee') {
    const session = this.auth.currentSession();
    const current = this.ppeIssues().find((entry) => entry.id === issueId);
    if (!session || !current) throw new Error('PPE record not found.');
    const now = new Date().toISOString();
    return this.savePpeIssue({ ...current, ...(party === 'office' ? { officeConfirmedAt: now, officeConfirmedBy: session.userId } : { employeeConfirmedAt: now, employeeConfirmedBy: session.userId }) });
  }

  async saveFuelEntry(record: Omit<AssetFuelEntry, 'id' | 'organizationId' | 'totalCost' | 'recordedBy' | 'createdAt'> & { id?: string }) {
    const session = this.auth.currentSession();
    if (!session) throw new Error('You must be signed in.');
    const litres = Math.max(0, Number(record.litres) || 0); const unitCost = Math.max(0, Number(record.unitCost) || 0);
    if (!record.assetId || !record.fuelDate || litres <= 0) throw new Error('Asset, fuel date, and litres are required.');
    const normalized: AssetFuelEntry = { ...record, id: record.id || this.createId(), organizationId: SENATLA_TRADING_ORGANIZATION_ID, litres, unitCost, totalCost: Number((litres * unitCost).toFixed(2)), recordedBy: session.userId, createdAt: new Date().toISOString() };
    if (this.supabase) {
      const { error } = await this.supabase.from('asset_fuel_entries').insert({ id: normalized.id, organization_id: normalized.organizationId, asset_id: normalized.assetId, fuel_date: normalized.fuelDate, litres: normalized.litres, unit_cost: normalized.unitCost, odometer_km: normalized.odometerKm || null, engine_hours: normalized.engineHours || null, supplier: normalized.supplier || null, reference_number: normalized.referenceNumber || null, recorded_by: normalized.recordedBy });
      if (error) throw error;
    }
    this.assetFuelEntries.update((records) => [normalized, ...records]);
    await this.persistLocalWorkspace();
    await this.logActivity('asset_fuel_recorded', 'asset', normalized.assetId, { litres, totalCost: normalized.totalCost });
    return normalized;
  }
  async saveVendorAccount(record: Omit<VendorAccount, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const session = this.auth.currentSession();
    if (!session) throw new Error('You must be signed in.');
    const now = new Date().toISOString();
    const normalized: VendorAccount = {
      id: record.id || this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      name: record.name.trim(),
      description: record.description.trim(),
      taxNumber: record.taxNumber?.trim() || undefined,
      isActive: record.isActive !== false,
      totalOwingAmount: Math.max(0, Number(record.totalOwingAmount) || 0),
      createdAt: this.vendorAccounts().find((vendor) => vendor.id === record.id)?.createdAt || now,
      updatedAt: now,
    };
    if (!normalized.name) throw new Error('Vendor name is required.');

    if (this.supabase) {
      const { error } = await this.supabase.from('vendor_accounts').upsert({
        id: normalized.id,
        organization_id: normalized.organizationId,
        name: normalized.name,
        description: normalized.description,
        tax_number: normalized.taxNumber || null,
        is_active: normalized.isActive !== false,
        total_owing_amount: normalized.totalOwingAmount,
      });
      if (error) throw error;
    }

    this.vendorAccounts.update((vendors) => [normalized, ...vendors.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity('vendor_saved', 'vendor_account', normalized.id, { name: normalized.name, totalOwingAmount: normalized.totalOwingAmount });
    return normalized;
  }

  async submitVendorInvoice(record: Omit<VendorInvoiceRecord, 'id' | 'organizationId' | 'status' | 'requestedBy' | 'requestedByName' | 'directorReviewedBy' | 'directorReviewedAt' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const session = this.auth.currentSession();
    if (!session) throw new Error('You must be signed in.');
    const vendor = this.vendorAccounts().find((entry) => entry.id === record.vendorId);
    if (!vendor) throw new Error('Vendor is required before invoice submission.');
    const total = Math.max(0, Number(record.total) || 0);
    const now = new Date().toISOString();
    const normalized: VendorInvoiceRecord = {
      id: record.id || this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      vendorId: record.vendorId,
      invoiceDate: record.invoiceDate,
      orderNumber: (record.supplierOrderNumber || record.invoiceNumber || record.orderNumber).trim(),
      invoiceNumber: record.invoiceNumber?.trim() || undefined,
      supplierOrderNumber: record.supplierOrderNumber?.trim() || undefined,
      internalOrderNumber: record.internalOrderNumber?.trim() || undefined,
      itemsPurchased: record.itemsPurchased.trim(),
      total,
      responsiblePerson: record.responsiblePerson.trim(),
      status: 'pending_director',
      requestedBy: session.userId,
      requestedByName: session.displayName,
      directorReviewedBy: null,
      directorReviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    if (!normalized.invoiceDate || !normalized.internalOrderNumber || !(normalized.invoiceNumber || normalized.supplierOrderNumber) || !normalized.itemsPurchased || !normalized.responsiblePerson || total <= 0) {
      throw new Error('Invoice date, internal order number, supplier invoice or order reference, items, requester, and total are required.');
    }

    if (this.supabase) {
      const { error } = await this.supabase.from('vendor_invoice_records').insert({
        id: normalized.id,
        organization_id: normalized.organizationId,
        vendor_id: normalized.vendorId,
        invoice_date: normalized.invoiceDate,
        order_number: normalized.orderNumber,
        invoice_number: normalized.invoiceNumber || null,
        supplier_order_number: normalized.supplierOrderNumber || null,
        internal_order_number: normalized.internalOrderNumber || null,
        items_purchased: normalized.itemsPurchased,
        total: normalized.total,
        responsible_person: normalized.responsiblePerson,
        status: normalized.status,
        requested_by: normalized.requestedBy,
        requested_by_name: normalized.requestedByName,
      });
      if (error) throw error;
    }

    this.vendorInvoices.update((invoices) => [normalized, ...invoices.filter((entry) => entry.id !== normalized.id)]);
    this.vendorAccounts.update((vendors) => vendors.map((entry) => entry.id === normalized.vendorId ? { ...entry, totalOwingAmount: Number((entry.totalOwingAmount + normalized.total).toFixed(2)), updatedAt: now } : entry));
    await this.persistLocalWorkspace();
    await this.submitApprovalRequest('vendor_invoice_approval', { invoiceId: normalized.id, vendorId: normalized.vendorId, total: normalized.total, orderNumber: normalized.orderNumber, vendorName: vendor.name });
    await this.logActivity('vendor_invoice_submitted', 'vendor_invoice', normalized.id, { vendorId: normalized.vendorId, total: normalized.total, orderNumber: normalized.orderNumber });
    return normalized;
  }
  async saveFinancialType(financialType: FinancialType) {
    const normalized: FinancialType = {
      ...financialType,
      id: financialType.id.trim(),
      name: financialType.name.trim(),
    };
    if (!normalized.id || !normalized.name) throw new Error('Financial type is incomplete.');

    if (this.supabase) {
      const { error } = await this.supabase.from('financial_types').upsert({
        id: normalized.id,
        name: normalized.name,
        category: normalized.category,
        is_active: normalized.isActive,
        is_system: !!normalized.isSystem,
      });
      if (error) throw error;
    }

    this.financialTypes.update((types) => [normalized, ...types.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity('financial_type_saved', 'financial_type', normalized.id, {
      category: normalized.category,
      isActive: normalized.isActive,
    });
  }

  async saveIssue(issue: Issue & { severity?: IssueSeverity; ownerProfileId?: string | null; dueAt?: string | null }) {
    const normalized = this.normalizeIssue(issue);
    if (!normalized.description) throw new Error('Issue description is required.');

    if (this.supabase) {
      const { error } = await this.supabase.from('issues').upsert({
        id: normalized.id,
        organization_id: normalized.organizationId,
        site_id: normalized.siteId || null,
        reported_by: normalized.reportedBy,
        category: normalized.category,
        description: normalized.description,
        status: normalized.status,
        severity: normalized.severity ?? 'medium',
        owner_profile_id: normalized.ownerProfileId ?? null,
        due_at: normalized.dueAt ?? null,
        audit_trail: normalized.auditTrail,
      });
      if (error) throw error;
    }

    this.issues.update((issues) => [normalized, ...issues.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity('issue_saved', 'issue', normalized.id, {
      status: normalized.status,
      severity: normalized.severity ?? 'medium',
    });
  }

  async saveAsset(asset: VehicleAsset) {
    const normalized = this.normalizeAsset(asset);
    if (!normalized.registrationNumber && !normalized.serialNumber && !normalized.vin) {
      throw new Error('Add at least one unique identifier: serial number, VIN, or number plate.');
    }
    if (!normalized.make || !normalized.model || !normalized.licenseExpiry) {
      throw new Error('Make, model, and compliance date are required.');
    }

    const duplicate = this.assets().find((entry) => {
      if (entry.id === normalized.id) return false;
      const current = this.normalizeAsset(entry);
      return Boolean(
        (normalized.registrationNumber && current.registrationNumber === normalized.registrationNumber)
        || (normalized.serialNumber && current.serialNumber === normalized.serialNumber)
        || (normalized.vin && current.vin === normalized.vin),
      );
    });
    if (duplicate) {
      throw new Error('That serial number, VIN, or number plate is already assigned to another asset.');
    }

    if (this.supabase) {
      const { error } = await this.supabase.from('assets').upsert({
        id: normalized.id,
        organization_id: normalized.organizationId,
        registration_number: normalized.registrationNumber ?? null,
        serial_number: normalized.serialNumber ?? null,
        vin: normalized.vin ?? null,
        make: normalized.make,
        model: normalized.model,
        type: normalized.type,
        license_expiry: normalized.licenseExpiry,
        status: normalized.status,
        assigned_site_id: normalized.assignedSiteId ?? null,
        notes: normalized.notes ?? null,
        custodian_name: normalized.custodianName ?? null,
        asset_class: normalized.assetClass ?? null,
        lifecycle_state: normalized.lifecycleState ?? 'active',
        retired_at: normalized.retiredAt ?? null,
      });
      if (error) throw error;
    }

    this.assets.update((assets) => [normalized, ...assets.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity('asset_saved', 'asset', normalized.id, {
      status: normalized.status,
      assignedSiteId: normalized.assignedSiteId ?? null,
    });
    return normalized;
  }

  previewAssetCsv(csv: string): AssetImportPreview {
    const lines = csv.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      return { validAssets: [], conflicts: [{ rowNumber: 1, identifier: '', reason: 'CSV requires a header and at least one data row.' }], totalRows: 0 };
    }

    const headers = this.parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
    const valueFor = (values: string[], aliases: string[]) => {
      const index = aliases.map((alias) => headers.indexOf(alias)).find((candidate) => candidate >= 0) ?? -1;
      return index >= 0 ? values[index]?.trim() || '' : '';
    };
    const validAssets: VehicleAsset[] = [];
    const conflicts: AssetImportPreview['conflicts'] = [];
    const identifiers = new Set<string>();
    for (const asset of this.assets()) {
      [asset.registrationNumber, asset.serialNumber, asset.vin].filter(Boolean).forEach((value) => identifiers.add(value!.trim().toUpperCase()));
    }

    lines.slice(1).forEach((line, index) => {
      const rowNumber = index + 2;
      const values = this.parseCsvLine(line);
      const registrationNumber = valueFor(values, ['registrationnumber', 'numberplate', 'registration', 'plate']).toUpperCase();
      const serialNumber = valueFor(values, ['serialnumber', 'serial']).toUpperCase();
      const vin = valueFor(values, ['vin', 'chassisnumber', 'chassis']).toUpperCase();
      const make = valueFor(values, ['make']);
      const model = valueFor(values, ['model']);
      const licenseExpiry = valueFor(values, ['licenseexpiry', 'compliancedate', 'expiry']);
      const suppliedIdentifiers = [registrationNumber, serialNumber, vin].filter(Boolean);
      const identifier = suppliedIdentifiers.join(' / ');

      if (!suppliedIdentifiers.length || !make || !model || !/^\d{4}-\d{2}-\d{2}$/.test(licenseExpiry)) {
        conflicts.push({ rowNumber, identifier, reason: 'At least one identifier, make, model, and a YYYY-MM-DD compliance date are required.' });
        return;
      }
      const duplicate = suppliedIdentifiers.find((value) => identifiers.has(value));
      if (duplicate) {
        conflicts.push({ rowNumber, identifier: duplicate, reason: 'Identifier already exists in the register or import file.' });
        return;
      }

      suppliedIdentifiers.forEach((value) => identifiers.add(value));
      const typeValue = valueFor(values, ['type', 'assetclass']).toLowerCase();
      const type: VehicleAsset['type'] = typeValue.includes('yellow') ? 'Yellow Metal' : typeValue.includes('light') ? 'Light Vehicle' : 'Heavy Duty';
      validAssets.push({
        id: '', organizationId: SENATLA_TRADING_ORGANIZATION_ID,
        registrationNumber: registrationNumber || undefined, serialNumber: serialNumber || undefined, vin: vin || undefined,
        make, model, type, assetClass: valueFor(values, ['assetclass']) || type, licenseExpiry,
        status: 'Active', lifecycleState: 'active',
        assignedSiteId: valueFor(values, ['assignedsiteid', 'siteid']) || undefined,
        custodianName: valueFor(values, ['custodianname', 'custodian']) || undefined,
        notes: valueFor(values, ['notes']) || undefined,
      });
    });

    return { validAssets, conflicts, totalRows: lines.length - 1 };
  }

  async commitAssetImport(preview: AssetImportPreview) {
    if (preview.conflicts.length) throw new Error('Resolve all import conflicts before committing assets.');
    for (const asset of preview.validAssets) await this.saveAsset(asset);
    await this.logActivity('asset_import_committed', 'asset_import', this.createId(), { count: preview.validAssets.length });
  }

  reviewAssetSiteTransfer(assetId: string, siteId: string) {
    return planAssetSiteTransfer({
      assetId,
      targetSiteId: siteId,
      assets: this.assets(),
      sites: this.sites(),
      compliance: this.assetComplianceRecords(),
      workOrders: this.assetWorkOrders(),
    });
  }

  async transferAsset(
    assetId: string,
    toSiteId?: string,
    toCustodian?: string,
    notes?: string,
    decision: AssignmentDecision = 'accept',
    reasonCode = '',
  ) {
    if (!toSiteId) throw new Error('Select an active target site.');
    const review = this.reviewAssetSiteTransfer(assetId, toSiteId);
    this.assertAssignmentDecision(review, decision, reasonCode);
    if (!this.supabase) throw new Error('Controlled assignment requires the real Supabase runtime.');

    const { error } = await this.supabase.rpc('apply_asset_site_transfer', {
      p_asset_id: assetId,
      p_target_site_id: toSiteId,
      p_to_custodian: toCustodian?.trim() || null,
      p_handover_notes: notes?.trim() || null,
      p_decision: decision,
      p_reason_code: reasonCode || null,
    });
    if (error) throw error;
    if (decision !== 'reject') this.assets.update((assets) => assets.map((asset) => asset.id === assetId ? { ...asset, assignedSiteId: toSiteId, custodianName: toCustodian?.trim() || undefined } : asset));
    return review;
  }
  async saveComplianceRecord(record: AssetComplianceRecord) {
    const normalized: AssetComplianceRecord = {
      ...record, id: record.id || this.createId(), organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      referenceNumber: record.referenceNumber?.trim() || undefined, documentPath: record.documentPath?.trim() || undefined,
      notes: record.notes?.trim() || undefined, status: this.complianceStatus(record.expiresAt, record.status),
    };
    if (!this.assets().some((asset) => asset.id === normalized.assetId)) throw new Error('Select a valid asset.');
    if (this.supabase) {
      const { error } = await this.supabase.from('asset_compliance_records').upsert({
        id: normalized.id, organization_id: normalized.organizationId, asset_id: normalized.assetId,
        compliance_type: normalized.complianceType, reference_number: normalized.referenceNumber ?? null,
        issued_at: normalized.issuedAt ?? null, expires_at: normalized.expiresAt ?? null, status: normalized.status,
        document_path: normalized.documentPath ?? null, notes: normalized.notes ?? null,
      });
      if (error) throw error;
    }
    this.assetComplianceRecords.update((records) => [normalized, ...records.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity('asset_compliance_saved', 'asset_compliance', normalized.id, { assetId: normalized.assetId, status: normalized.status });
  }

  async recordMeterReading(reading: AssetMeterReading) {
    const normalized = { ...reading, id: reading.id || this.createId(), organizationId: SENATLA_TRADING_ORGANIZATION_ID, reading: Number(reading.reading), recordedBy: reading.recordedBy || this.auth.displayName(), recordedAt: reading.recordedAt || new Date().toISOString() };
    if (!Number.isFinite(normalized.reading) || normalized.reading < 0) throw new Error('Meter reading must be zero or greater.');
    const latest = this.assetMeterReadings().filter((entry) => entry.assetId === normalized.assetId && entry.meterType === normalized.meterType).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
    if (latest && normalized.reading < latest.reading) throw new Error('Meter readings cannot decrease.');
    if (this.supabase) {
      const { error } = await this.supabase.from('asset_meter_readings').insert({ id: normalized.id, organization_id: normalized.organizationId, asset_id: normalized.assetId, meter_type: normalized.meterType, reading: normalized.reading, recorded_at: normalized.recordedAt, recorded_by: normalized.recordedBy, source: normalized.source });
      if (error) throw error;
    }
    this.assetMeterReadings.update((readings) => [normalized, ...readings]);
    await this.persistLocalWorkspace();
    await this.logActivity('asset_meter_recorded', 'asset_meter', normalized.id, { assetId: normalized.assetId, reading: normalized.reading });
  }

  async saveWorkOrder(workOrder: AssetWorkOrder) {
    const normalized: AssetWorkOrder = { ...workOrder, id: workOrder.id || this.createId(), organizationId: SENATLA_TRADING_ORGANIZATION_ID, title: workOrder.title.trim(), description: workOrder.description?.trim() || undefined, cost: Number(workOrder.cost || 0), completedAt: workOrder.status === 'completed' ? workOrder.completedAt || new Date().toISOString() : null };
    if (!normalized.title || normalized.cost < 0) throw new Error('Work-order title and a non-negative cost are required.');
    if (this.supabase) {
      const { error } = await this.supabase.from('asset_work_orders').upsert({ id: normalized.id, organization_id: normalized.organizationId, asset_id: normalized.assetId, title: normalized.title, description: normalized.description ?? null, status: normalized.status, priority: normalized.priority, due_at: normalized.dueAt ?? null, completed_at: normalized.completedAt ?? null, cost: normalized.cost });
      if (error) throw error;
    }
    this.assetWorkOrders.update((orders) => [normalized, ...orders.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity('asset_work_order_saved', 'asset_work_order', normalized.id, { assetId: normalized.assetId, status: normalized.status });
  }

  async saveMaintenancePlan(plan: AssetMaintenancePlan) {
    const normalized: AssetMaintenancePlan = { ...plan, id: plan.id || this.createId(), organizationId: SENATLA_TRADING_ORGANIZATION_ID, name: plan.name.trim(), intervalDays: plan.intervalDays ? Number(plan.intervalDays) : null, intervalMeter: plan.intervalMeter ? Number(plan.intervalMeter) : null };
    if (!normalized.name || (!normalized.intervalDays && !normalized.intervalMeter)) throw new Error('Maintenance plans require a name and a date or meter interval.');
    if (this.supabase) {
      const { error } = await this.supabase.from('asset_maintenance_plans').upsert({ id: normalized.id, organization_id: normalized.organizationId, asset_id: normalized.assetId, name: normalized.name, interval_days: normalized.intervalDays, interval_meter: normalized.intervalMeter, meter_type: normalized.meterType ?? null, next_due_at: normalized.nextDueAt ?? null, next_due_meter: normalized.nextDueMeter ?? null, is_active: normalized.isActive });
      if (error) throw error;
    }
    this.assetMaintenancePlans.update((plans) => [normalized, ...plans.filter((entry) => entry.id !== normalized.id)]);
    await this.persistLocalWorkspace();
    await this.logActivity('asset_maintenance_plan_saved', 'asset_maintenance_plan', normalized.id, { assetId: normalized.assetId });
  }

  async enqueueOutbox(eventType: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>, idempotencyKey: string) {
    if (this.integrationOutbox().some((event) => event.idempotencyKey === idempotencyKey)) return;
    const event: IntegrationOutboxEvent = { id: this.createId(), organizationId: SENATLA_TRADING_ORGANIZATION_ID, eventType, aggregateType, aggregateId, payload, status: 'pending', idempotencyKey, attempts: 0, createdAt: new Date().toISOString(), processedAt: null };
    if (this.supabase) {
      const { error } = await this.supabase.from('integration_outbox').insert({ id: event.id, organization_id: event.organizationId, event_type: event.eventType, aggregate_type: event.aggregateType, aggregate_id: event.aggregateId, payload: event.payload, status: event.status, idempotency_key: event.idempotencyKey, attempts: event.attempts });
      if (error && error.code !== '23505') throw error;
    }
    this.integrationOutbox.update((events) => [event, ...events]);
    await this.persistLocalWorkspace();
  }

  async retryOutboxEvent(eventId: string) {
    const event = this.integrationOutbox().find((entry) => entry.id === eventId);
    if (!event) throw new Error('Outbox event not found.');
    if (event.status !== 'failed') throw new Error('Only failed outbox events can be retried.');
    if (event.attempts >= 2) throw new Error('Repeated failure requires escalation with the original audit reference.');
    if (this.supabase) {
      const { error } = await this.supabase.from('integration_outbox').update({ status: 'pending', processed_at: null }).eq('id', event.id).eq('status', 'failed').select('id').single();
      if (error) throw error;
    }
    const retried: IntegrationOutboxEvent = { ...event, status: 'pending', processedAt: null };
    this.integrationOutbox.update((events) => events.map((entry) => entry.id === event.id ? retried : entry));
    await this.persistLocalWorkspace();
    await this.logActivity('integration_outbox_retry_requested', 'integration_outbox', event.id, { idempotencyKey: event.idempotencyKey, attempts: event.attempts, lastError: event.lastError || null });
  }

  async retryAttendanceSubmission(submissionId: string) {
    const submission = this.attendanceQueue().find((entry) => entry.id === submissionId);
    if (!submission) throw new Error('Attendance submission not found.');
    if (submission.outcome !== 'retryable') throw new Error('Only retryable attendance submissions can be retried.');
    if (this.supabase) {
      const { data, error } = await this.supabase.from('queued_sync_submissions').update({ status: 'processing' }).eq('id', submissionId).select('id, organization_id, submitted_by, site_id, work_date, status, outcome, attempts, idempotency_key, last_error, diagnostic_context, created_at, processed_at').single();
      if (error || !data) throw error || new Error('Attendance retry returned no result.');
      const updated = this.mapAttendanceQueue(data as AttendanceQueueRow);
      this.attendanceQueue.update((entries) => entries.map((entry) => entry.id === updated.id ? updated : entry));
      return updated;
    }
    const updated: AttendanceQueueSubmission = { ...submission, status: 'completed', outcome: 'accepted', attempts: submission.attempts + 1, lastError: null, processedAt: new Date().toISOString() };
    this.attendanceQueue.update((entries) => entries.map((entry) => entry.id === updated.id ? updated : entry));
    await this.persistLocalWorkspace();
    return updated;
  }
  async ensurePayrollPeriod(month: number, year: number) {
    const periodKey = `${year}-${`${month + 1}`.padStart(2, '0')}`;
    let period = this.payrollPeriods().find((entry) => entry.periodKey === periodKey);
    if (period) return period;

    period = {
      id: this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      periodKey,
      month,
      year,
      status: 'open',
      lockedAt: null,
      lockedBy: null,
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('payroll_periods').upsert({
        id: period.id,
        organization_id: SENATLA_TRADING_ORGANIZATION_ID,
        period_key: period.periodKey,
        month: period.month,
        year: period.year,
        status: period.status,
        locked_at: period.lockedAt,
        locked_by: period.lockedBy,
      });
      if (error) throw error;
    }

    this.payrollPeriods.update((periods) => [period!, ...periods.filter((entry) => entry.periodKey !== periodKey)]);
    await this.persistLocalWorkspace();
    return period;
  }

  async setPayrollPeriodStatus(month: number, year: number, status: PayrollPeriodStatus) {
    const current = await this.ensurePayrollPeriod(month, year);
    if (current.status === 'exported' && status !== 'exported') {
      throw new Error('Exported payroll periods are immutable.');
    }
    if (current.status === 'locked' && status === 'open') {
      throw new Error('Locked payroll periods cannot be reopened.');
    }
    const next: PayrollPeriod = {
      ...current,
      status,
      lockedAt: status === 'locked' || status === 'exported' ? new Date().toISOString() : null,
      lockedBy: status === 'locked' || status === 'exported' ? this.auth.displayName() : null,
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('payroll_periods').upsert({
        id: next.id,
        organization_id: SENATLA_TRADING_ORGANIZATION_ID,
        period_key: next.periodKey,
        month: next.month,
        year: next.year,
        status: next.status,
        locked_at: next.lockedAt,
        locked_by: next.lockedBy,
      });
      if (error) throw error;
    }

    this.payrollPeriods.update((periods) => [next, ...periods.filter((entry) => entry.periodKey !== next.periodKey)]);
    await this.persistLocalWorkspace();
    await this.logActivity('payroll_period_updated', 'payroll_period', next.periodKey, { status });
  }

  async recordPayrollExport(periodKey: string, includeFullIds: boolean, fileName: string) {
    const period = this.payrollPeriods().find((entry) => entry.periodKey === periodKey);
    if (!period || period.status === 'open') {
      throw new Error('Lock the payroll period before exporting it.');
    }
    const record: PayrollExportRecord = {
      id: this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      periodKey,
      includeFullIds,
      requestedBy: this.auth.displayName(),
      fileName,
      createdAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('payroll_exports').insert({
        id: record.id,
        organization_id: SENATLA_TRADING_ORGANIZATION_ID,
        period_key: record.periodKey,
        include_full_ids: record.includeFullIds,
        requested_by: record.requestedBy,
        file_name: record.fileName,
      });
      if (error) throw error;
    }

    this.payrollExports.update((exports) => [record, ...exports]);
    await this.persistLocalWorkspace();
    await this.logActivity('payroll_export_created', 'payroll_export', record.id, {
      periodKey,
      includeFullIds,
      fileName,
    });
  }

  calculateMonthlyPayroll(empId: string, month: number, year: number) {
    const employee = this.employees().find((entry) => entry.id === empId);
    if (!employee) return null;

    let automatedDays = 0;
    Object.values(employee.logs).forEach((log) => {
      const date = new Date(log.date);
      if (date.getMonth() === month && date.getFullYear() === year && log.status === 'present') {
        automatedDays += 1;
      }
    });

    let adjustmentDays = 0;
    for (let week = 1; week <= 5; week += 1) {
      adjustmentDays += employee.adjustments[`${year}-${month}-${week}`] || 0;
    }

    const totalDays = Math.max(0, automatedDays + adjustmentDays);
    const grossWages = totalDays * employee.basicRate;
    let totalAllowances = 0;
    let totalDeductions = 0;

    this.financialTypes().forEach((type) => {
      if (!type.isActive) return;
      const amount = employee.financials[type.id] || 0;
      if (type.category === 'Allowance') totalAllowances += amount;
      if (type.category === 'Deduction') totalDeductions += amount;
    });

    const uifDeduction = (grossWages + totalAllowances) * 0.01;
    const totalEarnings = grossWages + totalAllowances;
    const netPay = totalEarnings - uifDeduction - totalDeductions - (employee.salaryAdvances || 0);

    return {
      daysWorked: totalDays,
      automatedDays,
      adjustmentDays,
      grossWages,
      allowances: totalAllowances,
      deductions: totalDeductions,
      salaryAdvances: employee.salaryAdvances || 0,
      uifDeduction,
      totalEarnings,
      netPay,
    };
  }

  generatePayrollCsv(month: number, year: number, includeFullIds: boolean) {
    const header = 'ID Number,Surname,First Name,Site,Days Worked,Manual Adj,Basic Rate,Gross Wage,Allowances,Deductions,Advances,UIF Deduction,Net Pay\n';
    const rows = this.activeEmployees().map((employee) => {
      const payroll = this.calculateMonthlyPayroll(employee.id, month, year);
      if (!payroll) return '';
      const idNumber = includeFullIds ? employee.idNumber : this.maskIdNumber(employee.idNumber);
      const siteName = this.sites().find((site) => site.id === employee.siteId)?.name || 'Unknown';
      return `${idNumber},${employee.surname},${employee.firstName},${siteName},${payroll.daysWorked},${payroll.adjustmentDays},${employee.basicRate},${payroll.grossWages},${payroll.allowances},${payroll.deductions},${payroll.salaryAdvances},${payroll.uifDeduction.toFixed(2)},${payroll.netPay.toFixed(2)}`;
    }).join('\n');
    return header + rows;
  }

  maskIdNumber(idNumber: string) {
    const trimmed = idNumber.trim();
    if (/^UAT-EMP-\d{4,}$/i.test(trimmed)) return trimmed;
    if (trimmed.length <= 4) return trimmed;
    return `${trimmed.slice(0, 2)}${'*'.repeat(Math.max(trimmed.length - 4, 0))}${trimmed.slice(-2)}`;
  }

  getSiteName(id: string) {
    return this.sites().find((site) => site.id === id)?.name || 'Unassigned';
  }

  isExpired(dateStr: string) {
    return new Date(`${dateStr}T00:00:00`).getTime() < new Date().getTime();
  }

  private async loadWorkspace(userId: string | null) {
    const loadId = ++this.loadSequence;
    this.loadingState.set(true);
    this.errorState.set('');
    this.hydratedState.set(false);

    try {
      const workspace = this.supabase ? await this.loadFromSupabase() : this.loadFromLocal();
      if (loadId !== this.loadSequence || !userId) return;
      this.applyWorkspace(workspace);
      this.hydratedState.set(true);
    } catch (error) {
      if (loadId !== this.loadSequence) return;
      this.errorState.set(error instanceof Error ? error.message : 'Unable to load office workspace.');
      this.applyWorkspace(this.createDefaultWorkspace());
      this.hydratedState.set(true);
    } finally {
      if (loadId === this.loadSequence) {
        this.loadingState.set(false);
      }
    }
  }

  private async loadFromSupabase(): Promise<OfficeAdminWorkspace> {
    const [
      profileResult,
      siteResult,
      groupResult,
      employeeResult,
      onboardingResult,
      ppeResult,
      financialTypeResult,
      issueResult,
      assetResult,
      activityResult,
      payrollPeriodResult,
      payrollExportResult,
      approvalResult,
      savedViewResult,
      organizationResult,
      custodyResult,
      complianceResult,
      meterResult,
      workOrderResult,
      maintenancePlanResult,
      fuelResult,
      vendorResult,
      vendorInvoiceResult,
      outboxResult,
      attendanceQueueResult,
    ] = await Promise.all([
      this.supabase!.from('profiles').select('id, username, display_name, role, is_active, created_at').order('created_at', { ascending: false }),
      this.supabase!.from('sites').select('id, organization_id, name, location, manager_profile_id, team_name, job_number, estimated_duration, compliance_checklist, is_active').order('name'),
      this.supabase!.from('employee_groups').select('id, name, is_active').order('name'),
      this.supabase!.from('employees').select('id, organization_id, first_name, surname, id_number, company_number, role, designation, site_id, group_id, employment_status, start_date, basic_rate, pay_rate_unit, safety_qualifications, additional_fields, salary_advances, financials, logs, adjustments, tax_ref_number').order('surname'),
      this.supabase!.from('employee_onboarding_records').select('id, organization_id, employee_id, criminal_check_status, fingerprint_check_status, medical_status, red_ticket_number, red_ticket_issued_at, red_ticket_expires_at, notes, updated_at').order('updated_at', { ascending: false }),
      this.supabase!.from('ppe_issue_records').select('id, organization_id, employee_id, item_type, brand, size, unit_cost, order_date, collection_date, status, requested_at, office_confirmed_at, office_confirmed_by, employee_confirmed_at, employee_confirmed_by').order('requested_at', { ascending: false }),
      this.supabase!.from('financial_types').select('id, name, category, is_active, is_system').order('name'),
      this.supabase!.from('issues').select('id, organization_id, site_id, reported_by, category, description, status, severity, owner_profile_id, due_at, audit_trail, created_at').order('created_at', { ascending: false }),
      this.supabase!.from('assets').select('id, organization_id, registration_number, serial_number, vin, make, model, type, license_expiry, status, assigned_site_id, notes, custodian_name, asset_class, lifecycle_state, retired_at').order('license_expiry'),
      this.supabase!.from('admin_activity_log').select('id, organization_id, action, entity_type, entity_id, actor_id, actor_name, details, occurred_at').order('occurred_at', { ascending: false }).limit(50),
      this.supabase!.from('payroll_periods').select('id, organization_id, period_key, month, year, status, locked_at, locked_by').order('year', { ascending: false }).order('month', { ascending: false }),
      this.supabase!.from('payroll_exports').select('id, organization_id, period_key, include_full_ids, requested_by, file_name, created_at').order('created_at', { ascending: false }).limit(25),
      this.supabase!.from('approval_requests').select('id, organization_id, request_type, status, requested_by, requested_by_name, reviewed_by, reviewed_by_name, payload, notes, created_at, reviewed_at').order('created_at', { ascending: false }).limit(50),
      this.supabase!.from('saved_admin_views').select('id, organization_id, name, filters, created_by, created_at').order('created_at', { ascending: false }).limit(25),
      this.supabase!.from('organizations').select('id, name, slug, is_active, created_at').order('name'),
      this.supabase!.from('asset_custody_events').select('id, organization_id, asset_id, from_site_id, to_site_id, from_custodian, to_custodian, accepted_by, notes, occurred_at').order('occurred_at', { ascending: false }),
      this.supabase!.from('asset_compliance_records').select('id, organization_id, asset_id, compliance_type, reference_number, issued_at, expires_at, status, document_path, notes').order('expires_at'),
      this.supabase!.from('asset_meter_readings').select('id, organization_id, asset_id, meter_type, reading, recorded_at, recorded_by, source').order('recorded_at', { ascending: false }),
      this.supabase!.from('asset_work_orders').select('id, organization_id, asset_id, title, description, status, priority, due_at, completed_at, cost').order('due_at'),
      this.supabase!.from('asset_maintenance_plans').select('id, organization_id, asset_id, name, interval_days, interval_meter, meter_type, next_due_at, next_due_meter, is_active').order('name'),
      this.supabase!.from('asset_fuel_entries').select('id, organization_id, asset_id, fuel_date, litres, unit_cost, total_cost, odometer_km, engine_hours, supplier, reference_number, recorded_by, created_at').order('fuel_date', { ascending: false }),
      this.supabase!.from('vendor_accounts').select('id, organization_id, name, description, tax_number, is_active, total_owing_amount, created_at, updated_at').order('name'),
      this.supabase!.from('vendor_invoice_records').select('id, organization_id, vendor_id, invoice_date, order_number, invoice_number, supplier_order_number, internal_order_number, items_purchased, total, responsible_person, status, requested_by, requested_by_name, director_reviewed_by, director_reviewed_at, created_at, updated_at').order('created_at', { ascending: false }),
      this.supabase!.from('integration_outbox').select('id, organization_id, event_type, aggregate_type, aggregate_id, payload, status, idempotency_key, attempts, last_error, created_at, processed_at').order('created_at', { ascending: false }).limit(100),
      this.supabase!.from('queued_sync_submissions').select('id, organization_id, submitted_by, site_id, work_date, status, outcome, attempts, idempotency_key, last_error, diagnostic_context, created_at, processed_at').order('created_at', { ascending: false }).limit(100),
    ]);

    const results = [profileResult, siteResult, groupResult, employeeResult, onboardingResult, ppeResult, financialTypeResult, issueResult, assetResult, activityResult, payrollPeriodResult, payrollExportResult, approvalResult, savedViewResult, organizationResult, custodyResult, complianceResult, meterResult, workOrderResult, maintenancePlanResult, fuelResult, vendorResult, vendorInvoiceResult, outboxResult, attendanceQueueResult];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) throw firstError;

    return {
      users: (profileResult.data as ProfileRow[]).map((row) => this.mapProfile(row)),
      sites: (siteResult.data as SiteRow[]).map((row) => this.mapSite(row)),
      groups: (groupResult.data as GroupRow[]).filter((row) => row.is_active).map((row) => ({ id: row.id, name: row.name })),
      employees: (employeeResult.data as EmployeeRow[]).map((row) => this.mapEmployee(row)),
      employeeOnboarding: (onboardingResult.data as EmployeeOnboardingRow[]).map((row) => ({ id: row.id, organizationId: row.organization_id, employeeId: row.employee_id, criminalCheckStatus: row.criminal_check_status, fingerprintCheckStatus: row.fingerprint_check_status, medicalStatus: row.medical_status, redTicketNumber: row.red_ticket_number, redTicketIssuedAt: row.red_ticket_issued_at, redTicketExpiresAt: row.red_ticket_expires_at, notes: row.notes || '', updatedAt: row.updated_at })),
      ppeIssues: (ppeResult.data as PpeIssueRow[]).map((row) => ({ id: row.id, organizationId: row.organization_id, employeeId: row.employee_id, itemType: row.item_type, brand: row.brand || '', size: row.size, unitCost: row.unit_cost, orderDate: row.order_date, collectionDate: row.collection_date, status: row.status, requestedAt: row.requested_at, officeConfirmedAt: row.office_confirmed_at, officeConfirmedBy: row.office_confirmed_by, employeeConfirmedAt: row.employee_confirmed_at, employeeConfirmedBy: row.employee_confirmed_by })),
      financialTypes: (financialTypeResult.data as FinancialTypeRow[]).map((row) => this.mapFinancialType(row)),
      issues: (issueResult.data as IssueRow[]).map((row) => this.mapIssue(row)),
      assets: (assetResult.data as AssetRow[]).map((row) => this.mapAsset(row)),
      assetCustodyEvents: (custodyResult.data as AssetCustodyRow[]).map((row) => this.mapCustody(row)),
      assetComplianceRecords: (complianceResult.data as AssetComplianceRow[]).map((row) => this.mapCompliance(row)),
      assetMeterReadings: (meterResult.data as AssetMeterRow[]).map((row) => this.mapMeter(row)),
      assetWorkOrders: (workOrderResult.data as AssetWorkOrderRow[]).map((row) => this.mapWorkOrder(row)),
      assetMaintenancePlans: (maintenancePlanResult.data as AssetPlanRow[]).map((row) => this.mapMaintenancePlan(row)),
      assetFuelEntries: (fuelResult.data as AssetFuelRow[]).map((row) => ({ id: row.id, organizationId: row.organization_id, assetId: row.asset_id, fuelDate: row.fuel_date, litres: row.litres, unitCost: row.unit_cost, totalCost: row.total_cost, odometerKm: row.odometer_km, engineHours: row.engine_hours, supplier: row.supplier || '', referenceNumber: row.reference_number || '', recordedBy: row.recorded_by, createdAt: row.created_at })),
      vendorAccounts: (vendorResult.data as VendorAccountRow[]).map((row) => this.mapVendorAccount(row)),
      vendorInvoices: (vendorInvoiceResult.data as VendorInvoiceRow[]).map((row) => this.mapVendorInvoice(row)),
      integrationOutbox: (outboxResult.data as OutboxRow[]).map((row) => this.mapOutbox(row)),
      attendanceQueue: (attendanceQueueResult.data as AttendanceQueueRow[]).map((row) => this.mapAttendanceQueue(row)),
      activity: (activityResult.data as ActivityRow[]).map((row) => this.mapActivity(row)),
      payrollPeriods: (payrollPeriodResult.data as PayrollPeriodRow[]).map((row) => this.mapPayrollPeriod(row)),
      payrollExports: (payrollExportResult.data as PayrollExportRow[]).map((row) => this.mapPayrollExport(row)),
      approvals: (approvalResult.data as ApprovalRequestRow[]).map((row) => this.mapApproval(row)),
      savedViews: (savedViewResult.data as SavedViewRow[]).map((row) => this.mapSavedView(row)),
      organizations: (organizationResult.data as OrganizationRow[]).map((row) => this.mapOrganization(row)),
      anomalies: [],
    };
  }

  private loadFromLocal(): OfficeAdminWorkspace {
    const raw = sessionStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return this.createDefaultWorkspace();
    return JSON.parse(raw) as OfficeAdminWorkspace;
  }

  private applyWorkspace(workspace: OfficeAdminWorkspace) {
    this.users.set(workspace.users);
    this.sites.set(workspace.sites.map((site) => ({ ...site, organizationId: SENATLA_TRADING_ORGANIZATION_ID })));
    this.groups.set(workspace.groups);
    this.employees.set(workspace.employees.map((employee) => ({ ...employee, organizationId: SENATLA_TRADING_ORGANIZATION_ID })));
    this.employeeOnboarding.set(workspace.employeeOnboarding || []);
    this.ppeIssues.set(workspace.ppeIssues || []);
    this.financialTypes.set(workspace.financialTypes);
    this.issues.set(workspace.issues.map((issue) => ({ ...issue, organizationId: SENATLA_TRADING_ORGANIZATION_ID })));
    this.assets.set(workspace.assets.map((asset) => this.normalizeAsset(asset)));
    this.assetCustodyEvents.set(workspace.assetCustodyEvents || []);
    this.assetComplianceRecords.set(workspace.assetComplianceRecords || []);
    this.assetMeterReadings.set(workspace.assetMeterReadings || []);
    this.assetWorkOrders.set(workspace.assetWorkOrders || []);
    this.assetMaintenancePlans.set(workspace.assetMaintenancePlans || []);
    this.assetFuelEntries.set(workspace.assetFuelEntries || []);
    this.vendorAccounts.set(workspace.vendorAccounts || []);
    this.vendorInvoices.set(workspace.vendorInvoices || []);
    this.integrationOutbox.set(workspace.integrationOutbox || []);
    this.attendanceQueue.set(workspace.attendanceQueue || []);
    this.activity.set(workspace.activity);
    this.payrollPeriods.set(workspace.payrollPeriods);
    this.payrollExports.set(workspace.payrollExports);
    this.approvals.set(workspace.approvals);
    this.savedViews.set(workspace.savedViews);
    this.organizations.set([SENATLA_TRADING_ORGANIZATION]);
  }

  private createDefaultWorkspace(): OfficeAdminWorkspace {
    return {
      users: [],
      sites: [
        { id: 'demo-workshop', organizationId: SENATLA_TRADING_ORGANIZATION_ID, name: 'Engineering Workshop', location: 'Main Operations Yard', isActive: true },
        { id: 'demo-head-office', organizationId: SENATLA_TRADING_ORGANIZATION_ID, name: 'Head Office', location: 'Corporate Campus', isActive: true },
      ],
      groups: [],
      employees: [],
      employeeOnboarding: [],
      ppeIssues: [],
      financialTypes: [
        { id: 'travel', name: 'Travel Allowance', category: 'Allowance', isActive: true, isSystem: true },
        { id: 'housing', name: 'Housing Allowance', category: 'Allowance', isActive: true, isSystem: true },
        { id: 'advance', name: 'Salary Advance', category: 'Deduction', isActive: true, isSystem: true },
      ],
      issues: [],
      assets: [
        {
          id: 'demo-excavator',
          organizationId: SENATLA_TRADING_ORGANIZATION_ID,
          serialNumber: 'CAT-320-EX-0042',
          make: 'Caterpillar',
          model: '320 Excavator',
          type: 'Yellow Metal',
          licenseExpiry: '2027-03-31',
          status: 'Active',
          lifecycleState: 'active',
          assignedSiteId: 'demo-workshop',
          custodianName: 'Engineering Team A',
          assetClass: 'Excavator',
          notes: 'Engineering heavy machinery demo record.',
        },
        {
          id: 'demo-truck',
          organizationId: SENATLA_TRADING_ORGANIZATION_ID,
          registrationNumber: 'SN 24 TR GP',
          vin: 'WDB9630201L123456',
          make: 'Mercedes-Benz',
          model: 'Actros 2645',
          type: 'Heavy Duty',
          licenseExpiry: '2026-11-30',
          status: 'Active',
          lifecycleState: 'active',
          assignedSiteId: 'demo-workshop',
          custodianName: 'Transport Team',
          assetClass: 'Prime mover',
          notes: 'Engineering transport fleet demo record.',
        },
        {
          id: 'demo-bakkie',
          organizationId: SENATLA_TRADING_ORGANIZATION_ID,
          registrationNumber: 'SN 18 LD GP',
          vin: 'AHTBA3CD606123456',
          make: 'Toyota',
          model: 'Hilux 2.4 GD-6',
          type: 'Light Vehicle',
          licenseExpiry: '2025-12-15',
          status: 'Expired',
          lifecycleState: 'maintenance',
          assignedSiteId: 'demo-head-office',
          custodianName: 'Office Operations',
          assetClass: 'Light vehicle',
          notes: 'Parent company light vehicle demo record.',
        },
        {
          id: 'demo-loader',
          organizationId: SENATLA_TRADING_ORGANIZATION_ID,
          serialNumber: 'VOL-L120H-0198',
          make: 'Volvo',
          model: 'L120H Loader',
          type: 'Yellow Metal',
          assetClass: 'Wheel loader',
          licenseExpiry: '2027-08-31',
          status: 'Active',
          lifecycleState: 'active',
          assignedSiteId: 'demo-workshop',
          custodianName: 'Plant Operations',
          notes: 'Engineering loader pilot asset.',
        },
        {
          id: 'demo-generator',
          organizationId: SENATLA_TRADING_ORGANIZATION_ID,
          serialNumber: 'GX690-0143',
          make: 'Honda',
          model: 'GX690 Generator',
          type: 'Heavy Duty',
          assetClass: 'Generator',
          licenseExpiry: '2027-01-31',
          status: 'Active',
          lifecycleState: 'active',
          assignedSiteId: 'demo-workshop',
          custodianName: 'Workshop Stores',
          notes: 'Portable general equipment pilot asset.',
        },
        {
          id: 'demo-compressor',
          organizationId: SENATLA_TRADING_ORGANIZATION_ID,
          serialNumber: 'AC-XAS185-2210',
          make: 'Atlas Copco',
          model: 'XAS 185 Compressor',
          type: 'Heavy Duty',
          assetClass: 'Compressor',
          licenseExpiry: '2026-07-15',
          status: 'Maintenance',
          lifecycleState: 'maintenance',
          assignedSiteId: 'demo-workshop',
          custodianName: 'Workshop Stores',
          notes: 'Portable compressor awaiting repair.',
        },
      ],
      assetCustodyEvents: [],
      assetComplianceRecords: [
        { id: 'demo-compliance-excavator', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-excavator', complianceType: 'inspection', referenceNumber: 'INSP-320-26', issuedAt: '2026-06-01', expiresAt: '2026-07-01', status: 'due' },
        { id: 'demo-compliance-loader', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-loader', complianceType: 'certification', referenceNumber: 'CERT-L120-26', issuedAt: '2026-04-10', expiresAt: '2027-04-10', status: 'valid' },
        { id: 'demo-roadworthy-bakkie', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-bakkie', complianceType: 'roadworthy', referenceNumber: 'RW-HILUX-25', issuedAt: '2025-01-12', expiresAt: '2025-12-15', status: 'expired' },
      ],
      assetMeterReadings: [
        { id: 'demo-meter-excavator', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-excavator', meterType: 'engine_hours', reading: 4820, recordedAt: '2026-06-26T06:30:00.000Z', recordedBy: 'Engineering Team A', source: 'manual' },
        { id: 'demo-meter-loader', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-loader', meterType: 'engine_hours', reading: 3165, recordedAt: '2026-06-25T15:10:00.000Z', recordedBy: 'Plant Operations', source: 'manual' },
        { id: 'demo-meter-truck', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-truck', meterType: 'odometer_km', reading: 184220, recordedAt: '2026-06-24T08:00:00.000Z', recordedBy: 'Transport Team', source: 'manual' },
      ],
      assetWorkOrders: [
        { id: 'demo-wo-excavator', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-excavator', title: 'Inspect hydraulic centre joint', description: 'Trace seepage found during pre-start inspection.', status: 'in_progress', priority: 'high', dueAt: '2026-06-29', completedAt: null, cost: 0 },
        { id: 'demo-wo-compressor', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-compressor', title: 'Repair compressor pressure fault', status: 'blocked', priority: 'critical', dueAt: '2026-06-28', completedAt: null, cost: 0 },
      ],
      assetMaintenancePlans: [
        { id: 'demo-plan-excavator', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-excavator', name: '500-hour service', intervalDays: null, intervalMeter: 500, meterType: 'engine_hours', nextDueAt: null, nextDueMeter: 5000, isActive: true },
        { id: 'demo-plan-loader', organizationId: SENATLA_TRADING_ORGANIZATION_ID, assetId: 'demo-loader', name: 'Monthly plant inspection', intervalDays: 30, intervalMeter: null, meterType: null, nextDueAt: '2026-07-10', nextDueMeter: null, isActive: true },
      ],
      assetFuelEntries: [],
      vendorAccounts: [],
      vendorInvoices: [],
      integrationOutbox: [],
      attendanceQueue: [],
      activity: [],
      payrollPeriods: [],
      payrollExports: [],
      approvals: [],
      savedViews: [],
      organizations: [SENATLA_TRADING_ORGANIZATION],
      anomalies: [],
    };
  }

  private async persistLocalWorkspace() {
    if (this.supabase) return;
    sessionStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      users: this.users(),
      sites: this.sites(),
      groups: this.groups(),
      employees: this.employees(),
      employeeOnboarding: this.employeeOnboarding(),
      ppeIssues: this.ppeIssues(),
      financialTypes: this.financialTypes(),
      issues: this.issues(),
      assets: this.assets(),
      assetCustodyEvents: this.assetCustodyEvents(),
      assetComplianceRecords: this.assetComplianceRecords(),
      assetMeterReadings: this.assetMeterReadings(),
      assetWorkOrders: this.assetWorkOrders(),
      assetMaintenancePlans: this.assetMaintenancePlans(),
      assetFuelEntries: this.assetFuelEntries(),
      vendorAccounts: this.vendorAccounts(),
      vendorInvoices: this.vendorInvoices(),
      integrationOutbox: this.integrationOutbox(),
      attendanceQueue: this.attendanceQueue(),
      activity: this.activity(),
      payrollPeriods: this.payrollPeriods(),
      payrollExports: this.payrollExports(),
      approvals: this.approvals(),
      savedViews: this.savedViews(),
      organizations: this.organizations(),
      anomalies: this.anomalies(),
    } satisfies OfficeAdminWorkspace));
  }

  private async logActivity(action: string, entityType: string, entityId: string, details?: Record<string, unknown>) {
    const session = this.auth.currentSession();
    if (!session) return;

    const event: AdminActivityEvent = {
      id: this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      action,
      entityType,
      entityId,
      actorId: session.userId,
      actorName: session.displayName,
      details: details ?? null,
      occurredAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const { error } = await this.supabase.from('admin_activity_log').insert({
        id: event.id,
        organization_id: SENATLA_TRADING_ORGANIZATION_ID,
        actor_id: event.actorId,
        actor_name: event.actorName,
        action: event.action,
        entity_type: event.entityType,
        entity_id: event.entityId,
        details: event.details,
        occurred_at: event.occurredAt,
      });
      if (error) throw error;
    }

    this.activity.update((events) => [event, ...events].slice(0, 50));
    await this.persistLocalWorkspace();
  }

  private findDuplicateIds() {
    const counts = new Map<string, number>();
    for (const employee of this.employees()) {
      counts.set(employee.idNumber, (counts.get(employee.idNumber) || 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  }

  private normalizeEmployee(employee: Employee & { employmentStatus?: EmploymentStatus }) {
    return {
      ...employee,
      id: employee.id || this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      firstName: employee.firstName.trim(),
      surname: employee.surname.trim(),
      idNumber: employee.idNumber.trim(),
      companyNumber: employee.companyNumber?.trim() || undefined,
      designation: employee.designation?.trim() || undefined,
      siteId: employee.siteId.trim(),
      groupId: employee.groupId?.trim() || undefined,
      startDate: employee.startDate,
      basicRate: Number(employee.basicRate),
      payRateUnit: employee.payRateUnit ?? 'daily',
      safetyQualifications: [...(employee.safetyQualifications || [])],
      additionalFields: { ...(employee.additionalFields || {}) },
      salaryAdvances: Number(employee.salaryAdvances || 0),
      financials: { ...(employee.financials || {}) },
      logs: { ...(employee.logs || {}) },
      adjustments: { ...(employee.adjustments || {}) },
      taxRefNumber: employee.taxRefNumber?.trim() || undefined,
      employmentStatus: employee.employmentStatus ?? 'active',
    };
  }

  private normalizeIssue(issue: Issue & { severity?: IssueSeverity; ownerProfileId?: string | null; dueAt?: string | null }) {
    return {
      ...issue,
      id: issue.id || this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      siteId: issue.siteId,
      reportedBy: issue.reportedBy.trim(),
      description: issue.description.trim(),
      auditTrail: [...(issue.auditTrail || [])],
      severity: issue.severity ?? 'medium',
      ownerProfileId: issue.ownerProfileId ?? null,
      dueAt: issue.dueAt ?? null,
    };
  }

  private normalizeAsset(asset: VehicleAsset) {
    return {
      ...asset,
      id: asset.id || this.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      registrationNumber: asset.registrationNumber?.trim().toUpperCase() || undefined,
      serialNumber: asset.serialNumber?.trim().toUpperCase() || undefined,
      vin: asset.vin?.trim().toUpperCase() || undefined,
      make: asset.make.trim(),
      model: asset.model.trim(),
      assignedSiteId: asset.assignedSiteId?.trim() || undefined,
      notes: asset.notes?.trim() || undefined,
      custodianName: asset.custodianName?.trim() || undefined,
      assetClass: asset.assetClass?.trim() || asset.type,
      lifecycleState: asset.lifecycleState ?? (asset.status === 'Maintenance' ? 'maintenance' : 'active'),
      retiredAt: asset.retiredAt ?? null,
    };
  }

  private mapProfile(row: ProfileRow): ManagedUserProfile {
    return {
      id: row.id,
      username: row.username || '',
      displayName: row.display_name || '',
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }

  private mapSite(row: SiteRow): Site {
    return {
      id: row.id,
      organizationId: row.organization_id || SENATLA_TRADING_ORGANIZATION_ID,
      name: row.name,
      location: row.location,
      managerId: row.manager_profile_id || undefined,
      teamName: row.team_name || undefined,
      jobNumber: row.job_number || undefined,
      estimatedDuration: row.estimated_duration || undefined,
      complianceChecklist: row.compliance_checklist || [],
      isActive: row.is_active,
    };
  }

  private mapEmployee(row: EmployeeRow): Employee {
    return {
      id: row.id,
      organizationId: row.organization_id || SENATLA_TRADING_ORGANIZATION_ID,
      firstName: row.first_name,
      surname: row.surname,
      idNumber: row.id_number,
      companyNumber: row.company_number || undefined,
      role: row.role,
      designation: row.designation || row.role,
      siteId: row.site_id,
      groupId: row.group_id || undefined,
      startDate: row.start_date,
      basicRate: Number(row.basic_rate || 0),
      payRateUnit: row.pay_rate_unit || 'daily',
      safetyQualifications: row.safety_qualifications || [],
      additionalFields: row.additional_fields || {},
      salaryAdvances: Number(row.salary_advances || 0),
      financials: row.financials || {},
      logs: row.logs || {},
      adjustments: row.adjustments || {},
      travelAllowance: Number(row.financials?.['travel'] || 0),
      housingAllowance: Number(row.financials?.['housing'] || 0),
      taxRefNumber: row.tax_ref_number || undefined,
    } as Employee;
  }

  private mapFinancialType(row: FinancialTypeRow): FinancialType {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      isActive: row.is_active,
      isSystem: row.is_system,
    };
  }

  private mapIssue(row: IssueRow): Issue {
    const issue = {
      id: row.id,
      organizationId: row.organization_id || SENATLA_TRADING_ORGANIZATION_ID,
      siteId: row.site_id || '',
      reportedBy: row.reported_by,
      dateReported: new Date(row.created_at),
      category: row.category,
      description: row.description,
      status: row.status,
      auditTrail: Array.isArray(row.audit_trail)
        ? row.audit_trail.map((entry) => ({
            date: new Date(entry.date),
            action: entry.action,
            user: entry.user,
          }))
        : [],
      severity: row.severity,
      ownerProfileId: row.owner_profile_id,
      dueAt: row.due_at,
    };
    return issue as Issue;
  }

  private mapAsset(row: AssetRow): VehicleAsset {
    return {
      id: row.id,
      organizationId: row.organization_id || SENATLA_TRADING_ORGANIZATION_ID,
      registrationNumber: row.registration_number || undefined,
      serialNumber: row.serial_number || undefined,
      vin: row.vin || undefined,
      make: row.make,
      model: row.model,
      type: row.type,
      licenseExpiry: row.license_expiry,
      status: row.status,
      assignedSiteId: row.assigned_site_id || undefined,
      notes: row.notes || undefined,
      custodianName: row.custodian_name || undefined,
      assetClass: row.asset_class || row.type,
      lifecycleState: row.lifecycle_state || 'active',
      retiredAt: row.retired_at,
    };
  }

  private mapCustody(row: AssetCustodyRow): AssetCustodyEvent {
    return { id: row.id, organizationId: row.organization_id, assetId: row.asset_id, fromSiteId: row.from_site_id, toSiteId: row.to_site_id, fromCustodian: row.from_custodian, toCustodian: row.to_custodian, acceptedBy: row.accepted_by, occurredAt: row.occurred_at, notes: row.notes || undefined };
  }

  private mapCompliance(row: AssetComplianceRow): AssetComplianceRecord {
    return { id: row.id, organizationId: row.organization_id, assetId: row.asset_id, complianceType: row.compliance_type, referenceNumber: row.reference_number || undefined, issuedAt: row.issued_at, expiresAt: row.expires_at, status: this.complianceStatus(row.expires_at, row.status), documentPath: row.document_path || undefined, notes: row.notes || undefined };
  }

  private mapMeter(row: AssetMeterRow): AssetMeterReading {
    return { id: row.id, organizationId: row.organization_id, assetId: row.asset_id, meterType: row.meter_type, reading: Number(row.reading), recordedAt: row.recorded_at, recordedBy: row.recorded_by, source: row.source };
  }

  private mapWorkOrder(row: AssetWorkOrderRow): AssetWorkOrder {
    return { id: row.id, organizationId: row.organization_id, assetId: row.asset_id, title: row.title, description: row.description || undefined, status: row.status, priority: row.priority, dueAt: row.due_at, completedAt: row.completed_at, cost: Number(row.cost || 0) };
  }

  private mapMaintenancePlan(row: AssetPlanRow): AssetMaintenancePlan {
    return { id: row.id, organizationId: row.organization_id, assetId: row.asset_id, name: row.name, intervalDays: row.interval_days, intervalMeter: row.interval_meter, meterType: row.meter_type, nextDueAt: row.next_due_at, nextDueMeter: row.next_due_meter, isActive: row.is_active };
  }

  private mapAttendanceQueue(row: AttendanceQueueRow): AttendanceQueueSubmission {
    return { id: row.id, organizationId: row.organization_id, submittedBy: row.submitted_by, siteId: row.site_id, workDate: row.work_date, status: row.status, outcome: row.outcome, attempts: row.attempts, idempotencyKey: row.idempotency_key, lastError: row.last_error, diagnosticContext: row.diagnostic_context, createdAt: row.created_at, processedAt: row.processed_at };
   }
  private mapVendorAccount(row: VendorAccountRow): VendorAccount {
    return { id: row.id, organizationId: row.organization_id, name: row.name, description: row.description || '', taxNumber: row.tax_number || undefined, isActive: row.is_active, totalOwingAmount: Number(row.total_owing_amount || 0), createdAt: row.created_at, updatedAt: row.updated_at };
  }
  
   private mapVendorInvoice(row: VendorInvoiceRow): VendorInvoiceRecord {
    return { id: row.id, organizationId: row.organization_id, vendorId: row.vendor_id, invoiceDate: row.invoice_date, orderNumber: row.order_number, invoiceNumber: row.invoice_number || undefined, supplierOrderNumber: row.supplier_order_number || undefined, internalOrderNumber: row.internal_order_number || undefined, itemsPurchased: row.items_purchased, total: Number(row.total || 0), responsiblePerson: row.responsible_person, status: row.status, requestedBy: row.requested_by, requestedByName: row.requested_by_name, directorReviewedBy: row.director_reviewed_by, directorReviewedAt: row.director_reviewed_at, createdAt: row.created_at, updatedAt: row.updated_at };
  }
  private mapOutbox(row: OutboxRow): IntegrationOutboxEvent {
    return { id: row.id, organizationId: row.organization_id, eventType: row.event_type, aggregateType: row.aggregate_type, aggregateId: row.aggregate_id, payload: row.payload || {}, status: row.status, idempotencyKey: row.idempotency_key, attempts: row.attempts, lastError: row.last_error, createdAt: row.created_at, processedAt: row.processed_at };
  }

  private mapActivity(row: ActivityRow): AdminActivityEvent {
    return {
      id: row.id,
      organizationId: row.organization_id || SENATLA_TRADING_ORGANIZATION_ID,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id || undefined,
      actorId: row.actor_id,
      actorName: row.actor_name,
      details: row.details,
      occurredAt: row.occurred_at,
    };
  }

  private mapPayrollPeriod(row: PayrollPeriodRow): PayrollPeriod {
    return {
      id: row.id,
      organizationId: row.organization_id || SENATLA_TRADING_ORGANIZATION_ID,
      periodKey: row.period_key,
      month: row.month,
      year: row.year,
      status: row.status,
      lockedAt: row.locked_at,
      lockedBy: row.locked_by,
    };
  }

  private mapPayrollExport(row: PayrollExportRow): PayrollExportRecord {
    return {
      id: row.id,
      organizationId: row.organization_id || SENATLA_TRADING_ORGANIZATION_ID,
      periodKey: row.period_key,
      includeFullIds: row.include_full_ids,
      requestedBy: row.requested_by,
      fileName: row.file_name,
      createdAt: row.created_at,
    };
  }

  private mapApproval(row: ApprovalRequestRow): ApprovalRequest {
    return {
      id: row.id,
      organizationId: row.organization_id || SENATLA_TRADING_ORGANIZATION_ID,
      requestType: row.request_type,
      status: row.status,
      requestedBy: row.requested_by,
      requestedByName: row.requested_by_name,
      reviewedBy: row.reviewed_by,
      reviewedByName: row.reviewed_by_name,
      payload: row.payload || {},
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      notes: row.notes,
    };
  }

  private mapSavedView(row: SavedViewRow): SavedAdminView {
    return {
      id: row.id,
      organizationId: row.organization_id || SENATLA_TRADING_ORGANIZATION_ID,
      name: row.name,
      filters: {
        tab: typeof row.filters?.['tab'] === 'string' ? (row.filters['tab'] as string) : 'overview',
        searchTerm: typeof row.filters?.['searchTerm'] === 'string' ? (row.filters['searchTerm'] as string) : undefined,
        siteId: typeof row.filters?.['siteId'] === 'string' ? (row.filters['siteId'] as string) : undefined,
      },
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }

  private mapOrganization(row: OrganizationRow): Organization {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }

  private getBaseUrl() {
    return this.config.api.baseUrl?.trim() || '';
  }

  private async callAdminUserApi(method: 'POST' | 'PATCH', body: Record<string, unknown>) {
    const { data } = await this.supabase!.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error('Missing access token.');

    const response = await fetch(`${this.getBaseUrl()}/api/admin/users`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as Record<string, any>;
    if (!response.ok) {
      throw new Error(typeof payload['error'] === 'string' ? (payload['error'] as string) : 'Admin action failed.');
    }
    return payload;
  }

  private assertAssignmentDecision(review: AssignmentReview, decision: AssignmentDecision, reasonCode: string) {
    const rejectReasons = new Set(['assignment_deferred', 'alternative_not_suitable', 'additional_evidence_required']);
    const overrideReasons = new Set(['restricted_duties_confirmed', 'maintenance_plan_confirmed', 'operational_continuity', 'manager_authorized']);
    if (decision === 'reject') {
      if (!rejectReasons.has(reasonCode)) throw new Error('Select a controlled rejection reason.');
      return;
    }
    if (review.outcome === 'blocked') throw new Error('Hard blockers must be resolved before assignment.');
    if (review.outcome === 'unknown') throw new Error('Missing readiness evidence must be completed before assignment.');
    if (review.outcome === 'warning') {
      if (decision !== 'override' || !overrideReasons.has(reasonCode)) throw new Error('Warnings require an explicit controlled override reason.');
      return;
    }
    if (decision !== 'accept') throw new Error('Ready assignments must be explicitly accepted.');
  }
  private complianceStatus(expiresAt: string | null | undefined, fallback: AssetComplianceRecord['status']): AssetComplianceRecord['status'] {
    if (fallback === 'waived' || !expiresAt) return fallback;
    const expiry = new Date(`${expiresAt}T00:00:00`).getTime();
    if (!Number.isFinite(expiry)) return fallback;
    const days = Math.ceil((expiry - Date.now()) / 86_400_000);
    if (days < 0) return 'expired';
    if (days <= 30) return 'due';
    return 'valid';
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"' && quoted) {
        current += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === ',' && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += character;
      }
    }
    values.push(current);
    return values;
  }

  private createId() {
    return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 11);
  }

  private async executeApproval(request: ApprovalRequest) {
    if (request.requestType === 'user_suspension') {
      const userId = typeof request.payload['userId'] === 'string' ? request.payload['userId'] : '';
      if (!userId) throw new Error('Suspension request payload is invalid.');
      await this.setUserAccessState(userId, false);
      await this.markApprovalExecuted(request.id);
      return;
    }

    if (request.requestType === 'full_id_payroll_export') {
      const month = Number(request.payload['month']);
      const year = Number(request.payload['year']);
      if (!Number.isFinite(month) || !Number.isFinite(year)) {
        throw new Error('Payroll export request payload is invalid.');
      }
      const csv = this.generatePayrollCsv(month, year, true);
      const periodKey = `${year}-${`${month + 1}`.padStart(2, '0')}`;
      const fileName = `senatla-payroll-${periodKey}-full-approved.csv`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      await this.recordPayrollExport(periodKey, true, fileName);
      await this.setPayrollPeriodStatus(month, year, 'exported');
      await this.markApprovalExecuted(request.id);
      return;
    }

    if (request.requestType === 'vendor_invoice_approval') {
      const invoiceId = typeof request.payload['invoiceId'] === 'string' ? request.payload['invoiceId'] : '';
      const invoice = this.vendorInvoices().find((entry) => entry.id === invoiceId);
      if (!invoice) throw new Error('Vendor invoice request payload is invalid.');
      const session = this.auth.currentSession();
      const now = new Date().toISOString();
      const approved: VendorInvoiceRecord = { ...invoice, status: 'approved', directorReviewedBy: session?.userId || request.reviewedBy || null, directorReviewedAt: now, updatedAt: now };
      if (this.supabase) {
        const { error } = await this.supabase.from('vendor_invoice_records').update({ status: approved.status, director_reviewed_by: approved.directorReviewedBy, director_reviewed_at: approved.directorReviewedAt }).eq('id', invoiceId);
        if (error) throw error;
      }
      this.vendorInvoices.update((invoices) => [approved, ...invoices.filter((entry) => entry.id !== invoiceId)]);
      await this.persistLocalWorkspace();
      await this.markApprovalExecuted(request.id);
      return;
    }
    if (request.requestType === 'asset_return_to_service') {
      const assetId = typeof request.payload['assetId'] === 'string' ? request.payload['assetId'] : '';
      const asset = this.assets().find((entry) => entry.id === assetId);
      if (!asset) throw new Error('Return-to-service request asset is invalid.');
      const blockers = this.assetWorkOrders().filter((order) => order.assetId === assetId && !['completed', 'cancelled'].includes(order.status) && ['high', 'critical'].includes(order.priority));
      if (blockers.length) throw new Error('High or critical work orders must be completed before return to service.');
      await this.saveAsset({ ...asset, status: 'Active', lifecycleState: 'active', retiredAt: null });
      await this.markApprovalExecuted(request.id);
    }
  }

  private async markApprovalExecuted(requestId: string) {
    const request = this.approvals().find((entry) => entry.id === requestId);
    if (!request) return;
    const executed = { ...request, status: 'executed' as ApprovalStatus };

    if (this.supabase) {
      const { error } = await this.supabase.from('approval_requests').update({
        status: 'executed',
      }).eq('id', requestId);
      if (error) throw error;
    }

    this.approvals.update((approvals) => [executed, ...approvals.filter((entry) => entry.id !== requestId)]);
    await this.persistLocalWorkspace();
  }
}
