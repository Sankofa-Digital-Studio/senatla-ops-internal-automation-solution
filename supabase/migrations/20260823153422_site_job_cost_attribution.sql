begin;

alter table public.ppe_issue_records
  add column if not exists attribution_site_id uuid references public.sites(id) on delete restrict,
  add column if not exists job_number_snapshot text,
  add column if not exists currency_code text not null default 'ZAR' check (currency_code ~ '^[A-Z]{3}$');

alter table public.asset_fuel_entries
  add column if not exists attribution_site_id uuid references public.sites(id) on delete restrict,
  add column if not exists job_number_snapshot text,
  add column if not exists currency_code text not null default 'ZAR' check (currency_code ~ '^[A-Z]{3}$');

alter table public.asset_work_orders
  add column if not exists attribution_site_id uuid references public.sites(id) on delete restrict,
  add column if not exists job_number_snapshot text,
  add column if not exists currency_code text not null default 'ZAR' check (currency_code ~ '^[A-Z]{3}$');

alter table public.vendor_invoice_records
  add column if not exists site_allocations jsonb not null default '[]'::jsonb,
  add column if not exists currency_code text not null default 'ZAR' check (currency_code ~ '^[A-Z]{3}$'),
  add constraint vendor_invoice_site_allocations_array check (jsonb_typeof(site_allocations) = 'array');

create index if not exists ppe_cost_period_idx
  on public.ppe_issue_records (organization_id, order_date, status);
create index if not exists fuel_cost_attribution_idx
  on public.asset_fuel_entries (organization_id, attribution_site_id, fuel_date);
create index if not exists work_order_cost_period_idx
  on public.asset_work_orders (organization_id, completed_at, status);
create index if not exists vendor_invoice_cost_period_idx
  on public.vendor_invoice_records (organization_id, invoice_date, status);

create or replace function private.prepare_ppe_cost_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_site public.sites%rowtype;
begin
  if tg_op = 'INSERT' then
    select site.* into source_site
    from public.employees employee
    join public.sites site on site.id = employee.site_id
    where employee.id = new.employee_id
      and employee.organization_id = new.organization_id
      and site.organization_id = new.organization_id;
    if source_site.id is null then raise exception 'Employee cost site is invalid' using errcode = '23514'; end if;
    new.attribution_site_id := source_site.id;
    new.job_number_snapshot := nullif(btrim(source_site.job_number), '');
    new.currency_code := 'ZAR';
  else
    if new.organization_id is distinct from old.organization_id
       or new.employee_id is distinct from old.employee_id
       or new.attribution_site_id is distinct from old.attribution_site_id
       or new.job_number_snapshot is distinct from old.job_number_snapshot
       or new.currency_code is distinct from old.currency_code then
      raise exception 'PPE cost attribution snapshots are immutable';
    end if;
    if old.status in ('ordered','ready','collected')
       and (new.unit_cost is distinct from old.unit_cost or new.order_date is distinct from old.order_date) then
      raise exception 'Ordered PPE cost fields are immutable';
    end if;
    if old.status = 'collected' and new.status is distinct from old.status then
      raise exception 'Collected PPE records are terminal';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.prepare_fuel_cost_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_site public.sites%rowtype;
begin
  select site.* into source_site
  from public.assets asset
  join public.sites site on site.id = asset.assigned_site_id
  where asset.id = new.asset_id
    and asset.organization_id = new.organization_id
    and site.organization_id = new.organization_id;
  if source_site.id is null then raise exception 'Asset cost site is invalid' using errcode = '23514'; end if;
  new.attribution_site_id := source_site.id;
  new.job_number_snapshot := nullif(btrim(source_site.job_number), '');
  new.currency_code := 'ZAR';
  return new;
end;
$$;

