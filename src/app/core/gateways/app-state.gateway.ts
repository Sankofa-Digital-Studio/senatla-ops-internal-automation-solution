import { InjectionToken } from '@angular/core';
import { AdminAuditEvent, AttendanceAuditEvent, AttendanceDeliveryPayload, AttendanceQueueSubmission, Employee, FinancialType, Group, Issue, SafetyTalkRecord, Site, SyncRecord } from '../models/app.models';

export interface AppStateSnapshot {
  siteName: string;
  sites: Site[];
  employees: Employee[];
  issues: Issue[];
  groups: Group[];
  financialTypes: FinancialType[];
  safetyTopics: string[];
  syncHistory: SyncRecord[];
  lastSyncTime: string | null;
  safetyTalks: SafetyTalkRecord[];
}

export interface AppStateGateway {
  loadState(): Promise<AppStateSnapshot | null>;
  saveState(snapshot: AppStateSnapshot): Promise<void>;
  loadAdminAuditTrail(): Promise<AdminAuditEvent[]>;
  loadAttendanceAuditTrail(): Promise<AttendanceAuditEvent[]>;
  appendAdminAuditEvent(event: AdminAuditEvent): Promise<void>;
  appendAttendanceAuditEvent(event: AttendanceAuditEvent): Promise<void>;
  loadAttendanceQueue(): Promise<AttendanceQueueSubmission[]>;
  submitAttendance(payload: AttendanceDeliveryPayload, idempotencyKey: string): Promise<AttendanceQueueSubmission>;
  retryAttendance(submissionId: string): Promise<AttendanceQueueSubmission>;
}

export const APP_STATE_GATEWAY = new InjectionToken<AppStateGateway>('APP_STATE_GATEWAY');
