begin;

create table public.manager_control_idempotency (
  organization_id uuid not null default private.current_organization_id() references public.organizations(id),
  site_id uuid not null references public.sites(id),
  manager_profile_id uuid not null default auth.uid() references public.profiles(id),
  request_id uuid not null,
  payload_hash text not null check (length(payload_hash) = 32),
  snapshot_id uuid not null references public.manager_shift_snapshots(id),
  snapshot_version integer not null check (snapshot_version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, site_id, manager_profile_id, request_id)
);
alter table public.manager_control_idempotency enable row level security;
revoke all on public.manager_control_idempotency from public, anon, authenticated;
grant select, insert on public.manager_control_idempotency to authenticated;
create policy manager_control_idempotency_read on public.manager_control_idempotency for select to authenticated
using (manager_profile_id = (select auth.uid()) and private.can_read_manager_control(site_id, organization_id));
create policy manager_control_idempotency_insert on public.manager_control_idempotency for insert to authenticated
with check (manager_profile_id = (select auth.uid()) and private.can_write_manager_control(site_id, organization_id)
  and current_setting('senatla.manager_control_save', true) = 'on');

create or replace function public.save_manager_control_state_v1(
  p_request_id uuid,
  p_expected_version integer,
  p_site_id uuid,
  p_work_date date,
  p_state jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org_id uuid := private.current_organization_id();
  v_actor_id uuid := (select auth.uid());
  v_snapshot public.manager_shift_snapshots;
  v_request public.manager_control_idempotency;
  v_hash text;
  v_item jsonb;
  v_blocker jsonb;
begin
  if v_actor_id is null or p_request_id is null or p_work_date is null or jsonb_typeof(p_state) <> 'object' then
    raise exception using errcode = '22023', message = 'A valid manager state, site, date and request id are required';
  end if;
  if not private.can_write_manager_control(p_site_id, v_org_id) then
    raise insufficient_privilege using message = 'You cannot save manager control records for this site';
  end if;
  perform set_config('senatla.manager_control_save', 'on', true);
  if coalesce(jsonb_typeof(p_state->'workshopWorkItems'), 'array') <> 'array'
     or coalesce(jsonb_typeof(p_state->'operationalBlockers'), 'array') <> 'array'
     or coalesce(jsonb_typeof(p_state->'workstationReadiness'), 'object') <> 'object' then
    raise exception using errcode = '22023', message = 'The manager state has an invalid collection shape';
  end if;

  v_hash := md5(p_state::text);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_request from public.manager_control_idempotency
  where organization_id = v_org_id and site_id = p_site_id and manager_profile_id = v_actor_id and request_id = p_request_id;
  if found then
    if v_request.payload_hash <> v_hash then
      raise exception using errcode = '22023', message = 'An idempotency key cannot be reused for a different manager state';
    end if;
    return jsonb_build_object('snapshot_id', v_request.snapshot_id, 'version', v_request.snapshot_version);
  end if;

  select * into v_snapshot from public.manager_shift_snapshots
  where organization_id = v_org_id and site_id = p_site_id and work_date = p_work_date
  for update;
  if not found then
    if coalesce(p_expected_version, 0) <> 0 then
      raise exception using errcode = '40001', message = 'The manager shift changed. Reload it before saving again.';
    end if;
    insert into public.manager_shift_snapshots (organization_id, site_id, work_date, manager_profile_id, manager_mode, shift_objective, shift_top_risk, shift_support, handover_note)
    values (v_org_id, p_site_id, p_work_date, v_actor_id,
      coalesce(nullif(p_state->>'managerMode', ''), 'site'),
      btrim(coalesce(p_state->>'shiftObjective', '')), btrim(coalesce(p_state->>'shiftTopRisk', '')),
      btrim(coalesce(p_state->>'shiftSupport', '')), btrim(coalesce(p_state->>'handoverNote', '')))
    returning * into v_snapshot;
  else
    if v_snapshot.version <> coalesce(p_expected_version, 0) then
      raise exception using errcode = '40001', message = 'The manager shift changed. Reload it before saving again.';
    end if;
    if v_snapshot.status not in ('draft', 'rejected') then
      raise exception using errcode = '55000', message = 'A submitted or accepted handover cannot be edited';
    end if;
    update public.manager_shift_snapshots
    set manager_mode = coalesce(nullif(p_state->>'managerMode', ''), 'site'),
        shift_objective = btrim(coalesce(p_state->>'shiftObjective', '')),
        shift_top_risk = btrim(coalesce(p_state->>'shiftTopRisk', '')),
        shift_support = btrim(coalesce(p_state->>'shiftSupport', '')),
        handover_note = btrim(coalesce(p_state->>'handoverNote', '')),
        version = version + 1,
        updated_at = timezone('utc', now())
    where id = v_snapshot.id returning * into v_snapshot;
  end if;

  insert into public.manager_workstation_readiness (organization_id, site_id, work_date, manager_profile_id, machine_ready, tools_ready, materials_ready, operator_ready, instruction_ready, inspection_ready, verified_at)
  values (v_org_id, p_site_id, p_work_date, v_actor_id,
    coalesce((p_state->'workstationReadiness'->>'machine')::boolean, false),
    coalesce((p_state->'workstationReadiness'->>'tools')::boolean, false),
    coalesce((p_state->'workstationReadiness'->>'materials')::boolean, false),
    coalesce((p_state->'workstationReadiness'->>'operator')::boolean, false),
    coalesce((p_state->'workstationReadiness'->>'instruction')::boolean, false),
    coalesce((p_state->'workstationReadiness'->>'inspection')::boolean, false),
    timezone('utc', now()))
  on conflict (organization_id, site_id, work_date) do update set
    machine_ready = excluded.machine_ready, tools_ready = excluded.tools_ready, materials_ready = excluded.materials_ready,
    operator_ready = excluded.operator_ready, instruction_ready = excluded.instruction_ready, inspection_ready = excluded.inspection_ready,
    verified_at = timezone('utc', now()), manager_profile_id = v_actor_id;

  for v_item in select value from jsonb_array_elements(coalesce(p_state->'workshopWorkItems', '[]'::jsonb)) as items(value) loop
    insert into public.manager_work_packages (id, organization_id, site_id, shift_snapshot_id, title, workstation, assigned_employee_id, work_date, due_date, status, blocker_id, created_by, updated_by)
    values ((v_item->>'id')::uuid, v_org_id, p_site_id, v_snapshot.id, btrim(v_item->>'title'), btrim(v_item->>'workstation'),
      nullif(v_item->>'assignedEmployeeId', '')::uuid, p_work_date, (v_item->>'dueDate')::date,
      coalesce(v_item->>'status', 'queued'), nullif(v_item->>'blockerId', '')::uuid, v_actor_id, v_actor_id)
    on conflict (id) do update set
      shift_snapshot_id = excluded.shift_snapshot_id, title = excluded.title, workstation = excluded.workstation,
      assigned_employee_id = excluded.assigned_employee_id, work_date = excluded.work_date, due_date = excluded.due_date,
      status = excluded.status, blocker_id = excluded.blocker_id, updated_by = v_actor_id,
      version = public.manager_work_packages.version + 1, updated_at = timezone('utc', now());
  end loop;

  for v_blocker in select value from jsonb_array_elements(coalesce(p_state->'operationalBlockers', '[]'::jsonb)) as blockers(value) loop
    insert into public.manager_blockers (id, organization_id, site_id, shift_snapshot_id, category, severity, summary, owner_label, due_at, status, created_by, resolved_by, resolved_at)
    values ((v_blocker->>'id')::uuid, v_org_id, p_site_id, v_snapshot.id, v_blocker->>'category', v_blocker->>'severity',
      btrim(v_blocker->>'summary'), btrim(v_blocker->>'owner'),
      case when (v_blocker->>'dueAt') like '%T%' then (v_blocker->>'dueAt')::timestamptz else ((v_blocker->>'dueAt') || 'T23:59:59Z')::timestamptz end,
      coalesce(v_blocker->>'status', 'open'), v_actor_id,
      case when v_blocker->>'status' = 'resolved' then v_actor_id else null end,
      case when v_blocker->>'status' = 'resolved' then timezone('utc', now()) else null end)
    on conflict (id) do update set
      shift_snapshot_id = excluded.shift_snapshot_id, category = excluded.category, severity = excluded.severity,
      summary = excluded.summary, owner_label = excluded.owner_label, due_at = excluded.due_at, status = excluded.status,
      resolved_by = case when excluded.status = 'resolved' then v_actor_id else null end,
      resolved_at = case when excluded.status = 'resolved' then coalesce(public.manager_blockers.resolved_at, timezone('utc', now())) else null end,
      updated_at = timezone('utc', now());
  end loop;

  insert into public.manager_control_idempotency (organization_id, site_id, manager_profile_id, request_id, payload_hash, snapshot_id, snapshot_version)
  values (v_org_id, p_site_id, v_actor_id, p_request_id, v_hash, v_snapshot.id, v_snapshot.version);
  return jsonb_build_object('snapshot_id', v_snapshot.id, 'version', v_snapshot.version);
end;
$$;
revoke all on function public.save_manager_control_state_v1(uuid, integer, uuid, date, jsonb) from public, anon;
grant execute on function public.save_manager_control_state_v1(uuid, integer, uuid, date, jsonb) to authenticated;

comment on table public.manager_control_idempotency is 'Idempotency ledger for atomic manager control saves, scoped by actor, site and request id.';

commit;
