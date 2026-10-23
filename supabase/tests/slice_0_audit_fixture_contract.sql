begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

set local session_replication_role = replica;
insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'director.audit@senatla.test', timezone('utc', now()), '{"provider":"email","providers":["email"]}', '{"display_name":"Audit Director"}', timezone('utc', now()), timezone('utc', now()), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'office.a.audit@senatla.test', timezone('utc', now()), '{"provider":"email","providers":["email"]}', '{"display_name":"Audit Office A"}', timezone('utc', now()), timezone('utc', now()), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'office.b.audit@senatla.test', timezone('utc', now()), '{"provider":"email","providers":["email"]}', '{"display_name":"Audit Office B"}', timezone('utc', now()), timezone('utc', now()), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'site.a.audit@senatla.test', timezone('utc', now()), '{"provider":"email","providers":["email"]}', '{"display_name":"Audit Site Manager A"}', timezone('utc', now()), timezone('utc', now()), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'site.b.audit@senatla.test', timezone('utc', now()), '{"provider":"email","providers":["email"]}', '{"display_name":"Audit Site Manager B"}', timezone('utc', now()), timezone('utc', now()), '', '', '', '');

insert into public.profiles (id, username, display_name, role, is_active, organization_id)
values
  ('51000000-0000-4000-8000-000000000001', 'audit.director', 'Audit Director', 'director', true, '00000000-0000-4000-8000-000000000001'),
  ('51000000-0000-4000-8000-000000000002', 'audit.office.a', 'Audit Office A', 'office', true, '00000000-0000-4000-8000-000000000001'),
  ('51000000-0000-4000-8000-000000000003', 'audit.office.b', 'Audit Office B', 'office', true, '00000000-0000-4000-8000-000000000001'),
  ('51000000-0000-4000-8000-000000000004', 'audit.site.a', 'Audit Site Manager A', 'site', true, '00000000-0000-4000-8000-000000000001'),
  ('51000000-0000-4000-8000-000000000005', 'audit.site.b', 'Audit Site Manager B', 'site', true, '00000000-0000-4000-8000-000000000001');

insert into public.sites (id, name, location, manager_profile_id, is_active, organization_id, team_name, job_number, estimated_duration, compliance_checklist)
values
  ('52000000-0000-4000-8000-000000000001', 'Audit North Site', 'Synthetic North Yard', '51000000-0000-4000-8000-000000000004', true, '00000000-0000-4000-8000-000000000001', 'Audit Team North', 'AUDIT-JOB-NORTH', 'Test fixture only', array['Daily readiness review','Safety talk']),
  ('52000000-0000-4000-8000-000000000002', 'Audit South Site', 'Synthetic South Yard', '51000000-0000-4000-8000-000000000005', true, '00000000-0000-4000-8000-000000000001', 'Audit Team South', 'AUDIT-JOB-SOUTH', 'Test fixture only', array['Daily readiness review','Safety talk']);

