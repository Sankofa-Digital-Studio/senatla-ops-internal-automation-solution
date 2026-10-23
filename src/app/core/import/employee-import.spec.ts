import { stageEmployeeCsv } from './employee-import';

describe('stageEmployeeCsv', () => {
  const csv = [
    'Names,ID No,Company No,Designation,Emp.Start Date,Rate P/D,Xtream Safety,Source Reference',
    'Anele Zulu,9001015009087,EMP-001,Excavator Op,2026-08-01,650,"First Aid Level 1; HIRA",Workforce PDF p.4',
  ].join('\n');

  it('creates a generated UAT reference and never retains source ID or rate data', () => {
    const rows = stageEmployeeCsv(csv, 'site-1');
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('ready');
    expect(rows[0].employee).toEqual(jasmine.objectContaining({
      firstName: 'Anele', surname: 'Zulu', idNumber: 'UAT-EMP-0001', companyNumber: 'EMP-001',
      designation: 'Excavator Op', role: 'Operator', startDate: '2026-08-01', basicRate: 0, payRateUnit: 'daily',
    }));
    expect(rows[0].employee.safetyQualifications).toEqual(['First Aid Level 1', 'HIRA']);
    expect(rows[0].employee.additionalFields).toEqual({ source_reference: 'Workforce PDF p.4' });
    expect(JSON.stringify(rows)).not.toContain('9001015009087');
    expect(JSON.stringify(rows)).not.toContain('650');
  });

  it('increments generated references from existing UAT records', () => {
    const existing = [{ id: 'existing', firstName: 'Existing', surname: 'Worker', idNumber: 'UAT-EMP-0041', role: 'Operator' as const, siteId: 'site-1', startDate: '2026-01-01', basicRate: 0, salaryAdvances: 0, financials: {}, logs: {}, adjustments: {} }];
    expect(stageEmployeeCsv(csv, 'site-1', existing)[0].employee.idNumber).toBe('UAT-EMP-0042');
  });

  it('detects duplicate source IDs without disclosing them and requires a site', () => {
    const rows = stageEmployeeCsv(`${csv}\nBongi Ndlovu,9001015009087,EMP-002,Driver,2026-08-02,700,,`, '');
    expect(rows[0].errors).toContain('Select a site before importing.');
    expect(rows[1].errors).toContain('Source identifier duplicates another staged employee.');
    expect(JSON.stringify(rows[1].errors)).not.toContain('9001015009087');
  });

  it('detects duplicate company numbers and rejects sensitive columns', () => {
    const existing = [{ id: 'existing', firstName: 'Existing', surname: 'Worker', idNumber: 'UAT-EMP-0001', companyNumber: 'emp-001', role: 'Operator' as const, siteId: 'site-1', startDate: '2026-01-01', basicRate: 0, salaryAdvances: 0, financials: {}, logs: {}, adjustments: {} }];
    expect(stageEmployeeCsv(csv, 'site-1', existing)[0].errors).toContain('Company number duplicates an existing or staged employee.');
    expect(() => stageEmployeeCsv('Names,Tax Number\nAnele Zulu,123', 'site-1')).toThrowError(/disallowed sensitive column/i);
  });
});