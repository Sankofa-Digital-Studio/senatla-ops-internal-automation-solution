begin;

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

commit;
