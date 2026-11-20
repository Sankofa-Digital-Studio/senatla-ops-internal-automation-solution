begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

select ok(to_regclass('public.manager_shift_snapshots') is not null, 'shift snapshot table exists');
select ok(to_regclass('public.manager_workstation_readiness') is not null, 'workstation readiness table exists');
select ok(to_regclass('public.manager_blockers') is not null, 'manager blocker table exists');
select ok(to_regclass('public.manager_work_packages') is not null, 'manager work package table exists');
select ok(to_regclass('public.manager_control_events') is not null, 'manager control event table exists');
select has_column('public', 'manager_work_packages', 'work_date', 'package work date is separate from due date');
select ok((select is_nullable = 'NO' from information_schema.columns where table_schema = 'public' and table_name = 'manager_work_packages' and column_name = 'work_date'), 'package work date is required');
select ok(not exists (
  select 1 from pg_class relation
  join pg_namespace schema on schema.oid = relation.relnamespace
  where schema.nspname = 'public'
    and relation.relname in ('manager_shift_snapshots', 'manager_workstation_readiness', 'manager_blockers', 'manager_work_packages', 'manager_control_events')
    and not relation.relrowsecurity
), 'RLS is enabled on every manager control table');
select ok(to_regprocedure('public.transition_manager_work_package_v1(uuid,text)') is not null, 'work transition function exists');
select ok(to_regprocedure('public.set_manager_shift_status_v1(uuid,text,text)') is not null, 'review status function exists');
select is((select prosecdef from pg_proc where oid = 'public.transition_manager_work_package_v1(uuid,text)'::regprocedure), false, 'work transition runs with caller rights');
select is((select prosecdef from pg_proc where oid = 'public.set_manager_shift_status_v1(uuid,text,text)'::regprocedure), false, 'review transition uses caller rights');
select ok(not has_function_privilege('anon', 'public.set_manager_shift_status_v1(uuid,text,text)', 'execute'), 'anonymous users cannot review manager handovers');
select ok(has_function_privilege('authenticated', 'public.set_manager_shift_status_v1(uuid,text,text)', 'execute'), 'authenticated users call the guarded review transition');
select ok(not has_table_privilege('authenticated', 'public.manager_control_events', 'INSERT'), 'clients cannot forge audit events');
select ok(not has_table_privilege('authenticated', 'public.manager_control_events', 'UPDATE'), 'clients cannot edit audit events');
select ok(not has_table_privilege('authenticated', 'public.manager_control_events', 'DELETE'), 'clients cannot delete audit events');
select ok(not exists (
  select 1 from unnest(array['manager_shift_snapshots','manager_workstation_readiness','manager_blockers','manager_work_packages']) table_name
  where has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
), 'clients cannot delete manager control records');
select ok(exists (
  select 1 from pg_trigger trigger_row join pg_class relation on relation.oid = trigger_row.tgrelid join pg_namespace schema on schema.oid = relation.relnamespace
  where schema.nspname = 'public' and relation.relname = 'manager_work_packages' and trigger_row.tgname = 'manager_work_package_start_gate' and not trigger_row.tgisinternal
), 'work start is gated at the database boundary');
select ok((
  select count(*) >= 4 from pg_trigger trigger_row join pg_class relation on relation.oid = trigger_row.tgrelid join pg_namespace schema on schema.oid = relation.relnamespace
  where schema.nspname = 'public' and relation.relname in ('manager_shift_snapshots','manager_workstation_readiness','manager_blockers','manager_work_packages') and trigger_row.tgname like 'manager_%_audit' and not trigger_row.tgisinternal
), 'manager record writes create database audit events');
select ok(to_regclass('public.manager_control_idempotency') is not null, 'atomic save idempotency ledger exists');
select ok((select relrowsecurity from pg_class where oid = 'public.manager_control_idempotency'::regclass), 'idempotency ledger is protected by RLS');
select ok(to_regprocedure('public.save_manager_control_state_v1(uuid,integer,uuid,date,jsonb)') is not null, 'atomic manager save function exists');
select is((select prosecdef from pg_proc where oid = 'public.save_manager_control_state_v1(uuid,integer,uuid,date,jsonb)'::regprocedure), false, 'atomic manager save uses caller rights');
select ok(has_function_privilege('authenticated', 'public.save_manager_control_state_v1(uuid,integer,uuid,date,jsonb)', 'execute') and not has_function_privilege('anon', 'public.save_manager_control_state_v1(uuid,integer,uuid,date,jsonb)', 'execute'), 'only authenticated callers can use the atomic save function');
select ok(exists (select 1 from pg_policy where polname = 'manager_control_idempotency_insert' and pg_get_expr(polwithcheck, polrelid) like '%senatla.manager_control_save%'), 'only the atomic save path can insert idempotency records');
select ok(exists (select 1 from pg_trigger where tgname = 'manager_shift_scope_insert_guard' and not tgisinternal), 'concurrent first saves are serialized');

