begin;

-- Trigger functions do not require relation lookup; pinning an empty search path
-- prevents caller-controlled schema resolution without changing behavior.
alter function public.prevent_payroll_period_reopen() set search_path = '';
alter function public.prevent_approval_redecision() set search_path = '';
alter function public.set_updated_at() set search_path = '';

-- An ALL policy also participates in SELECT, so pairing it with a read policy
-- creates multiple permissive SELECT policies. Split each write policy into
-- command-specific policies while preserving the original predicates.
drop policy if exists "employee_groups_write" on public.employee_groups;
drop policy if exists "employee_groups_insert" on public.employee_groups;
drop policy if exists "employee_groups_update" on public.employee_groups;
drop policy if exists "employee_groups_delete" on public.employee_groups;
create policy "employee_groups_insert" on public.employee_groups for insert to authenticated
  with check (public.is_office_admin());
create policy "employee_groups_update" on public.employee_groups for update to authenticated
  using (public.is_office_admin()) with check (public.is_office_admin());
create policy "employee_groups_delete" on public.employee_groups for delete to authenticated
  using (public.is_office_admin());

drop policy if exists "employees_write" on public.employees;
drop policy if exists "employees_insert" on public.employees;
drop policy if exists "employees_update" on public.employees;
drop policy if exists "employees_delete" on public.employees;
create policy "employees_insert" on public.employees for insert to authenticated
  with check (public.is_office_admin());
create policy "employees_update" on public.employees for update to authenticated
  using (public.is_office_admin()) with check (public.is_office_admin());
create policy "employees_delete" on public.employees for delete to authenticated
  using (public.is_office_admin());

drop policy if exists "financial_types_write" on public.financial_types;
drop policy if exists "financial_types_insert" on public.financial_types;
drop policy if exists "financial_types_update" on public.financial_types;
drop policy if exists "financial_types_delete" on public.financial_types;
create policy "financial_types_insert" on public.financial_types for insert to authenticated
  with check (public.is_office_admin());
create policy "financial_types_update" on public.financial_types for update to authenticated
  using (public.is_office_admin()) with check (public.is_office_admin());
create policy "financial_types_delete" on public.financial_types for delete to authenticated
  using (public.is_office_admin());

drop policy if exists "integration_outbox_write" on public.integration_outbox;
drop policy if exists "integration_outbox_insert" on public.integration_outbox;
drop policy if exists "integration_outbox_update" on public.integration_outbox;
drop policy if exists "integration_outbox_delete" on public.integration_outbox;
create policy "integration_outbox_insert" on public.integration_outbox for insert to authenticated
  with check (
    public.is_office_admin()
    and organization_id = '00000000-0000-4000-8000-000000000001'::uuid
  );
create policy "integration_outbox_update" on public.integration_outbox for update to authenticated
  using (public.is_office_admin())
  with check (
    public.is_office_admin()
    and organization_id = '00000000-0000-4000-8000-000000000001'::uuid
  );
create policy "integration_outbox_delete" on public.integration_outbox for delete to authenticated
  using (public.is_office_admin());

drop policy if exists "issues_write" on public.issues;
drop policy if exists "issues_insert" on public.issues;
drop policy if exists "issues_update" on public.issues;
drop policy if exists "issues_delete" on public.issues;
create policy "issues_insert" on public.issues for insert to authenticated
  with check (public.is_office_admin());
create policy "issues_update" on public.issues for update to authenticated
  using (public.is_office_admin()) with check (public.is_office_admin());
create policy "issues_delete" on public.issues for delete to authenticated
  using (public.is_office_admin());

drop policy if exists "payroll_periods_write" on public.payroll_periods;
drop policy if exists "payroll_periods_insert" on public.payroll_periods;
drop policy if exists "payroll_periods_update" on public.payroll_periods;
drop policy if exists "payroll_periods_delete" on public.payroll_periods;
create policy "payroll_periods_insert" on public.payroll_periods for insert to authenticated
  with check (public.is_office_admin());
create policy "payroll_periods_update" on public.payroll_periods for update to authenticated
  using (public.is_office_admin()) with check (public.is_office_admin());
create policy "payroll_periods_delete" on public.payroll_periods for delete to authenticated
  using (public.is_office_admin());

drop policy if exists "profile_site_access_write" on public.profile_site_access;
drop policy if exists "profile_site_access_insert" on public.profile_site_access;
drop policy if exists "profile_site_access_update" on public.profile_site_access;
drop policy if exists "profile_site_access_delete" on public.profile_site_access;
create policy "profile_site_access_insert" on public.profile_site_access for insert to authenticated
  with check (
    public.is_office_admin()
    and organization_id = private.current_organization_id()
    and exists (
      select 1 from public.profiles profile
      where profile.id = profile_site_access.profile_id
        and profile.role = 'site'::public.app_role
        and profile.is_active
        and profile.organization_id = profile_site_access.organization_id
    )
    and exists (
      select 1 from public.sites site
      where site.id = profile_site_access.site_id
        and site.organization_id = profile_site_access.organization_id
    )
  );
create policy "profile_site_access_update" on public.profile_site_access for update to authenticated
  using (public.is_office_admin())
  with check (
    public.is_office_admin()
    and organization_id = private.current_organization_id()
    and exists (
      select 1 from public.profiles profile
      where profile.id = profile_site_access.profile_id
        and profile.role = 'site'::public.app_role
        and profile.is_active
        and profile.organization_id = profile_site_access.organization_id
    )
    and exists (
      select 1 from public.sites site
      where site.id = profile_site_access.site_id
        and site.organization_id = profile_site_access.organization_id
    )
  );
create policy "profile_site_access_delete" on public.profile_site_access for delete to authenticated
  using (public.is_office_admin());

drop policy if exists "saved_admin_views_write" on public.saved_admin_views;
drop policy if exists "saved_admin_views_insert" on public.saved_admin_views;
drop policy if exists "saved_admin_views_update" on public.saved_admin_views;
drop policy if exists "saved_admin_views_delete" on public.saved_admin_views;
create policy "saved_admin_views_insert" on public.saved_admin_views for insert to authenticated
  with check (
    public.is_office_admin()
    and created_by = (select auth.uid())
  );
create policy "saved_admin_views_update" on public.saved_admin_views for update to authenticated
  using (public.is_office_admin())
  with check (
    public.is_office_admin()
    and created_by = (select auth.uid())
  );
create policy "saved_admin_views_delete" on public.saved_admin_views for delete to authenticated
  using (public.is_office_admin());

drop policy if exists "sites_write" on public.sites;
drop policy if exists "sites_insert" on public.sites;
drop policy if exists "sites_update" on public.sites;
drop policy if exists "sites_delete" on public.sites;
create policy "sites_insert" on public.sites for insert to authenticated
  with check (public.is_office_admin());
create policy "sites_update" on public.sites for update to authenticated
  using (public.is_office_admin()) with check (public.is_office_admin());
create policy "sites_delete" on public.sites for delete to authenticated
  using (public.is_office_admin());

commit;