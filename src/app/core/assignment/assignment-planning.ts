import {
  AssetComplianceRecord,
  AssetWorkOrder,
  Employee,
  EmployeeOnboardingRecord,
  Site,
  VehicleAsset,
} from '../models/app.models';

export type AssignmentOutcome = 'ready' | 'warning' | 'blocked' | 'unknown';
export type AssignmentDecision = 'accept' | 'reject' | 'override';

export interface AssignmentReason {
  code: string;
  message: string;
  action: string;
}

export interface AssignmentAlternative {
  entityId: string;
  label: string;
  roleOrClass: string;
  currentSiteId: string | null;
  outcome: 'ready' | 'warning';
  score: number;
  scoreReasons: string[];
}

export interface AssignmentReviewItem {
  entityId: string;
  label: string;
  roleOrClass: string;
  currentSiteId: string | null;
  outcome: AssignmentOutcome;
  reasons: AssignmentReason[];
  alternatives: AssignmentAlternative[];
}

export interface AssignmentReview {
  resourceType: 'employee' | 'asset';
  targetSiteId: string;
  outcome: AssignmentOutcome;
  items: AssignmentReviewItem[];
}

const OUTCOME_WEIGHT: Record<AssignmentOutcome, number> = {
  ready: 0,
  warning: 1,
  unknown: 2,
  blocked: 3,
};

export function planEmployeeSiteAssignment(input: {
  employeeIds: string[];
  targetSiteId: string;
  employees: Employee[];
  onboarding: EmployeeOnboardingRecord[];
  sites: Site[];
}): AssignmentReview {
  const selectedIds = new Set(input.employeeIds);
  const target = input.sites.find((site) => site.id === input.targetSiteId);
  const onboardingByEmployee = new Map(input.onboarding.map((record) => [record.employeeId, record]));
  const selected = input.employees.filter((employee) => selectedIds.has(employee.id));

  if (!target || !target.isActive) {
    return {
      resourceType: 'employee',
      targetSiteId: input.targetSiteId,
      outcome: 'blocked',
      items: selected.map((employee) => employeeReview(employee, onboardingByEmployee.get(employee.id), null, [])),
    };
  }

  const items = selected.map((employee) => {
    const review = employeeReview(employee, onboardingByEmployee.get(employee.id), target, []);
    const alternatives = input.employees
      .filter((candidate) => !selectedIds.has(candidate.id) && candidate.role === employee.role)
      .map((candidate) => employeeReview(candidate, onboardingByEmployee.get(candidate.id), target, []))
      .filter((candidate): candidate is AssignmentReviewItem & { outcome: 'ready' | 'warning' } => candidate.outcome === 'ready' || candidate.outcome === 'warning')
      .map((candidate) => toAlternative(candidate, employee.role, input.targetSiteId))
      .sort(compareAlternatives)
      .slice(0, 3);
    return { ...review, alternatives };
  });

  return { resourceType: 'employee', targetSiteId: input.targetSiteId, outcome: aggregateOutcome(items), items };
}

export function planAssetSiteTransfer(input: {
  assetId: string;
  targetSiteId: string;
  assets: VehicleAsset[];
  sites: Site[];
  compliance: AssetComplianceRecord[];
  workOrders: AssetWorkOrder[];
  today?: string;
}): AssignmentReview {
  const target = input.sites.find((site) => site.id === input.targetSiteId);
  const asset = input.assets.find((entry) => entry.id === input.assetId);
  if (!asset) return { resourceType: 'asset', targetSiteId: input.targetSiteId, outcome: 'blocked', items: [] };

  const today = input.today || new Date().toISOString().slice(0, 10);
  const review = assetReview(asset, target, input.compliance, input.workOrders, today);
  const alternatives = input.assets
    .filter((candidate) => candidate.id !== asset.id)
    .map((candidate) => assetReview(candidate, target, input.compliance, input.workOrders, today))
    .filter((candidate): candidate is AssignmentReviewItem & { outcome: 'ready' | 'warning' } => candidate.outcome === 'ready' || candidate.outcome === 'warning')
    .map((candidate) => toAlternative(candidate, asset.assetClass || asset.type, input.targetSiteId))
    .filter((candidate) => candidate.roleOrClass === (asset.assetClass || asset.type) || input.assets.find((entry) => entry.id === candidate.entityId)?.type === asset.type)
    .sort(compareAlternatives)
    .slice(0, 3);
  const item = { ...review, alternatives };
  return { resourceType: 'asset', targetSiteId: input.targetSiteId, outcome: item.outcome, items: [item] };
}

function employeeReview(
  employee: Employee,
  onboarding: EmployeeOnboardingRecord | undefined,
  target: Site | null,
  alternatives: AssignmentAlternative[],
): AssignmentReviewItem {
  const reasons: AssignmentReason[] = [];
  if (!target || !target.isActive) reasons.push(reason('TARGET_SITE_INACTIVE', 'The target site is unavailable.', 'Select an active site.'));
  if ((employee.employmentStatus || 'active') !== 'active') reasons.push(reason('EMPLOYEE_UNAVAILABLE', 'The employee is not active.', 'Resolve the employment status before assignment.'));
  if (!onboarding) reasons.push(reason('EMPLOYEE_READINESS_UNKNOWN', 'Readiness evidence is incomplete.', 'Complete the required readiness evidence.'));
  else if (onboarding.medicalStatus === 'unfit') reasons.push(reason('EMPLOYEE_NOT_FIT', 'The employee is not eligible for assignment.', 'Do not assign until Office Admin records a fit outcome.'));
  else if (onboarding.medicalStatus === 'pending') reasons.push(reason('EMPLOYEE_READINESS_UNKNOWN', 'Readiness evidence is incomplete.', 'Complete the required readiness evidence.'));
  else if (onboarding.medicalStatus === 'restricted') reasons.push(reason('EMPLOYEE_RESTRICTION', 'The employee has an assignment restriction.', 'Confirm permitted duties before overriding.'));
  if (employee.siteId === target?.id) reasons.push(reason('ALREADY_AT_TARGET_SITE', 'The employee is already associated with the target site.', 'No reassignment is required.'));
  const outcome = outcomeForReasons(reasons);
  return {
    entityId: employee.id,
    label: `${employee.firstName} ${employee.surname}`.trim(),
    roleOrClass: employee.role,
    currentSiteId: employee.siteId || null,
    outcome,
    reasons,
    alternatives,
  };
}

