import {
  AssetComplianceRecord,
  AssetWorkOrder,
  Employee,
  EmployeeOnboardingRecord,
  Site,
  VehicleAsset,
} from '../models/app.models';

export const READINESS_POLICY_VERSION = 'senatla-readiness-v1.0.0';

export type ReadinessStatus = 'ready' | 'warning' | 'blocked' | 'unknown';
export type ReadinessSubjectType = 'employee' | 'asset' | 'site' | 'operation';

export type ReadinessReasonCode =
  | 'employee_inactive'
  | 'employee_suspended'
  | 'onboarding_missing'
  | 'medical_pending'
  | 'medical_restricted'
  | 'medical_unfit'
  | 'evaluation_date_invalid'
  | 'red_ticket_missing'
  | 'red_ticket_expired'
  | 'red_ticket_due'
  | 'asset_inactive'
  | 'asset_in_maintenance'
  | 'asset_retired'
  | 'asset_disposed'
  | 'asset_licence_missing'
  | 'asset_licence_expired'
  | 'asset_licence_due'
  | 'asset_compliance_missing'
  | 'asset_compliance_expired'
  | 'asset_compliance_due'
  | 'asset_work_order_blocking'
  | 'asset_work_order_open'
  | 'site_inactive'
  | 'site_checklist_missing';

export interface ReadinessReason {
  readonly code: ReadinessReasonCode;
  readonly status: Exclude<ReadinessStatus, 'ready'>;
  readonly message: string;
  readonly correctiveAction: string;
}

export interface ReadinessResult {
  readonly policyVersion: typeof READINESS_POLICY_VERSION;
  readonly evaluatedAt: string;
  readonly subjectType: ReadinessSubjectType;
  readonly subjectId: string;
  readonly status: ReadinessStatus;
  readonly canProceed: boolean;
  readonly reasons: readonly ReadinessReason[];
}

export interface ReadinessEvaluationContext {
  /** ISO date or timestamp. Supplying it makes evaluation and audit replay deterministic. */
  readonly asOf: string;
  readonly warningWindowDays?: number;
}

export interface EmployeeReadinessInput {
  readonly employee: Employee;
  readonly onboarding?: EmployeeOnboardingRecord | null;
}

export interface AssetReadinessInput {
  readonly asset: VehicleAsset;
  readonly complianceRecords?: readonly AssetComplianceRecord[] | null;
  readonly workOrders?: readonly AssetWorkOrder[] | null;
}

const STATUS_WEIGHT: Record<ReadinessStatus, number> = {
  ready: 0,
  warning: 1,
  unknown: 2,
  blocked: 3,
};

function utcDay(value: string): number | null {
  const datePart = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    ? timestamp
    : null;
}

function daysUntil(value: string | null | undefined, asOf: string): number | null {
  if (!value) return null;
  const target = utcDay(value);
  const origin = utcDay(asOf);
  return target === null || origin === null ? null : Math.floor((target - origin) / 86_400_000);
}

function reason(
  code: ReadinessReasonCode,
  status: Exclude<ReadinessStatus, 'ready'>,
  message: string,
  correctiveAction: string,
): ReadinessReason {
  return { code, status, message, correctiveAction };
}

function result(
  context: ReadinessEvaluationContext,
  subjectType: ReadinessSubjectType,
  subjectId: string,
  reasons: ReadinessReason[],
): ReadinessResult {
  if (utcDay(context.asOf) === null && !reasons.some((item) => item.code === 'evaluation_date_invalid')) {
    reasons.push(reason('evaluation_date_invalid', 'unknown', 'The readiness evaluation date is invalid.', 'Refresh the readiness data before work starts.'));
  }
  reasons.sort((left, right) => STATUS_WEIGHT[right.status] - STATUS_WEIGHT[left.status] || left.code.localeCompare(right.code));
  const status = reasons.reduce<ReadinessStatus>(
    (current, item) => STATUS_WEIGHT[item.status] > STATUS_WEIGHT[current] ? item.status : current,
    'ready',
  );
  return {
    policyVersion: READINESS_POLICY_VERSION,
    evaluatedAt: context.asOf,
    subjectType,
    subjectId,
    status,
    canProceed: status === 'ready' || status === 'warning',
    reasons,
  };
}

function expiryReason(
  value: string | null | undefined,
  context: ReadinessEvaluationContext,
  codes: { missing: ReadinessReasonCode; expired: ReadinessReasonCode; due: ReadinessReasonCode },
  label: string,
): ReadinessReason | null {
  const remaining = daysUntil(value, context.asOf);
  if (remaining === null) {
    return reason(codes.missing, 'unknown', `${label} evidence is missing or invalid.`, `Capture and verify the ${label.toLowerCase()} date before work starts.`);
  }
  if (remaining < 0) {
    return reason(codes.expired, 'blocked', `${label} expired ${Math.abs(remaining)} day(s) ago.`, `Renew and verify the ${label.toLowerCase()} before assignment.`);
  }
  if (remaining <= (context.warningWindowDays ?? 30)) {
    return reason(codes.due, 'warning', `${label} expires in ${remaining} day(s).`, `Schedule renewal before the ${label.toLowerCase()} expires.`);
  }
  return null;
}