set local session_replication_role = replica;
insert into public.profiles(id, username, display_name, role, is_active, organization_id)
values ('e9000000-0000-4000-8000-000000000001', 'phase2.manager.contract', 'Phase 2 Test Manager', 'site', true, '00000000-0000-4000-8000-000000000001');
insert into public.sites(id, name, location, manager_profile_id, is_active, organization_id)
values ('e9100000-0000-4000-8000-000000000001', 'Phase 2 Test Site', 'Yard', 'e9000000-0000-4000-8000-000000000001', true, '00000000-0000-4000-8000-000000000001');
insert into public.profile_site_access(profile_id, site_id, organization_id)
values ('e9000000-0000-4000-8000-000000000001', 'e9100000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001');
set local session_replication_role = origin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"e9000000-0000-4000-8000-000000000001","role":"authenticated","exp":4102444800}';

select lives_ok($save$
  select public.save_manager_control_state_v1(
    'e9200000-0000-4000-8000-000000000001', 0, 'e9100000-0000-4000-8000-000000000001', '2026-11-18',
    '{"managerMode":"site","shiftObjective":"Test shift","shiftTopRisk":"","shiftSupport":"","handoverNote":"","workstationReadiness":{"machine":false,"tools":false,"materials":false,"operator":false,"instruction":false,"inspection":false},"workshopWorkItems":[],"operationalBlockers":[]}'::jsonb
  )
$save$, 'atomic save writes the manager snapshot and linked collections');
select is((public.save_manager_control_state_v1(
  'e9200000-0000-4000-8000-000000000001', 0, 'e9100000-0000-4000-8000-000000000001', '2026-11-18',
  '{"managerMode":"site","shiftObjective":"Test shift","shiftTopRisk":"","shiftSupport":"","handoverNote":"","workstationReadiness":{"machine":false,"tools":false,"materials":false,"operator":false,"instruction":false,"inspection":false},"workshopWorkItems":[],"operationalBlockers":[]}'::jsonb
)->>'version'), '1', 'retry with the same request id returns the original version');
select throws_ok($stale$
  select public.save_manager_control_state_v1(
    'e9200000-0000-4000-8000-000000000002', 0, 'e9100000-0000-4000-8000-000000000001', '2026-11-18',
    '{"managerMode":"site","shiftObjective":"Stale shift","shiftTopRisk":"","shiftSupport":"","handoverNote":"","workstationReadiness":{"machine":false,"tools":false,"materials":false,"operator":false,"instruction":false,"inspection":false},"workshopWorkItems":[],"operationalBlockers":[]}'::jsonb
  )
$stale$, '40001', 'The manager shift changed. Reload it before saving again.', 'a stale save is rejected');
select is((select version from public.manager_shift_snapshots where site_id = 'e9100000-0000-4000-8000-000000000001' and work_date = '2026-11-18'), 1, 'idempotent replay and conflict do not increment the version');
select is((select count(*) from public.manager_workstation_readiness where site_id = 'e9100000-0000-4000-8000-000000000001'), 1::bigint, 'atomic save persists readiness once');
select is((select count(*) from public.manager_control_events where site_id = 'e9100000-0000-4000-8000-000000000001'), 2::bigint, 'snapshot and readiness writes are audited');

select * from finish();
rollback;