insert into public.profile_site_access (profile_id, site_id, organization_id)
values
  ('51000000-0000-4000-8000-000000000004', '52000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('51000000-0000-4000-8000-000000000005', '52000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001');

insert into public.employees (id, first_name, surname, id_number, role, site_id, employment_status, start_date, organization_id)
values
  ('53000000-0000-4000-8000-000000000001', 'Ready', 'Operator', 'AUDIT-EMP-READY', 'Operator', '52000000-0000-4000-8000-000000000001', 'active', date '2026-01-01', '00000000-0000-4000-8000-000000000001'),
  ('53000000-0000-4000-8000-000000000002', 'Restricted', 'Worker', 'AUDIT-EMP-WARNING', 'General Worker', '52000000-0000-4000-8000-000000000001', 'active', date '2026-01-01', '00000000-0000-4000-8000-000000000001'),
  ('53000000-0000-4000-8000-000000000003', 'Blocked', 'Operator', 'AUDIT-EMP-BLOCKED', 'Operator', '52000000-0000-4000-8000-000000000002', 'active', date '2026-01-01', '00000000-0000-4000-8000-000000000001'),
  ('53000000-0000-4000-8000-000000000004', 'Unknown', 'Worker', 'AUDIT-EMP-UNKNOWN', 'General Worker', '52000000-0000-4000-8000-000000000002', 'active', date '2026-01-01', '00000000-0000-4000-8000-000000000001');

insert into public.employee_onboarding_records (id, organization_id, employee_id, criminal_check_status, fingerprint_check_status, medical_status, red_ticket_number, red_ticket_issued_at, red_ticket_expires_at, notes, updated_by)
values
  ('54000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', 'clear', 'clear', 'fit', 'AUDIT-RT-READY', date '2026-01-01', date '2099-12-31', 'Synthetic ready case', '51000000-0000-4000-8000-000000000002'),
  ('54000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000002', 'clear', 'clear', 'restricted', 'AUDIT-RT-WARNING', date '2026-01-01', date '2099-12-31', 'Synthetic warning case', '51000000-0000-4000-8000-000000000002'),
  ('54000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000003', 'clear', 'clear', 'unfit', 'AUDIT-RT-EXPIRED', date '2020-01-01', date '2020-12-31', 'Synthetic blocked case', '51000000-0000-4000-8000-000000000003');

insert into public.assets (id, registration_number, serial_number, make, model, type, license_expiry, status, assigned_site_id, organization_id, lifecycle_state, asset_class, notes)
values
  ('55000000-0000-4000-8000-000000000001', 'AUDIT-READY', 'AUDIT-ASSET-READY', 'Synthetic', 'Ready Unit', 'Light Vehicle', date '2099-12-31', 'Active', '52000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'active', 'light_vehicle', 'Synthetic ready fixture'),
  ('55000000-0000-4000-8000-000000000002', 'AUDIT-EXPIRED', 'AUDIT-ASSET-EXPIRED', 'Synthetic', 'Expired Unit', 'Light Vehicle', date '2020-12-31', 'Active', '52000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'active', 'light_vehicle', 'Synthetic expired-licence fixture'),
  ('55000000-0000-4000-8000-000000000003', null, 'AUDIT-ASSET-MAINT', 'Synthetic', 'Maintenance Unit', 'Yellow Metal', date '2099-12-31', 'Maintenance', '52000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'maintenance', 'yellow_metal', 'Synthetic maintenance fixture');
set local session_replication_role = origin;

select is((select count(*) from auth.users where id::text like '51000000-0000-4000-8000-00000000000%'), 5::bigint, 'five deterministic audit auth users exist');
select is((select count(*) from public.profiles where id::text like '51000000-0000-4000-8000-00000000000%' and is_active), 5::bigint, 'all five audit profiles are active');
select is((select count(*) from public.profiles where id in ('51000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000003') and role = 'office'), 2::bigint, 'two distinct office administrators exist');
select is((select role::text from public.profiles where id = '51000000-0000-4000-8000-000000000001'), 'director', 'director identity has director role');
select is((select count(*) from public.profiles where id in ('51000000-0000-4000-8000-000000000004','51000000-0000-4000-8000-000000000005') and role = 'site'), 2::bigint, 'two distinct site managers exist');
select is((select count(*) from public.sites where id in ('52000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000002')), 2::bigint, 'two deterministic audit sites exist');
select is((select count(*) from public.profile_site_access where profile_id = '51000000-0000-4000-8000-000000000004' and site_id = '52000000-0000-4000-8000-000000000001'), 1::bigint, 'site manager A is assigned only to north site');
select is((select count(*) from public.profile_site_access where profile_id = '51000000-0000-4000-8000-000000000005' and site_id = '52000000-0000-4000-8000-000000000002'), 1::bigint, 'site manager B is assigned only to south site');
select is((select count(*) from public.employee_onboarding_records where employee_id in ('53000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000002','53000000-0000-4000-8000-000000000003')), 3::bigint, 'ready warning and blocked employees have onboarding evidence');
select is((select count(*) from public.employee_onboarding_records where employee_id = '53000000-0000-4000-8000-000000000004'), 0::bigint, 'unknown employee intentionally has no onboarding evidence');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"51000000-0000-4000-8000-000000000004","role":"authenticated","exp":4102444800}';
select is((select count(*) from public.employees where site_id = '52000000-0000-4000-8000-000000000001'), 2::bigint, 'site manager A reads north employees');
select is((select count(*) from public.employees where site_id = '52000000-0000-4000-8000-000000000002'), 0::bigint, 'site manager A cannot read south employees');
select is((select count(*) from public.assets where assigned_site_id = '52000000-0000-4000-8000-000000000001'), 1::bigint, 'site manager A reads north assets');
select is((select count(*) from public.assets where assigned_site_id = '52000000-0000-4000-8000-000000000002'), 0::bigint, 'site manager A cannot read south assets');

set local "request.jwt.claims" = '{"sub":"51000000-0000-4000-8000-000000000005","role":"authenticated","exp":4102444800}';
select is((select count(*) from public.employees where site_id = '52000000-0000-4000-8000-000000000002'), 2::bigint, 'site manager B reads south employees');
select is((select count(*) from public.employees where site_id = '52000000-0000-4000-8000-000000000001'), 0::bigint, 'site manager B cannot read north employees');

set local "request.jwt.claims" = '{"sub":"51000000-0000-4000-8000-000000000002","role":"authenticated","exp":4102444800}';
select lives_ok(
  $$ insert into public.admin_audit_events (id, actor_id, actor_name, action, organization_id) values ('56000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000003', 'Spoofed actor', 'masked_payroll_export', '00000000-0000-4000-8000-000000000001') $$,
  'office administrator A can append an administrative audit event'
);
select is((select actor_id from public.admin_audit_events where id = '56000000-0000-4000-8000-000000000001'), '51000000-0000-4000-8000-000000000002'::uuid, 'database records office administrator A as the authenticated actor');

set local "request.jwt.claims" = '{"sub":"51000000-0000-4000-8000-000000000003","role":"authenticated","exp":4102444800}';
select lives_ok(
  $$ insert into public.admin_audit_events (id, actor_id, actor_name, action, organization_id) values ('56000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', 'Spoofed actor', 'masked_payroll_export', '00000000-0000-4000-8000-000000000001') $$,
  'office administrator B can append an administrative audit event'
);
select is((select actor_id from public.admin_audit_events where id = '56000000-0000-4000-8000-000000000002'), '51000000-0000-4000-8000-000000000003'::uuid, 'database records office administrator B as the authenticated actor');
select isnt(
  (select actor_id from public.admin_audit_events where id = '56000000-0000-4000-8000-000000000001'),
  (select actor_id from public.admin_audit_events where id = '56000000-0000-4000-8000-000000000002'),
  'same-role office actions remain attributable to distinct humans'
);

reset role;
select is((select count(distinct actor_id) from public.admin_audit_events where id in ('56000000-0000-4000-8000-000000000001','56000000-0000-4000-8000-000000000002')), 2::bigint, 'audit evidence persists two distinct actors');

select * from finish();
rollback;
