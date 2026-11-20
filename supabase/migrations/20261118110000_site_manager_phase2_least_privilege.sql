begin;

-- Supabase default privileges may grant more table operations than the
-- explicit Phase 2 grants. Reset these tables to the intended least privilege.
revoke all on public.manager_shift_snapshots, public.manager_workstation_readiness, public.manager_blockers, public.manager_work_packages, public.manager_control_events from authenticated, anon;
grant select, insert, update on public.manager_shift_snapshots, public.manager_workstation_readiness, public.manager_blockers, public.manager_work_packages to authenticated;
grant select on public.manager_control_events to authenticated;

commit;
