import { Injectable } from '@angular/core';
import { AppStateGateway, AppStateSnapshot } from './app-state.gateway';
import { AdminAuditEvent, AttendanceAuditEvent, AttendanceDeliveryPayload, AttendanceQueueSubmission } from '../models/app.models';

@Injectable()
export class LocalAppStateGateway implements AppStateGateway {
  private readonly storageKey = 'senatla_ops_data';
  private readonly legacyStorageKey = 'senatla_ops_data';
  private readonly legacyBackupKey = 'senatla_ops_data_backup';
  private readonly adminAuditStorageKey = 'senatla_ops_admin_audit';
  private readonly attendanceAuditStorageKey = 'senatla_ops_attendance_audit';
  private readonly attendanceQueueStorageKey = 'senatla_ops_attendance_queue';

  async loadState(): Promise<AppStateSnapshot | null> {
    const sessionData = sessionStorage.getItem(this.storageKey);
    if (sessionData) {
      return JSON.parse(sessionData) as AppStateSnapshot;
    }

    const legacyData = localStorage.getItem(this.legacyStorageKey);
    if (!legacyData) return null;

    const parsed = JSON.parse(legacyData) as AppStateSnapshot;
    sessionStorage.setItem(this.storageKey, JSON.stringify(parsed));
    localStorage.setItem(this.legacyBackupKey, legacyData);
    localStorage.removeItem(this.legacyStorageKey);
    return parsed;
  }

  async saveState(snapshot: AppStateSnapshot): Promise<void> {
    sessionStorage.setItem(this.storageKey, JSON.stringify(snapshot));
  }

  async loadAdminAuditTrail(): Promise<AdminAuditEvent[]> {
    return this.loadAuditTrail(this.adminAuditStorageKey, 'adminAuditTrail');
  }

  async loadAttendanceAuditTrail(): Promise<AttendanceAuditEvent[]> {
    return this.loadAuditTrail(this.attendanceAuditStorageKey, 'attendanceAuditTrail');
  }

  async appendAdminAuditEvent(event: AdminAuditEvent): Promise<void> {
    const trail = await this.loadAdminAuditTrail();
    this.persistAuditTrail(this.adminAuditStorageKey, [event, ...trail].slice(0, 25));
  }

  async appendAttendanceAuditEvent(event: AttendanceAuditEvent): Promise<void> {
    const trail = await this.loadAttendanceAuditTrail();
    this.persistAuditTrail(this.attendanceAuditStorageKey, [event, ...trail].slice(0, 40));
  }

  async loadAttendanceQueue(): Promise<AttendanceQueueSubmission[]> {
    return JSON.parse(sessionStorage.getItem(this.attendanceQueueStorageKey) || '[]') as AttendanceQueueSubmission[];
  }

  async submitAttendance(payload: AttendanceDeliveryPayload, idempotencyKey: string): Promise<AttendanceQueueSubmission> {
    const submissions = await this.loadAttendanceQueue();
    const duplicate = submissions.find((entry) => entry.idempotencyKey === idempotencyKey);
    if (duplicate) return duplicate;
    const now = new Date().toISOString();
    const submission: AttendanceQueueSubmission = {
      id: crypto.randomUUID(), organizationId: '00000000-0000-4000-8000-000000000001', submittedBy: 'local-site-user',
      siteId: payload.siteId, workDate: payload.workDate, status: 'completed', outcome: 'accepted', attempts: 1,
      idempotencyKey, lastError: null, diagnosticContext: { delivery: 'local-demo' }, createdAt: now, processedAt: now,
    };
    sessionStorage.setItem(this.attendanceQueueStorageKey, JSON.stringify([submission, ...submissions]));
    return submission;
  }

  async retryAttendance(submissionId: string): Promise<AttendanceQueueSubmission> {
    const submissions = await this.loadAttendanceQueue();
    const current = submissions.find((entry) => entry.id === submissionId);
    if (!current || current.outcome !== 'retryable') throw new Error('Only retryable attendance deliveries can be retried.');
    const updated: AttendanceQueueSubmission = { ...current, status: 'completed', outcome: 'accepted', attempts: current.attempts + 1, lastError: null, processedAt: new Date().toISOString() };
    sessionStorage.setItem(this.attendanceQueueStorageKey, JSON.stringify(submissions.map((entry) => entry.id === submissionId ? updated : entry)));
    return updated;
  }
  private loadAuditTrail<T extends AdminAuditEvent | AttendanceAuditEvent>(
    storageKey: string,
    legacyTrailKey: 'adminAuditTrail' | 'attendanceAuditTrail',
  ): T[] {
    const cachedTrail = sessionStorage.getItem(storageKey);
    if (cachedTrail) {
      return this.parseAuditTrail<T>(cachedTrail);
    }

    const legacySources = [
      sessionStorage.getItem(this.storageKey),
      localStorage.getItem(this.legacyStorageKey),
      localStorage.getItem(this.legacyBackupKey),
    ];

    for (const legacySnapshot of legacySources) {
      if (!legacySnapshot) {
        continue;
      }

      try {
        const parsed = JSON.parse(legacySnapshot) as Record<string, unknown>;
        const legacyTrail = Array.isArray(parsed[legacyTrailKey]) ? parsed[legacyTrailKey] as T[] : [];
        if (!legacyTrail.length) {
          continue;
        }

        this.persistAuditTrail(storageKey, legacyTrail);
        return this.parseAuditTrail<T>(sessionStorage.getItem(storageKey) || '[]');
      } catch {
        continue;
      }
    }

    return [];
  }

  private persistAuditTrail<T extends AdminAuditEvent | AttendanceAuditEvent>(storageKey: string, trail: T[]): void {
    sessionStorage.setItem(storageKey, JSON.stringify(trail.map((event) => ({
      ...event,
      occurredAt: event.occurredAt instanceof Date ? event.occurredAt.toISOString() : event.occurredAt,
    }))));
  }

  private parseAuditTrail<T extends AdminAuditEvent | AttendanceAuditEvent>(rawTrail: string): T[] {
    try {
      return (JSON.parse(rawTrail) as Array<Partial<T> & { occurredAt?: string }>).map((entry) => ({
        ...(entry as unknown as T),
        occurredAt: new Date(entry.occurredAt || Date.now()),
      }));
    } catch {
      return [];
    }
  }
}
