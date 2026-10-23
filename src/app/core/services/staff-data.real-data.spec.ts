import { TestBed } from '@angular/core/testing';
import { provideRuntimeConfig, RuntimeConfig } from '../config/runtime-config';
import { APP_STATE_GATEWAY, AppStateGateway, AppStateSnapshot } from '../gateways/app-state.gateway';
import { AUTH_GATEWAY } from '../gateways/auth.gateway';
import { AdminAuditEvent, AttendanceAuditEvent, AttendanceDeliveryPayload, AttendanceQueueSubmission } from '../models/app.models';
import { StaffDataService } from './staff-data.service';

class EmptyRemoteStateGateway implements AppStateGateway {
  saveCalls = 0;
  async loadState(): Promise<AppStateSnapshot | null> { return null; }
  async saveState(_snapshot: AppStateSnapshot) { this.saveCalls += 1; }
  async loadAdminAuditTrail(): Promise<AdminAuditEvent[]> { return []; }
  async loadAttendanceAuditTrail(): Promise<AttendanceAuditEvent[]> { return []; }
  async appendAdminAuditEvent(_event: AdminAuditEvent) {}
  async appendAttendanceAuditEvent(_event: AttendanceAuditEvent) {}
  async loadAttendanceQueue(): Promise<AttendanceQueueSubmission[]> { return []; }
  async submitAttendance(_payload: AttendanceDeliveryPayload, _idempotencyKey: string): Promise<AttendanceQueueSubmission> {
    throw new Error('submitAttendance should not be called in this test.');
  }
  async retryAttendance(_submissionId: string): Promise<AttendanceQueueSubmission> {
    throw new Error('retryAttendance should not be called in this test.');
  }
}

class AnonymousAuthGateway {
  async loadSession() { return null; }
  async login() { return null; }
  async register() { return { success: false, confirmationRequired: false, adminGranted: false }; }
  async redeemAdminCode() { return false; }
  async logout() {}
}

describe('StaffDataService real-data boundary', () => {
  it('does not initialize or persist demonstration records when a Supabase snapshot is absent', async () => {
    const gateway = new EmptyRemoteStateGateway();
    const config: RuntimeConfig = { api: { mode: 'supabase', baseUrl: '', supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-test-key' } };
    TestBed.configureTestingModule({ providers: [
      StaffDataService,
      provideRuntimeConfig(config),
      { provide: APP_STATE_GATEWAY, useValue: gateway },
      { provide: AUTH_GATEWAY, useClass: AnonymousAuthGateway },
    ] });

    const service = TestBed.inject(StaffDataService);
    await waitUntil(() => service.isHydrated());

    expect(service.sites()).toEqual([]);
    expect(service.employees()).toEqual([]);
    expect(service.siteName()).toBe('');
    expect(service.dataLoadError()).toContain('No local or demonstration records were loaded');
    expect(gateway.saveCalls).toBe(0);
  });
});

async function waitUntil(predicate: () => boolean) {
  for (let attempt = 0; attempt < 20 && !predicate(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBeTrue();
}
