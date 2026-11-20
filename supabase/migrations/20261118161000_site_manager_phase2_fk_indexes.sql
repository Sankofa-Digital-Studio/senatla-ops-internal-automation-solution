begin;

create index if not exists manager_readiness_site_fk_idx on public.manager_workstation_readiness (site_id);
create index if not exists manager_readiness_profile_fk_idx on public.manager_workstation_readiness (manager_profile_id);
create index if not exists manager_blocker_creator_fk_idx on public.manager_blockers (created_by);
create index if not exists manager_blocker_resolver_fk_idx on public.manager_blockers (resolved_by);
create index if not exists manager_work_package_site_fk_idx on public.manager_work_packages (site_id);
create index if not exists manager_work_package_snapshot_fk_idx on public.manager_work_packages (shift_snapshot_id);
create index if not exists manager_work_package_blocker_fk_idx on public.manager_work_packages (blocker_id);
create index if not exists manager_work_package_assignee_fk_idx on public.manager_work_packages (assigned_employee_id);
create index if not exists manager_work_package_creator_fk_idx on public.manager_work_packages (created_by);
create index if not exists manager_work_package_updater_fk_idx on public.manager_work_packages (updated_by);
create index if not exists manager_event_site_fk_idx on public.manager_control_events (site_id);
create index if not exists manager_event_snapshot_fk_idx on public.manager_control_events (shift_snapshot_id);
create index if not exists manager_event_actor_fk_idx on public.manager_control_events (actor_id);
create index if not exists manager_control_idempotency_site_fk_idx on public.manager_control_idempotency (site_id);
create index if not exists manager_control_idempotency_manager_fk_idx on public.manager_control_idempotency (manager_profile_id);
create index if not exists manager_control_idempotency_snapshot_fk_idx on public.manager_control_idempotency (snapshot_id);

commit;