function assetReview(
  asset: VehicleAsset,
  target: Site | undefined,
  compliance: AssetComplianceRecord[],
  workOrders: AssetWorkOrder[],
  today: string,
): AssignmentReviewItem {
  const reasons: AssignmentReason[] = [];
  if (!target || !target.isActive) reasons.push(reason('TARGET_SITE_INACTIVE', 'The target site is unavailable.', 'Select an active site.'));
  if ((asset.lifecycleState || 'active') !== 'active' || asset.status !== 'Active') reasons.push(reason('ASSET_UNAVAILABLE', 'The asset is not available for transfer.', 'Return the asset to active service before assignment.'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asset.licenseExpiry || '')) reasons.push(reason('ASSET_READINESS_UNKNOWN', 'The asset licence date is invalid.', 'Correct the licence date before assignment.'));
  else if (asset.licenseExpiry < today) reasons.push(reason('ASSET_LICENCE_EXPIRED', 'The asset licence has expired.', 'Renew the licence before assignment.'));

  const records = compliance.filter((record) => record.assetId === asset.id);
  if (records.some((record) => record.status === 'expired' || Boolean(record.expiresAt && record.expiresAt < today))) reasons.push(reason('ASSET_COMPLIANCE_BLOCKED', 'An asset compliance item is expired.', 'Resolve expired compliance before assignment.'));
  else if (records.some((record) => record.status === 'due')) reasons.push(reason('ASSET_COMPLIANCE_DUE', 'An asset compliance item is due.', 'Confirm the renewal plan before overriding.'));

  const openOrders = workOrders.filter((order) => order.assetId === asset.id && order.status !== 'completed' && order.status !== 'cancelled');
  if (openOrders.some((order) => order.priority === 'high' || order.priority === 'critical')) reasons.push(reason('ASSET_WORK_ORDER_BLOCKING', 'A blocking work order is open.', 'Complete the blocking work order before assignment.'));
  else if (openOrders.length) reasons.push(reason('ASSET_WORK_ORDER_OPEN', 'A non-blocking work order is open.', 'Confirm the work order does not prevent the planned duty.'));
  if (asset.assignedSiteId === target?.id) reasons.push(reason('ALREADY_AT_TARGET_SITE', 'The asset is already associated with the target site.', 'No transfer is required.'));
  return {
    entityId: asset.id,
    label: asset.registrationNumber || asset.serialNumber || `${asset.make} ${asset.model}`.trim(),
    roleOrClass: asset.assetClass || asset.type,
    currentSiteId: asset.assignedSiteId || null,
    outcome: outcomeForReasons(reasons),
    reasons,
    alternatives: [],
  };
}

function reason(code: string, message: string, action: string): AssignmentReason {
  return { code, message, action };
}

function outcomeForReasons(reasons: AssignmentReason[]): AssignmentOutcome {
  if (reasons.some((entry) => ['TARGET_SITE_INACTIVE', 'EMPLOYEE_UNAVAILABLE', 'EMPLOYEE_NOT_FIT', 'ASSET_UNAVAILABLE', 'ASSET_LICENCE_EXPIRED', 'ASSET_COMPLIANCE_BLOCKED', 'ASSET_WORK_ORDER_BLOCKING'].includes(entry.code))) return 'blocked';
  if (reasons.some((entry) => entry.code.endsWith('_UNKNOWN'))) return 'unknown';
  if (reasons.some((entry) => entry.code !== 'ALREADY_AT_TARGET_SITE')) return 'warning';
  return 'ready';
}

function aggregateOutcome(items: AssignmentReviewItem[]): AssignmentOutcome {
  return items.reduce<AssignmentOutcome>((current, item) => OUTCOME_WEIGHT[item.outcome] > OUTCOME_WEIGHT[current] ? item.outcome : current, 'ready');
}

function toAlternative(item: AssignmentReviewItem & { outcome: 'ready' | 'warning' }, exactFit: string, targetSiteId: string): AssignmentAlternative {
  let score = 0;
  const scoreReasons: string[] = [];
  if (item.roleOrClass === exactFit) { score += 50; scoreReasons.push('Exact role or class fit'); }
  if (item.outcome === 'ready') { score += 25; scoreReasons.push('Ready'); }
  else { score += 15; scoreReasons.push('Ready with a warning'); }
  if (item.currentSiteId === targetSiteId) { score += 15; scoreReasons.push('Already associated with target site'); }
  if (!item.reasons.some((entry) => entry.code.includes('WORK_ORDER'))) { score += 10; scoreReasons.push('No recorded work-order conflict'); }
  return { entityId: item.entityId, label: item.label, roleOrClass: item.roleOrClass, currentSiteId: item.currentSiteId, outcome: item.outcome, score, scoreReasons };
}

function compareAlternatives(left: AssignmentAlternative, right: AssignmentAlternative) {
  return right.score - left.score || left.label.localeCompare(right.label) || left.entityId.localeCompare(right.entityId);
}
