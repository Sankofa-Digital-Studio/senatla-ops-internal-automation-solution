import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const password = 'Responsive-test-2026!';

export default async function globalSetup() {
  const url = required('SENATLA_SUPABASE_URL');
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const siteId = await ensureUser(admin, 'responsive.site@test.invalid', 'Responsive Site Manager');
  const officeId = await ensureUser(admin, 'responsive.office@test.invalid', 'Responsive Office Admin');
  const sql = fixtureSql(siteId, officeId);
  const result = spawnSync('docker', ['exec', '-i', 'supabase_db_senatla-ops', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Responsive SQL fixture failed.');
}

async function ensureUser(admin: ReturnType<typeof createClient>, email: string, displayName: string) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  const existing = listed.data.users.find((user) => user.email === email);
  if (existing) {
    const updated = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { display_name: displayName } });
    if (updated.error) throw updated.error;
    return existing.id;
  }
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
  if (created.error) throw created.error;
  return created.data.user.id;
}

function fixtureSql(siteUserId: string, officeUserId: string) {
  return `begin;
update public.profiles set display_name='Responsive Site Manager',role='site',is_active=true,organization_id='00000000-0000-4000-8000-000000000001' where id='${siteUserId}'::uuid;
update public.profiles set display_name='Responsive Office Admin',role='office',is_active=true,organization_id='00000000-0000-4000-8000-000000000001' where id='${officeUserId}'::uuid;
insert into public.sites(id,name,location,manager_profile_id,is_active,organization_id) values('61000000-0000-4000-8000-000000000001','Responsive Test Site','CI Yard','${siteUserId}'::uuid,true,'00000000-0000-4000-8000-000000000001') on conflict(id) do update set manager_profile_id=excluded.manager_profile_id;
insert into public.sites(id,name,location,is_active,organization_id) values('61000000-0000-4000-8000-000000000002','Forbidden Test Site','Other Yard',true,'00000000-0000-4000-8000-000000000001') on conflict(id) do nothing;
insert into public.profile_site_access(profile_id,site_id,organization_id) values('${siteUserId}'::uuid,'61000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001') on conflict(profile_id,site_id) do update set organization_id=excluded.organization_id;
insert into public.employees(id,first_name,surname,id_number,role,site_id,employment_status,start_date,basic_rate,organization_id) values('62000000-0000-4000-8000-000000000001','Viewport','Worker','RESPONSIVE-EMP-001','Operator','61000000-0000-4000-8000-000000000001','active','2026-01-01',100,'00000000-0000-4000-8000-000000000001') on conflict(id) do update set site_id=excluded.site_id;
set local session_replication_role=replica;
insert into public.queued_sync_submissions(id,organization_id,submitted_by,site_id,work_date,idempotency_key,payload,status,outcome,attempts,last_error,diagnostic_context,created_at,processed_at,updated_at) values
('63000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','${siteUserId}'::uuid,'61000000-0000-4000-8000-000000000001','2026-08-08','responsive-layout-pending-2026-08-08','{"siteId":"61000000-0000-4000-8000-000000000001","workDate":"2026-08-08","rows":[{"employeeId":"62000000-0000-4000-8000-000000000001","status":"pending"}]}','pending','pending',0,null,'{}','2026-08-08T08:00:00Z',null,'2026-08-08T08:00:00Z'),
('63000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','${siteUserId}'::uuid,'61000000-0000-4000-8000-000000000001','2026-08-09','responsive-layout-retryable-2026-08-09','{"siteId":"61000000-0000-4000-8000-000000000001","workDate":"2026-08-09","rows":[{"employeeId":"62000000-0000-4000-8000-000000000001","status":"present"}]}','failed','retryable',1,'Fixture lock timeout','{"sqlstate":"55P03","message":"Fixture lock timeout","attempt":1}','2026-08-09T08:00:00Z','2026-08-09T08:01:00Z','2026-08-09T08:01:00Z'),
('63000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','${siteUserId}'::uuid,'61000000-0000-4000-8000-000000000001','2026-08-07','responsive-layout-rejected-2026-08-07','{"siteId":"61000000-0000-4000-8000-000000000001","workDate":"2026-08-07","rows":[{"employeeId":"62000000-0000-4000-8000-000000000001","status":"present"}]}','failed','rejected',1,'Fixture validation rejection','{"sqlstate":"22023","message":"Fixture validation rejection","attempt":1}','2026-08-07T08:00:00Z','2026-08-07T08:01:00Z','2026-08-07T08:01:00Z')
on conflict(id) do update set status=excluded.status,outcome=excluded.outcome,attempts=excluded.attempts,last_error=excluded.last_error,diagnostic_context=excluded.diagnostic_context,updated_at=excluded.updated_at;
set local session_replication_role=origin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"${siteUserId}","role":"authenticated","exp":4102444800}',true);
insert into public.queued_sync_submissions(organization_id,submitted_by,site_id,work_date,idempotency_key,payload) values('00000000-0000-4000-8000-000000000001','${siteUserId}'::uuid,'61000000-0000-4000-8000-000000000001','2026-08-10','responsive-layout-attendance-2026-08-10','{"siteId":"61000000-0000-4000-8000-000000000001","workDate":"2026-08-10","rows":[{"employeeId":"62000000-0000-4000-8000-000000000001","status":"present","comment":"Responsive fixture"}],"summary":{"present":1,"absent":0,"pending":0,"flagged":0,"evidenceCount":0},"timingStatus":"On Time","acknowledgedWarning":false,"safetyTopic":"Responsive safety"}') on conflict(idempotency_key) do nothing;
commit;`;
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for responsive browser fixtures.`);
  return value;
}
