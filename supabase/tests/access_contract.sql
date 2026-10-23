begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

set local session_replication_role = replica;
insert into public.profiles (id, username, display_name, role, is_active, organization_id)
values
  ('10000000-0000-4000-8000-000000000001', 'office.test', 'Office Test', 'office', true, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'director.test', 'Director Test', 'director', true, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000003', 'site.test', 'Site Test', 'site', true, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000004', 'inactive.test', 'Inactive Test', 'office', false, '00000000-0000-4000-8000-000000000001');

insert into public.sites (id, name, location, manager_profile_id, is_active, organization_id)
values
  ('11000000-0000-4000-8000-000000000001', 'Allowed Site', 'North', '10000000-0000-4000-8000-000000000003', true, '00000000-0000-4000-8000-000000000001'),
  ('11000000-0000-4000-8000-000000000002', 'Other Site', 'South', null, true, '00000000-0000-4000-8000-000000000001');

insert into public.profile_site_access (profile_id, site_id, organization_id)
values ('10000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001');

insert into public.employees (id, first_name, surname, id_number, role, site_id, start_date, organization_id)
values
  ('12000000-0000-4000-8000-000000000001', 'Allowed', 'Worker', 'RLS-ALLOWED', 'Operator', '11000000-0000-4000-8000-000000000001', current_date, '00000000-0000-4000-8000-000000000001'),
  ('12000000-0000-4000-8000-000000000002', 'Other', 'Worker', 'RLS-OTHER', 'Operator', '11000000-0000-4000-8000-000000000002', current_date, '00000000-0000-4000-8000-000000000001');

insert into public.assets (id, registration_number, serial_number, make, model, type, license_expiry, status, assigned_site_id, organization_id)
values
  ('13000000-0000-4000-8000-000000000001', 'SITE-OK', 'SITE-ASSET-001', 'CAT', '320', 'Yellow Metal', current_date + 90, 'Active', '11000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000002', 'SITE-NO', 'SITE-ASSET-002', 'CAT', '330', 'Yellow Metal', current_date + 90, 'Active', '11000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001');

