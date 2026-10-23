alter table public.vendor_accounts
  add column if not exists tax_number text,
  add column if not exists is_active boolean not null default true;

alter table public.vendor_invoice_records
  add column if not exists invoice_number text,
  add column if not exists supplier_order_number text,
  add column if not exists internal_order_number text;

alter table public.vendor_invoice_records
  add constraint vendor_invoice_reference_required
  check (
    nullif(trim(coalesce(invoice_number, '')), '') is not null
    or nullif(trim(coalesce(supplier_order_number, '')), '') is not null
    or nullif(trim(coalesce(order_number, '')), '') is not null
  ) not valid;

create unique index if not exists vendor_accounts_org_tax_number_uidx
  on public.vendor_accounts (organization_id, lower(regexp_replace(coalesce(tax_number, ''), '[^a-zA-Z0-9]', '', 'g')))
  where nullif(trim(coalesce(tax_number, '')), '') is not null;

create unique index if not exists vendor_invoice_org_vendor_invoice_number_uidx
  on public.vendor_invoice_records (organization_id, vendor_id, lower(invoice_number))
  where nullif(trim(coalesce(invoice_number, '')), '') is not null;

create unique index if not exists vendor_invoice_org_fallback_duplicate_uidx
  on public.vendor_invoice_records (organization_id, vendor_id, invoice_date, total, internal_order_number)
  where nullif(trim(coalesce(invoice_number, '')), '') is null and nullif(trim(coalesce(internal_order_number, '')), '') is not null;

create index if not exists vendor_invoice_org_internal_order_idx
  on public.vendor_invoice_records (organization_id, internal_order_number)
  where nullif(trim(coalesce(internal_order_number, '')), '') is not null;
