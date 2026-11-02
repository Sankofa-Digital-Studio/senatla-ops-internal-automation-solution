create table if not exists public.recovery_pin_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pin_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  is_current boolean not null default true
);

create index if not exists idx_recovery_pin_history_user_current on public.recovery_pin_history(user_id, is_current);
create index if not exists idx_recovery_pin_history_user_created on public.recovery_pin_history(user_id, created_at);

alter table public.recovery_pin_history enable row level security;

-- Authenticated users can only read their own recovery pin status (not raw pin hashes)
create policy recovery_pin_read_own
  on public.recovery_pin_history
  for select
  to authenticated
  using (user_id = auth.uid());

-- All insertions and mutations occur via service-role / security-definer API handlers
revoke insert, update, delete, truncate on public.recovery_pin_history from authenticated, anon;
