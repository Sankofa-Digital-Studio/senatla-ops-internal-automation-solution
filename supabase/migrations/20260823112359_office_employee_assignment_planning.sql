begin;

create or replace function private.enforce_controlled_employee_site_assignment()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.site_id is distinct from new.site_id
     and coalesce(pg_catalog.current_setting('senatla.assignment_resource', true), '') <> 'employee' then
    raise sqlstate '55000' using message = 'Use the controlled employee assignment workflow';
  end if;
  return new;
end;
$$;

drop trigger if exists employees_controlled_site_assignment on public.employees;
create trigger employees_controlled_site_assignment before update of site_id on public.employees
for each row execute function private.enforce_controlled_employee_site_assignment();

create or replace function private.enforce_controlled_asset_site_assignment()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.assigned_site_id is distinct from new.assigned_site_id
     and coalesce(pg_catalog.current_setting('senatla.assignment_resource', true), '') <> 'asset' then
    raise sqlstate '55000' using message = 'Use the controlled asset transfer workflow';
  end if;
  return new;
end;
$$;

drop trigger if exists assets_controlled_site_assignment on public.assets;
create trigger assets_controlled_site_assignment before update of assigned_site_id on public.assets
for each row execute function private.enforce_controlled_asset_site_assignment();

create or replace function private.apply_employee_site_assignment_internal(
  p_employee_ids uuid[], p_target_site_id uuid, p_decision text, p_reason_code text default null
)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_name text;
  v_organization_id uuid;
  v_role text;
  v_count integer;
  v_move_count integer;
  v_warning_count integer;
begin
  if v_actor_id is null or not private.auth_session_is_current() then
    raise insufficient_privilege using message = 'Active authenticated session required';
  end if;
  select profile.display_name, profile.organization_id, profile.role
    into v_actor_name, v_organization_id, v_role
  from public.profiles profile where profile.id = v_actor_id and profile.is_active = true;
  if v_organization_id is null or v_role <> 'office' then
    raise insufficient_privilege using message = 'Only active Office Admin users can apply assignments';
  end if;
  if p_decision not in ('accept', 'reject', 'override') then
    raise invalid_parameter_value using message = 'Unsupported assignment decision';
  end if;
  if p_employee_ids is null or pg_catalog.cardinality(p_employee_ids) < 1 or pg_catalog.cardinality(p_employee_ids) > 100
     or exists (select 1 from pg_catalog.unnest(p_employee_ids) employee_id where employee_id is null) then
    raise invalid_parameter_value using message = 'Select between one and one hundred employees';
  end if;
  if not exists (select 1 from public.sites site where site.id = p_target_site_id
    and site.organization_id = v_organization_id and site.is_active = true) then
    raise sqlstate '55000' using message = 'Select an active organization site';
  end if;
  select count(*)::integer into v_count from public.employees employee
  where employee.id = any(p_employee_ids) and employee.organization_id = v_organization_id;
  if v_count <> (select count(distinct employee_id)::integer from pg_catalog.unnest(p_employee_ids) employee_id) then
    raise insufficient_privilege using message = 'Employee assignment selection is outside the active organization';
  end if;
  select count(*)::integer into v_move_count from public.employees employee
  where employee.id = any(p_employee_ids) and employee.organization_id = v_organization_id
    and employee.site_id is distinct from p_target_site_id;

  if p_decision = 'reject' then
    if p_reason_code not in ('assignment_deferred', 'alternative_not_suitable', 'additional_evidence_required') then
      raise invalid_parameter_value using message = 'Select a controlled rejection reason';
    end if;
    insert into public.admin_activity_log
      (organization_id, actor_id, actor_name, action, entity_type, entity_id, details)
    values (v_organization_id, v_actor_id, coalesce(v_actor_name, 'Office Admin'), 'employee_assignment_rejected',
      'employee_assignment', p_target_site_id::text, pg_catalog.jsonb_build_object(
        'targetSiteId', p_target_site_id, 'count', v_count, 'decision', p_decision,
        'reasonCode', p_reason_code, 'policyVersion', 'senatla-assignment-v1.0.0'));
    return 0;
  end if;

  if exists (
    select 1 from public.employees employee
    left join public.employee_onboarding_records onboarding
      on onboarding.employee_id = employee.id and onboarding.organization_id = v_organization_id
    where employee.id = any(p_employee_ids) and employee.organization_id = v_organization_id
      and (employee.employment_status <> 'active' or onboarding.id is null or onboarding.medical_status in ('pending', 'unfit'))
  ) then
    raise sqlstate '55000' using message = 'Hard blockers or missing readiness evidence must be resolved before assignment';
  end if;
  select count(*)::integer into v_warning_count from public.employee_onboarding_records onboarding
  where onboarding.employee_id = any(p_employee_ids) and onboarding.organization_id = v_organization_id
    and onboarding.medical_status = 'restricted';
  if v_warning_count > 0 then
    if p_decision <> 'override' or p_reason_code not in ('restricted_duties_confirmed', 'operational_continuity', 'manager_authorized') then
      raise sqlstate '55000' using message = 'Assignment warnings require a controlled override reason';
    end if;
  elsif p_decision <> 'accept' then
    raise invalid_parameter_value using message = 'Ready assignments must be explicitly accepted';
  end if;

  perform pg_catalog.set_config('senatla.assignment_resource', 'employee', true);
  update public.employees set site_id = p_target_site_id, updated_at = timezone('utc', now())
  where id = any(p_employee_ids) and organization_id = v_organization_id
    and site_id is distinct from p_target_site_id;
  perform pg_catalog.set_config('senatla.assignment_resource', '', true);
  insert into public.admin_activity_log
    (organization_id, actor_id, actor_name, action, entity_type, entity_id, details)
  values (v_organization_id, v_actor_id, coalesce(v_actor_name, 'Office Admin'), 'employee_assignment_applied',
    'employee_assignment', p_target_site_id::text, pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'targetSiteId', p_target_site_id, 'selectedCount', v_count, 'movedCount', v_move_count, 'decision', p_decision,
      'reasonCode', p_reason_code, 'policyVersion', 'senatla-assignment-v1.0.0')));
  return v_move_count;
