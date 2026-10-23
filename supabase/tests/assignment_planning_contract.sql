begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

set local session_replication_role = replica;
insert into public.profiles (id, username, display_name, role, is_active, organization_id) values
  ('71000000-0000-4000-8000-000000000001', 'assignment.office', 'Assignment Office', 'office', true, '00000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-000000000002', 'assignment.director', 'Assignment Director', 'director', true, '00000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-000000000003', 'assignment.site', 'Assignment Site', 'site', true, '00000000-0000-4000-8000-000000000001');
insert into public.sites (id, name, location, is_active, organization_id) values
  ('72000000-0000-4000-8000-000000000001', 'Assignment North', 'North', true, '00000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-000000000002', 'Assignment South', 'South', true, '00000000-0000-4000-8000-000000000001');
insert into public.employees (id, first_name, surname, id_number, role, site_id, employment_status, start_date, organization_id) values
  ('73000000-0000-4000-8000-000000000001', 'Ready', 'Worker', 'ASSIGN-SECRET-READY', 'Operator', '72000000-0000-4000-8000-000000000001', 'active', current_date, '00000000-0000-4000-8000-000000000001'),
  ('73000000-0000-4000-8000-000000000002', 'Restricted', 'Worker', 'ASSIGN-SECRET-RESTRICTED', 'Operator', '72000000-0000-4000-8000-000000000001', 'active', current_date, '00000000-0000-4000-8000-000000000001'),
  ('73000000-0000-4000-8000-000000000003', 'Unfit', 'Worker', 'ASSIGN-SECRET-UNFIT', 'Operator', '72000000-0000-4000-8000-000000000001', 'active', current_date, '00000000-0000-4000-8000-000000000001'),
  ('73000000-0000-4000-8000-000000000004', 'No Change', 'Worker', 'ASSIGN-SECRET-NOCHANGE', 'Operator', '72000000-0000-4000-8000-000000000002', 'active', current_date, '00000000-0000-4000-8000-000000000001');
