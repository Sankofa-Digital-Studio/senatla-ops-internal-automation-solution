begin;
alter table public.queued_sync_submissions add column site_id uuid references public.sites(id),add column work_date date,add column outcome text not null default 'pending' check(outcome in('pending','accepted','rejected','retryable')),add column last_error text,add column diagnostic_context jsonb not null default '{}',add column updated_at timestamptz not null default timezone('utc',now());
create index queued_sync_scope_idx on public.queued_sync_submissions(organization_id,site_id,status,created_at desc);
create table public.attendance_delivery_records(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),site_id uuid not null references public.sites(id),employee_id uuid not null references public.employees(id),work_date date not null,attendance jsonb not null,source_submission_id uuid not null references public.queued_sync_submissions(id) deferrable initially deferred,created_at timestamptz not null default timezone('utc',now()),unique(organization_id,site_id,employee_id,work_date));
alter table public.attendance_delivery_records enable row level security;revoke all on public.attendance_delivery_records from anon,authenticated;grant select on public.attendance_delivery_records to authenticated;
create policy attendance_delivery_read on public.attendance_delivery_records for select to authenticated using(organization_id=private.current_organization_id() and(public.can_read_admin_workspace() or private.has_site_access(site_id,organization_id)));
alter table public.attendance_audit_events drop constraint attendance_audit_events_action_check;
alter table public.attendance_audit_events add constraint attendance_audit_events_action_check check(action in('attendance_marked_present','attendance_marked_absent','attendance_marked_pending','attendance_reason_updated','attendance_comment_updated','safety_talk_completed','safety_talk_updated','sync_submitted','queue_delivery_accepted','queue_delivery_rejected','queue_delivery_retryable','queue_delivery_retried'));
create function private.process_attendance_queue() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.profiles%rowtype;r jsonb;e public.employees%rowtype;v jsonb;prior jsonb;n int;added int:=0;state text;msg text;act text;
begin
 if tg_op='UPDATE' then
  if old.status<>'failed' or old.outcome<>'retryable' or new.status<>'processing' then raise exception using errcode='22023',message='Only retryable failed submissions can be retried';end if;
  if(to_jsonb(new)-array['status','outcome','last_error','diagnostic_context','attempts','processed_at','updated_at']) is distinct from(to_jsonb(old)-array['status','outcome','last_error','diagnostic_context','attempts','processed_at','updated_at']) then raise exception using errcode='22023',message='Submission evidence is immutable';end if;
 end if;
 select * into p from public.profiles where id=new.submitted_by and is_active;
 begin
  if p.id is null or p.role<>'site' or p.organization_id<>new.organization_id then raise exception using errcode='42501',message='Active site manager in submission organization required';end if;
  if auth.uid() is distinct from new.submitted_by and not public.can_read_admin_workspace() then raise exception using errcode='42501',message='Actor outside permitted boundary';end if;
  new.site_id:=coalesce(new.site_id,nullif(new.payload->>'siteId','')::uuid);new.work_date:=coalesce(new.work_date,nullif(new.payload->>'workDate','')::date);
  if new.site_id is null or new.work_date is null or new.payload->>'siteId' is distinct from new.site_id::text or new.payload->>'workDate' is distinct from new.work_date::text then raise exception using errcode='22023',message='Payload scope does not match submission scope';end if;
  if not exists(select 1 from public.profile_site_access a join public.sites s on s.id=a.site_id and s.organization_id=a.organization_id where a.profile_id=new.submitted_by and a.site_id=new.site_id and a.organization_id=new.organization_id) then raise exception using errcode='42501',message='Site manager not assigned to submitted site';end if;
  if jsonb_typeof(new.payload->'rows')<>'array' then raise exception using errcode='22023',message='Attendance rows must be an array';end if;
  n:=jsonb_array_length(new.payload->'rows');if n<1 or n>2000 then raise exception using errcode='22023',message='Attendance submission must contain 1 to 2000 rows';end if;
  for r in select value from jsonb_array_elements(new.payload->'rows') loop
   if r->>'employeeId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception using errcode='22023',message='Invalid employee identifier';end if;
   select * into e from public.employees where id=(r->>'employeeId')::uuid and organization_id=new.organization_id and site_id=new.site_id;
   if e.id is null then raise exception using errcode='42501',message='Employee outside submitted organization or site';end if;
   if r->>'status' not in('present','absent','pending') then raise exception using errcode='22023',message='Unsupported attendance status';end if;
   if length(coalesce(r->>'comment',''))>500 then raise exception using errcode='22023',message='Attendance comment exceeds 500 characters';end if;
   v:=jsonb_strip_nulls(jsonb_build_object('date',new.work_date::text,'status',r->>'status','reason',nullif(r->>'reason',''),'comment',nullif(r->>'comment',''),'isFlagged',coalesce((r->>'isFlagged')::boolean,false)));
   select attendance into prior from public.attendance_delivery_records where organization_id=new.organization_id and site_id=new.site_id and employee_id=e.id and work_date=new.work_date;
   if prior is not null and prior<>v then raise exception using errcode='22000',message='Authoritative attendance already exists with different values';end if;
   if prior is null then
    insert into public.attendance_delivery_records(organization_id,site_id,employee_id,work_date,attendance,source_submission_id) values(new.organization_id,new.site_id,e.id,new.work_date,v,new.id) on conflict do nothing;
    if found then update public.employees set logs=jsonb_set(coalesce(logs,'{}'),array[new.work_date::text],v,true),updated_at=timezone('utc',now()) where id=e.id;added:=added+1;end if;
   end if;
  end loop;
  new.status:='completed';new.outcome:='accepted';new.last_error:=null;new.diagnostic_context:=jsonb_build_object('rowCount',n,'insertedCount',added,'idempotentCount',n-added);new.processed_at:=timezone('utc',now());
  if tg_op='UPDATE' then new.attempts:=old.attempts+1;act:='queue_delivery_retried';else new.attempts:=new.attempts+1;act:='queue_delivery_accepted';end if;
 exception when others then
  get stacked diagnostics state=returned_sqlstate,msg=message_text;new.status:='failed';new.outcome:=case when state in('40001','40P01','55P03','57014','08000','08003','08006') then 'retryable' else 'rejected' end;new.last_error:=left(msg,1000);
  if tg_op='UPDATE' then new.attempts:=old.attempts+1;else new.attempts:=new.attempts+1;end if;
  new.diagnostic_context:=jsonb_build_object('sqlstate',state,'message',new.last_error,'attempt',new.attempts);new.processed_at:=timezone('utc',now());act:=case when new.outcome='retryable' then 'queue_delivery_retryable' else 'queue_delivery_rejected' end;
 end;
 new.updated_at:=timezone('utc',now());
 insert into public.attendance_audit_events(actor_id,actor_name,action,details,organization_id,site_id) values(auth.uid(),coalesce(p.display_name,'Site Manager'),act,format('Submission %s: %s',new.id,coalesce(new.last_error,new.outcome)),new.organization_id,new.site_id);
 return new;
