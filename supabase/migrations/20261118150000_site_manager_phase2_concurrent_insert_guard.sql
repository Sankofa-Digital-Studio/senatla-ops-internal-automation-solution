begin;

create or replace function private.guard_manager_shift_scope_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_write_manager_control(new.site_id, new.organization_id) then
    raise insufficient_privilege using message = 'You cannot create a manager shift for this site';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text || ':' || new.site_id::text || ':' || new.work_date::text, 1));
  if exists (
    select 1 from public.manager_shift_snapshots snapshot
    where snapshot.organization_id = new.organization_id
      and snapshot.site_id = new.site_id
      and snapshot.work_date = new.work_date
  ) then
    raise exception using errcode = '40001', message = 'The manager shift was created by another save. Reload it before retrying.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_manager_shift_scope_insert() from public, anon, authenticated;
create trigger manager_shift_scope_insert_guard before insert on public.manager_shift_snapshots
for each row execute function private.guard_manager_shift_scope_insert();

commit;
