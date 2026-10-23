import { LocalAppStateGateway } from './local-app-state.gateway';
import { AppStateSnapshot } from './app-state.gateway';
import { AdminAuditEvent, AttendanceAuditEvent } from '../models/app.models';

describe('LocalAppStateGateway', () => {
  let gateway: LocalAppStateGateway;

  const snapshot: AppStateSnapshot = {
    siteName: 'Senatla Shaft 1',
    sites: [],
    employees: [],
    issues: [],
    groups: [],
    financialTypes: [],
    safetyTopics: [],
    syncHistory: [],
    lastSyncTime: null,
    safetyTalks: [],
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    gateway = new LocalAppStateGateway();
  });

  it('keeps audit evidence in dedicated storage instead of the operational snapshot', async () => {
    const event: AttendanceAuditEvent = {
      id: 'attendance-1',
      action: 'attendance_marked_absent',
      actor: 'Site Manager',
      employeeId: 'employee-1',
      employeeName: 'Anele Zulu',
      siteId: 'site-1',
      details: 'Anele Zulu marked absent for 2026-06-27.',
      occurredAt: new Date('2026-06-27T08:00:00Z'),
    };

    await gateway.saveState(snapshot);
    await gateway.appendAttendanceAuditEvent(event);

    const savedSnapshot = JSON.parse(sessionStorage.getItem('senatla_ops_data') || '{}') as Record<string, unknown>;
    const savedTrail = JSON.parse(sessionStorage.getItem('senatla_ops_attendance_audit') || '[]') as Array<Record<string, unknown>>;

    expect(savedSnapshot['attendanceAuditTrail']).toBeUndefined();
    expect(savedTrail.length).toBe(1);
    expect(savedTrail[0]['occurredAt']).toBe('2026-06-27T08:00:00.000Z');
  });

  it('migrates legacy snapshot audit trails into normalized caches', async () => {
    const legacyTrail: AdminAuditEvent[] = [
      {
        id: 'admin-1',
        action: 'masked_payroll_export',
        actor: 'Office Admin',
        details: 'June 2026 payroll export',
        occurredAt: new Date('2026-06-27T09:00:00Z'),
      },
    ];

    sessionStorage.setItem(
      'senatla_ops_data',
      JSON.stringify({
        ...snapshot,
        adminAuditTrail: legacyTrail,
        attendanceAuditTrail: [],
      }),
    );

    const loadedTrail = await gateway.loadAdminAuditTrail();

    expect(loadedTrail.length).toBe(1);
    expect(loadedTrail[0].occurredAt instanceof Date).toBeTrue();
    expect(sessionStorage.getItem('senatla_ops_admin_audit') || '').toContain('masked_payroll_export');
  });
  it('returns one delivery result for repeated attendance idempotency keys', async () => {
    const payload = {
      siteId: 'site-1', workDate: '2026-08-10',
      rows: [{ employeeId: 'employee-1', status: 'present' as const }],
      summary: { present: 1, absent: 0, pending: 0, flagged: 0, evidenceCount: 0 },
      timingStatus: 'On Time' as const, acknowledgedWarning: false, safetyTopic: 'Start safe',
    };

    const first = await gateway.submitAttendance(payload, 'attendance:site-1:2026-08-10');
    const duplicate = await gateway.submitAttendance(payload, 'attendance:site-1:2026-08-10');

    expect(duplicate.id).toBe(first.id);
    expect((await gateway.loadAttendanceQueue()).length).toBe(1);
    expect(first.outcome).toBe('accepted');
  });
});
