-- Profile history and immutable snapshots for recovery and audit compliance
create table if not exists public.profile_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  snapshot jsonb not null,
  change_type text not null check (change_type in ('created', 'updated', 'suspended', 'activated', 'role_changed', 'rollback')),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_by_name text not null default 'System',
  recorded_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profile_history_profile_id on public.profile_history(profile_id, recorded_at desc);

alter table public.profile_history enable row level security;

drop policy if exists "profile_history_select" on public.profile_history;
create policy "profile_history_select"
on public.profile_history for select to authenticated
using (
  (public.current_app_role() = 'director' or (auth.jwt() ->> 'email') = 'thosontula@gmail.com')
  or (public.current_app_role() = 'office' and organization_id = public.current_organization_id())
  or (profile_id = auth.uid())
);

drop policy if exists "profile_history_insert" on public.profile_history;
create policy "profile_history_insert"
on public.profile_history for insert to authenticated
with check (
  public.current_app_role() in ('office', 'director')
  or (auth.jwt() ->> 'email') = 'thosontula@gmail.com'
  or profile_id = auth.uid()
);

drop policy if exists "profile_history_no_update" on public.profile_history;
create policy "profile_history_no_update"
on public.profile_history for update to authenticated
using (false);

drop policy if exists "profile_history_no_delete" on public.profile_history;
create policy "profile_history_no_delete"
on public.profile_history for delete to authenticated
using (false);

grant select, insert on public.profile_history to authenticated;