insert into public.approval_requests (id, request_type, status, requested_by, requested_by_name, organization_id)
values ('20000000-0000-4000-8000-000000000001', 'user_suspension', 'pending', '10000000-0000-4000-8000-000000000001', 'Office Test', '00000000-0000-4000-8000-000000000001');
set local session_replication_role = origin;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","exp":4102444800}';
select is(public.current_app_role()::text, 'office', 'active office role resolves from protected profile data');
select ok(public.is_office_admin(), 'office user receives office mutation capability');
select lives_ok($$ select count(*) from public.assets $$, 'office user can read assets');

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","exp":4102444800}';
select ok(public.can_read_admin_workspace(), 'director can read the administrative workspace');
select lives_ok(
  $$ insert into public.assets (registration_number, make, model, type, license_expiry, status, assigned_site_id, organization_id) values ('RLS TEST', 'Test', 'Test', 'Light Vehicle', current_date, 'Active', '11000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001') $$,
  'director can register organization assets from Asset Register'
);

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","exp":4102444800}';
select ok(not public.can_read_admin_workspace(), 'site role does not receive admin workspace access');
select is((select count(*) from public.employees where site_id = '11000000-0000-4000-8000-000000000001'), 1::bigint, 'site role can read employees at an assigned site');
select is((select count(*) from public.employees where site_id = '11000000-0000-4000-8000-000000000002'), 0::bigint, 'site role cannot read employees at another site');
select is((select count(*) from public.assets where assigned_site_id = '11000000-0000-4000-8000-000000000001'), 2::bigint, 'site role can read assets at an assigned site');
select lives_ok(
  $$ insert into public.assets (registration_number, make, model, type, license_expiry, status, assigned_site_id, organization_id) values ('SITE NEW', 'Site', 'New', 'Light Vehicle', current_date, 'Active', '11000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001') $$,
  'site role can register assets for an assigned site'
);
select throws_ok(
  $$ insert into public.assets (registration_number, make, model, type, license_expiry, status, assigned_site_id, organization_id) values ('SITE BLOCK', 'Site', 'Blocked', 'Light Vehicle', current_date, 'Active', '11000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'site role cannot register assets for another site'
);
select lives_ok(
  'insert into public.asset_registration_drafts (id, organization_id, owner_id, owner_name, asset_data, validation_errors) values (''14000000-0000-4000-8000-000000000001'', ''00000000-0000-4000-8000-000000000001'', ''10000000-0000-4000-8000-000000000003'', ''Site Test'', jsonb_build_object(''serialNumber'', ''SITE-OCR-001'', ''make'', ''CAT''), jsonb_build_array(''Model is required.''))',
  'site role can save asset registration draft validation metadata'
);
select lives_ok(
  'insert into public.asset_registration_evidence (organization_id, draft_id, uploaded_by, evidence_type, file_name, mime_type, storage_path, extraction_state, extracted_fields, capture_source, content_sha256, storage_state) values (''00000000-0000-4000-8000-000000000001'', ''14000000-0000-4000-8000-000000000001'', ''10000000-0000-4000-8000-000000000003'', ''number_plate'', ''plate.jpg'', ''image/jpeg'', ''00000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000003/14000000-0000-4000-8000-000000000001/plate.jpg'', ''review_required'', jsonb_build_object(''registrationNumber'', ''SITE-OCR''), ''upload'', repeat(''a'', 64), ''pending_upload'')',
  'site role can attach OCR evidence metadata to an owned draft'
);
select lives_ok(
  'insert into public.admin_activity_log (organization_id, actor_id, actor_name, action, entity_type, entity_id, details) values (''00000000-0000-4000-8000-000000000001'', ''10000000-0000-4000-8000-000000000003'', ''Site Test'', ''asset_registration_draft_saved'', ''asset_registration'', ''14000000-0000-4000-8000-000000000001'', jsonb_build_object(''missingFields'', jsonb_build_array(''Model'')))',
  'site role can record asset registration audit events'
);
select lives_ok(
  $$ insert into public.asset_custody_events (organization_id, asset_id, from_site_id, to_site_id, accepted_by) values ('00000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Site Test') $$,
  'site role can capture custody events for an assigned asset'
);
select lives_ok(
  $$ insert into public.asset_compliance_records (organization_id, asset_id, compliance_type, reference_number, status) values ('00000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'licence', 'LIC-001', 'valid') $$,
  'site role can save compliance records for an assigned asset'
);
select lives_ok(
  $$ insert into public.asset_meter_readings (organization_id, asset_id, meter_type, reading, recorded_by, source) values ('00000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'engine_hours', 100, 'Site Test', 'manual') $$,
  'site role can record meter readings for an assigned asset'
);
select lives_ok(
  $$ insert into public.asset_work_orders (organization_id, asset_id, title, status, priority, cost) values ('00000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Site inspection', 'open', 'medium', 0) $$,
  'site role can save work orders for an assigned asset'
);
select lives_ok(
  $$ insert into public.asset_maintenance_plans (organization_id, asset_id, name, interval_days, is_active) values ('00000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Site monthly check', 30, true) $$,
  'site role can save maintenance plans for an assigned asset'
);
select lives_ok(
  $$ insert into public.approval_requests (request_type, status, requested_by, requested_by_name, payload, organization_id) values ('asset_return_to_service', 'pending', '10000000-0000-4000-8000-000000000003', 'Site Test', '{"assetId":"13000000-0000-4000-8000-000000000001"}'::jsonb, '00000000-0000-4000-8000-000000000001') $$,
  'site role can request return-to-service approval for an assigned asset'
);

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","exp":4102444800}';
select is(public.current_app_role(), null::public.app_role, 'inactive profile has no effective application role');
select is((select count(*) from public.assets), 0::bigint, 'inactive profile cannot read protected assets');

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","exp":1}';
select is(public.current_app_role(), null::public.app_role, 'expired session has no effective application role');
select is((select count(*) from public.app_state_snapshots), 0::bigint, 'expired session cannot read application state');

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","exp":4102444800}';
select throws_ok(
  $$ update public.profiles set role = 'director' where id = '10000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'authenticated clients cannot change trusted profile roles'
);
select results_eq(
  $$ update public.approval_requests set status = 'approved', reviewed_by = '10000000-0000-4000-8000-000000000001' where id = '20000000-0000-4000-8000-000000000001' returning id $$,
  $$ values (null::uuid) limit 0 $$,
  'office users cannot perform director approval updates'
);

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","exp":4102444800}';
select results_eq(
  $$ update public.approval_requests set status = 'approved', reviewed_by = '10000000-0000-4000-8000-000000000002', reviewed_by_name = 'Director Test', reviewed_at = now() where id = '20000000-0000-4000-8000-000000000001' returning status $$,
  $$ values ('approved'::text) $$,
  'director can approve a request from a different user'
);

set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","exp":4102444800}';
select lives_ok(
  $$ insert into public.auth_activity_events (organization_id, actor_id, target_profile_id, event_type) values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'login') $$,
  'authenticated user can record their own login event'
);
select is((select count(*) from public.auth_activity_events where actor_id = '10000000-0000-4000-8000-000000000001'), 1::bigint, 'authentication event remains auditable');

reset role;
select is((select status from public.approval_requests where id = '20000000-0000-4000-8000-000000000001'), 'approved', 'director approval persisted');

select * from finish();
rollback;