export function evaluateEmployeeReadiness(input: EmployeeReadinessInput, context: ReadinessEvaluationContext): ReadinessResult {
  const reasons: ReadinessReason[] = [];
  const status = input.employee.employmentStatus;
  if (status === 'inactive') reasons.push(reason('employee_inactive', 'blocked', 'Employee is inactive.', 'Reactivate the employee through an authorised process before assignment.'));
  if (status === 'suspended') reasons.push(reason('employee_suspended', 'blocked', 'Employee is suspended.', 'Resolve the suspension through the authorised process before assignment.'));

  const onboarding = input.onboarding;
  if (!onboarding) {
    reasons.push(reason('onboarding_missing', 'unknown', 'Verified onboarding and fitness evidence is unavailable.', 'Complete and verify onboarding before assignment.'));
    return result(context, 'employee', input.employee.id, reasons);
  }

  if (onboarding.medicalStatus === 'pending') reasons.push(reason('medical_pending', 'unknown', 'Medical fitness is pending.', 'Obtain a verified fitness decision before assignment.'));
  if (onboarding.medicalStatus === 'restricted') reasons.push(reason('medical_restricted', 'warning', 'Employee has medical work restrictions.', 'Confirm the planned duty complies with the recorded restrictions.'));
  if (onboarding.medicalStatus === 'unfit') reasons.push(reason('medical_unfit', 'blocked', 'Employee is medically unfit for work.', 'Do not assign work until a verified fit status is recorded.'));


  const ticket = expiryReason(
    onboarding.redTicketExpiresAt,
    context,
    { missing: 'red_ticket_missing', expired: 'red_ticket_expired', due: 'red_ticket_due' },
    'Red ticket',
  );
  if (!onboarding.redTicketNumber?.trim() && ticket?.code !== 'red_ticket_missing') {
    reasons.push(reason('red_ticket_missing', 'unknown', 'Red-ticket identifier is missing.', 'Capture and verify the red-ticket identifier before work starts.'));
  }
  if (ticket) reasons.push(ticket);
  return result(context, 'employee', input.employee.id, reasons);
}

export function evaluateAssetReadiness(input: AssetReadinessInput, context: ReadinessEvaluationContext): ReadinessResult {
  const reasons: ReadinessReason[] = [];
  const asset = input.asset;
  if (asset.status === 'Maintenance' || asset.lifecycleState === 'maintenance') reasons.push(reason('asset_in_maintenance', 'blocked', 'Asset is in maintenance.', 'Return the asset to service through the authorised maintenance workflow.'));
  else if (asset.status !== 'Active') reasons.push(reason('asset_inactive', 'blocked', 'Asset is not active.', 'Resolve the asset status before assignment.'));
  if (asset.lifecycleState === 'retired') reasons.push(reason('asset_retired', 'blocked', 'Asset is retired.', 'Select an active replacement asset.'));
  if (asset.lifecycleState === 'disposed') reasons.push(reason('asset_disposed', 'blocked', 'Asset is disposed.', 'Select an active replacement asset.'));

  const licence = expiryReason(asset.licenseExpiry, context, { missing: 'asset_licence_missing', expired: 'asset_licence_expired', due: 'asset_licence_due' }, 'Asset licence');
  if (licence) reasons.push(licence);

  const compliance = input.complianceRecords;
  if (!compliance?.length) {
    reasons.push(reason('asset_compliance_missing', 'unknown', 'Verified asset compliance evidence is unavailable.', 'Capture and verify applicable compliance records before assignment.'));
  } else {
    for (const record of compliance) {
      if (record.status === 'expired') reasons.push(reason('asset_compliance_expired', 'blocked', `${record.complianceType} compliance is expired.`, `Renew and verify ${record.complianceType} compliance before assignment.`));
      if (record.status === 'due') reasons.push(reason('asset_compliance_due', 'warning', `${record.complianceType} compliance is due.`, `Schedule renewal of ${record.complianceType} compliance.`));
      if (record.status === 'valid' && record.expiresAt) {
        const expiry = daysUntil(record.expiresAt, context.asOf);
        if (expiry !== null && expiry < 0) reasons.push(reason('asset_compliance_expired', 'blocked', `${record.complianceType} compliance date has expired.`, `Renew and verify ${record.complianceType} compliance before assignment.`));
        else if (expiry !== null && expiry <= (context.warningWindowDays ?? 30)) reasons.push(reason('asset_compliance_due', 'warning', `${record.complianceType} compliance expires in ${expiry} day(s).`, `Schedule renewal of ${record.complianceType} compliance.`));
      }
    }
  }

  for (const workOrder of input.workOrders ?? []) {
    if (!['open', 'in_progress', 'blocked'].includes(workOrder.status)) continue;
    if (workOrder.status === 'blocked' || workOrder.priority === 'critical') reasons.push(reason('asset_work_order_blocking', 'blocked', `Blocking work order: ${workOrder.title}.`, 'Resolve and close the blocking work order before assignment.'));
    else reasons.push(reason('asset_work_order_open', 'warning', `Open work order: ${workOrder.title}.`, 'Confirm the work order does not make the planned duty unsafe.'));
  }
  return result(context, 'asset', asset.id, reasons);
}

export function evaluateSiteReadiness(site: Site, context: ReadinessEvaluationContext): ReadinessResult {
  const reasons: ReadinessReason[] = [];
  if (!site.isActive) reasons.push(reason('site_inactive', 'blocked', 'Site is inactive.', 'Activate the site through an authorised process or select another site.'));
  if (!site.complianceChecklist?.length) reasons.push(reason('site_checklist_missing', 'unknown', 'Site compliance checklist evidence is unavailable.', 'Complete and verify the site compliance checklist before work starts.'));
  return result(context, 'site', site.id, reasons);
}

export function combineReadiness(results: readonly ReadinessResult[], context: ReadinessEvaluationContext, operationId: string): ReadinessResult {
  return result(context, 'operation', operationId, results.reduce<ReadinessReason[]>((allReasons, item) => allReasons.concat(item.reasons), []));
}
