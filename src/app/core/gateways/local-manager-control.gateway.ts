import { Injectable } from '@angular/core';
import { ManagerControlGateway, ManagerControlScope, ManagerControlState, WorkshopWorkStatus } from './manager-control.gateway';

@Injectable()
export class LocalManagerControlGateway implements ManagerControlGateway {
  readonly persistenceMode = 'local_review' as const;
  async load(scope: ManagerControlScope): Promise<ManagerControlState | null> {
    try {
      const raw = localStorage.getItem(this.key(scope)) || localStorage.getItem(`senatla_site_manager_phase1:${encodeURIComponent(scope.siteId)}:${scope.workDate}`);
      return raw ? JSON.parse(raw) as ManagerControlState : null;
    } catch {
      return null;
    }
  }

  async save(scope: ManagerControlScope, state: ManagerControlState): Promise<{ snapshotId?: string; version: number }> {
    const nextVersion = (state.version || 0) + 1;
    const persistedState = { ...state, version: nextVersion };
    try {
      localStorage.setItem(this.key(scope), JSON.stringify(persistedState));
    } catch {
      // Local review mode remains usable when storage is unavailable.
    }
    return { snapshotId: state.snapshotId, version: nextVersion };
  }

  async transitionWorkPackage(_id: string, _status: WorkshopWorkStatus): Promise<void> {
    // Local review mode applies the transition in the component after its local gate.
  }

  private key(scope: ManagerControlScope): string {
    return `senatla_site_manager_phase2:${encodeURIComponent(scope.siteId)}:${scope.workDate}`;
  }
}
