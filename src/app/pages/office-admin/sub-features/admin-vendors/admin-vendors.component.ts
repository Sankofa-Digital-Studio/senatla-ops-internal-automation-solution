import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfficeAdminService } from '../../../../core/services/office-admin.service';
import { VendorAccount, VendorInvoiceRecord, VendorInvoiceStatus } from '../../../../core/models/app.models';
import { ErpStatusBadgeComponent, ErpStatusVariant } from '../../../../components/erp/erp-status-badge.component';

@Component({
  selector: 'app-admin-vendors',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, ErpStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-vendors.component.html',
})
export class AdminVendorsComponent {
  readonly service = inject(OfficeAdminService);

  readonly busy = signal<boolean>(false);
  readonly feedback = signal<string>('');
  readonly selectedVendorId = signal<string>('');

  invoiceForm: {
    vendorId: string;
    orderNumber: string;
    invoiceNumber: string;
    itemsPurchased: string;
    total: number;
    responsiblePerson: string;
    invoiceDate: string;
  } = {
    vendorId: '',
    orderNumber: '',
    invoiceNumber: '',
    itemsPurchased: '',
    total: 0,
    responsiblePerson: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
  };

  readonly filteredInvoices = computed(() => {
    const vId = this.selectedVendorId();
    return this.service.vendorInvoices().filter((inv) => !vId || inv.vendorId === vId);
  });

  statusVariant(status: VendorInvoiceStatus): ErpStatusVariant {
    switch (status) {
      case 'paid':
        return 'success';
      case 'approved':
        return 'info';
      case 'rejected':
        return 'danger';
      case 'pending_director':
      default:
        return 'warning';
    }
  }

  vendorName(vendorId: string): string {
    const v = this.service.vendorAccounts().find((acc) => acc.id === vendorId);
    return v ? v.name : 'Unknown Vendor';
  }

  async submitInvoice(): Promise<void> {
    if (!this.invoiceForm.vendorId || !this.invoiceForm.orderNumber || !this.invoiceForm.total) {
      this.feedback.set('Vendor, order number, and total amount are required.');
      return;
    }

    this.busy.set(true);
    try {
      await this.service.submitVendorInvoice({
        vendorId: this.invoiceForm.vendorId,
        orderNumber: this.invoiceForm.orderNumber,
        invoiceNumber: this.invoiceForm.invoiceNumber,
        itemsPurchased: this.invoiceForm.itemsPurchased,
        total: Number(this.invoiceForm.total),
        responsiblePerson: this.invoiceForm.responsiblePerson,
        invoiceDate: this.invoiceForm.invoiceDate,
      });
      this.feedback.set('Vendor invoice recorded successfully.');
      this.invoiceForm = {
        vendorId: '',
        orderNumber: '',
        invoiceNumber: '',
        itemsPurchased: '',
        total: 0,
        responsiblePerson: '',
        invoiceDate: new Date().toISOString().slice(0, 10),
      };
    } catch (err: any) {
      this.feedback.set(err.message || 'Failed to submit invoice.');
    } finally {
      this.busy.set(false);
    }
  }
}
