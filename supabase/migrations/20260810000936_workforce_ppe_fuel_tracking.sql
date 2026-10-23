create table public.employee_onboarding_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  employee_id uuid not null references public.employees(id) on delete cascade,
  criminal_check_status text not null default 'pending' check (criminal_check_status in ('pending','clear','review','failed')),
  fingerprint_check_status text not null default 'pending' check (fingerprint_check_status in ('pending','clear','review','failed')),
  medical_status text not null default 'pending' check (medical_status in ('pending','fit','restricted','unfit')),
  red_ticket_number text,
  red_ticket_issued_at date,
  red_ticket_expires_at date,
  notes text not null default '',
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id),
  check (red_ticket_expires_at is null or red_ticket_issued_at is null or red_ticket_expires_at >= red_ticket_issued_at)
);

create table public.ppe_issue_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  employee_id uuid not null references public.employees(id) on delete cascade,
  item_type text not null check (item_type in ('overall_pants','overall_jacket','safety_boots')),
  brand text,
  size text not null check (length(trim(size)) > 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  order_date date,
  collection_date date,
  status text not null default 'requested' check (status in ('requested','ordered','ready','collected')),
  requested_at timestamptz not null default now(),
  office_confirmed_at timestamptz,
  office_confirmed_by uuid references auth.users(id),
  employee_confirmed_at timestamptz,
  employee_confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (collection_date is null or order_date is null or collection_date >= order_date),
  check ((office_confirmed_at is null) = (office_confirmed_by is null)),
  check ((employee_confirmed_at is null) = (employee_confirmed_by is null))
);

create table public.asset_fuel_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  asset_id uuid not null references public.assets(id) on delete cascade,
  fuel_date date not null,
  litres numeric(12,3) not null check (litres > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  total_cost numeric(14,2) generated always as (round(litres * unit_cost, 2)) stored,
  odometer_km numeric(14,1) check (odometer_km is null or odometer_km >= 0),
  engine_hours numeric(14,1) check (engine_hours is null or engine_hours >= 0),
  supplier text,
  reference_number text,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index employee_onboarding_employee_idx on public.employee_onboarding_records(employee_id);
create index ppe_issue_employee_status_idx on public.ppe_issue_records(employee_id, status);
create index ppe_issue_order_date_idx on public.ppe_issue_records(organization_id, order_date desc);
create index asset_fuel_asset_date_idx on public.asset_fuel_entries(asset_id, fuel_date desc);
create index asset_fuel_org_date_idx on public.asset_fuel_entries(organization_id, fuel_date desc);

alter table public.employee_onboarding_records enable row level security;
alter table public.ppe_issue_records enable row level security;
alter table public.asset_fuel_entries enable row level security;

grant select, insert, update on public.employee_onboarding_records to authenticated;
grant select, insert, update on public.ppe_issue_records to authenticated;
grant select, insert on public.asset_fuel_entries to authenticated;

create policy employee_onboarding_read on public.employee_onboarding_records for select to authenticated
using (organization_id = private.current_organization_id() and private.current_app_role() in ('office','director'));
create policy employee_onboarding_write on public.employee_onboarding_records for insert to authenticated
with check (organization_id = private.current_organization_id() and private.current_app_role() = 'office' and updated_by = (select auth.uid()));
create policy employee_onboarding_update on public.employee_onboarding_records for update to authenticated
using (organization_id = private.current_organization_id() and private.current_app_role() = 'office')
with check (organization_id = private.current_organization_id() and private.current_app_role() = 'office' and updated_by = (select auth.uid()));

create policy ppe_issue_read on public.ppe_issue_records for select to authenticated
using (organization_id = private.current_organization_id() and private.current_app_role() in ('office','director'));
create policy ppe_issue_insert on public.ppe_issue_records for insert to authenticated
with check (organization_id = private.current_organization_id() and private.current_app_role() = 'office');
create policy ppe_issue_update on public.ppe_issue_records for update to authenticated
using (organization_id = private.current_organization_id() and private.current_app_role() = 'office')
with check (organization_id = private.current_organization_id() and private.current_app_role() = 'office');

create policy asset_fuel_read on public.asset_fuel_entries for select to authenticated
using (organization_id = private.current_organization_id() and private.can_manage_asset(asset_id, organization_id));
create policy asset_fuel_insert on public.asset_fuel_entries for insert to authenticated
with check (organization_id = private.current_organization_id() and recorded_by = (select auth.uid()) and private.can_manage_asset(asset_id, organization_id));
