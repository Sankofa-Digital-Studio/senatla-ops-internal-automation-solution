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

-- PIN digests are server-only recovery material. All access occurs through
-- authenticated server handlers using the service role; clients receive only
-- availability or verification results and must never read the digest rows.
revoke all on public.recovery_pin_history from authenticated, anon;