insert into public.employee_onboarding_records
  (id, organization_id, employee_id, criminal_check_status, fingerprint_check_status, medical_status, notes, updated_by) values
  ('74000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'clear', 'clear', 'fit', 'ASSIGN SECRET READY NOTE', '71000000-0000-4000-8000-000000000001'),
  ('74000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000002', 'clear', 'clear', 'restricted', 'ASSIGN SECRET RESTRICTED NOTE', '71000000-0000-4000-8000-000000000001'),
  ('74000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000003', 'clear', 'clear', 'unfit', 'ASSIGN SECRET UNFIT NOTE', '71000000-0000-4000-8000-000000000001'),
  ('74000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000004', 'clear', 'clear', 'fit', 'ASSIGN SECRET NOCHANGE NOTE', '71000000-0000-4000-8000-000000000001');
insert into public.assets
  (id, registration_number, serial_number, vin, make, model, type, license_expiry, status, assigned_site_id, organization_id, lifecycle_state) values
  ('75000000-0000-4000-8000-000000000001', 'ASSIGN-READY', 'ASSIGN-SERIAL-1', 'ASSIGN-VIN-1', 'Test', 'Ready', 'Plant', current_date + 90, 'Active', '72000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'active'),
  ('75000000-0000-4000-8000-000000000002', 'ASSIGN-BLOCKED', 'ASSIGN-SERIAL-2', 'ASSIGN-VIN-2', 'Test', 'Blocked', 'Plant', current_date + 90, 'Active', '72000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'active'),
  ('75000000-0000-4000-8000-000000000003', 'ASSIGN-DUE', 'ASSIGN-SERIAL-3', 'ASSIGN-VIN-3', 'Test', 'Due', 'Plant', current_date + 90, 'Active', '72000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'active'),
  ('75000000-0000-4000-8000-000000000004', 'ASSIGN-NOCHANGE', 'ASSIGN-SERIAL-4', 'ASSIGN-VIN-4', 'Test', 'No Change', 'Plant', current_date + 90, 'Active', '72000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'active');
insert into public.asset_work_orders (id, organization_id, asset_id, title, status, priority, cost) values
  ('76000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '75000000-0000-4000-8000-000000000002', 'ASSIGN SECRET FAILURE', 'open', 'critical', 0);
insert into public.asset_compliance_records
  (id, organization_id, asset_id, compliance_type, reference_number, expires_at, status, notes) values
  ('77000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '75000000-0000-4000-8000-000000000003', 'inspection', 'ASSIGN-SECRET-REFERENCE', current_date + 20, 'due', 'ASSIGN SECRET COMPLIANCE NOTE');
set local session_replication_role = origin;

select has_function('public', 'apply_employee_site_assignment', array['uuid[]','uuid','text','text'], 'employee assignment RPC exists');
select has_function('public', 'apply_asset_site_transfer', array['uuid','uuid','text','text','text','text'], 'asset transfer RPC exists');
select ok(not has_function_privilege('anon', 'public.apply_employee_site_assignment(uuid[],uuid,text,text)', 'EXECUTE'), 'anonymous role cannot assign employees');
select ok(not has_function_privilege('anon', 'public.apply_asset_site_transfer(uuid,uuid,text,text,text,text)', 'EXECUTE'), 'anonymous role cannot transfer assets');
select ok(has_function_privilege('authenticated', 'public.apply_employee_site_assignment(uuid[],uuid,text,text)', 'EXECUTE'), 'authenticated role can invoke the guarded employee RPC');
select ok(has_function_privilege('authenticated', 'public.apply_asset_site_transfer(uuid,uuid,text,text,text,text)', 'EXECUTE'), 'authenticated role can invoke the guarded asset RPC');
select is((select prosecdef from pg_proc where oid = 'public.apply_employee_site_assignment(uuid[],uuid,text,text)'::regprocedure), false, 'employee public wrapper is security invoker');
select is((select prosecdef from pg_proc where oid = 'private.apply_employee_site_assignment_internal(uuid[],uuid,text,text)'::regprocedure), true, 'employee privileged implementation remains private');
select is((select prosecdef from pg_proc where oid = 'public.apply_asset_site_transfer(uuid,uuid,text,text,text,text)'::regprocedure), false, 'asset public wrapper is security invoker');
select is((select prosecdef from pg_proc where oid = 'private.apply_asset_site_transfer_internal(uuid,uuid,text,text,text,text)'::regprocedure), true, 'asset privileged implementation remains private');
select throws_ok($$ update public.employees set site_id = '72000000-0000-4000-8000-000000000002' where id = '73000000-0000-4000-8000-000000000001' $$, '55000', 'Use the controlled employee assignment workflow', 'direct employee site mutation is rejected');
select throws_ok($$ update public.assets set assigned_site_id = '72000000-0000-4000-8000-000000000002' where id = '75000000-0000-4000-8000-000000000001' $$, '55000', 'Use the controlled asset transfer workflow', 'direct asset site mutation is rejected');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated","exp":4102444800}';
select throws_ok($$ select public.apply_employee_site_assignment(array['73000000-0000-4000-8000-000000000001']::uuid[], '72000000-0000-4000-8000-000000000002', 'accept', null) $$, '42501', 'Only active Office Admin users can apply assignments', 'site role cannot assign employees');
set local "request.jwt.claims" = '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","exp":4102444800}';
select throws_ok($$ select public.apply_asset_site_transfer('75000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000002', 'Custodian', 'note', 'accept', null) $$, '42501', 'Only active Office Admin users can apply assignments', 'director cannot transfer assets');
set local "request.jwt.claims" = '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","exp":4102444800}';
select throws_ok($$ select public.apply_employee_site_assignment(array['73000000-0000-4000-8000-000000000003']::uuid[], '72000000-0000-4000-8000-000000000002', 'accept', null) $$, '55000', 'Hard blockers or missing readiness evidence must be resolved before assignment', 'unfit employee cannot be assigned');
select throws_ok($$ select public.apply_employee_site_assignment(array['73000000-0000-4000-8000-000000000002']::uuid[], '72000000-0000-4000-8000-000000000002', 'accept', null) $$, '55000', 'Assignment warnings require a controlled override reason', 'restricted employee requires an override');
select is(public.apply_employee_site_assignment(array['73000000-0000-4000-8000-000000000002']::uuid[], '72000000-0000-4000-8000-000000000002', 'override', 'restricted_duties_confirmed'), 1, 'controlled employee override moves one employee');
select is((select site_id from public.employees where id = '73000000-0000-4000-8000-000000000002'), '72000000-0000-4000-8000-000000000002'::uuid, 'employee override persists the target site');
select throws_ok($$ update public.employees set site_id = '72000000-0000-4000-8000-000000000001' where id = '73000000-0000-4000-8000-000000000002' $$, '55000', 'Use the controlled employee assignment workflow', 'employee guard marker cannot be reused after the RPC in the same transaction');
select is(public.apply_employee_site_assignment(array['73000000-0000-4000-8000-000000000004']::uuid[], '72000000-0000-4000-8000-000000000002', 'accept', null), 0, 'employee no-op reports zero moved rows');
select is(public.apply_employee_site_assignment(array['73000000-0000-4000-8000-000000000001']::uuid[], '72000000-0000-4000-8000-000000000002', 'reject', 'assignment_deferred'), 0, 'controlled rejection changes no employee');
select is((select site_id from public.employees where id = '73000000-0000-4000-8000-000000000001'), '72000000-0000-4000-8000-000000000001'::uuid, 'rejected employee assignment preserves its original site');
select throws_ok($$ select public.apply_asset_site_transfer('75000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002', 'Custodian', 'note', 'accept', null) $$, '55000', 'Hard asset blockers must be resolved before transfer', 'critical work order blocks asset transfer');
select throws_ok($$ select public.apply_asset_site_transfer('75000000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000002', 'Custodian', 'note', 'accept', null) $$, '55000', 'Asset transfer warnings require a controlled override reason', 'due compliance requires an asset override');
select ok(public.apply_asset_site_transfer('75000000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000002', 'Custodian', 'PRIVATE HANDOVER NOTE', 'override', 'maintenance_plan_confirmed') is not null, 'controlled asset override creates a custody event');
select is((select assigned_site_id from public.assets where id = '75000000-0000-4000-8000-000000000003'), '72000000-0000-4000-8000-000000000002'::uuid, 'asset override persists the target site');
select is((select count(*) from public.asset_custody_events where asset_id = '75000000-0000-4000-8000-000000000003'), 1::bigint, 'asset override creates exactly one custody event');
select throws_ok($$ update public.assets set assigned_site_id = '72000000-0000-4000-8000-000000000001' where id = '75000000-0000-4000-8000-000000000003' $$, '55000', 'Use the controlled asset transfer workflow', 'asset guard marker cannot be reused after the RPC in the same transaction');
select is(public.apply_asset_site_transfer('75000000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000002', 'Custodian', 'PRIVATE NOOP NOTE', 'accept', null), null::uuid, 'asset no-op returns no custody event');
select ok(not ((select jsonb_agg(details)::text from public.admin_activity_log where actor_id = '71000000-0000-4000-8000-000000000001') ~* 'SECRET|PRIVATE|id_number|medical|notes|reference'), 'assignment audit payloads exclude protected source and handover detail');

select * from finish();
rollback;
