begin;

-- Phase 2 durable manager control loop. Browser storage remains available only
-- for local review mode. Hosted users write to these organization/site-scoped
-- records under the existing auth boundary.

create table public.manager_shift_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.current_organization_id() references public.organizations(id),
  site_id uuid not null references public.sites(id),
  work_date date not null,
  manager_profile_id uuid not null default auth.uid() references public.profiles(id),
  manager_mode text not null default 'site' check (manager_mode in ('site', 'workshop')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'accepted', 'rejected')),
  shift_objective text not null default '' check (length(shift_objective) <= 2000),
  shift_top_risk text not null default '' check (length(shift_top_risk) <= 1000),
  shift_support text not null default '' check (length(shift_support) <= 1000),
  handover_note text not null default '' check (length(handover_note) <= 4000),
  version integer not null default 1 check (version > 0),
  review_reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, site_id, work_date)
);

create table public.manager_workstation_readiness (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.current_organization_id() references public.organizations(id),
  site_id uuid not null references public.sites(id),
  work_date date not null,
  manager_profile_id uuid not null default auth.uid() references public.profiles(id),
  machine_ready boolean not null default false,
  tools_ready boolean not null default false,
  materials_ready boolean not null default false,
  operator_ready boolean not null default false,
  instruction_ready boolean not null default false,
  inspection_ready boolean not null default false,
  verified_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, site_id, work_date)
);

create table public.manager_blockers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.current_organization_id() references public.organizations(id),
  site_id uuid not null references public.sites(id),
  shift_snapshot_id uuid references public.manager_shift_snapshots(id) on delete set null,
  category text not null check (category in ('safety', 'material', 'drawing', 'equipment', 'labour', 'quality', 'client', 'logistics')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  summary text not null check (length(btrim(summary)) between 1 and 1000),
  owner_profile_id uuid references public.profiles(id),
  owner_label text not null check (length(btrim(owner_label)) between 1 and 160),
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'escalated', 'resolved')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.manager_work_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.current_organization_id() references public.organizations(id),
  site_id uuid not null references public.sites(id),
  shift_snapshot_id uuid references public.manager_shift_snapshots(id) on delete set null,
  blocker_id uuid references public.manager_blockers(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 240),
  workstation text not null check (length(btrim(workstation)) between 1 and 240),
  assigned_employee_id uuid references public.employees(id),
  work_date date not null,
  due_date date not null,
  status text not null default 'queued' check (status in ('queued', 'ready', 'in_progress', 'quality_check', 'complete', 'blocked')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.manager_control_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default private.current_organization_id() references public.organizations(id),
  site_id uuid not null references public.sites(id),
  shift_snapshot_id uuid references public.manager_shift_snapshots(id) on delete set null,
  actor_id uuid not null default auth.uid() references public.profiles(id),
  event_type text not null check (event_type in ('snapshot_saved', 'snapshot_submitted', 'snapshot_reviewed', 'readiness_updated', 'work_package_created', 'work_package_transitioned', 'blocker_created', 'blocker_escalated', 'blocker_resolved', 'handover_accepted')),
  entity_type text not null check (entity_type in ('shift_snapshot', 'readiness', 'work_package', 'blocker', 'handover')),
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default timezone('utc', now())
);

create index manager_shift_scope_idx on public.manager_shift_snapshots (organization_id, site_id, work_date desc);
create index manager_readiness_scope_idx on public.manager_workstation_readiness (organization_id, site_id, work_date desc);
create index manager_blocker_scope_idx on public.manager_blockers (organization_id, site_id, status, due_at asc);
create index manager_work_package_scope_idx on public.manager_work_packages (organization_id, site_id, status, due_date asc);
create index manager_work_package_employee_idx on public.manager_work_packages (organization_id, assigned_employee_id, due_date asc);
create index manager_event_scope_idx on public.manager_control_events (organization_id, site_id, occurred_at desc);

create or replace function private.can_read_manager_control(target_site_id uuid, target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    target_organization_id = private.current_organization_id()
    and (
      public.can_read_admin_workspace()
      or private.has_site_access(target_site_id, target_organization_id)
    ), false
  )
$$;

create or replace function private.can_write_manager_control(target_site_id uuid, target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    target_organization_id = private.current_organization_id()
    and private.current_app_role() = 'site'
    and private.has_site_access(target_site_id, target_organization_id), false
  )
$$;

revoke all on function private.can_read_manager_control(uuid, uuid) from public, anon;
grant execute on function private.can_read_manager_control(uuid, uuid) to authenticated;
revoke all on function private.can_write_manager_control(uuid, uuid) from public, anon;
grant execute on function private.can_write_manager_control(uuid, uuid) to authenticated;

