begin;

-- Cover foreign-key maintenance paths as well as the site/date query paths.
create index if not exists manager_shift_site_fk_idx on public.manager_shift_snapshots (site_id);
create index if not exists manager_shift_manager_fk_idx on public.manager_shift_snapshots (manager_profile_id);
create index if not exists manager_shift_reviewer_fk_idx on public.manager_shift_snapshots (reviewed_by);
create index if not exists manager_blocker_site_fk_idx on public.manager_blockers (site_id);
create index if not exists manager_blocker_snapshot_fk_idx on public.manager_blockers (shift_snapshot_id);
create index if not exists manager_blocker_owner_fk_idx on public.manager_blockers (owner_profile_id);

drop policy if exists manager_shift_insert on public.manager_shift_snapshots;
create policy manager_shift_insert on public.manager_shift_snapshots for insert to authenticated
with check (private.can_write_manager_control(site_id, organization_id) and manager_profile_id = (select auth.uid()) and status = 'draft');

drop policy if exists manager_blocker_insert on public.manager_blockers;
create policy manager_blocker_insert on public.manager_blockers for insert to authenticated
with check (private.can_write_manager_control(site_id, organization_id) and created_by = (select auth.uid()));

drop policy if exists manager_work_package_insert on public.manager_work_packages;
create policy manager_work_package_insert on public.manager_work_packages for insert to authenticated
with check (private.can_write_manager_control(site_id, organization_id) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));

drop policy if exists manager_work_package_update on public.manager_work_packages;
create policy manager_work_package_update on public.manager_work_packages for update to authenticated
using (private.can_write_manager_control(site_id, organization_id))
with check (private.can_write_manager_control(site_id, organization_id) and updated_by = (select auth.uid()));

drop policy if exists manager_control_idempotency_insert on public.manager_control_idempotency;
create policy manager_control_idempotency_insert on public.manager_control_idempotency for insert to authenticated
with check (manager_profile_id = (select auth.uid()) and private.can_write_manager_control(site_id, organization_id)
  and (select current_setting('senatla.manager_control_save', true)) = 'on');

commit;
