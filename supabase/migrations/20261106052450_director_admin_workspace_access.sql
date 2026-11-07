begin;

-- Office Admin retains administrative capability. Director administration is
-- restricted to the two exact developer/director identities; ordinary client
-- Directors remain oversight/read-only users.
create or replace function private.is_developer_director_internal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.current_app_role() = 'director'
    and exists (
      select 1 from auth.users person
      where person.id = auth.uid()
        and lower(person.email) in ('thosontula@gmail.com', 'thosontula+tag@gmail.com')
        and lower(person.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    ), false
  )
$$;

create or replace function public.is_developer_director()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.is_developer_director_internal()
$$;

revoke all on function private.is_developer_director_internal() from public, anon;
grant execute on function private.is_developer_director_internal() to authenticated;
revoke all on function public.is_developer_director() from public, anon;
grant execute on function public.is_developer_director() to authenticated;

create or replace function public.is_office_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'office' or (public.current_app_role() = 'director' and public.is_developer_director()), false)
$$;

-- The controlled assignment workflow historically allowed only Office Admin.
-- Keep the same readiness and audit contract available to directors by using the
-- existing internal workflow after the role gate is widened at the policy layer.
create or replace function public.can_manage_admin_workspace()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.is_office_admin()
$$;

create or replace function private.apply_employee_site_assignment_director_internal(
  p_employee_ids uuid[], p_target_site_id uuid, p_decision text, p_reason_code text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_actor uuid := auth.uid();
  v_count integer;
  v_moved integer;
  v_warning_count integer;
begin
  if v_actor is null or not private.auth_session_is_current() or not public.is_developer_director() then
    raise insufficient_privilege using message = 'Only the authorised developer Directors can use this workflow';
  end if;
  select organization_id into v_org from public.profiles where id = v_actor and is_active = true;
  if v_org is null or p_decision not in ('accept', 'reject', 'override') then
    raise invalid_parameter_value using message = 'Invalid assignment request';
  end if;
  if p_employee_ids is null or cardinality(p_employee_ids) < 1 or cardinality(p_employee_ids) > 100
     or exists (select 1 from unnest(p_employee_ids) employee_id where employee_id is null) then
    raise invalid_parameter_value using message = 'Select between one and one hundred employees';
  end if;
  if not exists (select 1 from public.sites where id = p_target_site_id and organization_id = v_org and is_active = true) then
    raise sqlstate '55000' using message = 'Select an active organization site';
  end if;
  select count(*)::integer into v_count from public.employees where id = any(p_employee_ids) and organization_id = v_org;
  if v_count <> (select count(distinct employee_id)::integer from unnest(p_employee_ids) employee_id) then
    raise insufficient_privilege using message = 'Employee assignment selection is outside the active organization';
  end if;
  if p_decision = 'reject' then
    if p_reason_code not in ('assignment_deferred', 'alternative_not_suitable', 'additional_evidence_required') then
      raise invalid_parameter_value using message = 'Select a controlled rejection reason';
    end if;
    insert into public.admin_activity_log(organization_id, actor_id, actor_name, action, entity_type, entity_id, details)
    values(v_org, v_actor, coalesce((select display_name from public.profiles where id = v_actor), 'Director'), 'employee_assignment_rejected', 'employee_assignment', p_target_site_id::text, jsonb_build_object('count', v_count, 'reasonCode', p_reason_code));
    return 0;
  end if;
  if exists (
    select 1 from public.employees employee
    left join public.employee_onboarding_records onboarding on onboarding.employee_id = employee.id and onboarding.organization_id = v_org
    where employee.id = any(p_employee_ids) and employee.organization_id = v_org
      and (employee.employment_status <> 'active' or onboarding.id is null or onboarding.medical_status in ('pending', 'unfit'))
  ) then
    raise sqlstate '55000' using message = 'Hard blockers or missing readiness evidence must be resolved before assignment';
  end if;
  select count(*)::integer into v_warning_count from public.employee_onboarding_records onboarding
  where onboarding.employee_id = any(p_employee_ids) and onboarding.organization_id = v_org
    and onboarding.medical_status = 'restricted';
  if v_warning_count > 0 then
    if p_decision <> 'override' or p_reason_code not in ('restricted_duties_confirmed', 'operational_continuity', 'manager_authorized') then
      raise sqlstate '55000' using message = 'Assignment warnings require a controlled override reason';
    end if;
  elsif p_decision <> 'accept' then
    raise invalid_parameter_value using message = 'Ready assignments must be explicitly accepted';
  end if;
  select count(*)::integer into v_moved from public.employees where id = any(p_employee_ids) and organization_id = v_org and site_id is distinct from p_target_site_id;
  perform set_config('senatla.assignment_resource', 'employee', true);
  update public.employees set site_id = p_target_site_id, updated_at = timezone('utc', now())
  where id = any(p_employee_ids) and organization_id = v_org and site_id is distinct from p_target_site_id;
  perform set_config('senatla.assignment_resource', '', true);
  insert into public.admin_activity_log(organization_id, actor_id, actor_name, action, entity_type, entity_id, details)
  values(v_org, v_actor, coalesce((select display_name from public.profiles where id = v_actor), 'Director'), 'employee_assignment_applied', 'employee_assignment', p_target_site_id::text, jsonb_build_object('selectedCount', v_count, 'movedCount', v_moved, 'decision', p_decision, 'reasonCode', p_reason_code));
  return v_moved;
end;
$$;

create or replace function public.apply_employee_site_assignment_director(
  p_employee_ids uuid[], p_target_site_id uuid, p_decision text, p_reason_code text default null
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.apply_employee_site_assignment_director_internal(
    p_employee_ids, p_target_site_id, p_decision, p_reason_code
  );
$$;

revoke all on function private.apply_employee_site_assignment_director_internal(uuid[], uuid, text, text) from public, anon;
grant execute on function private.apply_employee_site_assignment_director_internal(uuid[], uuid, text, text) to authenticated;
revoke all on function public.apply_employee_site_assignment_director(uuid[], uuid, text, text) from public, anon;
grant execute on function public.apply_employee_site_assignment_director(uuid[], uuid, text, text) to authenticated;

comment on function public.is_developer_director() is
  'Elevated Director administration is limited to the exact developer mailboxes.';

comment on function public.is_office_admin() is
  'Administrative workspace capability for active Office Admins and exact developer Directors.';

-- The existing employee/site policies trusted the role helper but did not
-- consistently pin writes to the current organization.
alter policy employees_insert on public.employees
  with check (organization_id = private.current_organization_id() and public.is_office_admin());
alter policy employees_update on public.employees
  using (organization_id = private.current_organization_id() and public.is_office_admin())
  with check (organization_id = private.current_organization_id() and public.is_office_admin());
alter policy employees_delete on public.employees
  using (organization_id = private.current_organization_id() and public.is_office_admin());
alter policy sites_insert on public.sites
  with check (organization_id = private.current_organization_id() and public.is_office_admin());
alter policy sites_update on public.sites
  using (organization_id = private.current_organization_id() and public.is_office_admin())
  with check (organization_id = private.current_organization_id() and public.is_office_admin());
alter policy sites_delete on public.sites
  using (organization_id = private.current_organization_id() and public.is_office_admin());

-- Asset intake and the shared admin workspace use this site capability.
create or replace function private.can_manage_asset_site(target_site_id uuid, target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    target_organization_id = private.current_organization_id()
    and (
      private.current_app_role() = 'office'
      or public.is_developer_director()
      or (target_site_id is not null and private.has_site_access(target_site_id, target_organization_id)
          and private.current_app_role() = 'site')
    ), false
  )
$$;

commit;