create or replace function private.prepare_work_order_cost_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_site public.sites%rowtype;
begin
  if tg_op = 'INSERT' then
    select site.* into source_site
    from public.assets asset
    join public.sites site on site.id = asset.assigned_site_id
    where asset.id = new.asset_id
      and asset.organization_id = new.organization_id
      and site.organization_id = new.organization_id;
    if source_site.id is null then raise exception 'Asset cost site is invalid' using errcode = '23514'; end if;
    new.attribution_site_id := source_site.id;
    new.job_number_snapshot := nullif(btrim(source_site.job_number), '');
    new.currency_code := 'ZAR';
  else
    if new.organization_id is distinct from old.organization_id
       or new.asset_id is distinct from old.asset_id
       or new.attribution_site_id is distinct from old.attribution_site_id
       or new.job_number_snapshot is distinct from old.job_number_snapshot
       or new.currency_code is distinct from old.currency_code then
      raise exception 'Work-order cost attribution snapshots are immutable';
    end if;
    if old.status in ('completed','cancelled') and new.status is distinct from old.status then
      raise exception 'Completed or cancelled work orders are terminal';
    end if;
    if old.status = 'completed'
       and (new.cost is distinct from old.cost or new.completed_at is distinct from old.completed_at) then
      raise exception 'Completed work-order cost fields are immutable';
    end if;
  end if;
  if new.status = 'completed' and new.completed_at is null then
    raise exception 'Completed work orders require completed_at' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.normalize_vendor_site_allocations(
  p_organization_id uuid,
  p_allocations jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized jsonb;
  allocation_count integer;
  distinct_site_count integer;
  ratio_total numeric;
begin
  if jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'Vendor site allocations must be an array' using errcode = '23514';
  end if;
  if jsonb_array_length(p_allocations) = 0 then return '[]'::jsonb; end if;

  begin
    with parsed as (
      select (entry ->> 'siteId')::uuid as site_id, (entry ->> 'ratio')::numeric as ratio
      from jsonb_array_elements(p_allocations) entry
    ), validated as (
      select parsed.site_id, parsed.ratio, site.job_number
      from parsed
      join public.sites site on site.id = parsed.site_id and site.organization_id = p_organization_id
      where parsed.ratio > 0 and parsed.ratio <= 1
    )
    select jsonb_agg(jsonb_build_object('siteId', site_id, 'jobNumber', nullif(btrim(job_number), ''), 'ratio', ratio) order by site_id),
           count(*), count(distinct site_id), sum(ratio)
      into normalized, allocation_count, distinct_site_count, ratio_total
    from validated;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Vendor site allocation contains an invalid siteId or ratio' using errcode = '23514';
  end;

  if allocation_count <> jsonb_array_length(p_allocations)
     or distinct_site_count <> allocation_count
     or ratio_total > 1 then
    raise exception 'Vendor site allocations must use unique organization sites and total no more than 1' using errcode = '23514';
  end if;
  return coalesce(normalized, '[]'::jsonb);
end;
$$;

create or replace function private.guard_vendor_invoice_cost_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare actor_role public.app_role;
begin
  if auth.uid() is not null and not private.auth_session_is_current() then
    raise insufficient_privilege using message = 'Active authenticated session required';
  end if;
  actor_role := private.current_app_role();
  if tg_op = 'INSERT' then
    new.site_allocations := private.normalize_vendor_site_allocations(new.organization_id, new.site_allocations);
    new.currency_code := 'ZAR';
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id
     or new.vendor_id is distinct from old.vendor_id
     or new.invoice_date is distinct from old.invoice_date
     or new.order_number is distinct from old.order_number
     or new.items_purchased is distinct from old.items_purchased
     or new.total is distinct from old.total
     or new.responsible_person is distinct from old.responsible_person
     or new.requested_by is distinct from old.requested_by
     or new.requested_by_name is distinct from old.requested_by_name
     or new.currency_code is distinct from old.currency_code then
    raise exception 'Vendor invoice commercial fields are immutable';
  end if;

  if new.site_allocations is distinct from old.site_allocations then
    if old.status <> 'pending_director' or new.status <> old.status or actor_role <> 'office' then
      raise exception 'Only Office may attribute a pending vendor invoice';
    end if;
    new.site_allocations := private.normalize_vendor_site_allocations(new.organization_id, new.site_allocations);
  end if;

  if new.status is distinct from old.status then
    if actor_role <> 'director' then raise insufficient_privilege using message = 'Director decision required'; end if;
    if not ((old.status = 'pending_director' and new.status in ('approved','rejected'))
            or (old.status = 'approved' and new.status = 'paid')) then
      raise exception 'Invalid vendor invoice status transition' using errcode = '23514';
    end if;
    if old.status = 'pending_director' then
      if auth.uid() = old.requested_by then raise exception 'Maker-checker requires a different reviewer' using errcode = '23514'; end if;
      new.director_reviewed_by := auth.uid();
      new.director_reviewed_at := timezone('utc', now());
    end if;
  elsif new.director_reviewed_by is distinct from old.director_reviewed_by
        or new.director_reviewed_at is distinct from old.director_reviewed_at then
    raise exception 'Vendor invoice reviewer evidence is server controlled';
  end if;
  return new;
end;
$$;

revoke all on function private.prepare_ppe_cost_snapshot() from public, anon, authenticated;
revoke all on function private.prepare_fuel_cost_snapshot() from public, anon, authenticated;
revoke all on function private.prepare_work_order_cost_snapshot() from public, anon, authenticated;
revoke all on function private.normalize_vendor_site_allocations(uuid,jsonb) from public, anon, authenticated;
revoke all on function private.guard_vendor_invoice_cost_state() from public, anon, authenticated;

drop trigger if exists ppe_cost_snapshot_guard on public.ppe_issue_records;
create trigger ppe_cost_snapshot_guard before insert or update on public.ppe_issue_records
for each row execute function private.prepare_ppe_cost_snapshot();
drop trigger if exists fuel_cost_snapshot_guard on public.asset_fuel_entries;
create trigger fuel_cost_snapshot_guard before insert on public.asset_fuel_entries
for each row execute function private.prepare_fuel_cost_snapshot();
drop trigger if exists work_order_cost_snapshot_guard on public.asset_work_orders;
create trigger work_order_cost_snapshot_guard before insert or update on public.asset_work_orders
for each row execute function private.prepare_work_order_cost_snapshot();
drop trigger if exists vendor_invoice_cost_state_guard on public.vendor_invoice_records;
create trigger vendor_invoice_cost_state_guard before insert or update on public.vendor_invoice_records
for each row execute function private.guard_vendor_invoice_cost_state();

drop policy if exists vendor_invoice_attribution_update on public.vendor_invoice_records;
create policy vendor_invoice_attribution_update on public.vendor_invoice_records for update to authenticated
using (organization_id = private.current_organization_id() and private.current_app_role() = 'office' and status = 'pending_director')
with check (organization_id = private.current_organization_id() and private.current_app_role() = 'office' and status = 'pending_director');

create or replace function public.reconcile_site_job_costs(
  p_period_start date,
  p_period_end_exclusive date,
  p_site_id uuid default null
)
returns table (
  source_type text, source_id uuid, cost_date date, site_id uuid, job_number text,
  currency_code text, source_amount numeric, recognized_amount numeric,
  recognition_status text, source_status text, allocation_metadata jsonb,
  quality_reasons text[], policy_version text, evaluated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_organization_id uuid;
  actor_role public.app_role;
  evaluation_time timestamptz := statement_timestamp();
begin
  if auth.uid() is null or not private.auth_session_is_current() then raise insufficient_privilege using message = 'Active authenticated session required'; end if;
  actor_organization_id := private.current_organization_id();
  actor_role := private.current_app_role();
  if actor_organization_id is null or actor_role not in ('office','director') then raise insufficient_privilege using message = 'Office or Director access required'; end if;
  if p_period_start is null or p_period_end_exclusive is null or p_period_start >= p_period_end_exclusive then raise exception 'A valid half-open cost period is required' using errcode = '22007'; end if;
  if p_site_id is not null and not exists (select 1 from public.sites s where s.id = p_site_id and s.organization_id = actor_organization_id) then raise insufficient_privilege using message = 'Site access denied'; end if;

  return query
  with rows as (
    select 'ppe'::text st, p.id sid, coalesce(p.order_date, (p.requested_at at time zone 'Africa/Johannesburg')::date) dt,
      p.attribution_site_id site, p.job_number_snapshot job, p.currency_code currency, p.unit_cost amount,
      case when p.status in ('ordered','ready','collected') and p.order_date is not null then p.unit_cost else 0::numeric end recognized,
      case when p.status in ('ordered','ready','collected') and p.order_date is not null then 'recognized' else 'not_recognized' end rs,
      p.status ss, jsonb_build_array() allocations,
      array_remove(array[case when p.order_date is null then 'PPE_ORDER_DATE_MISSING' end, case when p.attribution_site_id is null then 'SITE_ATTRIBUTION_MISSING' end, case when p.job_number_snapshot is null then 'JOB_NUMBER_MISSING' end, case when p.status = 'requested' then 'PPE_NOT_ORDERED' end], null)::text[] quality
    from public.ppe_issue_records p where p.organization_id = actor_organization_id
    union all
    select 'fuel', f.id, f.fuel_date, f.attribution_site_id, f.job_number_snapshot, f.currency_code, f.total_cost, f.total_cost, 'recognized', 'recorded', jsonb_build_array(),
      array_remove(array[case when f.attribution_site_id is null then 'SITE_ATTRIBUTION_MISSING' end, case when f.job_number_snapshot is null then 'JOB_NUMBER_MISSING' end], null)::text[]
    from public.asset_fuel_entries f where f.organization_id = actor_organization_id
    union all
    select 'asset_work_order', w.id, coalesce((w.completed_at at time zone 'Africa/Johannesburg')::date, (w.created_at at time zone 'Africa/Johannesburg')::date), w.attribution_site_id, w.job_number_snapshot, w.currency_code, w.cost,
      case when w.status = 'completed' and w.completed_at is not null then w.cost else 0::numeric end,
      case when w.status = 'completed' and w.completed_at is not null then 'recognized' else 'not_recognized' end, w.status, jsonb_build_array(),
      array_remove(array[case when w.status = 'completed' and w.completed_at is null then 'WORK_ORDER_COMPLETION_DATE_MISSING' end, case when w.status <> 'completed' then 'WORK_ORDER_NOT_COMPLETED' end, case when w.attribution_site_id is null then 'SITE_ATTRIBUTION_MISSING' end, case when w.job_number_snapshot is null then 'JOB_NUMBER_MISSING' end], null)::text[]
    from public.asset_work_orders w where w.organization_id = actor_organization_id
    union all
    select 'vendor_invoice', v.id, v.invoice_date,
      case when jsonb_array_length(v.site_allocations) = 1 then ((v.site_allocations -> 0 ->> 'siteId')::uuid) else null end,
      case when jsonb_array_length(v.site_allocations) = 1 then (v.site_allocations -> 0 ->> 'jobNumber') else null end,
      v.currency_code, v.total,
      case when v.status in ('approved','paid') then
        case when p_site_id is null then v.total else round(v.total * coalesce((select sum((a ->> 'ratio')::numeric) from jsonb_array_elements(v.site_allocations) a where (a ->> 'siteId')::uuid = p_site_id), 0), 2) end
        else 0::numeric end,
      case when v.status in ('approved','paid') then 'recognized' else 'not_recognized' end, v.status, v.site_allocations,
      array_remove(array[case when jsonb_array_length(v.site_allocations) = 0 then 'SITE_ATTRIBUTION_MISSING' end, case when v.status = 'pending_director' then 'INVOICE_PENDING_APPROVAL' end, case when v.status = 'rejected' then 'INVOICE_REJECTED' end], null)::text[]
    from public.vendor_invoice_records v where v.organization_id = actor_organization_id
    union all
    select 'labour_provisional', a.id, (a.occurred_at at time zone 'Africa/Johannesburg')::date, a.site_id, s.job_number, 'ZAR', null::numeric, 0::numeric,
      'provisional_unrecognized', a.action, jsonb_build_array(), array['LABOUR_SOURCE_UNSTRUCTURED','LABOUR_RATE_UNIT_UNDEFINED']::text[]
    from public.attendance_audit_events a left join public.sites s on s.id = a.site_id and s.organization_id = a.organization_id
    where a.organization_id = actor_organization_id
  )
  select st, sid, dt, site, job, currency, amount,
    case when p_site_id is not null and st <> 'vendor_invoice' then case when site = p_site_id then recognized else 0::numeric end else recognized end,
    rs, ss, allocations, quality, 'cost-attribution-v1.0.0', evaluation_time
  from rows
  where dt >= p_period_start and dt < p_period_end_exclusive
    and (p_site_id is null or (st = 'vendor_invoice' and exists (select 1 from jsonb_array_elements(allocations) a where (a ->> 'siteId')::uuid = p_site_id)) or site = p_site_id)
  order by dt, st, sid;
end;
$$;

revoke all on function public.reconcile_site_job_costs(date,date,uuid) from public, anon;
grant execute on function public.reconcile_site_job_costs(date,date,uuid) to authenticated;
comment on function public.reconcile_site_job_costs(date,date,uuid) is 'Source-level, non-aggregated site/job cost reconciliation. Labour evidence is explicitly provisional and never recognized.';

commit;
