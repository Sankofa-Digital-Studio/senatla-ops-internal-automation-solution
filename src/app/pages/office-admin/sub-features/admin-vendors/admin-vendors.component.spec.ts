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
      itemsPurchased: '',
      total: 0,
      responsiblePerson: '',
      invoiceDate: '2026-11-08',
    };
    await component.submitInvoice();
    expect(component.feedback()).toContain('Vendor, order number, and total amount are required.');
  });
});
