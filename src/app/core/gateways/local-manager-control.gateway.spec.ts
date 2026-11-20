import { LocalManagerControlGateway } from './local-manager-control.gateway';
import { ManagerControlState } from './manager-control.gateway';

describe('LocalManagerControlGateway', () => {
  beforeEach(() => localStorage.clear());

  it('keeps manager state isolated by site and work date', async () => {
    const gateway = new LocalManagerControlGateway();
    const state: ManagerControlState = {
      managerMode: 'workshop', shiftObjective: 'Complete the repair', shiftTopRisk: 'Material delay', shiftSupport: 'Office confirmation', handoverNote: 'Carry the inspection forward',
      workshopWorkItems: [{ id: 'work-1', title: 'Repair pump', workstation: 'Bay 2', assignedEmployeeId: 'employee-1', dueDate: '2026-11-18', status: 'queued' }],
      operationalBlockers: [], workstationReadiness: { machine: true, tools: true, materials: false, operator: true, instruction: true, inspection: false },
    };

    await gateway.save({ siteId: 'site-a', workDate: '2026-11-18' }, state);

    expect(await gateway.load({ siteId: 'site-a', workDate: '2026-11-18' })).toEqual({ ...state, version: 1 });
    expect(await gateway.load({ siteId: 'site-b', workDate: '2026-11-18' })).toBeNull();
    expect(await gateway.load({ siteId: 'site-a', workDate: '2026-11-19' })).toBeNull();
  });

  it('reads the Phase 1 storage key during local review migration', async () => {
    const gateway = new LocalManagerControlGateway();
    localStorage.setItem('senatla_site_manager_phase1:site-a:2026-11-18', JSON.stringify({ managerMode: 'site', shiftObjective: 'Legacy plan', shiftTopRisk: '', shiftSupport: '', handoverNote: '', workshopWorkItems: [], operationalBlockers: [], workstationReadiness: { machine: false, tools: false, materials: false, operator: false, instruction: false, inspection: false } }));

    expect((await gateway.load({ siteId: 'site-a', workDate: '2026-11-18' }))?.shiftObjective).toBe('Legacy plan');
  });
});
