import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminVendorsComponent } from './admin-vendors.component';
import { TEST_APP_PROVIDERS } from '../../../../test-providers';

describe('AdminVendorsComponent', () => {
  let fixture: ComponentFixture<AdminVendorsComponent>;
  let component: AdminVendorsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminVendorsComponent],
      providers: [...TEST_APP_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminVendorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders log invoice form and captured invoices header', () => {
    expect(component).toBeTruthy();
    const h2s = fixture.nativeElement.querySelectorAll('h2');
    const titles = Array.from(h2s).map((h: any) => h.textContent.trim());
    expect(titles).toContain('Log Vendor Invoice');
    expect(titles).toContain('Captured Invoices');
  });

  it('validates required fields before submitting invoice', async () => {
    component.invoiceForm = {
      vendorId: '',
      orderNumber: '',
      invoiceNumber: '',
      supplierOrderNumber: '',
      itemsPurchased: '',
      total: 0,
      responsiblePerson: '',
      invoiceDate: '2026-11-08',
    };
    await component.submitInvoice();
    expect(component.feedback()).toContain('Vendor, order number, and total amount are required.');
  });
  it('sends the internal PO and supplier reference required by the command', async () => {
    const submit = spyOn(component.service, 'submitVendorInvoice').and.resolveTo({} as any);
    component.invoiceForm = { vendorId: 'vendor-1', orderNumber: 'INT-12', invoiceNumber: '', supplierOrderNumber: 'SUP-77', itemsPurchased: 'Filters', total: 100, responsiblePerson: 'Office', invoiceDate: '2026-11-16' };
    await component.submitInvoice();
    expect(submit).toHaveBeenCalledOnceWith(jasmine.objectContaining({ internalOrderNumber: 'INT-12', supplierOrderNumber: 'SUP-77', total: 100 }));
    expect(component.feedback()).toBe('Vendor invoice recorded successfully.');
    expect(component.invoiceForm.supplierOrderNumber).toBe('');
  });

  it('retains entered references after a failed save and prevents concurrent submission', async () => {
    const submit = spyOn(component.service, 'submitVendorInvoice').and.rejectWith(new Error('Save failed'));
    component.invoiceForm = { vendorId: 'vendor-1', orderNumber: 'INT-12', invoiceNumber: 'INV-4', supplierOrderNumber: '', itemsPurchased: 'Filters', total: 100, responsiblePerson: 'Office', invoiceDate: '2026-11-16' };
    component.busy.set(true);
    await component.submitInvoice();
    expect(submit).not.toHaveBeenCalled();
    component.busy.set(false);
    await component.submitInvoice();
    expect(component.invoiceForm.orderNumber).toBe('INT-12');
    expect(component.feedback()).toBe('Save failed');
    expect(component.busy()).toBeFalse();
  });
});
