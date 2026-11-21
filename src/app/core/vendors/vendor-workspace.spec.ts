import { VendorWorkspace, vendorInvoicePayload, mapVendorInvoice } from './vendor-workspace';

const context = { now: '2026-11-16T10:00:00Z', createId: () => 'invoice-1', userId: 'office-1', displayName: 'Office' };
const invoiceInput = { vendorId: 'vendor-1', invoiceDate: '2026-11-16', orderNumber: 'legacy', invoiceNumber: ' INV-2 ', supplierOrderNumber: ' SUP-3 ', internalOrderNumber: ' INT-1 ', itemsPurchased: ' Filters ', total: 12.35, responsiblePerson: ' Officer ' };

describe('VendorWorkspace', () => {
  let workspace: VendorWorkspace;
  beforeEach(() => { workspace = new VendorWorkspace(); });

  it('preserves reference precedence, trimming and database payload fields', () => {
    const invoice = workspace.prepareInvoice(invoiceInput, context);
    expect(invoice.orderNumber).toBe('SUP-3');
    expect(invoice.invoiceNumber).toBe('INV-2');
    expect(invoice.internalOrderNumber).toBe('INT-1');
    expect(invoice.status).toBe('pending_director');
    expect(invoice.requestedBy).toBe('office-1');
    const payload = vendorInvoicePayload(invoice);
    expect(payload).toEqual({ id: 'invoice-1', organization_id: invoice.organizationId, vendor_id: 'vendor-1', invoice_date: '2026-11-16', order_number: 'SUP-3', invoice_number: 'INV-2', supplier_order_number: 'SUP-3', internal_order_number: 'INT-1', items_purchased: 'Filters', total: 12.35, responsible_person: 'Officer', status: 'pending_director', requested_by: 'office-1', requested_by_name: 'Office' });
    expect(mapVendorInvoice({ ...payload, director_reviewed_by: null, director_reviewed_at: null, created_at: context.now, updated_at: context.now })).toEqual(invoice);
  });

  it('accepts either supplier reference but requires the internal order and positive total', () => {
    expect(workspace.prepareInvoice({ ...invoiceInput, supplierOrderNumber: '' }, context).orderNumber).toBe('INV-2');
    expect(workspace.prepareInvoice({ ...invoiceInput, invoiceNumber: '' }, context).orderNumber).toBe('SUP-3');
    for (const change of [{ internalOrderNumber: '' }, { invoiceNumber: '', supplierOrderNumber: '' }, { total: 0 }, { total: -5 }]) {
      expect(() => workspace.prepareInvoice({ ...invoiceInput, ...change }, context)).toThrowError();
    }
    expect(workspace.invoices()).toEqual([]);
  });

  it('preserves creation dates, balances and approval replacement without adding the balance twice', () => {
    const account = workspace.prepareAccount({ id: 'vendor-1', name: ' Supplier ', description: '', isActive: true, totalOwingAmount: 0.1 }, { ...context, now: '2026-10-01T00:00:00Z' });
    workspace.recordAccount(account);
    const updated = workspace.prepareAccount({ ...account, name: 'Updated' }, context);
    expect(updated.createdAt).toBe(account.createdAt);
    workspace.recordAccount(updated);
    const invoice = workspace.prepareInvoice({ ...invoiceInput, total: 0.2 }, context);
    workspace.recordInvoice(invoice);
    expect(workspace.totalOwing()).toBe(0.3);
    expect(workspace.pendingInvoices().length).toBe(1);
    workspace.replaceInvoice({ ...invoice, status: 'approved' });
    expect(workspace.totalOwing()).toBe(0.3);
    expect(workspace.invoices().length).toBe(1);
    expect(workspace.pendingInvoices().length).toBe(0);
    workspace.accounts.set([]);
    workspace.invoices.set([]);
    expect(workspace.totalOwing()).toBe(0);
  });
});
