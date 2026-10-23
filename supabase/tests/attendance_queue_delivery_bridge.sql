begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
insert into public.organizations(id,name,slug) values('10000000-0000-4000-8000-000000000001','Queue Org','queue-org'),('20000000-0000-4000-8000-000000000002','Other Org','other-org');
insert into auth.users(id,email) values('11000000-0000-4000-8000-000000000001','site@queue.test'),('12000000-0000-4000-8000-000000000002','office@queue.test'),('21000000-0000-4000-8000-000000000003','other@queue.test');
update public.profiles set display_name='Site Manager',role='site',organization_id='10000000-0000-4000-8000-000000000001' where id='11000000-0000-4000-8000-000000000001';
update public.profiles set display_name='Office Admin',role='office',organization_id='10000000-0000-4000-8000-000000000001' where id='12000000-0000-4000-8000-000000000002';
update public.profiles set display_name='Other Site',role='site',organization_id='20000000-0000-4000-8000-000000000002' where id='21000000-0000-4000-8000-000000000003';
insert into public.sites(id,name,location,organization_id) values
('13000000-0000-4000-8000-000000000003','Assigned','A','10000000-0000-4000-8000-000000000001'),
('14000000-0000-4000-8000-000000000004','Denied','B','10000000-0000-4000-8000-000000000001'),
('23000000-0000-4000-8000-000000000005','Other','C','20000000-0000-4000-8000-000000000002');
insert into public.profile_site_access(profile_id,site_id,organization_id) values('11000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001');
insert into public.employees(id,first_name,surname,id_number,role,site_id,start_date,organization_id) values
('15000000-0000-4000-8000-000000000005','One','Worker','QUEUE-1','worker','13000000-0000-4000-8000-000000000003','2026-01-01','10000000-0000-4000-8000-000000000001'),
('16000000-0000-4000-8000-000000000006','Two','Worker','QUEUE-2','worker','14000000-0000-4000-8000-000000000004','2026-01-01','10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","exp":4102444800}',true);
insert into public.queued_sync_submissions(id,organization_id,submitted_by,idempotency_key,site_id,work_date,payload) values
('17000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','queue-1','13000000-0000-4000-8000-000000000003','2026-08-10','{"siteId":"13000000-0000-4000-8000-000000000003","workDate":"2026-08-10","rows":[{"employeeId":"15000000-0000-4000-8000-000000000005","status":"present","comment":"Delivered"}]}');
select is((select status from public.queued_sync_submissions where id='17000000-0000-4000-8000-000000000007'),'completed','valid queue completes');
select is((select outcome from public.queued_sync_submissions where id='17000000-0000-4000-8000-000000000007'),'accepted','valid queue accepted');
select is((select count(*)::int from public.attendance_delivery_records),1,'one authoritative delivery');
select is((select logs->'2026-08-10'->>'status' from public.employees where id='15000000-0000-4000-8000-000000000005'),'present','shared employee log updated');
insert into public.queued_sync_submissions(id,organization_id,submitted_by,idempotency_key,site_id,work_date,payload) values
('18000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','queue-2','13000000-0000-4000-8000-000000000003','2026-08-10','{"siteId":"13000000-0000-4000-8000-000000000003","workDate":"2026-08-10","rows":[{"employeeId":"15000000-0000-4000-8000-000000000005","status":"present","comment":"Delivered"}]}');
select is((select count(*)::int from public.attendance_delivery_records),1,'different submission retry remains idempotent');
select is((select diagnostic_context->>'idempotentCount' from public.queued_sync_submissions where id='18000000-0000-4000-8000-000000000008'),'1','idempotent outcome recorded');
select throws_ok($$insert into public.queued_sync_submissions(organization_id,submitted_by,idempotency_key,site_id,work_date,payload) values('10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','cross-site','14000000-0000-4000-8000-000000000004','2026-08-10','{"siteId":"14000000-0000-4000-8000-000000000004","workDate":"2026-08-10","rows":[{"employeeId":"16000000-0000-4000-8000-000000000006","status":"present"}]}')$$,'42501',null,'cross-site submission denied');
insert into public.queued_sync_submissions(id,organization_id,submitted_by,idempotency_key,site_id,work_date,payload) values
('19000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001','bad-employee','13000000-0000-4000-8000-000000000003','2026-08-11','{"siteId":"13000000-0000-4000-8000-000000000003","workDate":"2026-08-11","rows":[{"employeeId":"16000000-0000-4000-8000-000000000006","status":"present"}]}');
select is((select outcome from public.queued_sync_submissions where id='19000000-0000-4000-8000-000000000009'),'rejected','cross-site employee rejected');
select ok((select last_error is not null and diagnostic_context?'sqlstate' from public.queued_sync_submissions where id='19000000-0000-4000-8000-000000000009'),'failure keeps diagnostics');
select is((select count(*)::int from public.attendance_audit_events where action like 'queue_delivery_%'),3,'immutable audit evidence appended');
select * from finish();
rollback;