create or replace function public.set_manager_shift_status_v1(
  p_snapshot_id uuid,
  p_status text,
  p_reason text default null
)
returns public.manager_shift_snapshots
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_snapshot public.manager_shift_snapshots;
begin
  if p_status not in ('submitted', 'accepted', 'rejected') then
    raise exception using errcode = '22023', message = 'Unsupported manager shift status';
  end if;

  select * into v_snapshot
  from public.manager_shift_snapshots
  where id = p_snapshot_id;

  if v_snapshot.id is null then
    raise exception using errcode = 'P0002', message = 'Manager shift snapshot not found';
  end if;
  if p_status in ('accepted', 'rejected') and not public.can_read_admin_workspace() then
    raise insufficient_privilege using message = 'Only Office Admin or Director users can review a manager handover';
  end if;
  if p_status = 'submitted' and not private.can_write_manager_control(v_snapshot.site_id, v_snapshot.organization_id) then
    raise insufficient_privilege using message = 'Only the assigned Site Manager can submit this handover';
  end if;
  if p_status = 'rejected' and length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception using errcode = '22023', message = 'A rejection reason is required';
  end if;

  update public.manager_shift_snapshots
  set status = p_status,
      review_reason = case when p_status = 'rejected' then btrim(p_reason) else null end,
      reviewed_by = case when p_status in ('accepted', 'rejected') then auth.uid() else reviewed_by end,
      reviewed_at = case when p_status in ('accepted', 'rejected') then timezone('utc', now()) else reviewed_at end,
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = p_snapshot_id
  returning * into v_snapshot;

  insert into public.manager_control_events (organization_id, site_id, shift_snapshot_id, actor_id, event_type, entity_type, entity_id, payload)
  values (v_snapshot.organization_id, v_snapshot.site_id, v_snapshot.id, auth.uid(), case when p_status = 'submitted' then 'snapshot_submitted' else 'snapshot_reviewed' end, 'shift_snapshot', v_snapshot.id, jsonb_build_object('status', p_status, 'reason', p_reason));
  return v_snapshot;
end;
$$;

create or replace function public.transition_manager_work_package_v1(
  p_work_package_id uuid,
  p_status text
)
returns public.manager_work_packages
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.manager_work_packages;
  v_ready public.manager_workstation_readiness;
  v_present boolean;
begin
  if p_status not in ('queued', 'ready', 'in_progress', 'quality_check', 'complete', 'blocked') then
    raise exception using errcode = '22023', message = 'Unsupported work-package status';
  end if;
  select * into v_item from public.manager_work_packages where id = p_work_package_id;
  if v_item.id is null then
    raise exception using errcode = 'P0002', message = 'Manager work package not found';
  end if;
  if not private.can_write_manager_control(v_item.site_id, v_item.organization_id) then
    raise insufficient_privilege using message = 'Only the assigned Site Manager can transition this work package';
  end if;
  if p_status = 'in_progress' then
    select * into v_ready from public.manager_workstation_readiness
    where organization_id = v_item.organization_id and site_id = v_item.site_id and work_date = v_item.work_date;
    if v_ready.id is null or not (v_ready.machine_ready and v_ready.tools_ready and v_ready.materials_ready and v_ready.operator_ready and v_ready.instruction_ready and v_ready.inspection_ready) then
      raise exception using errcode = '55000', message = 'All six workstation readiness checks must be complete before work starts';
    end if;
    select coalesce((employee.logs -> v_item.work_date::text ->> 'status') = 'present', false)
      into v_present
    from public.employees employee
    where employee.id = v_item.assigned_employee_id
      and employee.organization_id = v_item.organization_id
      and employee.site_id = v_item.site_id;
    if not coalesce(v_present, false) then
      raise exception using errcode = '55000', message = 'The assigned employee must be marked present before work starts';
    end if;
  end if;

  update public.manager_work_packages
  set status = p_status, updated_by = auth.uid(), version = version + 1, updated_at = timezone('utc', now())
  where id = p_work_package_id
  returning * into v_item;

  insert into public.manager_control_events (organization_id, site_id, shift_snapshot_id, actor_id, event_type, entity_type, entity_id, payload)
  values (v_item.organization_id, v_item.site_id, v_item.shift_snapshot_id, auth.uid(), 'work_package_transitioned', 'work_package', v_item.id, jsonb_build_object('status', p_status));
  return v_item;
end;
$$;