end$$;
revoke all on function private.process_attendance_queue() from public,anon,authenticated;
create trigger queued_sync_process before insert or update on public.queued_sync_submissions for each row execute function private.process_attendance_queue();
revoke all on public.queued_sync_submissions from anon;revoke update,delete,truncate on public.queued_sync_submissions from authenticated;grant select,insert on public.queued_sync_submissions to authenticated;grant update(status) on public.queued_sync_submissions to authenticated;
drop policy queued_sync_own_read on public.queued_sync_submissions;
create policy queued_sync_read on public.queued_sync_submissions for select to authenticated using(organization_id=private.current_organization_id() and(public.can_read_admin_workspace() or(submitted_by=(select auth.uid()) and private.has_site_access(site_id,organization_id))));
drop policy queued_sync_own_insert on public.queued_sync_submissions;
create policy queued_sync_insert on public.queued_sync_submissions for insert to authenticated with check(submitted_by=(select auth.uid()) and organization_id=private.current_organization_id() and private.current_app_role()='site' and private.has_site_access(site_id,organization_id));
create policy queued_sync_retry on public.queued_sync_submissions for update to authenticated using(organization_id=private.current_organization_id() and status='failed' and outcome='retryable' and(public.can_read_admin_workspace() or(submitted_by=(select auth.uid()) and private.has_site_access(site_id,organization_id)))) with check(organization_id=private.current_organization_id());
commit;