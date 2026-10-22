import {
  AdminActivityEvent,
  AdminAnomaly,
  AssetComplianceRecord,
  AssetCustodyEvent,
  AssetMaintenancePlan,
  AssetMeterReading,
  AssetWorkOrder,
  AssetFuelEntry,
  VendorAccount,
  VendorInvoiceRecord,
  ApprovalRequest,
  AttendanceQueueSubmission,
  Employee,
  EmployeeOnboardingRecord,
  FinancialType,
  Group,
  Issue,
  IntegrationOutboxEvent,
  Organization,
  ManagedUserProfile,
  PayrollExportRecord,
  PayrollPeriod,
  PpeIssueRecord,
  SavedAdminView,
  Site,
  VehicleAsset,
  ExecutiveOperationalReport,
} from './app.models';

export interface OfficeAdminWorkspace {
  users: ManagedUserProfile[];
  sites: Site[];
  groups: Group[];
  employees: Employee[];
  employeeOnboarding: EmployeeOnboardingRecord[];
  ppeIssues: PpeIssueRecord[];
  financialTypes: FinancialType[];
  issues: Issue[];
  assets: VehicleAsset[];
  assetCustodyEvents: AssetCustodyEvent[];
  assetComplianceRecords: AssetComplianceRecord[];
  assetMeterReadings: AssetMeterReading[];
  assetWorkOrders: AssetWorkOrder[];
  assetMaintenancePlans: AssetMaintenancePlan[];
  assetFuelEntries: AssetFuelEntry[];
  vendorAccounts: VendorAccount[];
  vendorInvoices: VendorInvoiceRecord[];
  integrationOutbox: IntegrationOutboxEvent[];
  attendanceQueue: AttendanceQueueSubmission[];
  activity: AdminActivityEvent[];
  payrollPeriods: PayrollPeriod[];
  payrollExports: PayrollExportRecord[];
  approvals: ApprovalRequest[];
  savedViews: SavedAdminView[];
  organizations: Organization[];
  anomalies: AdminAnomaly[];
  directorReports?: ExecutiveOperationalReport[];
}

export interface UserInviteInput {
  email: string;
  displayName: string;
  role: 'site' | 'office' | 'director';
}
