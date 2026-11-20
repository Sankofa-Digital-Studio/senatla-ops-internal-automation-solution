import { InjectionToken } from '@angular/core';

export type ManagerMode = 'site' | 'workshop';
export type WorkshopWorkStatus = 'queued' | 'ready' | 'in_progress' | 'quality_check' | 'complete' | 'blocked';
export type BlockerSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BlockerCategory = 'safety' | 'material' | 'drawing' | 'equipment' | 'labour' | 'quality' | 'client' | 'logistics';

export interface WorkshopWorkItem {
  id: string;
  title: string;
  workstation: string;
  assignedEmployeeId: string;
  dueDate: string;
  status: WorkshopWorkStatus;
  blockerId?: string;
}

export interface OperationalBlocker {
  id: string;
  category: BlockerCategory;
  severity: BlockerSeverity;
  summary: string;
  owner: string;
  dueAt: string;
  status: 'open' | 'escalated' | 'resolved';
  createdAt: string;
}

export interface ManagerControlScope {
  siteId: string;
  workDate: string;
}

export interface ManagerControlState {
  snapshotId?: string;
  version?: number;
  managerMode: ManagerMode;
  shiftObjective: string;
  shiftTopRisk: string;
  shiftSupport: string;
  handoverNote: string;
  workshopWorkItems: WorkshopWorkItem[];
  operationalBlockers: OperationalBlocker[];
  workstationReadiness: {
    machine: boolean;
    tools: boolean;
    materials: boolean;
    operator: boolean;
    instruction: boolean;
    inspection: boolean;
  };
}

export interface ManagerControlGateway {
  readonly persistenceMode: 'server' | 'local_review';
  load(scope: ManagerControlScope): Promise<ManagerControlState | null>;
  save(scope: ManagerControlScope, state: ManagerControlState): Promise<{ snapshotId?: string; version: number }>;
  transitionWorkPackage(id: string, status: WorkshopWorkStatus): Promise<void>;
}

export const MANAGER_CONTROL_GATEWAY = new InjectionToken<ManagerControlGateway>('MANAGER_CONTROL_GATEWAY');
