begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

set local session_replication_role = replica;
insert into auth.users (
  instance_id, id, aud, role, email, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'readiness.office@senatla.test', timezone('utc', now()), timezone('utc', now()), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'readiness.director@senatla.test', timezone('utc', now()), timezone('utc', now()), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'readiness.site.a@senatla.test', timezone('utc', now()), timezone('utc', now()), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'readiness.site.b@senatla.test', timezone('utc', now()), timezone('utc', now()), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'readiness.inactive@senatla.test', timezone('utc', now()), timezone('utc', now()), '', '', '', '');
insert into public.profiles (id, username, display_name, role, is_active, organization_id)
values
  ('61000000-0000-4000-8000-000000000001', 'readiness.office', 'Readiness Office', 'office', true, '00000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000002', 'readiness.director', 'Readiness Director', 'director', true, '00000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000003', 'readiness.site.a', 'Readiness Site A', 'site', true, '00000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000004', 'readiness.site.b', 'Readiness Site B', 'site', true, '00000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000005', 'readiness.inactive', 'Readiness Inactive', 'site', false, '00000000-0000-4000-8000-000000000001');
insert into public.sites (id, name, location, is_active, organization_id, compliance_checklist) values
  ('62000000-0000-4000-8000-000000000001', 'Readiness North', 'North', true, '00000000-0000-4000-8000-000000000001', array['Readiness verified']::text[]),
  ('62000000-0000-4000-8000-000000000002', 'Readiness South', 'South', true, '00000000-0000-4000-8000-000000000001', array[]::text[]);
insert into public.profile_site_access (profile_id, site_id, organization_id) values
  ('61000000-0000-4000-8000-000000000003', '62000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000004', '62000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000005', '62000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001');
insert into public.employees (id, first_name, surname, id_number, role, site_id, employment_status, start_date, organization_id) values
  ('63000000-0000-4000-8000-000000000001', 'North', 'Ready', 'SECRET-ID-NORTH', 'Operator', '62000000-0000-4000-8000-000000000001', 'active', current_date, '00000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000002', 'North', 'Blocked', 'SECRET-ID-BLOCKED', 'Operator', '62000000-0000-4000-8000-000000000001', 'active', current_date, '00000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000003', 'South', 'Unknown', 'SECRET-ID-SOUTH', 'Operator', '62000000-0000-4000-8000-000000000002', 'active', current_date, '00000000-0000-4000-8000-000000000001');
insert into public.employee_onboarding_records
  (id, organization_id, employee_id, criminal_check_status, fingerprint_check_status, medical_status, red_ticket_number, red_ticket_issued_at, red_ticket_expires_at, notes, updated_by) values
  ('64000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', 'failed', 'failed', 'fit', 'SECRET-TICKET-READY', current_date - 10, current_date + 100, 'SECRET MEDICAL NOTE', '61000000-0000-4000-8000-000000000001'),
  ('64000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000002', 'clear', 'clear', 'unfit', 'SECRET-TICKET-BLOCKED', current_date - 20, current_date + 20, 'SECRET UNFIT NOTE', '61000000-0000-4000-8000-000000000001');
