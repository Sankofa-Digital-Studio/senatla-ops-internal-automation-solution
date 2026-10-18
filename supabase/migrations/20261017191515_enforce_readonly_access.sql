begin;

create or replace function private.auth_token_is_valid()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and coalesce(nullif(auth.jwt() ->> 'exp', '')::bigint, 0) > extract(epoch from statement_timestamp())::bigint
$$;

revoke all on function private.auth_token_is_valid() from public, anon;
grant execute on function private.auth_token_is_valid() to authenticated;

create or replace function private.auth_session_is_current()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.auth_token_is_valid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'must_change_password', 'false') <> 'true'
$$;

revoke all on function private.auth_session_is_current() from public, anon;
grant execute on function private.auth_session_is_current() to authenticated;

create or replace function private.has_site_access(target_site_id uuid, target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_site_access access
    where access.profile_id = auth.uid()
      and access.site_id = target_site_id
      and access.organization_id = target_organization_id
      and access.organization_id = private.current_organization_id()
      and private.current_app_role()::text in ('site', 'readonly')
  )
$$;

revoke all on function private.has_site_access(uuid, uuid) from public, anon;
grant execute on function private.has_site_access(uuid, uuid) to authenticated;

do $$
declare
  target_table record;
begin
  for target_table in
    select table_object.relname as table_name
    from pg_class table_object
    join pg_namespace schema_object on schema_object.oid = table_object.relnamespace
    where schema_object.nspname = 'public'
      and table_object.relkind = 'r'
      and table_object.relrowsecurity
  loop
    execute format(
      'drop policy if exists readonly_block_insert on public.%I',
      target_table.table_name
    );
    execute format(
      'create policy readonly_block_insert on public.%I as restrictive for insert to authenticated with check (coalesce(private.current_app_role()::text <> ''readonly'', false))',
      target_table.table_name
    );

    execute format(
      'drop policy if exists readonly_block_update on public.%I',
      target_table.table_name
    );
    execute format(
      'create policy readonly_block_update on public.%I as restrictive for update to authenticated using (coalesce(private.current_app_role()::text <> ''readonly'', false)) with check (coalesce(private.current_app_role()::text <> ''readonly'', false))',
      target_table.table_name
    );

    execute format(
      'drop policy if exists readonly_block_delete on public.%I',
      target_table.table_name
    );
    execute format(
      'create policy readonly_block_delete on public.%I as restrictive for delete to authenticated using (coalesce(private.current_app_role()::text <> ''readonly'', false))',
      target_table.table_name
    );
  end loop;
end;
$$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read
on public.profiles for select to authenticated
using (
  private.auth_token_is_valid()
  and is_active = true
  and (
    id = (select auth.uid())
    or (
      private.auth_session_is_current()
      and public.can_read_admin_workspace()
    )
  )
);

commit;