revoke all on public.manager_shift_snapshots, public.manager_workstation_readiness, public.manager_blockers, public.manager_work_packages, public.manager_control_events from anon;
revoke all on public.manager_shift_snapshots, public.manager_workstation_readiness, public.manager_blockers, public.manager_work_packages, public.manager_control_events from authenticated;
grant select, insert, update on public.manager_shift_snapshots, public.manager_workstation_readiness, public.manager_blockers, public.manager_work_packages to authenticated;
grant select on public.manager_control_events to authenticated;
grant execute on function public.set_manager_shift_status_v1(uuid, text, text) to authenticated;
grant execute on function public.transition_manager_work_package_v1(uuid, text) to authenticated;

alter table public.manager_shift_snapshots enable row level security;
alter table public.manager_workstation_readiness enable row level security;
alter table public.manager_blockers enable row level security;
alter table public.manager_work_packages enable row level security;
alter table public.manager_control_events enable row level security;

create policy manager_shift_read on public.manager_shift_snapshots for select to authenticated
using (private.can_read_manager_control(site_id, organization_id));
create policy manager_shift_insert on public.manager_shift_snapshots for insert to authenticated
with check (private.can_write_manager_control(site_id, organization_id) and manager_profile_id = (select auth.uid()) and status = 'draft');
create policy manager_shift_update on public.manager_shift_snapshots for update to authenticated
using (private.can_read_manager_control(site_id, organization_id) and (private.can_write_manager_control(site_id, organization_id) or public.can_read_admin_workspace()))
with check (private.can_read_manager_control(site_id, organization_id));

create policy manager_readiness_read on public.manager_workstation_readiness for select to authenticated
using (private.can_read_manager_control(site_id, organization_id));
create policy manager_readiness_insert on public.manager_workstation_readiness for insert to authenticated
with check (private.can_write_manager_control(site_id, organization_id));
create policy manager_readiness_update on public.manager_workstation_readiness for update to authenticated
using (private.can_write_manager_control(site_id, organization_id))
with check (private.can_write_manager_control(site_id, organization_id));

create policy manager_blocker_read on public.manager_blockers for select to authenticated
using (private.can_read_manager_control(site_id, organization_id));
create policy manager_blocker_insert on public.manager_blockers for insert to authenticated
with check (private.can_write_manager_control(site_id, organization_id) and created_by = (select auth.uid()));
create policy manager_blocker_update on public.manager_blockers for update to authenticated
using (private.can_write_manager_control(site_id, organization_id))
with check (private.can_write_manager_control(site_id, organization_id));

create policy manager_work_package_read on public.manager_work_packages for select to authenticated
using (private.can_read_manager_control(site_id, organization_id));
create policy manager_work_package_insert on public.manager_work_packages for insert to authenticated
with check (private.can_write_manager_control(site_id, organization_id) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy manager_work_package_update on public.manager_work_packages for update to authenticated
using (private.can_write_manager_control(site_id, organization_id))
with check (private.can_write_manager_control(site_id, organization_id) and updated_by = (select auth.uid()));

create policy manager_event_read on public.manager_control_events for select to authenticated
using (private.can_read_manager_control(site_id, organization_id));
create policy manager_event_insert on public.manager_control_events for insert to authenticated
with check (private.can_read_manager_control(site_id, organization_id) and actor_id = auth.uid());

create or replace function private.manager_shift_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = timezone('utc', now());
  if new.status <> old.status then
    if old.status = 'draft' and new.status not in ('draft', 'submitted') then
      raise exception using errcode = '22023', message = 'A draft manager shift can only be submitted';
    end if;
    if old.status = 'submitted' and new.status not in ('submitted', 'accepted', 'rejected') then
      raise exception using errcode = '22023', message = 'A submitted manager shift can only be reviewed';
    end if;
    if old.status in ('accepted', 'rejected') then
      raise exception using errcode = '22023', message = 'A reviewed manager shift is immutable';
    end if;
  end if;
  return new;
end;
$$;

create trigger manager_shift_updated_at before update on public.manager_shift_snapshots for each row execute function private.manager_shift_updated_at();
create trigger manager_readiness_updated_at before update on public.manager_workstation_readiness for each row execute function public.set_updated_at();
create trigger manager_blocker_updated_at before update on public.manager_blockers for each row execute function public.set_updated_at();
create trigger manager_work_package_updated_at before update on public.manager_work_packages for each row execute function public.set_updated_at();

revoke insert, update, delete, truncate on public.manager_control_events from authenticated;
comment on table public.manager_shift_snapshots is 'RLS-protected durable Site Manager shift plan and handover state.';
comment on table public.manager_control_events is 'Append-only event trail for Phase 2 manager control actions.';

commit;
