begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
select has_function('public', 'office_workspace_snapshot_v1', array[]::text[]);
select is((select prosecdef from pg_proc where oid='public.office_workspace_snapshot_v1()'::regprocedure), false, 'snapshot uses invoker rights');
select ok(not has_function_privilege('anon', 'public.office_workspace_snapshot_v1()', 'execute'), 'anonymous callers cannot execute');
select ok(has_function_privilege('authenticated', 'public.office_workspace_snapshot_v1()', 'execute'), 'authenticated callers can execute');

set local session_replication_role = replica;
insert into public.profiles(id,username,display_name,role,is_active,organization_id) values
('e7000000-0000-4000-8000-000000000001','snapshot.office','Snapshot Office','office',true,'00000000-0000-4000-8000-000000000001'),
('e7000000-0000-4000-8000-000000000002','snapshot.site','Snapshot Site','site',true,'00000000-0000-4000-8000-000000000001');
insert into public.sites(id,name,location,manager_profile_id,is_active,organization_id) values
('e7100000-0000-4000-8000-000000000001','Snapshot Allowed','Yard','e7000000-0000-4000-8000-000000000002',true,'00000000-0000-4000-8000-000000000001'),
('e7100000-0000-4000-8000-000000000002','Snapshot Forbidden','Other',null,true,'00000000-0000-4000-8000-000000000001');
insert into public.profile_site_access(profile_id,site_id,organization_id) values
('e7000000-0000-4000-8000-000000000002','e7100000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
insert into public.assets(id,registration_number,make,model,type,license_expiry,status,assigned_site_id,organization_id) values
('e7200000-0000-4000-8000-000000000001','SNAP-ALLOW','Test','Asset','Light Vehicle',current_date,'Active','e7100000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001'),
('e7200000-0000-4000-8000-000000000002','SNAP-DENY','Test','Asset','Light Vehicle',current_date,'Active','e7100000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
set local session_replication_role = origin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"e7000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok('select public.office_workspace_snapshot_v1()', 'office snapshot reads all collections');
select is((select count(*) from jsonb_object_keys(public.office_workspace_snapshot_v1())),26::bigint,'all 26 datasets are present');
set local "request.jwt.claims" = '{"sub":"e7000000-0000-4000-8000-000000000002","role":"authenticated"}';
select ok(exists(select 1 from jsonb_array_elements(public.office_workspace_snapshot_v1()->'assets') item where item->>'id'='e7200000-0000-4000-8000-000000000001'), 'site snapshot includes allowed asset');
select ok(not exists(select 1 from jsonb_array_elements(public.office_workspace_snapshot_v1()->'assets') item where item->>'id'='e7200000-0000-4000-8000-000000000002'), 'site snapshot excludes forbidden asset');
select is(
  (select array_agg(item->>'id' order by item->>'id') from jsonb_array_elements(public.office_workspace_snapshot_v1()->'assets') item),
  (select array_agg(id::text order by id::text) from public.assets),
  'snapshot asset visibility matches direct invoker reads'
);
select * from finish();
rollback;
