begin;

drop policy if exists manager_shift_update on public.manager_shift_snapshots;
create policy manager_shift_update on public.manager_shift_snapshots for update to authenticated
using (private.can_read_manager_control(site_id, organization_id) and (private.can_write_manager_control(site_id, organization_id) or public.can_read_admin_workspace()))
with check (private.can_read_manager_control(site_id, organization_id));

drop policy if exists manager_readiness_write on public.manager_workstation_readiness;
drop policy if exists manager_readiness_insert on public.manager_workstation_readiness;
drop policy if exists manager_readiness_update on public.manager_workstation_readiness;
create policy manager_readiness_insert on public.manager_workstation_readiness for insert to authenticated
with check (private.can_write_manager_control(site_id, organization_id));
create policy manager_readiness_update on public.manager_workstation_readiness for update to authenticated
using (private.can_write_manager_control(site_id, organization_id))
with check (private.can_write_manager_control(site_id, organization_id));

drop function if exists private.manager_shift_updated_at() cascade;
create or replace function private.manager_shift_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  if old.status = 'accepted' then
    raise exception using errcode = '22023', message = 'An accepted manager handover is immutable';
  end if;
  if private.can_write_manager_control(old.site_id, old.organization_id) then
    if (old.status = 'submitted' and new.status in ('accepted', 'rejected'))
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at then
      raise insufficient_privilege using message = 'Only an Office Admin or Director can review a submitted handover';
    end if;
  else
    if not public.can_read_admin_workspace()
       or old.status <> 'submitted'
       or new.status not in ('accepted', 'rejected')
       or new.manager_mode is distinct from old.manager_mode
       or new.shift_objective is distinct from old.shift_objective
       or new.shift_top_risk is distinct from old.shift_top_risk
       or new.shift_support is distinct from old.shift_support
       or new.handover_note is distinct from old.handover_note
       or new.manager_profile_id is distinct from old.manager_profile_id
       or new.reviewed_by is distinct from (select auth.uid()) then
      raise insufficient_privilege using message = 'Reviewers may only accept or reject a submitted handover';
    end if;
  end if;
  if new.status <> old.status then
    if old.status = 'draft' and new.status not in ('draft', 'submitted') then
      raise exception using errcode = '22023', message = 'A draft manager shift can only be submitted';
    end if;
    if old.status = 'submitted' and new.status not in ('submitted', 'accepted', 'rejected') then
      raise exception using errcode = '22023', message = 'A submitted manager shift can only be reviewed';
    end if;
    if old.status = 'rejected' and new.status not in ('rejected', 'submitted') then
      raise exception using errcode = '22023', message = 'A rejected manager shift can only be revised and resubmitted';
    end if;
  end if;
  if new.status = 'rejected' and length(btrim(coalesce(new.review_reason, ''))) < 3 then
    raise exception using errcode = '22023', message = 'A rejection reason is required';
  end if;
  return new;
end;
$$;
revoke all on function private.manager_shift_updated_at() from public, anon, authenticated;
create trigger manager_shift_updated_at before update on public.manager_shift_snapshots
for each row execute function private.manager_shift_updated_at();

create or replace function public.set_manager_shift_status_v1(p_snapshot_id uuid, p_status text, p_reason text default null)
returns public.manager_shift_snapshots
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_snapshot public.manager_shift_snapshots;
begin
  if p_status not in ('submitted', 'accepted', 'rejected') then
    raise exception using errcode = '22023', message = 'Unsupported manager shift status';
  end if;
  select * into v_snapshot from public.manager_shift_snapshots where id = p_snapshot_id;
  if v_snapshot.id is null then
    raise exception using errcode = 'P0002', message = 'Manager shift snapshot not found';
  end if;
  if not private.can_read_manager_control(v_snapshot.site_id, v_snapshot.organization_id) then
    raise insufficient_privilege using message = 'This manager handover is outside your authorized scope';
  end if;
  if p_status in ('accepted', 'rejected') and not public.can_read_admin_workspace() then
    raise insufficient_privilege using message = 'Only Office Admin or Director users can review a manager handover';
  end if;
  if p_status = 'submitted' and not private.can_write_manager_control(v_snapshot.site_id, v_snapshot.organization_id) then
    raise insufficient_privilege using message = 'Only the Site Manager can submit this handover';
  end if;
  if p_status = 'rejected' and length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception using errcode = '22023', message = 'A rejection reason is required';
  end if;
  update public.manager_shift_snapshots
  set status = p_status,
      review_reason = case when p_status = 'rejected' then btrim(p_reason) else null end,
      reviewed_by = case when p_status in ('accepted', 'rejected') then (select auth.uid()) else reviewed_by end,
      reviewed_at = case when p_status in ('accepted', 'rejected') then timezone('utc', now()) else reviewed_at end,
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = p_snapshot_id returning * into v_snapshot;
  return v_snapshot;
end;
$$;

revoke all on function public.set_manager_shift_status_v1(uuid, text, text) from public, anon;
grant execute on function public.set_manager_shift_status_v1(uuid, text, text) to authenticated;

commit;
