begin;

-- Work date is independent of the package deadline. Legacy rows inherit their
-- parent shift date where possible, falling back to their previous due date.
alter table public.manager_work_packages add column if not exists work_date date;
update public.manager_work_packages package
set work_date = coalesce(snapshot.work_date, package.due_date)
from public.manager_shift_snapshots snapshot
where package.shift_snapshot_id = snapshot.id and package.work_date is null;
update public.manager_work_packages set work_date = due_date where work_date is null;
alter table public.manager_work_packages alter column work_date set not null;
create index manager_work_package_work_date_idx on public.manager_work_packages (organization_id, site_id, work_date, status);

-- A reviewer may read a handover but cannot edit it through table access.
drop policy if exists manager_shift_update on public.manager_shift_snapshots;
create policy manager_shift_update on public.manager_shift_snapshots for update to authenticated
using (private.can_write_manager_control(site_id, organization_id) and status in ('draft', 'rejected'))
with check (private.can_write_manager_control(site_id, organization_id) and status in ('draft', 'rejected'));

drop policy if exists manager_readiness_write on public.manager_workstation_readiness;
create policy manager_readiness_write on public.manager_workstation_readiness for all to authenticated
using (private.can_write_manager_control(site_id, organization_id))
with check (private.can_write_manager_control(site_id, organization_id));

drop policy if exists manager_blocker_update on public.manager_blockers;
create policy manager_blocker_update on public.manager_blockers for update to authenticated
using (private.can_write_manager_control(site_id, organization_id))
with check (private.can_write_manager_control(site_id, organization_id));

-- Enforce the readiness and attendance gate even when a client attempts a
-- direct table write instead of calling the transition RPC.
create or replace function private.enforce_manager_work_start_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ready public.manager_workstation_readiness;
  v_present boolean;
begin
  if new.status <> 'in_progress' or (tg_op = 'UPDATE' and old.status = 'in_progress') then
    return new;
  end if;
  if not private.can_write_manager_control(new.site_id, new.organization_id) then
    raise insufficient_privilege using message = 'Only the assigned Site Manager can start this work package';
  end if;

  select * into v_ready
  from public.manager_workstation_readiness
  where organization_id = new.organization_id and site_id = new.site_id and work_date = new.work_date;
  if v_ready.id is null or not (v_ready.machine_ready and v_ready.tools_ready and v_ready.materials_ready and v_ready.operator_ready and v_ready.instruction_ready and v_ready.inspection_ready) then
    raise exception using errcode = '55000', message = 'All six workstation readiness checks must be complete before work starts';
  end if;

  select coalesce((employee.logs -> new.work_date::text ->> 'status') = 'present', false)
  into v_present
  from public.employees employee
  where employee.id = new.assigned_employee_id
    and employee.organization_id = new.organization_id
    and employee.site_id = new.site_id;
  if not coalesce(v_present, false) then
    raise exception using errcode = '55000', message = 'The assigned employee must be marked present before work starts';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_manager_work_start_gate() from public, anon, authenticated;
create trigger manager_work_package_start_gate
before insert or update of status on public.manager_work_packages
for each row execute function private.enforce_manager_work_start_gate();

create or replace function private.manager_shift_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = timezone('utc', now());
  if old.status = 'accepted' then
    raise exception using errcode = '22023', message = 'An accepted manager handover is immutable';
  end if;
  if new.status <> old.status then
    if old.status = 'draft' and new.status not in ('draft', 'submitted') then
      raise exception using errcode = '22023', message = 'A draft manager shift can only be submitted';
    end if;
    if old.status = 'submitted' and new.status not in ('submitted', 'accepted', 'rejected') then
      raise exception using errcode = '22023', message = 'A submitted manager shift can only be reviewed';
    end if;
    if old.status = 'rejected' and new.status not in ('rejected', 'submitted') then
      raise exception using errcode = '22023', message = 'A rejected manager shift can only be revised and resubmitted';
    end if;
  end if;
  return new;
end;
$$;

-- Capture state changes centrally so client upserts cannot omit the audit trail.
alter table public.manager_control_events drop constraint if exists manager_control_events_event_type_check;
alter table public.manager_control_events add constraint manager_control_events_event_type_check
check (event_type in ('snapshot_saved', 'snapshot_submitted', 'snapshot_reviewed', 'readiness_updated', 'work_package_created', 'work_package_updated', 'work_package_transitioned', 'blocker_created', 'blocker_updated', 'blocker_escalated', 'blocker_resolved', 'handover_accepted'));

create or replace function private.audit_manager_control_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_type text;
  v_entity_type text;
  v_entity_id uuid;
  v_snapshot_id uuid;
  v_org_id uuid;
  v_site_id uuid;
  v_actor_id uuid;
  v_payload jsonb := '{}'::jsonb;
