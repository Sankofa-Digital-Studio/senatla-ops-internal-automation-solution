import { computed, signal } from '@angular/core';
import { SENATLA_TRADING_ORGANIZATION_ID, VendorAccount, VendorInvoiceRecord } from '../models/app.models';

export type VendorAccountInput = Omit<VendorAccount, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> & { id?: string };
export type VendorInvoiceInput = Omit<VendorInvoiceRecord, 'id' | 'organizationId' | 'status' | 'requestedBy' | 'requestedByName' | 'directorReviewedBy' | 'directorReviewedAt' | 'createdAt' | 'updatedAt'> & { id?: string };
export type VendorAccountRow = { id: string; organization_id: string; name: string; description: string; tax_number: string | null; is_active: boolean; total_owing_amount: number; created_at: string; updated_at: string };
export type VendorInvoiceRow = { id: string; organization_id: string; vendor_id: string; invoice_date: string; order_number: string; invoice_number: string | null; supplier_order_number: string | null; internal_order_number: string | null; items_purchased: string; total: number; responsible_person: string; status: VendorInvoiceRecord['status']; requested_by: string; requested_by_name: string; director_reviewed_by: string | null; director_reviewed_at: string | null; created_at: string; updated_at: string };

type CommandContext = { now: string; createId: () => string };
type InvoiceContext = CommandContext & { userId: string; displayName: string };

/** Vendor state and rules; the office coordinator retains persistence, approvals and audit ordering. */
export class VendorWorkspace {
  readonly accounts = signal<VendorAccount[]>([]);
  readonly invoices = signal<VendorInvoiceRecord[]>([]);
  readonly pendingInvoices = computed(() => this.invoices().filter((invoice) => invoice.status === 'pending_director'));
  readonly totalOwing = computed(() => this.accounts().reduce((total, vendor) => total + vendor.totalOwingAmount, 0));

  prepareAccount(record: VendorAccountInput, context: CommandContext): VendorAccount {
    const now = context.now;
    const normalized: VendorAccount = {
      id: record.id || context.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      name: record.name.trim(),
      description: record.description.trim(),
      taxNumber: record.taxNumber?.trim() || undefined,
      isActive: record.isActive !== false,
      totalOwingAmount: Math.max(0, Number(record.totalOwingAmount) || 0),
      createdAt: this.accounts().find((vendor) => vendor.id === record.id)?.createdAt || now,
      updatedAt: now,
    };
    if (!normalized.name) throw new Error('Vendor name is required.');
    return normalized;
  }

  prepareInvoice(record: VendorInvoiceInput, context: InvoiceContext): VendorInvoiceRecord {
    const total = Math.max(0, Number(record.total) || 0);
    const now = context.now;
    const normalized: VendorInvoiceRecord = {
      id: record.id || context.createId(),
      organizationId: SENATLA_TRADING_ORGANIZATION_ID,
      vendorId: record.vendorId,
      invoiceDate: record.invoiceDate,
      orderNumber: (record.supplierOrderNumber || record.invoiceNumber || record.orderNumber).trim(),
      invoiceNumber: record.invoiceNumber?.trim() || undefined,
      supplierOrderNumber: record.supplierOrderNumber?.trim() || undefined,
      internalOrderNumber: record.internalOrderNumber?.trim() || undefined,
      itemsPurchased: record.itemsPurchased.trim(),
      total,
      responsiblePerson: record.responsiblePerson.trim(),
      status: 'pending_director',
      requestedBy: context.userId,
      requestedByName: context.displayName,
      directorReviewedBy: null,
      directorReviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    if (!normalized.invoiceDate || !normalized.internalOrderNumber || !(normalized.invoiceNumber || normalized.supplierOrderNumber) || !normalized.itemsPurchased || !normalized.responsiblePerson || total <= 0) {
      throw new Error('Invoice date, internal order number, supplier invoice or order reference, items, requester, and total are required.');
    }
    return normalized;
  }

  recordAccount(account: VendorAccount): void {
    this.accounts.update((accounts) => [account, ...accounts.filter((entry) => entry.id !== account.id)]);
  }

  recordInvoice(invoice: VendorInvoiceRecord): void {
    this.replaceInvoice(invoice);
    this.accounts.update((accounts) => accounts.map((entry) => entry.id === invoice.vendorId
      ? { ...entry, totalOwingAmount: Number((entry.totalOwingAmount + invoice.total).toFixed(2)), updatedAt: invoice.updatedAt }
      : entry));
  }

  replaceInvoice(invoice: VendorInvoiceRecord): void {
    this.invoices.update((invoices) => [invoice, ...invoices.filter((entry) => entry.id !== invoice.id)]);
  }
}

export function vendorAccountPayload(normalized: VendorAccount) {
  return {
    id: normalized.id,
    organization_id: normalized.organizationId,
    name: normalized.name,
    description: normalized.description,
    tax_number: normalized.taxNumber || null,
    is_active: normalized.isActive !== false,
    total_owing_amount: normalized.totalOwingAmount,
  };
}

export function vendorInvoicePayload(normalized: VendorInvoiceRecord) {
  return {
    id: normalized.id,
    organization_id: normalized.organizationId,
    vendor_id: normalized.vendorId,
    invoice_date: normalized.invoiceDate,
    order_number: normalized.orderNumber,
    invoice_number: normalized.invoiceNumber || null,
    supplier_order_number: normalized.supplierOrderNumber || null,
    internal_order_number: normalized.internalOrderNumber || null,
    items_purchased: normalized.itemsPurchased,
    total: normalized.total,
    responsible_person: normalized.responsiblePerson,
    status: normalized.status,
    requested_by: normalized.requestedBy,
    requested_by_name: normalized.requestedByName,
  };
}

export function mapVendorAccount(row: VendorAccountRow): VendorAccount {
  return { id: row.id, organizationId: row.organization_id, name: row.name, description: row.description || '', taxNumber: row.tax_number || undefined, isActive: row.is_active, totalOwingAmount: Number(row.total_owing_amount || 0), createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapVendorInvoice(row: VendorInvoiceRow): VendorInvoiceRecord {
  return { id: row.id, organizationId: row.organization_id, vendorId: row.vendor_id, invoiceDate: row.invoice_date, orderNumber: row.order_number, invoiceNumber: row.invoice_number || undefined, supplierOrderNumber: row.supplier_order_number || undefined, internalOrderNumber: row.internal_order_number || undefined, itemsPurchased: row.items_purchased, total: Number(row.total || 0), responsiblePerson: row.responsible_person, status: row.status, requestedBy: row.requested_by, requestedByName: row.requested_by_name, directorReviewedBy: row.director_reviewed_by, directorReviewedAt: row.director_reviewed_at, createdAt: row.created_at, updatedAt: row.updated_at };
}

