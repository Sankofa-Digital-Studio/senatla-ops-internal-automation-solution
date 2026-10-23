begin;

create or replace function private.evaluate_site_readiness_internal(p_site_id uuid)
returns table (
  entity_type text,
  entity_id uuid,
  entity_label text,
  outcome text,
  reason_codes text[],
  corrective_actions text[],
  policy_version text,
  evaluated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_organization_id uuid;
  v_actor_role public.app_role;
  v_as_of_date date := (statement_timestamp() at time zone 'Africa/Johannesburg')::date;
  v_evaluated_at timestamptz := statement_timestamp();
begin
  if v_actor_id is null or not private.auth_session_is_current() then
    raise insufficient_privilege using message = 'Active authenticated session required';
  end if;

  select profile.organization_id, profile.role
    into v_organization_id, v_actor_role
  from public.profiles profile
  join public.organizations organization
    on organization.id = profile.organization_id
   and organization.is_active = true
  where profile.id = v_actor_id
    and profile.is_active = true;

  if v_organization_id is null or v_actor_role is null then
    raise insufficient_privilege using message = 'Active authenticated profile required';
  end if;

  if not exists (
    select 1 from public.sites site
    where site.id = p_site_id and site.organization_id = v_organization_id
  ) then
    raise insufficient_privilege using message = 'Site access denied';
  end if;

  if v_actor_role = 'site' and not private.has_site_access(p_site_id, v_organization_id) then
    raise insufficient_privilege using message = 'Site access denied';
  elsif v_actor_role not in ('site', 'office', 'director') then
    raise insufficient_privilege using message = 'Site access denied';
  end if;

  return query
  with selected_site as (
    select site.id, site.name, site.is_active, site.compliance_checklist
    from public.sites site
    where site.id = p_site_id and site.organization_id = v_organization_id
  ),
  readiness_rows as (
    select
      'site'::text as row_entity_type,
      site.id as row_entity_id,
      site.name as row_entity_label,
      case when not site.is_active then 'blocked' when cardinality(site.compliance_checklist) = 0 then 'unknown' else 'ready' end::text as row_outcome,
      case when not site.is_active then array['SITE_INACTIVE']::text[] when cardinality(site.compliance_checklist) = 0 then array['SITE_CHECKLIST_EVIDENCE_MISSING']::text[] else array[]::text[] end as row_reason_codes,
      case when not site.is_active then array['Contact Office Admin to reactivate or replace the site.']::text[] when cardinality(site.compliance_checklist) = 0 then array['Complete and verify the site compliance checklist before work starts.']::text[] else array[]::text[] end as row_actions
    from selected_site site

    union all

    select
      'employee'::text,
      employee.id,
      concat_ws(' ', employee.first_name, employee.surname),
      decision.outcome,
      case when decision.reason_code is null then array[]::text[] else array[decision.reason_code] end,
      case when decision.corrective_action is null then array[]::text[] else array[decision.corrective_action] end
    from public.employees employee
    join selected_site site on site.id = employee.site_id
    left join public.employee_onboarding_records onboarding
      on onboarding.employee_id = employee.id
     and onboarding.organization_id = v_organization_id
    cross join lateral (
      select
        case
          when not site.is_active then 'blocked'
          when lower(btrim(employee.employment_status)) <> 'active' then 'blocked'
          when onboarding.id is null then 'unknown'
          when onboarding.medical_status = 'unfit' then 'blocked'
          when onboarding.red_ticket_expires_at is not null and onboarding.red_ticket_expires_at < v_as_of_date then 'blocked'
          when onboarding.medical_status = 'pending' then 'unknown'
          when onboarding.red_ticket_number is null or btrim(onboarding.red_ticket_number) = '' or onboarding.red_ticket_issued_at is null or onboarding.red_ticket_expires_at is null then 'unknown'
          when onboarding.medical_status = 'restricted' then 'warning'
          when onboarding.red_ticket_expires_at <= v_as_of_date + 30 then 'warning'
          else 'ready'
        end::text as outcome,
        case
          when not site.is_active then 'SITE_INACTIVE'
          when lower(btrim(employee.employment_status)) <> 'active' then 'EMPLOYEE_NOT_ACTIVE'
          when onboarding.id is null then 'EMPLOYEE_READINESS_EVIDENCE_MISSING'
          when onboarding.medical_status = 'unfit' then 'EMPLOYEE_CLEARANCE_BLOCKED'
          when onboarding.red_ticket_expires_at is not null and onboarding.red_ticket_expires_at < v_as_of_date then 'EMPLOYEE_AUTHORIZATION_EXPIRED'
          when onboarding.medical_status = 'pending' then 'EMPLOYEE_CLEARANCE_PENDING'
          when onboarding.red_ticket_number is null or btrim(onboarding.red_ticket_number) = '' or onboarding.red_ticket_issued_at is null or onboarding.red_ticket_expires_at is null then 'EMPLOYEE_AUTHORIZATION_EVIDENCE_MISSING'
          when onboarding.medical_status = 'restricted' then 'EMPLOYEE_CLEARANCE_RESTRICTION'
          when onboarding.red_ticket_expires_at <= v_as_of_date + 30 then 'EMPLOYEE_AUTHORIZATION_DUE'
          else null
        end::text as reason_code,
        case
          when not site.is_active then 'Contact Office Admin to reactivate or replace the site.'
          when lower(btrim(employee.employment_status)) <> 'active' then 'Contact Office Admin to confirm the employee assignment.'
          when onboarding.id is null then 'Ask Office Admin to complete the employee readiness record.'
          when onboarding.medical_status = 'unfit' then 'Ask Office Admin to resolve the confidential clearance blocker.'
          when onboarding.red_ticket_expires_at is not null and onboarding.red_ticket_expires_at < v_as_of_date then 'Ask Office Admin to renew the required work authorization.'
          when onboarding.medical_status = 'pending' then 'Ask Office Admin to complete the confidential clearance review.'
          when onboarding.red_ticket_number is null or btrim(onboarding.red_ticket_number) = '' or onboarding.red_ticket_issued_at is null or onboarding.red_ticket_expires_at is null then 'Ask Office Admin to complete the work-authorization evidence.'
          when onboarding.medical_status = 'restricted' then 'Confirm permitted duties with Office Admin before assignment.'
          when onboarding.red_ticket_expires_at <= v_as_of_date + 30 then 'Ask Office Admin to schedule renewal of the work authorization.'
          else null
        end::text as corrective_action
    ) decision
    where employee.organization_id = v_organization_id

    union all

    select
      'asset'::text,
      asset.id,
      coalesce(nullif(btrim(asset.registration_number), ''), nullif(btrim(asset.serial_number), ''), concat_ws(' ', asset.make, asset.model)),
      decision.outcome,
      case when decision.reason_code is null then array[]::text[] else array[decision.reason_code] end,
      case when decision.corrective_action is null then array[]::text[] else array[decision.corrective_action] end
    from public.assets asset
    join selected_site site on site.id = asset.assigned_site_id
    cross join lateral (
      select
        bool_or(compliance.status = 'expired' or (compliance.expires_at is not null and compliance.expires_at < v_as_of_date)) as has_expired,
        bool_or(compliance.status = 'due' or (compliance.expires_at is not null and compliance.expires_at <= v_as_of_date + 30)) as has_due,
        count(compliance.id) as record_count
      from public.asset_compliance_records compliance
      where compliance.asset_id = asset.id and compliance.organization_id = v_organization_id
    ) compliance_summary
    cross join lateral (
      select
        bool_or(work_order.status = 'blocked' or work_order.priority = 'critical') as has_blocking,
        bool_or(work_order.status in ('open', 'in_progress')) as has_open
      from public.asset_work_orders work_order
      where work_order.asset_id = asset.id
        and work_order.organization_id = v_organization_id
        and work_order.status in ('open', 'in_progress', 'blocked')
    ) work_order_summary
    cross join lateral (
      select
        case
          when not site.is_active then 'blocked'
          when asset.lifecycle_state in ('retired', 'disposed') then 'blocked'
          when asset.lifecycle_state = 'maintenance' then 'blocked'
          when lower(btrim(asset.status)) <> 'active' then 'blocked'
          when asset.license_expiry is null then 'unknown'
          when asset.license_expiry < v_as_of_date then 'blocked'
          when coalesce(work_order_summary.has_blocking, false) then 'blocked'
          when coalesce(compliance_summary.has_expired, false) then 'blocked'
          when compliance_summary.record_count = 0 then 'unknown'
          when asset.license_expiry <= v_as_of_date + 30 then 'warning'
          when coalesce(work_order_summary.has_open, false) then 'warning'
          when coalesce(compliance_summary.has_due, false) then 'warning'
          else 'ready'
        end::text as outcome,
        case
          when not site.is_active then 'SITE_INACTIVE'
          when asset.lifecycle_state in ('retired', 'disposed') then 'ASSET_OUT_OF_SERVICE'
          when asset.lifecycle_state = 'maintenance' then 'ASSET_IN_MAINTENANCE'
          when lower(btrim(asset.status)) <> 'active' then 'ASSET_NOT_ACTIVE'
          when asset.license_expiry is null then 'ASSET_LICENCE_EVIDENCE_MISSING'
          when asset.license_expiry < v_as_of_date then 'ASSET_LICENCE_EXPIRED'
          when coalesce(work_order_summary.has_blocking, false) then 'ASSET_WORK_ORDER_BLOCKING'
          when coalesce(compliance_summary.has_expired, false) then 'ASSET_COMPLIANCE_EXPIRED'
          when compliance_summary.record_count = 0 then 'ASSET_COMPLIANCE_EVIDENCE_MISSING'
          when asset.license_expiry <= v_as_of_date + 30 then 'ASSET_LICENCE_DUE'
          when coalesce(work_order_summary.has_open, false) then 'ASSET_WORK_ORDER_OPEN'
          when coalesce(compliance_summary.has_due, false) then 'ASSET_COMPLIANCE_DUE'
          else null
        end::text as reason_code,
        case
          when not site.is_active then 'Contact Office Admin to reactivate or replace the site.'
          when asset.lifecycle_state in ('retired', 'disposed') then 'Select an in-service asset.'
          when asset.lifecycle_state = 'maintenance' then 'Select another asset or complete the return-to-service process.'
          when lower(btrim(asset.status)) <> 'active' then 'Ask Office Admin to confirm the asset status.'
          when asset.license_expiry is null then 'Ask Office Admin to add verified asset licence evidence.'
          when asset.license_expiry < v_as_of_date then 'Renew the asset licence before assignment.'
          when coalesce(work_order_summary.has_blocking, false) then 'Resolve and close the blocking work order before assignment.'
          when coalesce(compliance_summary.has_expired, false) then 'Renew or replace the expired asset compliance evidence.'
          when compliance_summary.record_count = 0 then 'Ask Office Admin to add asset compliance evidence.'
          when asset.license_expiry <= v_as_of_date + 30 then 'Schedule asset licence renewal before expiry.'
          when coalesce(work_order_summary.has_open, false) then 'Confirm the open work order does not make the planned duty unsafe.'
          when coalesce(compliance_summary.has_due, false) then 'Review the due compliance item before assignment.'
          else null
        end::text as corrective_action
    ) decision
    where asset.organization_id = v_organization_id
  )
  select row_entity_type, row_entity_id, row_entity_label, row_outcome, row_reason_codes, row_actions,
         'senatla-readiness-v1.0.0'::text, v_evaluated_at
  from readiness_rows
  order by case row_entity_type when 'site' then 1 when 'employee' then 2 else 3 end, row_entity_id;
end;
$$;

comment on function private.evaluate_site_readiness_internal(uuid) is
  'Returns sanitized, policy-versioned readiness outcomes for an authorized existing site. Raw onboarding and compliance records are never returned.';

revoke all on function private.evaluate_site_readiness_internal(uuid) from public, anon;
grant execute on function private.evaluate_site_readiness_internal(uuid) to authenticated;

create or replace function public.evaluate_site_readiness(p_site_id uuid)
returns table (
  entity_type text,
  entity_id uuid,
  entity_label text,
  outcome text,
  reason_codes text[],
  corrective_actions text[],
  policy_version text,
  evaluated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.evaluate_site_readiness_internal(p_site_id);
$$;

comment on function public.evaluate_site_readiness(uuid) is
  'Security-invoker API wrapper for the sanitized private readiness evaluator.';

revoke all on function public.evaluate_site_readiness(uuid) from public, anon;
grant execute on function public.evaluate_site_readiness(uuid) to authenticated;

alter table public.attendance_audit_events drop constraint if exists attendance_audit_events_action_check;
alter table public.attendance_audit_events add constraint attendance_audit_events_action_check
  check (action in (
    'attendance_marked_present', 'attendance_marked_absent', 'attendance_marked_pending',
    'attendance_reason_updated', 'attendance_comment_updated', 'safety_talk_completed',
    'safety_talk_updated', 'sync_submitted', 'site_readiness_confirmed'
  )) not valid;

create or replace function private.confirm_site_readiness_internal(p_site_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_organization_id uuid;
  v_outcome text;
begin
  select case
    when bool_or(result.outcome = 'blocked') then 'blocked'
    when bool_or(result.outcome = 'unknown') then 'unknown'
    when bool_or(result.outcome = 'warning') then 'warning'
    else 'ready'
  end into v_outcome
  from private.evaluate_site_readiness_internal(p_site_id) result;

  if v_outcome not in ('ready', 'warning') then
    raise sqlstate '55000' using message = 'Site readiness must be ready or warning before start of shift';
  end if;

  select profile.organization_id into v_organization_id
  from public.profiles profile
  where profile.id = v_actor_id and profile.is_active = true;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_actor_id::text || ':' || p_site_id::text || ':' || ((statement_timestamp() at time zone 'Africa/Johannesburg')::date)::text, 0)
  );

  if not exists (
    select 1 from public.attendance_audit_events event
    where event.actor_id = v_actor_id
      and event.site_id = p_site_id
      and event.action = 'site_readiness_confirmed'
      and (event.occurred_at at time zone 'Africa/Johannesburg')::date = (statement_timestamp() at time zone 'Africa/Johannesburg')::date
  ) then
    insert into public.attendance_audit_events
      (actor_id, actor_name, site_id, action, details, organization_id)
    values
      (v_actor_id, 'Authenticated user', p_site_id, 'site_readiness_confirmed',
       'Start-of-shift readiness ' || v_outcome || ' confirmed under policy senatla-readiness-v1.0.0.', v_organization_id);
  end if;

  return v_outcome;
end;
$$;

comment on function private.confirm_site_readiness_internal(uuid) is
  'Atomically re-evaluates readiness and records one sanitized start-of-shift confirmation per actor, site and Johannesburg day.';

revoke all on function private.confirm_site_readiness_internal(uuid) from public, anon;
grant execute on function private.confirm_site_readiness_internal(uuid) to authenticated;

create or replace function public.confirm_site_readiness(p_site_id uuid)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.confirm_site_readiness_internal(p_site_id);
$$;

comment on function public.confirm_site_readiness(uuid) is
  'Security-invoker API for atomic start-of-shift readiness confirmation and sanitized audit evidence.';

revoke all on function public.confirm_site_readiness(uuid) from public, anon;
grant execute on function public.confirm_site_readiness(uuid) to authenticated;

alter table public.attendance_audit_events validate constraint attendance_audit_events_action_check;

commit;
