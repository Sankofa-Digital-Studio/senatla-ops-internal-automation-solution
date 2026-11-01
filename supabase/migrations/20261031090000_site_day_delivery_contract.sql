begin;

create table public.site_day_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  site_id uuid not null references public.sites(id),
  work_date date not null,
  contract_version integer not null check (contract_version = 1),
  planned_targets text not null check (length(btrim(planned_targets)) between 1 and 2000),
  site_latitude numeric(9,6) not null check (site_latitude between -90 and 90),
  site_longitude numeric(9,6) not null check (site_longitude between -180 and 180),
  safety_topic text not null check (length(btrim(safety_topic)) between 1 and 200),
  attendance_summary jsonb not null check (jsonb_typeof(attendance_summary) = 'object'),
  timing_status text not null check (timing_status in ('On Time','Late','Critical','Rollover')),
  warning_acknowledged boolean not null default false,
  signature_evidence_reference text not null check (signature_evidence_reference ~ '^sha256:[0-9a-f]{64}$'),
  payload_fingerprint text not null check (payload_fingerprint ~ '^[0-9a-f]{64}$'),
  submitted_by uuid not null references public.profiles(id),
  source_submission_id uuid not null unique references public.queued_sync_submissions(id) deferrable initially deferred,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, site_id, work_date)
);

