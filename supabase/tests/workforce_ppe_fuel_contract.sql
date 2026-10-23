begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_table('public', 'employee_onboarding_records', 'employee onboarding table exists');
select has_column('public', 'employees', 'company_number', 'company employee number is stored');
select has_column('public', 'employees', 'designation', 'employee designation is stored separately from access role');
select has_column('public', 'employees', 'pay_rate_unit', 'employee pay rate unit is explicit');
select has_column('public', 'employees', 'safety_qualifications', 'employee safety qualifications are stored');
select has_column('public', 'employees', 'additional_fields', 'future import columns are retained');
select has_table('public', 'ppe_issue_records', 'PPE issue table exists');
select has_table('public', 'asset_fuel_entries', 'asset fuel table exists');
select is((select relrowsecurity from pg_class where oid = 'public.employee_onboarding_records'::regclass), true, 'onboarding RLS is enabled');
select is((select relrowsecurity from pg_class where oid = 'public.ppe_issue_records'::regclass), true, 'PPE RLS is enabled');
select is((select relrowsecurity from pg_class where oid = 'public.asset_fuel_entries'::regclass), true, 'fuel RLS is enabled');

set local session_replication_role = replica;
insert into public.profiles (id, username, display_name, role, is_active, organization_id) values
('41000000-0000-4000-8000-000000000001','wf.office','Workforce Office','office',true,'00000000-0000-4000-8000-000000000001'),
('41000000-0000-4000-8000-000000000002','wf.director','Workforce Director','director',true,'00000000-0000-4000-8000-000000000001'),
('41000000-0000-4000-8000-000000000003','wf.site','Workforce Site','site',true,'00000000-0000-4000-8000-000000000001');
insert into public.sites (id,name,location,manager_profile_id,is_active,organization_id) values ('42000000-0000-4000-8000-000000000001','Fuel Site','Yard','41000000-0000-4000-8000-000000000003',true,'00000000-0000-4000-8000-000000000001');
insert into public.profile_site_access(profile_id,site_id,organization_id) values ('41000000-0000-4000-8000-000000000003','42000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
insert into public.employees(id,first_name,surname,id_number,role,site_id,start_date,organization_id) values ('43000000-0000-4000-8000-000000000001','New','Hire','9001015009087','Operator','42000000-0000-4000-8000-000000000001',current_date,'00000000-0000-4000-8000-000000000001');
insert into public.assets(id,serial_number,make,model,type,license_expiry,status,assigned_site_id,organization_id) values ('44000000-0000-4000-8000-000000000001','FUEL-TEST-1','CAT','320','Yellow Metal',current_date+30,'Active','42000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
insert into public.employee_onboarding_records(id,organization_id,employee_id,criminal_check_status,fingerprint_check_status,medical_status,updated_by) values ('45000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','43000000-0000-4000-8000-000000000001','clear','clear','fit','41000000-0000-4000-8000-000000000001');
insert into public.ppe_issue_records(id,organization_id,employee_id,item_type,size,unit_cost,status) values ('46000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','43000000-0000-4000-8000-000000000001','safety_boots','9',1250,'ordered');
insert into public.asset_fuel_entries(id,organization_id,asset_id,fuel_date,litres,unit_cost,recorded_by) values ('47000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000001',current_date,10,25,'41000000-0000-4000-8000-000000000003');
set local session_replication_role = origin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","exp":4102444800}';
select is((select count(*) from public.employee_onboarding_records),1::bigint,'office can read onboarding checks');
select is((select count(*) from public.ppe_issue_records),1::bigint,'office can read PPE records');
set local "request.jwt.claims" = '{"sub":"41000000-0000-4000-8000-000000000002","role":"authenticated","exp":4102444800}';
select is((select sum(unit_cost) from public.ppe_issue_records),1250::numeric,'director can read PPE expense');
select is((select sum(total_cost) from public.asset_fuel_entries),250::numeric,'director can read fuel expense');
set local "request.jwt.claims" = '{"sub":"41000000-0000-4000-8000-000000000003","role":"authenticated","exp":4102444800}';
select is((select count(*) from public.employee_onboarding_records),0::bigint,'site role cannot read sensitive screening records');
select is((select count(*) from public.asset_fuel_entries),1::bigint,'assigned site role can read fuel for its asset');
select * from finish();
rollback;
