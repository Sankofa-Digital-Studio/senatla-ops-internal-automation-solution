import {
  AssetComplianceRecord,
  Employee,
  EmployeeOnboardingRecord,
  Site,
  VehicleAsset,
} from '../models/app.models';
import {
  READINESS_POLICY_VERSION,
  combineReadiness,
  evaluateAssetReadiness,
  evaluateEmployeeReadiness,
  evaluateSiteReadiness,
} from './readiness-policy';

const context = { asOf: '2026-08-23T14:00:00+02:00', warningWindowDays: 30 } as const;
const employee: Employee = {
  id: 'employee-1', firstName: 'Test', surname: 'Worker', idNumber: 'test-id', role: 'Operator', siteId: 'site-1',
  startDate: '2026-01-01', basicRate: 100, salaryAdvances: 0, financials: {}, logs: {}, adjustments: {}, employmentStatus: 'active',
};
const onboarding: EmployeeOnboardingRecord = {
  id: 'onboarding-1', organizationId: 'org-1', employeeId: employee.id, criminalCheckStatus: 'clear', fingerprintCheckStatus: 'clear',
  medicalStatus: 'fit', redTicketNumber: 'RT-1', redTicketIssuedAt: '2026-01-01', redTicketExpiresAt: '2027-01-01', updatedAt: '2026-01-01',
};
const asset: VehicleAsset = {
  id: 'asset-1', make: 'CAT', model: '320', type: 'Yellow Metal', licenseExpiry: '2027-01-01', status: 'Active', lifecycleState: 'active',
};
const compliance: AssetComplianceRecord = {
  id: 'compliance-1', organizationId: 'org-1', assetId: asset.id, complianceType: 'inspection', status: 'valid', expiresAt: '2027-01-01',
};

describe('readiness policy', () => {
  it('returns ready with a stable policy version for verified employee evidence', () => {
    const result = evaluateEmployeeReadiness({ employee, onboarding }, context);
    expect(result.status).toBe('ready');
    expect(result.canProceed).toBeTrue();
    expect(result.policyVersion).toBe(READINESS_POLICY_VERSION);
    expect(result.evaluatedAt).toBe(context.asOf);
  });

  it('fails closed as unknown when safety-critical employee evidence is missing', () => {
    const result = evaluateEmployeeReadiness({ employee }, context);
    expect(result.status).toBe('unknown');
    expect(result.canProceed).toBeFalse();
    expect(result.reasons.map((item) => item.code)).toContain('onboarding_missing');
  });

  it('blocks an expired red ticket and warns at the exact renewal boundary', () => {
    const expired = evaluateEmployeeReadiness({ employee, onboarding: { ...onboarding, redTicketExpiresAt: '2026-08-22' } }, context);
    const due = evaluateEmployeeReadiness({ employee, onboarding: { ...onboarding, redTicketExpiresAt: '2026-09-22' } }, context);
    expect(expired.status).toBe('blocked');
    expect(expired.reasons.map((item) => item.code)).toContain('red_ticket_expired');
    expect(due.status).toBe('warning');
    expect(due.canProceed).toBeTrue();
  });

  it('blocks unfit and suspended employees even when other evidence is valid', () => {
    const result = evaluateEmployeeReadiness({ employee: { ...employee, employmentStatus: 'suspended' }, onboarding: { ...onboarding, medicalStatus: 'unfit' } }, context);
    expect(result.status).toBe('blocked');
    expect(result.reasons.map((item) => item.code)).toEqual(jasmine.arrayContaining(['employee_suspended', 'medical_unfit']));
  });

  it('fails closed when asset compliance evidence is absent', () => {
    const result = evaluateAssetReadiness({ asset }, context);
    expect(result.status).toBe('unknown');
    expect(result.canProceed).toBeFalse();
    expect(result.reasons.map((item) => item.code)).toContain('asset_compliance_missing');
  });

  it('blocks maintenance and expired compliance while retaining all reasons', () => {
    const result = evaluateAssetReadiness({
      asset: { ...asset, status: 'Maintenance' },
      complianceRecords: [{ ...compliance, status: 'expired' }],
    }, context);
    expect(result.status).toBe('blocked');
    expect(result.reasons.map((item) => item.code)).toEqual(jasmine.arrayContaining(['asset_in_maintenance', 'asset_compliance_expired']));
  });

  it('treats an invalid date as unknown rather than accidentally ready', () => {
    const result = evaluateAssetReadiness({ asset: { ...asset, licenseExpiry: 'not-a-date' }, complianceRecords: [compliance] }, context);
    expect(result.status).toBe('unknown');
    expect(result.reasons.map((item) => item.code)).toContain('asset_licence_missing');
  });

  it('evaluates site activity and checklist evidence', () => {
    const site: Site = { id: 'site-1', name: 'Test', location: 'Test', isActive: false };
    const result = evaluateSiteReadiness(site, context);
    expect(result.status).toBe('blocked');
    expect(result.reasons.map((item) => item.code)).toEqual(jasmine.arrayContaining(['site_inactive', 'site_checklist_missing']));
  });

  it('does not infer work eligibility from sensitive screening fields', () => {
    const result = evaluateEmployeeReadiness({
      employee,
      onboarding: { ...onboarding, criminalCheckStatus: 'failed', fingerprintCheckStatus: 'failed' },
    }, context);
    expect(result.status).toBe('ready');
    expect(result.reasons).toEqual([]);
  });

  it('fails closed when the evaluation date is invalid', () => {
    const result = evaluateSiteReadiness(
      { id: 'site-1', name: 'Test', location: 'Test', isActive: true, complianceChecklist: ['verified'] },
      { asOf: 'invalid-date' },
    );
    expect(result.status).toBe('unknown');
    expect(result.canProceed).toBeFalse();
    expect(result.reasons.map((item) => item.code)).toEqual(['evaluation_date_invalid']);
  });

  it('orders reasons deterministically by severity and code', () => {
    const result = evaluateEmployeeReadiness({ employee: { ...employee, employmentStatus: 'suspended' } }, context);
    expect(result.reasons.map((item) => item.code)).toEqual(['employee_suspended', 'onboarding_missing']);
  });
  it('combines results using blocked then unknown then warning precedence', () => {
    const readyEmployee = evaluateEmployeeReadiness({ employee, onboarding }, context);
    const unknownAsset = evaluateAssetReadiness({ asset }, context);
    const blockedSite = evaluateSiteReadiness({ id: 'site-1', name: 'Test', location: 'Test', isActive: false, complianceChecklist: ['verified'] }, context);
    expect(combineReadiness([readyEmployee, unknownAsset], context, 'shift-1').status).toBe('unknown');
    expect(combineReadiness([readyEmployee, unknownAsset, blockedSite], context, 'shift-1').status).toBe('blocked');
  });
});
