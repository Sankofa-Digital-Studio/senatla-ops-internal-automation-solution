import { Injectable } from '@angular/core';
import { AppStateGateway, AppStateSnapshot } from './app-state.gateway';
import { AdminAuditEvent, AttendanceAuditEvent, AttendanceDeliveryPayload, AttendanceQueueSubmission, Employee, Site } from '../models/app.models';
import { injectSupabaseClient } from './supabase.client';

type SnapshotRow = {
  user_id: string;
  snapshot: AppStateSnapshot;
  updated_at?: string;
};

@Injectable()
export class SupabaseAppStateGateway implements AppStateGateway {
  private readonly supabase = injectSupabaseClient();

  async loadState(): Promise<AppStateSnapshot | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) return null;

    const [snapshotResult, siteResult, employeeResult] = await Promise.all([
      this.supabase.from('app_state_snapshots').select('user_id, snapshot, updated_at').eq('user_id', userId).maybeSingle<SnapshotRow>(),
      this.supabase.from('sites').select('id, organization_id, name, location, manager_profile_id, is_active').order('name'),
      this.supabase.from('employees').select('id, organization_id, first_name, surname, id_number, role, site_id, group_id, start_date, basic_rate, salary_advances, financials, logs, adjustments, employment_status, tax_ref_number').order('surname'),
    ]);
    if (snapshotResult.error || siteResult.error || employeeResult.error) return null;
    const sites = (siteResult.data || []).map((row): Site => ({ id: row.id, organizationId: row.organization_id, name: row.name, location: row.location, managerId: row.manager_profile_id || undefined, isActive: row.is_active }));
    const employees = (employeeResult.data || []).map((row): Employee => ({ id: row.id, organizationId: row.organization_id, firstName: row.first_name, surname: row.surname, idNumber: row.id_number, role: row.role as Employee['role'], siteId: row.site_id, groupId: row.group_id || undefined, startDate: row.start_date, basicRate: Number(row.basic_rate), salaryAdvances: Number(row.salary_advances), financials: row.financials || {}, logs: row.logs || {}, adjustments: row.adjustments || {}, employmentStatus: row.employment_status as Employee['employmentStatus'], taxRefNumber: row.tax_ref_number || undefined }));
    const snapshot = snapshotResult.data?.snapshot;
    if (!snapshot && !sites.length) return null;
    return { siteName: sites[0]?.name || snapshot?.siteName || '', sites, employees, issues: snapshot?.issues || [], groups: snapshot?.groups || [], financialTypes: snapshot?.financialTypes || [], safetyTopics: snapshot?.safetyTopics || [], syncHistory: snapshot?.syncHistory || [], lastSyncTime: snapshot?.lastSyncTime || null, safetyTalks: snapshot?.safetyTalks || [] };
  }

  async saveState(snapshot: AppStateSnapshot): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    const { error } = await this.supabase
      .from('app_state_snapshots')
      .upsert(
        {
          user_id: userId,
          snapshot,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      throw error;
    }
  }

  async loadAdminAuditTrail(): Promise<AdminAuditEvent[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from('admin_audit_events')
      .select('id, actor_name, action, details, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(25);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      actor: row.actor_name,
      action: row.action as AdminAuditEvent['action'],
      details: row.details || undefined,
      occurredAt: new Date(row.occurred_at),
    }));
  }

  async loadAttendanceAuditTrail(): Promise<AttendanceAuditEvent[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from('attendance_audit_events')
      .select('id, actor_name, employee_id, employee_name, site_id, action, details, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(40);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      actor: row.actor_name,
      employeeId: row.employee_id || undefined,
      employeeName: row.employee_name || undefined,
      siteId: row.site_id || undefined,
      action: row.action as AttendanceAuditEvent['action'],
      details: row.details || undefined,
      occurredAt: new Date(row.occurred_at),
    }));
  }

  async appendAdminAuditEvent(event: AdminAuditEvent): Promise<void> {
    const userId = await this.requireCurrentUserId();
    const { error } = await this.supabase.from('admin_audit_events').insert({
      id: event.id,
      actor_id: userId,
      actor_name: event.actor,
      action: event.action,
      details: event.details || null,
      occurred_at: event.occurredAt.toISOString(),
    });
    if (error) throw error;
  }

  async appendAttendanceAuditEvent(event: AttendanceAuditEvent): Promise<void> {
    const userId = await this.requireCurrentUserId();
    const { error } = await this.supabase.from('attendance_audit_events').insert({
      id: event.id,
      actor_id: userId,
      actor_name: event.actor,
      employee_id: event.employeeId || null,
      employee_name: event.employeeName || null,
      site_id: event.siteId || null,
      action: event.action,
      details: event.details || null,
      occurred_at: event.occurredAt.toISOString(),
    });
    if (error) throw error;
  }

  async loadAttendanceQueue(): Promise<AttendanceQueueSubmission[]> {
    const { data, error } = await this.supabase.from('queued_sync_submissions').select('id, organization_id, submitted_by, site_id, work_date, status, outcome, attempts, idempotency_key, last_error, diagnostic_context, created_at, processed_at').order('created_at', { ascending: false }).limit(40);
    if (error) throw error;
    return (data || []).map((row) => this.mapAttendanceQueue(row));
  }

  async submitAttendance(payload: AttendanceDeliveryPayload, idempotencyKey: string): Promise<AttendanceQueueSubmission> {
    const userId = await this.requireCurrentUserId();
    const { data: profile, error: profileError } = await this.supabase.from('profiles').select('organization_id').eq('id', userId).single();
    if (profileError || !profile) throw profileError || new Error('Authenticated organization could not be resolved.');
    const { data, error } = await this.supabase.from('queued_sync_submissions').insert({ submitted_by: userId, organization_id: profile.organization_id, site_id: payload.siteId, work_date: payload.workDate, idempotency_key: idempotencyKey, payload }).select('id, organization_id, submitted_by, site_id, work_date, status, outcome, attempts, idempotency_key, last_error, diagnostic_context, created_at, processed_at').single();
    if (!error && data) return this.mapAttendanceQueue(data);
    if (error?.code !== '23505') throw error;
    const { data: duplicate, error: duplicateError } = await this.supabase.from('queued_sync_submissions').select('id, organization_id, submitted_by, site_id, work_date, status, outcome, attempts, idempotency_key, last_error, diagnostic_context, created_at, processed_at').eq('idempotency_key', idempotencyKey).single();
    if (duplicateError || !duplicate) throw duplicateError || error;
    return this.mapAttendanceQueue(duplicate);
  }

  async retryAttendance(submissionId: string): Promise<AttendanceQueueSubmission> {
    const { data, error } = await this.supabase.from('queued_sync_submissions').update({ status: 'processing' }).eq('id', submissionId).select('id, organization_id, submitted_by, site_id, work_date, status, outcome, attempts, idempotency_key, last_error, diagnostic_context, created_at, processed_at').single();
    if (error || !data) throw error || new Error('Attendance delivery retry did not return a result.');
    return this.mapAttendanceQueue(data);
  }

  private mapAttendanceQueue(row: any): AttendanceQueueSubmission {
    return { id: row.id, organizationId: row.organization_id, submittedBy: row.submitted_by, siteId: row.site_id, workDate: row.work_date, status: row.status, outcome: row.outcome, attempts: row.attempts, idempotencyKey: row.idempotency_key, lastError: row.last_error, diagnosticContext: row.diagnostic_context, createdAt: row.created_at, processedAt: row.processed_at };
  }
  private async requireCurrentUserId(): Promise<string> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('An authenticated user is required to write audit events.');
    return userId;
  }

  private async getCurrentUserId(): Promise<string | null> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  }
}
