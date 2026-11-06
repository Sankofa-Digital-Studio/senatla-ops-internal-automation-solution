begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

set local session_replication_role = replica;
insert into public.organizations(id,name,slug,is_active)
values ('81000000-0000-4000-8000-000000000002','Director Access Other Org','director-access-other',true);
insert into auth.users(id,email) values
  ('81000000-0000-4000-8000-000000000001','thosontula@gmail.com'),
  ('81000000-0000-4000-8000-000000000002','thosontula+tag@gmail.com'),
  ('81000000-0000-4000-8000-000000000003','director@senatlatrading.com'),
  ('81000000-0000-4000-8000-000000000004','office@senatlatrading.com');
insert into public.profiles(id,username,display_name,role,is_active,organization_id) values
  ('81000000-0000-4000-8000-000000000001','developer','Developer','director',true,'00000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000002','developer-alias','Developer Alias','director',true,'00000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000003','ordinary-director','Ordinary Director','director',true,'00000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000004','office-admin','Office Admin','office',true,'00000000-0000-4000-8000-000000000001');
insert into public.sites(id,name,location,is_active,organization_id) values
  ('82000000-0000-4000-8000-000000000001','Director Access Site','Local',true,'00000000-0000-4000-8000-000000000001'),
  ('82000000-0000-4000-8000-000000000002','Other Organization Site','Remote',true,'81000000-0000-4000-8000-000000000002');
insert into public.employees(id,first_name,surname,id_number,role,site_id,employment_status,start_date,organization_id) values
  ('83000000-0000-4000-8000-000000000001','Local','Worker','DIRECTOR-ACCESS-LOCAL','Operator','82000000-0000-4000-8000-000000000001','active',current_date,'00000000-0000-4000-8000-000000000001'),
  ('83000000-0000-4000-8000-000000000002','Other','Worker','DIRECTOR-ACCESS-OTHER','Operator','82000000-0000-4000-8000-000000000002','active',current_date,'81000000-0000-4000-8000-000000000002');
set local session_replication_role = origin;

select has_function('public','apply_employee_site_assignment_director',array['uuid[]','uuid','text','text'],'Director assignment wrapper exists');
select ok(not has_function_privilege('anon','public.apply_employee_site_assignment_director(uuid[],uuid,text,text)','execute'),'anonymous assignment is denied');
select is((select prosecdef from pg_proc where oid='public.apply_employee_site_assignment_director(uuid[],uuid,text,text)'::regprocedure),false,'public wrapper is invoker');
select is((select prosecdef from pg_proc where oid='private.apply_employee_site_assignment_director_internal(uuid[],uuid,text,text)'::regprocedure),true,'privileged implementation is private');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","email":"thosontula@gmail.com","role":"authenticated","exp":4102444800}',true);
select ok(public.is_developer_director(),'exact developer is elevated');
select ok(public.is_office_admin(),'exact developer can administer');
select lives_ok($$insert into public.assets(registration_number,make,model,type,license_expiry,status,assigned_site_id,organization_id) values('DIRECTOR-CONTRACT-ONE','Test','One','Light Vehicle',current_date,'Active','82000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001')$$,'exact developer can register an organization asset');
select throws_ok($$select public.apply_employee_site_assignment_director(array['83000000-0000-4000-8000-000000000002']::uuid[],'82000000-0000-4000-8000-000000000001','accept',null)$$,'42501','Employee assignment selection is outside the active organization','cross-organization employee assignment is rejected');
select throws_ok($$select public.apply_employee_site_assignment_director(array['83000000-0000-4000-8000-000000000001']::uuid[],'82000000-0000-4000-8000-000000000002','accept',null)$$,'55000','Select an active organization site','cross-organization site assignment is rejected');
select is((with changed as (update public.employees set first_name='Tampered' where id='83000000-0000-4000-8000-000000000002' returning id) select count(*) from changed),0::bigint,'cross-organization employee update changes no rows');
select is((with changed as (update public.sites set name='Tampered' where id='82000000-0000-4000-8000-000000000002' returning id) select count(*) from changed),0::bigint,'cross-organization site update changes no rows');

select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000002","email":"thosontula+tag@gmail.com","role":"authenticated","exp":4102444800}',true);
select ok(public.is_developer_director(),'named alias is elevated');
select ok(public.is_office_admin(),'named alias can administer');
select lives_ok($$insert into public.assets(registration_number,make,model,type,license_expiry,status,assigned_site_id,organization_id) values('DIRECTOR-CONTRACT-TWO','Test','Two','Light Vehicle',current_date,'Active','82000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001')$$,'named alias can register an organization asset');
select throws_ok($$select public.apply_employee_site_assignment_director(array[]::uuid[],'82000000-0000-4000-8000-000000000001','accept',null)$$,'22023','Select between one and one hundred employees','Director assignment enforces selection bounds');

select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000003","email":"director@senatlatrading.com","role":"authenticated","exp":4102444800}',true);
select ok(not public.is_developer_director(),'ordinary Director is not elevated');
select ok(not public.is_office_admin(),'ordinary Director cannot administer');
select throws_ok($$select public.apply_employee_site_assignment_director(array['83000000-0000-4000-8000-000000000001']::uuid[],'82000000-0000-4000-8000-000000000001','accept',null)$$,'42501','Only the authorised developer Directors can use this workflow','ordinary Director cannot invoke assignment');
select throws_ok($$insert into public.assets(registration_number,make,model,type,license_expiry,status,assigned_site_id,organization_id) values('DIRECTOR-CONTRACT-BLOCK','Test','Blocked','Light Vehicle',current_date,'Active','82000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001')$$,'42501',null,'ordinary Director cannot register assets');
select is((with changed as (update public.employees set first_name='Tampered' where id='83000000-0000-4000-8000-000000000001' returning id) select count(*) from changed),0::bigint,'ordinary Director cannot update employees');

select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000004","email":"office@senatlatrading.com","role":"authenticated","exp":4102444800}',true);
select ok(public.is_office_admin(),'Office Admin keeps administration access');
select ok(not public.is_developer_director(),'Office Admin does not inherit developer identity');
select is((with changed as (update public.employees set first_name='Updated' where id='83000000-0000-4000-8000-000000000001' returning id) select count(*) from changed),1::bigint,'Office Admin can update own-organization employee');

select * from finish();
rollback;