begin
  v_entity_type := case tg_table_name
    when 'manager_shift_snapshots' then 'shift_snapshot'
    when 'manager_workstation_readiness' then 'readiness'
    when 'manager_work_packages' then 'work_package'
    else 'blocker'
  end;

  v_org_id := new.organization_id;
  v_site_id := new.site_id;
  v_entity_id := new.id;
  if tg_table_name = 'manager_shift_snapshots' then
    v_snapshot_id := new.id;
    v_actor_id := new.manager_profile_id;
    v_event_type := case
      when tg_op = 'INSERT' then 'snapshot_saved'
      when old.status is distinct from new.status and new.status = 'submitted' then 'snapshot_submitted'
      when old.status is distinct from new.status then 'snapshot_reviewed'
      else 'snapshot_saved'
    end;
    v_payload := jsonb_build_object('status', new.status, 'version', new.version);
  elsif tg_table_name = 'manager_workstation_readiness' then
    v_actor_id := new.manager_profile_id;
    v_event_type := 'readiness_updated';
    v_payload := jsonb_build_object('work_date', new.work_date);
  elsif tg_table_name = 'manager_work_packages' then
    v_snapshot_id := new.shift_snapshot_id;
    v_actor_id := new.updated_by;
    v_event_type := case
      when tg_op = 'INSERT' then 'work_package_created'
      when old.status is distinct from new.status then 'work_package_transitioned'
      else 'work_package_updated'
    end;
    v_payload := jsonb_build_object('status', new.status, 'work_date', new.work_date, 'version', new.version);
  else
    v_snapshot_id := new.shift_snapshot_id;
    v_actor_id := new.created_by;
    v_event_type := case
      when tg_op = 'INSERT' then 'blocker_created'
      when old.status is distinct from new.status and new.status = 'resolved' then 'blocker_resolved'
      when old.status is distinct from new.status and new.status = 'escalated' then 'blocker_escalated'
      else 'blocker_updated'
    end;
    v_payload := jsonb_build_object('status', new.status, 'severity', new.severity);
  end if;

  insert into public.manager_control_events (organization_id, site_id, shift_snapshot_id, actor_id, event_type, entity_type, entity_id, payload)
  values (v_org_id, v_site_id, v_snapshot_id, coalesce(auth.uid(), v_actor_id), v_event_type, v_entity_type, v_entity_id, v_payload);
  return new;
end;
$$;

revoke all on function private.audit_manager_control_change() from public, anon, authenticated;
create trigger manager_snapshot_audit after insert or update on public.manager_shift_snapshots for each row execute function private.audit_manager_control_change();
create trigger manager_readiness_audit after insert or update on public.manager_workstation_readiness for each row execute function private.audit_manager_control_change();
create trigger manager_work_package_audit after insert or update on public.manager_work_packages for each row execute function private.audit_manager_control_change();
create trigger manager_blocker_audit after insert or update on public.manager_blockers for each row execute function private.audit_manager_control_change();

drop policy if exists manager_event_insert on public.manager_control_events;
revoke all on public.manager_shift_snapshots, public.manager_workstation_readiness, public.manager_blockers, public.manager_work_packages, public.manager_control_events from authenticated;
grant select, insert, update on public.manager_shift_snapshots, public.manager_workstation_readiness, public.manager_blockers, public.manager_work_packages to authenticated;
grant select on public.manager_control_events to authenticated;
revoke insert, update, delete, truncate on public.manager_control_events from authenticated;

-- The audit trigger owns event creation; prevent duplicate events from RPCs.
create or replace function public.set_manager_shift_status_v1(
  p_snapshot_id uuid,
  p_status text,
  p_reason text default null
)
returns public.manager_shift_snapshots
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot public.manager_shift_snapshots;
begin
  if p_status not in ('submitted', 'accepted', 'rejected') then
    raise exception using errcode = '22023', message = 'Unsupported manager shift status';
  end if;
  select * into v_snapshot from public.manager_shift_snapshots where id = p_snapshot_id;
  if v_snapshot.id is null then
    raise exception using errcode = 'P0002', message = 'Manager shift snapshot not found';
  end if;
  if not private.can_read_manager_control(v_snapshot.site_id, v_snapshot.organization_id) then
    raise insufficient_privilege using message = 'This manager handover is outside your authorized scope';
  end if;
  if p_status in ('accepted', 'rejected') and not public.can_read_admin_workspace() then
    raise insufficient_privilege using message = 'Only Office Admin or Director users can review a manager handover';
  end if;
  if p_status = 'submitted' and not private.can_write_manager_control(v_snapshot.site_id, v_snapshot.organization_id) then
    raise insufficient_privilege using message = 'Only the Site Manager can submit this handover';
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
  where id = p_snapshot_id returning * into v_snapshot;
  return v_snapshot;
end;
$$;

create or replace function public.transition_manager_work_package_v1(p_work_package_id uuid, p_status text)
returns public.manager_work_packages
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.manager_work_packages;
begin
  if p_status not in ('queued', 'ready', 'in_progress', 'quality_check', 'complete', 'blocked') then
    raise exception using errcode = '22023', message = 'Unsupported work-package status';
  end if;
  select * into v_item from public.manager_work_packages where id = p_work_package_id;
  if v_item.id is null then
    raise exception using errcode = 'P0002', message = 'Manager work package not found';
  end if;
  if not private.can_write_manager_control(v_item.site_id, v_item.organization_id) then
    raise insufficient_privilege using message = 'Only the Site Manager can transition this work package';
  end if;
  update public.manager_work_packages
  set status = p_status, updated_by = auth.uid(), version = version + 1, updated_at = timezone('utc', now())
  where id = p_work_package_id returning * into v_item;
  return v_item;
end;
$$;

revoke all on function public.set_manager_shift_status_v1(uuid, text, text) from public, anon;
grant execute on function public.set_manager_shift_status_v1(uuid, text, text) to authenticated;
revoke all on function public.transition_manager_work_package_v1(uuid, text) from public, anon;
grant execute on function public.transition_manager_work_package_v1(uuid, text) to authenticated;

commit;
