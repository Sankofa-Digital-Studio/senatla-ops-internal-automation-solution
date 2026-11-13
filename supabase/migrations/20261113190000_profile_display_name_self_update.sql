-- Allow authenticated users to edit only their own display name.
-- Role, organization, activation state, and username remain admin-controlled.

revoke update on table public.profiles from authenticated;
grant update (display_name) on table public.profiles to authenticated;

drop policy if exists profiles_update_display_name_own on public.profiles;
create policy profiles_update_display_name_own
on public.profiles
for update
to authenticated
using (
  private.auth_session_is_current()
  and id = (select auth.uid())
)
with check (
  private.auth_session_is_current()
  and id = (select auth.uid())
);