insert into public.assets
  (id, registration_number, serial_number, vin, make, model, type, license_expiry, status, assigned_site_id, organization_id, lifecycle_state) values
  ('65000000-0000-4000-8000-000000000001', 'READY-ASSET', 'READY-SERIAL', 'READY-VIN', 'Test', 'Ready', 'Plant', current_date + 10, 'Active', '62000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'active'),
  ('65000000-0000-4000-8000-000000000002', 'MAINT-ASSET', 'MAINT-SERIAL', 'MAINT-VIN', 'Test', 'Maintenance', 'Plant', current_date - 10, 'Inactive', '62000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'maintenance'),
  ('65000000-0000-4000-8000-000000000003', 'SOUTH-ASSET', 'SOUTH-SERIAL', 'SOUTH-VIN', 'Test', 'South', 'Plant', current_date + 10, 'Active', '62000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'active');
insert into public.asset_compliance_records
  (id, organization_id, asset_id, compliance_type, reference_number, expires_at, status, notes) values
  ('66000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '65000000-0000-4000-8000-000000000001', 'inspection', 'SECRET-COMPLIANCE-READY', current_date + 10, 'valid', 'SECRET ASSET NOTE'),
  ('66000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '65000000-0000-4000-8000-000000000002', 'inspection', 'SECRET-COMPLIANCE-EXPIRED', current_date - 10, 'expired', 'SECRET EXPIRED NOTE'),
  ('66000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '65000000-0000-4000-8000-000000000003', 'inspection', 'SECRET-COMPLIANCE-SOUTH', current_date + 10, 'valid', 'SECRET SOUTH NOTE');
insert into public.asset_work_orders
  (id, organization_id, asset_id, title, status, priority, cost) values
  ('67000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '65000000-0000-4000-8000-000000000003', 'Synthetic blocking work order', 'blocked', 'critical', 0);
set local session_replication_role = origin;

select has_function('public', 'evaluate_site_readiness', array['uuid'], 'sanitized readiness RPC exists');
select function_returns('public', 'evaluate_site_readiness', 'setof record', 'readiness RPC returns a record set');
select ok(not has_function_privilege('anon', 'public.evaluate_site_readiness(uuid)', 'EXECUTE'), 'anonymous role cannot execute readiness RPC');
select ok(has_function_privilege('authenticated', 'public.evaluate_site_readiness(uuid)', 'EXECUTE'), 'authenticated role can execute readiness RPC');
select is((select prosecdef from pg_proc where oid = 'public.evaluate_site_readiness(uuid)'::regprocedure), false, 'public API wrapper uses caller privileges');
select is((select prosecdef from pg_proc where oid = 'private.evaluate_site_readiness_internal(uuid)'::regprocedure), true, 'privileged evaluator remains in the private schema');
select ok(not has_function_privilege('anon', 'private.evaluate_site_readiness_internal(uuid)', 'EXECUTE'), 'anonymous role cannot execute the private evaluator');
select ok((select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.evaluate_site_readiness(uuid)'::regprocedure), 'public wrapper pins an empty search path');
select ok((select proconfig @> array['search_path=""'] from pg_proc where oid = 'private.evaluate_site_readiness_internal(uuid)'::regprocedure), 'private evaluator pins an empty search path');
select has_function('public', 'confirm_site_readiness', array['uuid'], 'atomic readiness confirmation RPC exists');
select ok(not has_function_privilege('anon', 'public.confirm_site_readiness(uuid)', 'EXECUTE'), 'anonymous role cannot confirm readiness');
select ok(has_function_privilege('authenticated', 'public.confirm_site_readiness(uuid)', 'EXECUTE'), 'authenticated role can confirm readiness');
select is((select prosecdef from pg_proc where oid = 'public.confirm_site_readiness(uuid)'::regprocedure), false, 'public confirmation wrapper uses caller privileges');
select is((select prosecdef from pg_proc where oid = 'private.confirm_site_readiness_internal(uuid)'::regprocedure), true, 'atomic confirmation implementation remains private and privileged');
select ok(not has_function_privilege('anon', 'private.confirm_site_readiness_internal(uuid)', 'EXECUTE'), 'anonymous role cannot execute the private confirmation implementation');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"61000000-0000-4000-8000-000000000003","role":"authenticated","exp":4102444800}';
select is((select count(*) from public.employee_onboarding_records), 0::bigint, 'site user cannot read raw onboarding records');
select is((select count(*) from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001')), 5::bigint, 'site A receives only its site, two employees and two assets');
select is((select count(*) from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') where entity_type = 'employee'), 2::bigint, 'site A receives sanitized employee readiness rows');
select is((select entity_label from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') where entity_type = 'site'), 'Readiness North', 'site label is useful and sanitized');
select is((select entity_label from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') where entity_id = '65000000-0000-4000-8000-000000000001'), 'READY-ASSET', 'asset label prefers a safe operational identifier and does not expose VIN');
select is((select outcome from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') where entity_id = '63000000-0000-4000-8000-000000000001'), 'ready', 'criminal and fingerprint fields do not create unsupported readiness rules');
select is((select reason_codes from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') where entity_id = '63000000-0000-4000-8000-000000000002'), array['EMPLOYEE_CLEARANCE_BLOCKED']::text[], 'employee blocker is sanitized');
select is((select reason_codes from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') where entity_id = '65000000-0000-4000-8000-000000000002'), array['ASSET_IN_MAINTENANCE']::text[], 'asset lifecycle precedence wins over status and compliance');
select is((select count(distinct policy_version) from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001')), 1::bigint, 'all rows carry one policy version');
select is((select min(policy_version) from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001')), 'senatla-readiness-v1.0.0', 'server policy version matches the client contract');
select is((select reason_codes from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') where entity_id = '65000000-0000-4000-8000-000000000001'), array['ASSET_LICENCE_DUE']::text[], 'licence warning window is deterministic at thirty days');
select is((select count(distinct evaluated_at) from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001')), 1::bigint, 'one evaluation uses one timestamp');
select ok(not ((select jsonb_agg(to_jsonb(result))::text from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') result) ~* 'SECRET|criminal|fingerprint|medical|ticket|id_number|reference_number|notes'), 'site output has no raw sensitive fields or fixture secrets');
select throws_ok($$ select * from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000002') $$, '42501', 'Site access denied', 'site A cannot evaluate site B');

set local "request.jwt.claims" = '{"sub":"61000000-0000-4000-8000-000000000004","role":"authenticated","exp":4102444800}';
select is((select count(*) from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000002')), 3::bigint, 'site B receives only its site, employee and asset');
select is((select reason_codes from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000002') where entity_id = '63000000-0000-4000-8000-000000000003'), array['EMPLOYEE_READINESS_EVIDENCE_MISSING']::text[], 'missing employee evidence is unknown without inventing a rule');
select is((select reason_codes from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000002') where entity_type = 'site'), array['SITE_CHECKLIST_EVIDENCE_MISSING']::text[], 'missing site checklist evidence fails closed as unknown');
select is((select reason_codes from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000002') where entity_id = '65000000-0000-4000-8000-000000000003'), array['ASSET_WORK_ORDER_BLOCKING']::text[], 'critical or blocked work orders override advisory expiry warnings');
select throws_ok($$ select * from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') $$, '42501', 'Site access denied', 'site B cannot evaluate site A');

set local "request.jwt.claims" = '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","exp":4102444800}';
select is((select count(*) from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000002')), 3::bigint, 'office can evaluate an organization site');
select ok(not ((select jsonb_agg(to_jsonb(result))::text from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') result) ~* 'SECRET|criminal|fingerprint|medical|ticket|id_number|reference_number|notes'), 'office receives sanitized contract');

set local "request.jwt.claims" = '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated","exp":4102444800}';
select is((select count(*) from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001')), 5::bigint, 'director can evaluate an organization site');
select ok(not ((select jsonb_agg(to_jsonb(result))::text from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') result) ~* 'SECRET|criminal|fingerprint|medical|ticket|id_number|reference_number|notes'), 'director receives sanitized contract');

reset role;
update public.employee_onboarding_records set medical_status = 'fit' where employee_id = '63000000-0000-4000-8000-000000000002';
update public.assets set lifecycle_state = 'active', status = 'Active', license_expiry = current_date + 60 where id = '65000000-0000-4000-8000-000000000002';
update public.asset_compliance_records set status = 'valid', expires_at = current_date + 60 where asset_id = '65000000-0000-4000-8000-000000000002';
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"61000000-0000-4000-8000-000000000003","role":"authenticated","exp":4102444800}';
select is(public.confirm_site_readiness('62000000-0000-4000-8000-000000000001'), 'warning', 'atomic confirmation re-evaluates and accepts warning readiness');
select is((select count(*) from public.attendance_audit_events where actor_id = '61000000-0000-4000-8000-000000000003' and site_id = '62000000-0000-4000-8000-000000000001' and action = 'site_readiness_confirmed'), 1::bigint, 'confirmation creates one immutable site audit event');
do $$ begin perform public.confirm_site_readiness('62000000-0000-4000-8000-000000000001'); end $$;
select is((select count(*) from public.attendance_audit_events where actor_id = '61000000-0000-4000-8000-000000000003' and site_id = '62000000-0000-4000-8000-000000000001' and action = 'site_readiness_confirmed'), 1::bigint, 'same actor site and Johannesburg day is idempotent');
select ok(not ((select details from public.attendance_audit_events where actor_id = '61000000-0000-4000-8000-000000000003' and action = 'site_readiness_confirmed') ~* 'medical|ticket|criminal|fingerprint|id_number|reference_number|notes'), 'confirmation audit contains no protected source detail');
set local "request.jwt.claims" = '{"sub":"61000000-0000-4000-8000-000000000004","role":"authenticated","exp":4102444800}';
select throws_ok($$ select public.confirm_site_readiness('62000000-0000-4000-8000-000000000002') $$, '55000', 'Site readiness must be ready or warning before start of shift', 'unknown readiness cannot be confirmed');

set local "request.jwt.claims" = '{"sub":"61000000-0000-4000-8000-000000000005","role":"authenticated","exp":4102444800}';
select throws_ok($$ select * from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') $$, '42501', 'Active authenticated profile required', 'inactive profile cannot evaluate readiness');
set local "request.jwt.claims" = '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","exp":1}';
select throws_ok($$ select * from public.evaluate_site_readiness('62000000-0000-4000-8000-000000000001') $$, '42501', 'Active authenticated session required', 'expired JWT cannot evaluate readiness');

reset role;
select is((select count(*) from public.admin_activity_log where action ilike '%readiness%'), 0::bigint, 'read-only evaluation creates no generic activity payload');
select is((select count(*) from public.admin_audit_events where action ilike '%readiness%'), 0::bigint, 'read-only evaluation duplicates no audit event');
select is((select count(*) from public.employee_onboarding_records where notes like 'SECRET%'), 2::bigint, 'confidential fixtures remain only in protected source table');
select is((select count(*) from public.asset_compliance_records where reference_number like 'SECRET%'), 3::bigint, 'compliance references remain only in protected source table');

select * from finish();
rollback;
