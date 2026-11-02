begin;

alter table public.issues
  add column if not exists version integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'issues_version_positive'
      and conrelid = 'public.issues'::regclass
  ) then
    alter table public.issues
      add constraint issues_version_positive check (version > 0);
  end if;
end
$$;

create table if not exists public.issue_events (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  event_type text not null check (event_type in ('created','details_updated','assigned','sla_changed','escalated','resolved','legacy')),
  from_status text check (from_status is null or from_status in ('Open','Escalated','Resolved')),
  to_status text check (to_status is null or to_status in ('Open','Escalated','Resolved')),
  reason text check (reason is null or length(btrim(reason)) between 1 and 1000),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null check (length(btrim(actor_name)) between 1 and 200),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists issue_events_issue_occurred_idx
  on public.issue_events(issue_id, occurred_at);
create index if not exists issue_events_organization_occurred_idx
  on public.issue_events(organization_id, occurred_at desc);
create index if not exists issue_events_actor_idx
  on public.issue_events(actor_id) where actor_id is not null;
create index if not exists issue_events_owner_idx
  on public.issue_events(owner_profile_id) where owner_profile_id is not null;

alter table public.issue_events enable row level security;
revoke all on public.issue_events from anon, authenticated;
grant select on public.issue_events to authenticated;

drop policy if exists issue_events_read on public.issue_events;
create policy issue_events_read
on public.issue_events for select to authenticated
using (
  organization_id = (select private.current_organization_id())
  and exists (
    select 1
    from public.issues issue
    where issue.id = issue_events.issue_id
      and issue.organization_id = issue_events.organization_id
      and (
        public.can_read_admin_workspace()
        or (issue.site_id is not null and private.has_site_access(issue.site_id, issue.organization_id))
      )
  )
);

insert into public.issue_events (
  issue_id, organization_id, event_type, from_status, to_status,
  reason, actor_id, actor_name, owner_profile_id, due_at, occurred_at
)
select
  issue.id, issue.organization_id, 'legacy', null, issue.status,
  'History predates normalized issue events.', null, 'System migration',
  issue.owner_profile_id, issue.due_at, issue.created_at
from public.issues issue
where issue.organization_id is not null
  and not exists (select 1 from public.issue_events event where event.issue_id = issue.id);

create or replace function public.save_operational_issue(
  p_issue_id uuid,
  p_site_id uuid,
  p_reported_by text,
  p_category text,
  p_description text,
  p_severity text,
  p_owner_profile_id uuid,
  p_due_at timestamptz
)
returns setof public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_existing public.issues%rowtype;
  v_saved public.issues%rowtype;
  v_event_type text;
begin
  select * into v_actor
  from public.profiles
  where id = auth.uid() and is_active = true;

  if v_actor.id is null or v_actor.role not in ('office', 'director')
     or v_actor.organization_id is distinct from private.current_organization_id() then
    raise exception using errcode = '42501', message = 'Active Office Admin or Director access is required';
  end if;
  if length(btrim(coalesce(p_reported_by, ''))) not between 1 and 200
     or length(btrim(coalesce(p_description, ''))) not between 1 and 4000
     or p_category not in ('Safety','Payroll','Discipline','Operations')
     or p_severity not in ('low','medium','high','critical') then
    raise exception using errcode = '22023', message = 'Issue details are invalid';
  end if;
  if p_severity in ('high','critical') and (p_owner_profile_id is null or p_due_at is null) then
    raise exception using errcode = '22023', message = 'High and critical issues require an owner and due date';
  end if;
  if p_site_id is not null and not exists (
    select 1 from public.sites
    where id = p_site_id and organization_id = v_actor.organization_id
  ) then
    raise exception using errcode = '42501', message = 'Issue site is outside the active organization';
  end if;
  if p_owner_profile_id is not null and not exists (
    select 1 from public.profiles
    where id = p_owner_profile_id and organization_id = v_actor.organization_id and is_active = true
  ) then
    raise exception using errcode = '42501', message = 'Issue owner is outside the active organization';
  end if;

  if p_issue_id is null then
    insert into public.issues (
      organization_id, site_id, reported_by, category, description, status,
      severity, owner_profile_id, due_at, version
    ) values (
      v_actor.organization_id, p_site_id, btrim(p_reported_by), p_category,
      btrim(p_description), 'Open', p_severity, p_owner_profile_id, p_due_at, 1
    ) returning * into v_saved;
    v_event_type := 'created';
  else
    select * into v_existing
    from public.issues
    where id = p_issue_id and organization_id = v_actor.organization_id
    for update;
    if v_existing.id is null then
      raise exception using errcode = 'P0002', message = 'Issue not found in the active organization';
    end if;
    if v_existing.status = 'Resolved' then
      raise exception using errcode = '22023', message = 'Resolved issues are immutable';
    end if;
    update public.issues set
      site_id = p_site_id,
      reported_by = btrim(p_reported_by),
      category = p_category,
      description = btrim(p_description),
      severity = p_severity,
      owner_profile_id = p_owner_profile_id,
      due_at = p_due_at,
      version = version + 1
    where id = v_existing.id
    returning * into v_saved;
    v_event_type := case
      when v_existing.owner_profile_id is distinct from p_owner_profile_id then 'assigned'
      when v_existing.due_at is distinct from p_due_at then 'sla_changed'
      else 'details_updated'
    end;
  end if;

  insert into public.issue_events (
    issue_id, organization_id, event_type, from_status, to_status, actor_id,
    actor_name, owner_profile_id, due_at
  ) values (
    v_saved.id, v_saved.organization_id, v_event_type,
    case when p_issue_id is null then null else v_existing.status end,
    v_saved.status, v_actor.id, coalesce(nullif(btrim(v_actor.display_name), ''), 'Authorized operator'),
    v_saved.owner_profile_id, v_saved.due_at
  );

  return next v_saved;
end
$$;

create or replace function public.transition_operational_issue(
  p_issue_id uuid,
  p_to_status text,
  p_reason text
)
returns setof public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_existing public.issues%rowtype;
  v_saved public.issues%rowtype;
begin
  select * into v_actor
  from public.profiles
  where id = auth.uid() and is_active = true;
  if v_actor.id is null or v_actor.role not in ('office', 'director')
     or v_actor.organization_id is distinct from private.current_organization_id() then
    raise exception using errcode = '42501', message = 'Active Office Admin or Director access is required';
  end if;
  if p_to_status not in ('Escalated','Resolved')
     or length(btrim(coalesce(p_reason, ''))) not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'A supported transition and reason are required';
  end if;

  select * into v_existing
  from public.issues
  where id = p_issue_id and organization_id = v_actor.organization_id
  for update;
  if v_existing.id is null then
    raise exception using errcode = 'P0002', message = 'Issue not found in the active organization';
  end if;
  if v_existing.status = 'Resolved' or v_existing.status = p_to_status then
    raise exception using errcode = '22023', message = 'That issue transition is not allowed';
  end if;
  if p_to_status = 'Escalated' and (v_existing.owner_profile_id is null or v_existing.due_at is null) then
    raise exception using errcode = '22023', message = 'Escalation requires an owner and due date';
  end if;

  update public.issues
  set status = p_to_status, version = version + 1
  where id = v_existing.id
  returning * into v_saved;

  insert into public.issue_events (
    issue_id, organization_id, event_type, from_status, to_status, reason,
    actor_id, actor_name, owner_profile_id, due_at
  ) values (
    v_saved.id, v_saved.organization_id,
    case when p_to_status = 'Escalated' then 'escalated' else 'resolved' end,
    v_existing.status, v_saved.status, btrim(p_reason), v_actor.id,
    coalesce(nullif(btrim(v_actor.display_name), ''), 'Authorized operator'),
    v_saved.owner_profile_id, v_saved.due_at
  );

  return next v_saved;
end
$$;

revoke all on function public.save_operational_issue(uuid, uuid, text, text, text, text, uuid, timestamptz) from public, anon;
revoke all on function public.transition_operational_issue(uuid, text, text) from public, anon;
grant execute on function public.save_operational_issue(uuid, uuid, text, text, text, text, uuid, timestamptz) to authenticated;
grant execute on function public.transition_operational_issue(uuid, text, text) to authenticated;

commit;
