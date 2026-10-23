import { AssetComplianceRecord, AssetWorkOrder, Employee, EmployeeOnboardingRecord, Site, VehicleAsset } from '../models/app.models';
import { planAssetSiteTransfer, planEmployeeSiteAssignment } from './assignment-planning';

describe('assignment planning', () => {
  const sites: Site[] = [
    { id: 'site-a', name: 'North', location: 'A', isActive: true },
    { id: 'site-b', name: 'South', location: 'B', isActive: true },
  ];

  it('blocks unavailable employees and ranks only eligible role-matched alternatives deterministically', () => {
    const employees = [
      employee('blocked', 'Mpho', 'Zulu', 'Operator', 'site-a', 'suspended'),
      employee('ready-b', 'Anele', 'Botha', 'Operator', 'site-b'),
      employee('ready-a', 'Zola', 'Dube', 'Operator', 'site-a'),
      employee('wrong-role', 'Thabo', 'Mokoena', 'Driver', 'site-b'),
    ];
    const onboarding = [record('blocked', 'fit'), record('ready-a', 'fit'), record('ready-b', 'fit'), record('wrong-role', 'fit')];

    const review = planEmployeeSiteAssignment({ employeeIds: ['blocked'], targetSiteId: 'site-b', employees, onboarding, sites });

    expect(review.outcome).toBe('blocked');
    expect(review.items[0].reasons.map((entry) => entry.code)).toContain('EMPLOYEE_UNAVAILABLE');
    expect(review.items[0].alternatives.map((entry) => entry.entityId)).toEqual(['ready-b', 'ready-a']);
    expect(review.items[0].alternatives.every((entry) => entry.roleOrClass === 'Operator')).toBeTrue();
  });

  it('fails closed when employee readiness evidence is missing and never emits protected fields', () => {
    const review = planEmployeeSiteAssignment({
      employeeIds: ['employee-1'],
      targetSiteId: 'site-b',
      employees: [employee('employee-1', 'Lebo', 'Ndlovu', 'Driver', 'site-a')],
      onboarding: [],
      sites,
    });

    expect(review.outcome).toBe('unknown');
    expect(JSON.stringify(review)).not.toMatch(/idNumber|criminal|fingerprint|ticket|medical|notes/i);
  });

  it('treats restricted duty as a warning and fit evidence as ready', () => {
    const employees = [employee('restricted', 'Sihle', 'Khumalo', 'Foreman', 'site-a'), employee('ready', 'Nandi', 'Maseko', 'Foreman', 'site-a')];
    const review = planEmployeeSiteAssignment({
      employeeIds: employees.map((entry) => entry.id), targetSiteId: 'site-b', employees,
      onboarding: [record('restricted', 'restricted'), record('ready', 'fit')], sites,
    });

    expect(review.outcome).toBe('warning');
    expect(review.items.map((entry) => entry.outcome)).toEqual(['warning', 'ready']);
  });

  it('treats an already-associated employee as a ready no-op', () => {
    const review = planEmployeeSiteAssignment({
      employeeIds: ['already-there'], targetSiteId: 'site-b',
      employees: [employee('already-there', 'Lindiwe', 'Molefe', 'Operator', 'site-b')],
      onboarding: [record('already-there', 'fit')], sites,
    });

    expect(review.outcome).toBe('ready');
    expect(review.items[0].reasons.map((entry) => entry.code)).toEqual(['ALREADY_AT_TARGET_SITE']);
  });

  it('blocks an asset with a critical work order and ranks an eligible same-class alternative', () => {
    const assets = [asset('blocked', 'EX-1', 'site-a'), asset('alternative', 'EX-2', 'site-b'), asset('wrong-class', 'TR-1', 'site-b', 'Truck')];
    const workOrders: AssetWorkOrder[] = [{ id: 'wo-1', organizationId: 'org', assetId: 'blocked', title: 'Hydraulic failure', status: 'open', priority: 'critical', cost: 0 }];
    const review = planAssetSiteTransfer({ assetId: 'blocked', targetSiteId: 'site-b', assets, sites, compliance: [], workOrders, today: '2026-08-23' });

    expect(review.outcome).toBe('blocked');
    expect(review.items[0].reasons.map((entry) => entry.code)).toContain('ASSET_WORK_ORDER_BLOCKING');
    expect(review.items[0].alternatives.map((entry) => entry.entityId)).toEqual(['alternative']);
  });

  it('blocks expired compliance without leaking reference numbers or notes', () => {
    const compliance: AssetComplianceRecord[] = [{ id: 'c1', organizationId: 'org', assetId: 'asset-1', complianceType: 'inspection', status: 'expired', referenceNumber: 'SECRET-REF', notes: 'SECRET-NOTE' }];
    const review = planAssetSiteTransfer({ assetId: 'asset-1', targetSiteId: 'site-b', assets: [asset('asset-1', 'EX-1', 'site-a')], sites, compliance, workOrders: [], today: '2026-08-23' });

    expect(review.outcome).toBe('blocked');
    expect(JSON.stringify(review)).not.toContain('SECRET');
    expect(JSON.stringify(review)).not.toMatch(/referenceNumber|notes/i);
  });
  it('treats an already-associated asset as a ready no-op', () => {
    const review = planAssetSiteTransfer({
      assetId: 'asset-1', targetSiteId: 'site-b', assets: [asset('asset-1', 'EX-1', 'site-b')],
      sites, compliance: [], workOrders: [], today: '2026-08-23',
    });

    expect(review.outcome).toBe('ready');
    expect(review.items[0].reasons.map((entry) => entry.code)).toEqual(['ALREADY_AT_TARGET_SITE']);
  });
});

function employee(id: string, firstName: string, surname: string, role: Employee['role'], siteId: string, employmentStatus: Employee['employmentStatus'] = 'active'): Employee {
  return { id, firstName, surname, idNumber: '9001015009087', role, siteId, startDate: '2026-01-01', basicRate: 500, salaryAdvances: 0, financials: {}, logs: {}, adjustments: {}, employmentStatus };
}

function record(employeeId: string, medicalStatus: EmployeeOnboardingRecord['medicalStatus']): EmployeeOnboardingRecord {
  return { id: `onboarding-${employeeId}`, organizationId: 'org', employeeId, criminalCheckStatus: 'pending', fingerprintCheckStatus: 'pending', medicalStatus, notes: 'SECRET', updatedAt: '2026-08-23T00:00:00Z' };
}

function asset(id: string, registrationNumber: string, assignedSiteId: string, assetClass = 'Excavator'): VehicleAsset {
  return { id, registrationNumber, make: 'CAT', model: '320', type: assetClass === 'Truck' ? 'Heavy Duty' : 'Yellow Metal', assetClass, licenseExpiry: '2027-01-01', status: 'Active', lifecycleState: 'active', assignedSiteId };
}
