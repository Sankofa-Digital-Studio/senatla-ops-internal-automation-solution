import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OfficeAdminService } from './office-admin.service';
import { AuthService } from './auth.service';
import { OfficeAdminWorkspace } from '../models/office-admin.models';
import { TEST_APP_PROVIDERS } from '../../test-providers';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('Office workspace load recovery', () => {
  let service: OfficeAdminService;
  let loader: jasmine.Spy;
  let auth: { session: ReturnType<typeof signal<any>>; role: ReturnType<typeof signal<any>>; isReady: ReturnType<typeof signal<boolean>> };
  let snapshot: OfficeAdminWorkspace;
  const load = (scope: string | null) => (service as any).loadWorkspace(scope) as Promise<void>;

  beforeEach(() => {
    auth = { session: signal(null), role: signal('office'), isReady: signal(true) };
    TestBed.configureTestingModule({ providers: [...TEST_APP_PROVIDERS, { provide: AuthService, useValue: auth }] });
    service = TestBed.inject(OfficeAdminService);
    TestBed.tick();
    Object.defineProperty(service, 'supabase', { value: {} });
    snapshot = { ...(service as any).createDefaultWorkspace(), sites: [{ id: 'real-site', name: 'Live site', location: 'Yard', isActive: true }], assets: [], vendorAccounts: [], vendorInvoices: [] };
    loader = spyOn(service as any, 'loadFromSupabase').and.resolveTo(snapshot);
  });

  it('restores an existing plaintext workspace', () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue(JSON.stringify(snapshot));
    expect((service as any).loadFromLocal().sites).toEqual(snapshot.sites);
  });

  it('recovers from a malformed workspace cache', () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue('{invalid');
    expect((service as any).loadFromLocal().sites).toEqual((service as any).createDefaultWorkspace().sites);
  });

  it('recovers when browser storage denies reads', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('Storage unavailable');
    expect((service as any).loadFromLocal().sites).toEqual((service as any).createDefaultWorkspace().sites);
  });

  it('shows an unavailable state instead of demo records when the first load fails', async () => {
    loader.and.rejectWith(new Error('Network unavailable'));
    await load('user-a');
    expect(service.isHydrated()).toBeFalse();
    expect(service.isLoading()).toBeFalse();
    expect(service.sites()).toEqual([]);
    expect(service.assets()).toEqual([]);
    expect(service.error()).toContain('Please retry');
  });

  it('retains a successful snapshot after a failed refresh and clears the error on retry', async () => {
    await load('user-a');
    const sites = service.sites();
    loader.and.rejectWith(new Error('Network unavailable'));
    await load('user-a');
    expect(service.sites()).toBe(sites);
    expect(service.isHydrated()).toBeTrue();
    expect(service.error()).not.toBe('');
    loader.and.resolveTo({ ...snapshot, sites: [] });
    spyOn(service as any, 'currentWorkspaceScope').and.returnValue('user-a');
    await service.retryWorkspaceLoad();
    expect(service.error()).toBe('');
    expect(service.sites()).toEqual([]);
  });

  it('clears the old snapshot immediately on account change, even if the new load fails', async () => {
    await load('user-a');
    const next = deferred<OfficeAdminWorkspace>();
    loader.and.returnValue(next.promise);
    const loading = load('user-b');
    expect(service.sites()).toEqual([]);
    expect(service.isHydrated()).toBeFalse();
    next.reject(new Error('Unavailable'));
    await loading;
    expect(service.sites()).toEqual([]);
  });

  it('invalidates in-flight requests on logout and never queries while signed out', async () => {
    const next = deferred<OfficeAdminWorkspace>();
    loader.and.returnValue(next.promise);
    const loading = load('user-a');
    await load(null);
    next.resolve(snapshot);
    await loading;
    await service.retryWorkspaceLoad();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(service.sites()).toEqual([]);
    expect(service.isHydrated()).toBeFalse();
    expect(service.isLoading()).toBeFalse();
    expect(service.error()).toBe('');
  });

  it('ignores an old failure after a newer load succeeds', async () => {
    const old = deferred<OfficeAdminWorkspace>();
    loader.and.returnValue(old.promise);
    const loading = load('user-a');
    loader.and.resolveTo(snapshot);
    await load('user-b');
    old.reject(new Error('Old request failed'));
    await loading;
    expect(service.sites()[0].id).toBe('real-site');
    expect(service.error()).toBe('');
    expect(service.isHydrated()).toBeTrue();
  });

  it('clears retained data when authorization is rejected', async () => {
    await load('user-a');
    loader.and.rejectWith({ code: '42501', message: 'Permission denied' });
    await load('user-a');
    expect(service.sites()).toEqual([]);
    expect(service.isHydrated()).toBeFalse();
  });

  it('keys scope by user, organization, role and permitted sites, not token refresh', () => {
    auth.session.set({ userId: 'a', organizationId: 'org-a', permittedSiteIds: ['2', '1'] });
    const key = (service as any).currentWorkspaceScope();
    auth.session.set({ userId: 'a', organizationId: 'org-a', permittedSiteIds: ['1', '2'], issuedAt: 'later' });
    expect((service as any).currentWorkspaceScope()).toBe(key);
    auth.role.set('site');
    expect((service as any).currentWorkspaceScope()).not.toBe(key);
    auth.role.set('office');
    auth.session.set({ userId: 'a', organizationId: 'org-a', permittedSiteIds: ['1'] });
    expect((service as any).currentWorkspaceScope()).not.toBe(key);
  });

  it('does not start another retry while a load is in progress', async () => {
    const next = deferred<OfficeAdminWorkspace>();
    loader.and.returnValue(next.promise);
    const loading = load('user-a');
    await service.retryWorkspaceLoad();
    expect(loader).toHaveBeenCalledTimes(1);
    next.resolve(snapshot);
    await loading;
  });
  it('rejects malformed snapshots before changing any published collection', async () => {
    await load('user-a');
    const sites = service.sites();
    const users = service.users();
    loader.and.resolveTo({ ...snapshot, users: [{ id: 'partial-user' }], sites: undefined });
    await load('user-a');
    expect(service.users()).toBe(users);
    expect(service.sites()).toBe(sites);
    expect(service.error()).not.toBe('');
  });
  it('avoids a redundant full load on token refresh but reloads changed access', async () => {
    auth.session.set({ userId: 'a', organizationId: 'org-a', permittedSiteIds: ['1'] });
    TestBed.tick();
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(1);
    auth.session.set({ userId: 'a', organizationId: 'org-a', permittedSiteIds: ['1'], issuedAt: 'renewed' });
    TestBed.tick();
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(1);
    auth.role.set('site');
    TestBed.tick();
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(2);
    auth.session.set(null);
    TestBed.tick();
    expect(service.sites()).toEqual([]);
    expect(service.isHydrated()).toBeFalse();
  });
});
