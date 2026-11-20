import { Injectable } from '@angular/core';
import { injectSupabaseClient } from './supabase.client';
import { BlockerCategory, BlockerSeverity, ManagerControlGateway, ManagerControlScope, ManagerControlState, OperationalBlocker, WorkshopWorkItem, WorkshopWorkStatus } from './manager-control.gateway';

@Injectable()
export class SupabaseManagerControlGateway implements ManagerControlGateway {
  readonly persistenceMode = 'server' as const;
  private readonly supabase = injectSupabaseClient();
  private pendingSaveRequest?: { fingerprint: string; requestId: string };

  async load(scope: ManagerControlScope): Promise<ManagerControlState | null> {
    const [snapshotResult, readinessResult, workResult, blockerResult] = await Promise.all([
      this.supabase.from('manager_shift_snapshots').select('id, version, manager_mode, shift_objective, shift_top_risk, shift_support, handover_note').eq('site_id', scope.siteId).eq('work_date', scope.workDate).maybeSingle(),
      this.supabase.from('manager_workstation_readiness').select('machine_ready, tools_ready, materials_ready, operator_ready, instruction_ready, inspection_ready').eq('site_id', scope.siteId).eq('work_date', scope.workDate).maybeSingle(),
      this.supabase.from('manager_work_packages').select('id, title, workstation, assigned_employee_id, due_date, status, blocker_id').eq('site_id', scope.siteId).order('due_date', { ascending: true }),
      this.supabase.from('manager_blockers').select('id, category, severity, summary, owner_label, due_at, status, created_at').eq('site_id', scope.siteId).order('created_at', { ascending: false }),
    ]);
    const failure = [snapshotResult, readinessResult, workResult, blockerResult].find((result) => result.error);
    if (failure?.error) throw new Error('The manager control record could not be loaded from Senatla Ops.');
    if (!snapshotResult.data && !readinessResult.data && !workResult.data?.length && !blockerResult.data?.length) return null;

    return {
      snapshotId: stringValue(snapshotResult.data?.id),
      version: numberValue(snapshotResult.data?.version),
      managerMode: snapshotResult.data?.manager_mode === 'workshop' ? 'workshop' : 'site',
      shiftObjective: stringValue(snapshotResult.data?.shift_objective) || '',
      shiftTopRisk: stringValue(snapshotResult.data?.shift_top_risk) || '',
      shiftSupport: stringValue(snapshotResult.data?.shift_support) || '',
      handoverNote: stringValue(snapshotResult.data?.handover_note) || '',
      workstationReadiness: {
        machine: Boolean(readinessResult.data?.machine_ready), tools: Boolean(readinessResult.data?.tools_ready),
        materials: Boolean(readinessResult.data?.materials_ready), operator: Boolean(readinessResult.data?.operator_ready),
        instruction: Boolean(readinessResult.data?.instruction_ready), inspection: Boolean(readinessResult.data?.inspection_ready),
      },
      workshopWorkItems: Array.isArray(workResult.data) ? workResult.data.map(parseWorkItem) : [],
      operationalBlockers: Array.isArray(blockerResult.data) ? blockerResult.data.map(parseBlocker) : [],
    };
  }

  async save(scope: ManagerControlScope, state: ManagerControlState): Promise<{ snapshotId?: string; version: number }> {
    const payload = {
      managerMode: state.managerMode,
      shiftObjective: state.shiftObjective.trim(),
      shiftTopRisk: state.shiftTopRisk.trim(),
      shiftSupport: state.shiftSupport.trim(),
      handoverNote: state.handoverNote.trim(),
      workstationReadiness: state.workstationReadiness,
      workshopWorkItems: state.workshopWorkItems,
      operationalBlockers: state.operationalBlockers,
    };
    const expectedVersion = state.version || 0;
    const fingerprint = JSON.stringify([scope, expectedVersion, payload]);
    if (this.pendingSaveRequest?.fingerprint !== fingerprint) {
      this.pendingSaveRequest = { fingerprint, requestId: crypto.randomUUID() };
    }
    const requestId = this.pendingSaveRequest.requestId;
    const { data, error } = await this.supabase.rpc('save_manager_control_state_v1', {
      p_request_id: requestId,
      p_expected_version: expectedVersion,
      p_site_id: scope.siteId,
      p_work_date: scope.workDate,
      p_state: payload,
    });
    if (error) throw new Error(error.message || 'The manager control record could not be saved. Reload the shift and retry.');
    const result = data as { snapshot_id?: unknown; version?: unknown } | null;
    if (!result || typeof result.version !== 'number') throw new Error('The server returned an invalid manager control version.');
    this.pendingSaveRequest = undefined;
    return { snapshotId: stringValue(result.snapshot_id), version: result.version };
  }

  async transitionWorkPackage(id: string, status: WorkshopWorkStatus): Promise<void> {
    const { error } = await this.supabase.rpc('transition_manager_work_package_v1', { p_work_package_id: id, p_status: status });
    if (error) throw new Error(error.message || 'The server rejected the work-package transition.');
  }
}

function parseWorkItem(row: Record<string, unknown>): WorkshopWorkItem {
  return { id: stringValue(row['id']) || crypto.randomUUID(), title: stringValue(row['title']) || 'Untitled work package', workstation: stringValue(row['workstation']) || 'Unassigned workstation', assignedEmployeeId: stringValue(row['assigned_employee_id']) || '', dueDate: stringValue(row['due_date']) || '', status: isWorkStatus(row['status']) ? row['status'] : 'queued', ...(stringValue(row['blocker_id']) ? { blockerId: stringValue(row['blocker_id']) } : {}) };
}

function parseBlocker(row: Record<string, unknown>): OperationalBlocker {
  const status: OperationalBlocker['status'] = row['status'] === 'resolved' || row['status'] === 'escalated' ? row['status'] : 'open';
  return { id: stringValue(row['id']) || crypto.randomUUID(), category: isBlockerCategory(row['category']) ? row['category'] : 'equipment', severity: isBlockerSeverity(row['severity']) ? row['severity'] : 'medium', summary: stringValue(row['summary']) || '', owner: stringValue(row['owner_label']) || '', dueAt: stringValue(row['due_at']) || '', status, createdAt: stringValue(row['created_at']) || new Date().toISOString() };
}

function stringValue(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
function numberValue(value: unknown): number { return typeof value === 'number' ? value : 0; }
function isWorkStatus(value: unknown): value is WorkshopWorkStatus { return value === 'queued' || value === 'ready' || value === 'in_progress' || value === 'quality_check' || value === 'complete' || value === 'blocked'; }
function isBlockerCategory(value: unknown): value is BlockerCategory { return value === 'safety' || value === 'material' || value === 'drawing' || value === 'equipment' || value === 'labour' || value === 'quality' || value === 'client' || value === 'logistics'; }
function isBlockerSeverity(value: unknown): value is BlockerSeverity { return value === 'low' || value === 'medium' || value === 'high' || value === 'critical'; }