create table public.site_day_trip_records (
  id uuid primary key,
  site_day_id uuid not null references public.site_day_records(id) on delete restrict,
  organization_id uuid not null references public.organizations(id),
  site_id uuid not null references public.sites(id),
  asset_id uuid not null references public.assets(id),
  asset_label text not null check (length(btrim(asset_label)) between 1 and 160),
  meter_reading numeric check (meter_reading is null or meter_reading >= 0),
  reason text not null check (length(btrim(reason)) between 1 and 80),
  custom_reason text check (custom_reason is null or length(custom_reason) <= 500),
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index site_day_scope_idx on public.site_day_records (organization_id, site_id, work_date desc);
create index site_day_submitter_idx on public.site_day_records (submitted_by, created_at desc);
create index site_day_trip_day_idx on public.site_day_trip_records (site_day_id, captured_at desc);
create index site_day_trip_scope_idx on public.site_day_trip_records (organization_id, site_id, captured_at desc);
create index site_day_trip_asset_idx on public.site_day_trip_records (organization_id, asset_id, captured_at desc);

alter table public.site_day_records enable row level security;
alter table public.site_day_trip_records enable row level security;
revoke all on public.site_day_records, public.site_day_trip_records from anon, authenticated;
grant select on public.site_day_records, public.site_day_trip_records to authenticated;

create policy site_day_records_read on public.site_day_records for select to authenticated
using (organization_id = private.current_organization_id() and (public.can_read_admin_workspace() or private.has_site_access(site_id, organization_id)));
create policy site_day_trip_records_read on public.site_day_trip_records for select to authenticated
using (organization_id = private.current_organization_id() and (public.can_read_admin_workspace() or private.has_site_access(site_id, organization_id)));

create or replace function private.persist_site_day_from_queue(p_submission public.queued_sync_submissions)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_site_day_id uuid;
  v_existing public.site_day_records%rowtype;
  v_trip jsonb;
  v_trip_id uuid;
  v_asset_id uuid;
  v_latitude numeric;
  v_longitude numeric;
  v_contract jsonb;
  v_fingerprint text;
begin
  if coalesce((p_submission.payload->>'version')::integer, 0) <> 1 then
    raise exception using errcode = '22023', message = 'Unsupported site-day payload version';
  end if;
  if length(btrim(coalesce(p_submission.payload->>'plannedTargets',''))) not between 1 and 2000 then
    raise exception using errcode = '22023', message = 'Planned work targets are required';
  end if;
  if jsonb_typeof(p_submission.payload->'siteLocation') <> 'object'
     or jsonb_typeof(p_submission.payload->'summary') <> 'object'
     or jsonb_typeof(p_submission.payload->'trips') <> 'array' then
    raise exception using errcode = '22023', message = 'Site-day location, summary, and trips are required';
  end if;
  if jsonb_array_length(p_submission.payload->'trips') > 100 then
    raise exception using errcode = '22023', message = 'A site day cannot contain more than 100 trips';
  end if;
  v_latitude := (p_submission.payload#>>'{siteLocation,latitude}')::numeric;
  v_longitude := (p_submission.payload#>>'{siteLocation,longitude}')::numeric;
  if v_latitude not between -90 and 90 or v_longitude not between -180 and 180 then
    raise exception using errcode = '22023', message = 'Site-day GPS location is invalid';
  end if;
  if coalesce(p_submission.payload->>'signatureEvidenceReference','') !~ '^sha256:[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Signature evidence reference is invalid';
  end if;
  if length(btrim(coalesce(p_submission.payload->>'safetyTopic',''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Safety topic is required';
  end if;

  v_contract := jsonb_build_object(
    'version', 1,
    'plannedTargets', btrim(p_submission.payload->>'plannedTargets'),
    'siteLocation', p_submission.payload->'siteLocation',
    'trips', p_submission.payload->'trips',
    'summary', p_submission.payload->'summary',
    'timingStatus', p_submission.payload->>'timingStatus',
    'acknowledgedWarning', coalesce((p_submission.payload->>'acknowledgedWarning')::boolean, false),
    'safetyTopic', btrim(p_submission.payload->>'safetyTopic'),
    'signatureEvidenceReference', p_submission.payload->>'signatureEvidenceReference'
  );
  v_fingerprint := encode(extensions.digest(v_contract::text, 'sha256'), 'hex');

  select * into v_existing
  from public.site_day_records
  where organization_id = p_submission.organization_id
    and site_id = p_submission.site_id
    and work_date = p_submission.work_date;
  if found then
    if v_existing.payload_fingerprint <> v_fingerprint then
      raise exception using errcode = '22000', message = 'Authoritative site-day record already exists with different values';
    end if;
    return v_existing.id;
  end if;

  insert into public.site_day_records (
    organization_id, site_id, work_date, contract_version, planned_targets,
    site_latitude, site_longitude, safety_topic, attendance_summary, timing_status,
    warning_acknowledged, signature_evidence_reference, payload_fingerprint,
    submitted_by, source_submission_id
  ) values (
    p_submission.organization_id, p_submission.site_id, p_submission.work_date, 1,
    btrim(p_submission.payload->>'plannedTargets'), v_latitude, v_longitude,
    btrim(p_submission.payload->>'safetyTopic'), p_submission.payload->'summary',
    p_submission.payload->>'timingStatus',
    coalesce((p_submission.payload->>'acknowledgedWarning')::boolean, false),
    p_submission.payload->>'signatureEvidenceReference', v_fingerprint,
    p_submission.submitted_by, p_submission.id
  )
  returning id into v_site_day_id;

  for v_trip in select value from jsonb_array_elements(p_submission.payload->'trips') loop
    v_trip_id := nullif(v_trip->>'id','')::uuid;
    v_asset_id := nullif(v_trip->>'assetId','')::uuid;
    v_latitude := (v_trip#>>'{location,latitude}')::numeric;
    v_longitude := (v_trip#>>'{location,longitude}')::numeric;
    if v_trip_id is null or v_asset_id is null
       or not exists (
         select 1 from public.assets a
         where a.id = v_asset_id
           and a.organization_id = p_submission.organization_id
           and a.assigned_site_id = p_submission.site_id
       )
       or length(btrim(coalesce(v_trip->>'assetLabel',''))) not between 1 and 160
       or length(btrim(coalesce(v_trip->>'reason',''))) not between 1 and 80
       or v_latitude not between -90 and 90 or v_longitude not between -180 and 180 then
      raise exception using errcode = '22023', message = 'Trip evidence is invalid or outside the submitted site';
    end if;
    insert into public.site_day_trip_records (
      id, site_day_id, organization_id, site_id, asset_id, asset_label, meter_reading,
      reason, custom_reason, latitude, longitude, captured_at
    ) values (
      v_trip_id, v_site_day_id, p_submission.organization_id, p_submission.site_id, v_asset_id,
      left(btrim(coalesce(v_trip->>'assetLabel','')),160), nullif(v_trip->>'reading','')::numeric,
      btrim(v_trip->>'reason'), nullif(left(btrim(coalesce(v_trip->>'customReason','')),500),''),
      v_latitude, v_longitude, (v_trip->>'capturedAt')::timestamptz
    );
  end loop;
  return v_site_day_id;
end
$$;

revoke all on function private.persist_site_day_from_queue(public.queued_sync_submissions) from public, anon, authenticated;

create or replace function private.process_attendance_queue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles%rowtype;
  r jsonb;
  e public.employees%rowtype;
  v jsonb;
  prior jsonb;
  n integer;
  added integer := 0;
  state text;
  msg text;
  act text;
begin
  if tg_op = 'UPDATE' then
    if old.status <> 'failed' or old.outcome <> 'retryable' or new.status <> 'processing' then
      raise exception using errcode = '22023', message = 'Only retryable failed submissions can be retried';
    end if;
    if (to_jsonb(new) - array['status','outcome','last_error','diagnostic_context','attempts','processed_at','updated_at'])
      is distinct from
      (to_jsonb(old) - array['status','outcome','last_error','diagnostic_context','attempts','processed_at','updated_at']) then
      raise exception using errcode = '22023', message = 'Submission evidence is immutable';
    end if;
  end if;

  select * into p from public.profiles where id = new.submitted_by and is_active;
  begin
    if p.id is null or p.role <> 'site' or p.organization_id <> new.organization_id then
      raise exception using errcode = '42501', message = 'Active site manager in submission organization required';
    end if;
    if auth.uid() is distinct from new.submitted_by and not public.can_read_admin_workspace() then
      raise exception using errcode = '42501', message = 'Actor outside permitted boundary';
    end if;
    new.site_id := coalesce(new.site_id, nullif(new.payload->>'siteId','')::uuid);
    new.work_date := coalesce(new.work_date, nullif(new.payload->>'workDate','')::date);
    if new.site_id is null or new.work_date is null
      or new.payload->>'siteId' is distinct from new.site_id::text
      or new.payload->>'workDate' is distinct from new.work_date::text then
      raise exception using errcode = '22023', message = 'Payload scope does not match submission scope';
    end if;
    if not exists (
      select 1
      from public.profile_site_access access
      join public.sites site on site.id = access.site_id and site.organization_id = access.organization_id
      where access.profile_id = new.submitted_by
        and access.site_id = new.site_id
        and access.organization_id = new.organization_id
    ) then
      raise exception using errcode = '42501', message = 'Site manager not assigned to submitted site';
    end if;
    if jsonb_typeof(new.payload->'rows') <> 'array' then
      raise exception using errcode = '22023', message = 'Attendance rows must be an array';
    end if;
    n := jsonb_array_length(new.payload->'rows');
    if n < 1 or n > 2000 then
      raise exception using errcode = '22023', message = 'Attendance submission must contain 1 to 2000 rows';
    end if;
    for r in select value from jsonb_array_elements(new.payload->'rows') loop
      if r->>'employeeId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception using errcode = '22023', message = 'Invalid employee identifier';
      end if;
      select * into e
      from public.employees
      where id = (r->>'employeeId')::uuid
        and organization_id = new.organization_id
        and site_id = new.site_id;
      if e.id is null then
        raise exception using errcode = '42501', message = 'Employee outside submitted organization or site';
      end if;
      if r->>'status' not in ('present','absent','pending') then
        raise exception using errcode = '22023', message = 'Unsupported attendance status';
      end if;
      if length(coalesce(r->>'comment','')) > 500 then
        raise exception using errcode = '22023', message = 'Attendance comment exceeds 500 characters';
      end if;
      v := jsonb_strip_nulls(jsonb_build_object(
        'date', new.work_date::text,
        'status', r->>'status',
        'reason', nullif(r->>'reason',''),
        'comment', nullif(r->>'comment',''),
        'isFlagged', coalesce((r->>'isFlagged')::boolean, false)
      ));
      select attendance into prior
      from public.attendance_delivery_records
      where organization_id = new.organization_id
        and site_id = new.site_id
        and employee_id = e.id
        and work_date = new.work_date;
      if prior is not null and prior <> v then
        raise exception using errcode = '22000', message = 'Authoritative attendance already exists with different values';
      end if;
      if prior is null then
        insert into public.attendance_delivery_records
          (organization_id, site_id, employee_id, work_date, attendance, source_submission_id)
        values (new.organization_id, new.site_id, e.id, new.work_date, v, new.id)
        on conflict do nothing;
        if found then
          update public.employees
          set logs = jsonb_set(coalesce(logs,'{}'), array[new.work_date::text], v, true), updated_at = now()
          where id = e.id;
          added := added + 1;
        end if;
      end if;
    end loop;

    perform private.persist_site_day_from_queue(new);

    new.status := 'completed';
    new.outcome := 'accepted';
    new.last_error := null;
    new.diagnostic_context := jsonb_build_object('rowCount', n, 'insertedCount', added, 'idempotentCount', n - added);
    new.processed_at := now();
    if tg_op = 'UPDATE' then
      new.attempts := old.attempts + 1;
      act := 'queue_delivery_retried';
    else
      new.attempts := new.attempts + 1;
      act := 'queue_delivery_accepted';
    end if;
  exception when others then
    get stacked diagnostics state = returned_sqlstate, msg = message_text;
    new.status := 'failed';
    new.outcome := case when state in ('40001','40P01','55P03','57014','08000','08003','08006') then 'retryable' else 'rejected' end;
    new.last_error := left(msg, 1000);
    if tg_op = 'UPDATE' then new.attempts := old.attempts + 1; else new.attempts := new.attempts + 1; end if;
    new.diagnostic_context := jsonb_build_object('sqlstate', state, 'message', new.last_error, 'attempt', new.attempts);
    new.processed_at := now();
    act := case when new.outcome = 'retryable' then 'queue_delivery_retryable' else 'queue_delivery_rejected' end;
  end;
  new.updated_at := now();
  insert into public.attendance_audit_events
    (actor_id, actor_name, action, details, organization_id, site_id)
  values (
    auth.uid(), coalesce(p.display_name,'Site Manager'), act,
    format('Submission %s: %s', new.id, coalesce(new.last_error,new.outcome)),
    new.organization_id, new.site_id
  );
  return new;
end
$$;

revoke all on function private.process_attendance_queue() from public, anon, authenticated;

commit;
