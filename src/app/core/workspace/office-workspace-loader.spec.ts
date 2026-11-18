import type { SupabaseClient } from '@supabase/supabase-js';
import { loadOfficeWorkspaceRows, OFFICE_WORKSPACE_QUERIES } from './office-workspace-loader';

describe('office workspace request contract', () => {
  const rows = () => Object.fromEntries(OFFICE_WORKSPACE_QUERIES.map(({ table }) => [table, []]));
  it('loads all collections in one RPC without individual table requests', async () => {
    const snapshot = rows();
    const rpc = jasmine.createSpy().and.resolveTo({ data: snapshot, error: null });
    const from = jasmine.createSpy();
    expect(await loadOfficeWorkspaceRows({ rpc, from } as unknown as SupabaseClient)).toBe(snapshot);
    expect(rpc).toHaveBeenCalledOnceWith('office_workspace_snapshot_v1');
    expect(from).not.toHaveBeenCalled();
  });

  it('uses legacy reads only when the snapshot RPC is absent during rollout', async () => {
    const chain: any = { select: () => chain, order: () => chain, limit: () => Promise.resolve({ data: [], error: null }) };
    const from = jasmine.createSpy().and.returnValue(chain);
    const rpc = jasmine.createSpy().and.resolveTo({ data: null, error: { code: 'PGRST202' } });
    expect(await loadOfficeWorkspaceRows({ rpc, from } as unknown as SupabaseClient)).toEqual(rows());
    expect(from.calls.count()).toBe(26);
  });

  it('does not retry individual reads for authorization or database failures', async () => {
    for (const code of ['42501', 'PGRST301', '57014']) {
      const error = { code };
      const from = jasmine.createSpy();
      const rpc = jasmine.createSpy().and.resolveTo({ data: null, error });
      await expectAsync(loadOfficeWorkspaceRows({ rpc, from } as unknown as SupabaseClient)).toBeRejectedWith(error);
      expect(from).not.toHaveBeenCalled();
    }
  });

  it('rejects partial snapshots without representing omitted collections as empty', async () => {
    const rpc = jasmine.createSpy().and.resolveTo({ data: { profiles: [] }, error: null });
    await expectAsync(loadOfficeWorkspaceRows({ rpc } as unknown as SupabaseClient)).toBeRejectedWithError('Workspace response is incomplete.');
  });
});
