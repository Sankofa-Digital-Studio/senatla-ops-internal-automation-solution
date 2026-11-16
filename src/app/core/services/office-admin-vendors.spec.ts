import { TestBed } from '@angular/core/testing';
import { OfficeAdminService } from './office-admin.service';
import { TEST_APP_PROVIDERS } from '../../test-providers';

const input = { vendorId: 'vendor-1', invoiceDate: '2026-11-16', orderNumber: 'INT-1', invoiceNumber: 'INV-2', internalOrderNumber: 'INT-1', itemsPurchased: 'Filters', total: 100, responsiblePerson: 'Office' };

describe('Office vendor command coordination', () => {
  let service: OfficeAdminService;
  let calls: string[];
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_APP_PROVIDERS] });
    service = TestBed.inject(OfficeAdminService);
    calls = [];
    spyOn((service as any).auth, 'currentSession').and.returnValue({ userId: 'office-1', displayName: 'Office' });
    service.vendorAccounts.set([{ id: 'vendor-1', name: 'Supplier', totalOwingAmount: 25 } as any]);
    spyOn(service as any, 'persistLocalWorkspace').and.callFake(async () => { calls.push('persist'); });
    spyOn(service, 'submitApprovalRequest').and.callFake(async () => { calls.push('approval'); return {} as any; });
    spyOn(service as any, 'logActivity').and.callFake(async () => { calls.push('audit'); });
  });

  it('persists one invoice before one approval and one audit event', async () => {
    const invoice = await service.submitVendorInvoice(input);
    expect(calls).toEqual(['persist', 'approval', 'audit']);
    expect(service.vendorInvoices()).toEqual([invoice]);
    expect(service.totalVendorOwing()).toBe(125);
    expect(service.submitApprovalRequest).toHaveBeenCalledOnceWith('vendor_invoice_approval', { invoiceId: invoice.id, vendorId: 'vendor-1', total: 100, orderNumber: 'INV-2', vendorName: 'Supplier' });
  });

  it('does not mutate state or submit approvals when the database insert fails', async () => {
    Object.defineProperty(service, 'supabase', { value: { from: () => ({ insert: async () => ({ error: new Error('Database rejected invoice') }) }) } });
    await expectAsync(service.submitVendorInvoice(input)).toBeRejectedWithError('Database rejected invoice');
    expect(service.vendorInvoices()).toEqual([]);
    expect(service.totalVendorOwing()).toBe(25);
    expect(calls).toEqual([]);
  });
});