end;
$$;

create or replace function public.apply_employee_site_assignment(
  p_employee_ids uuid[], p_target_site_id uuid, p_decision text, p_reason_code text default null
)
returns integer language sql volatile security invoker set search_path = '' as $$
  select private.apply_employee_site_assignment_internal(p_employee_ids, p_target_site_id, p_decision, p_reason_code);
$$;

create or replace function private.apply_asset_site_transfer_internal(
  p_asset_id uuid, p_target_site_id uuid, p_to_custodian text, p_handover_notes text,
  p_decision text, p_reason_code text default null
)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_name text;
  v_organization_id uuid;
  v_role text;
  v_asset public.assets%rowtype;
  v_event_id uuid := gen_random_uuid();
  v_has_warning boolean;
begin
  if v_actor_id is null or not private.auth_session_is_current() then
    raise insufficient_privilege using message = 'Active authenticated session required';
  end if;
  select profile.display_name, profile.organization_id, profile.role
    into v_actor_name, v_organization_id, v_role
  from public.profiles profile where profile.id = v_actor_id and profile.is_active = true;
  if v_organization_id is null or v_role <> 'office' then
    raise insufficient_privilege using message = 'Only active Office Admin users can apply assignments';
  end if;
  if p_decision not in ('accept', 'reject', 'override') then
    raise invalid_parameter_value using message = 'Unsupported assignment decision';
  end if;
  if not exists (select 1 from public.sites site where site.id = p_target_site_id
    and site.organization_id = v_organization_id and site.is_active = true) then
    raise sqlstate '55000' using message = 'Select an active organization site';
  end if;
  select * into v_asset from public.assets asset
  where asset.id = p_asset_id and asset.organization_id = v_organization_id for update;
  if v_asset.id is null then
    raise insufficient_privilege using message = 'Asset transfer selection is outside the active organization';
  end if;

  if p_decision = 'reject' then
    if p_reason_code not in ('assignment_deferred', 'alternative_not_suitable', 'additional_evidence_required') then
      raise invalid_parameter_value using message = 'Select a controlled rejection reason';
    end if;
    insert into public.admin_activity_log
      (organization_id, actor_id, actor_name, action, entity_type, entity_id, details)
    values (v_organization_id, v_actor_id, coalesce(v_actor_name, 'Office Admin'), 'asset_transfer_rejected',
      'asset_assignment', p_asset_id::text, pg_catalog.jsonb_build_object(
        'targetSiteId', p_target_site_id, 'decision', p_decision, 'reasonCode', p_reason_code,
        'policyVersion', 'senatla-assignment-v1.0.0'));
    return null;
  end if;

  if coalesce(v_asset.lifecycle_state, 'active') <> 'active' or v_asset.status <> 'Active'
     or v_asset.license_expiry is null
     or v_asset.license_expiry < (statement_timestamp() at time zone 'Africa/Johannesburg')::date
     or exists (select 1 from public.asset_compliance_records compliance
       where compliance.asset_id = p_asset_id and compliance.organization_id = v_organization_id
         and (compliance.status = 'expired' or compliance.expires_at < (statement_timestamp() at time zone 'Africa/Johannesburg')::date))
     or exists (select 1 from public.asset_work_orders work_order
       where work_order.asset_id = p_asset_id and work_order.organization_id = v_organization_id
         and work_order.status not in ('completed', 'cancelled') and work_order.priority in ('high', 'critical')) then
    raise sqlstate '55000' using message = 'Hard asset blockers must be resolved before transfer';
  end if;
  select exists (select 1 from public.asset_compliance_records compliance
    where compliance.asset_id = p_asset_id and compliance.organization_id = v_organization_id and compliance.status = 'due')
  or exists (select 1 from public.asset_work_orders work_order
    where work_order.asset_id = p_asset_id and work_order.organization_id = v_organization_id
      and work_order.status not in ('completed', 'cancelled')) into v_has_warning;
  if v_has_warning then
    if p_decision <> 'override' or p_reason_code not in ('maintenance_plan_confirmed', 'operational_continuity', 'manager_authorized') then
      raise sqlstate '55000' using message = 'Asset transfer warnings require a controlled override reason';
    end if;
  elsif p_decision <> 'accept' then
    raise invalid_parameter_value using message = 'Ready asset transfers must be explicitly accepted';
  end if;

  if v_asset.assigned_site_id is not distinct from p_target_site_id then
    insert into public.admin_activity_log
      (organization_id, actor_id, actor_name, action, entity_type, entity_id, details)
    values (v_organization_id, v_actor_id, coalesce(v_actor_name, 'Office Admin'), 'asset_transfer_reviewed_no_change',
      'asset_assignment', p_asset_id::text, pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'targetSiteId', p_target_site_id, 'decision', p_decision, 'reasonCode', p_reason_code,
        'policyVersion', 'senatla-assignment-v1.0.0')));
    return null;
  end if;

  perform pg_catalog.set_config('senatla.assignment_resource', 'asset', true);
  insert into public.asset_custody_events
    (id, organization_id, asset_id, from_site_id, to_site_id, from_custodian, to_custodian, accepted_by, notes, occurred_at)
  values (v_event_id, v_organization_id, p_asset_id, v_asset.assigned_site_id, p_target_site_id,
    v_asset.custodian_name, nullif(pg_catalog.btrim(p_to_custodian), ''), coalesce(v_actor_name, 'Office Admin'),
    nullif(pg_catalog.btrim(p_handover_notes), ''), timezone('utc', now()));
  update public.assets set assigned_site_id = p_target_site_id,
    custodian_name = nullif(pg_catalog.btrim(p_to_custodian), ''), updated_at = timezone('utc', now())
  where id = p_asset_id and organization_id = v_organization_id;
  perform pg_catalog.set_config('senatla.assignment_resource', '', true);
  insert into public.admin_activity_log
    (organization_id, actor_id, actor_name, action, entity_type, entity_id, details)
  values (v_organization_id, v_actor_id, coalesce(v_actor_name, 'Office Admin'), 'asset_transfer_applied',
    'asset_assignment', p_asset_id::text, pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'targetSiteId', p_target_site_id, 'decision', p_decision, 'reasonCode', p_reason_code,
      'custodyEventId', v_event_id, 'policyVersion', 'senatla-assignment-v1.0.0')));
  return v_event_id;
