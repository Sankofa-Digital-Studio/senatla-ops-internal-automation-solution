alter table public.employees
  add column if not exists company_number text,
  add column if not exists designation text,
  add column if not exists pay_rate_unit text not null default 'daily',
  add column if not exists safety_qualifications text[] not null default '{}',
  add column if not exists additional_fields jsonb not null default '{}'::jsonb;

alter table public.employees
  add constraint employees_pay_rate_unit_check check (pay_rate_unit in ('hourly', 'daily', 'monthly'));

create unique index if not exists employees_organization_company_number_uidx
  on public.employees (organization_id, lower(company_number))
  where company_number is not null and btrim(company_number) <> '';