end;
$$;

create or replace function public.apply_asset_site_transfer(
  p_asset_id uuid, p_target_site_id uuid, p_to_custodian text, p_handover_notes text,
  p_decision text, p_reason_code text default null
)
returns uuid language sql volatile security invoker set search_path = '' as $$
  select private.apply_asset_site_transfer_internal(
    p_asset_id, p_target_site_id, p_to_custodian, p_handover_notes, p_decision, p_reason_code);
$$;

revoke all on function private.enforce_controlled_employee_site_assignment() from public, anon, authenticated;
revoke all on function private.enforce_controlled_asset_site_assignment() from public, anon, authenticated;
revoke all on function private.apply_employee_site_assignment_internal(uuid[], uuid, text, text) from public, anon;
revoke all on function private.apply_asset_site_transfer_internal(uuid, uuid, text, text, text, text) from public, anon;
grant execute on function private.apply_employee_site_assignment_internal(uuid[], uuid, text, text) to authenticated;
grant execute on function private.apply_asset_site_transfer_internal(uuid, uuid, text, text, text, text) to authenticated;
revoke all on function public.apply_employee_site_assignment(uuid[], uuid, text, text) from public, anon;
revoke all on function public.apply_asset_site_transfer(uuid, uuid, text, text, text, text) from public, anon;
grant execute on function public.apply_employee_site_assignment(uuid[], uuid, text, text) to authenticated;
grant execute on function public.apply_asset_site_transfer(uuid, uuid, text, text, text, text) to authenticated;

comment on function public.apply_employee_site_assignment(uuid[], uuid, text, text) is
  'Applies or rejects a reviewed Office Admin employee-site assignment atomically with sanitized audit evidence.';
comment on function public.apply_asset_site_transfer(uuid, uuid, text, text, text, text) is
  'Applies or rejects a reviewed Office Admin asset transfer atomically with immutable custody and sanitized audit evidence.';

commit;
