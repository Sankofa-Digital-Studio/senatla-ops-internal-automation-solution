# Supabase + Vercel Rollout

## Recommendation

Use:
- Supabase for Auth, Postgres, RLS, and persistent operational state
- Vercel for frontend hosting and future thin privileged functions

Do not use Vercel as the primary data layer for this project. The domain is relational and audit-heavy. Supabase fits that better.

## Why this pairing is the default

- payroll, attendance, sites, and audit data are relational
- browser-only persistence is no longer acceptable
- Supabase RLS gives a clean path to role-bound access rules
- Vercel hosts Angular cleanly and can add server functions later without replacing the data tier

## Better alternatives only if your priority changes

Choose `Clerk + Neon + Vercel` instead if:
- auth complexity is the main problem
- you need stronger org/invite/session tooling before data modeling
- you expect enterprise identity requirements first

Do not choose Firebase first for this app unless:
- realtime mobile sync is more important than relational reporting and audit design

## Environment variables

Set these for local `.env` usage and in Vercel project settings:

- `SENATLA_API_MODE=supabase`
- `SENATLA_SUPABASE_URL=...`
- `SENATLA_SUPABASE_ANON_KEY=...`

The runtime config generator also accepts common Vercel aliases: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If `SENATLA_API_MODE=supabase` is set without a URL and anon key, the build fails instead of deploying a blank runtime config.

Use `local` mode only for the local app-state gateway. Authentication still uses Supabase Auth in every mode.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL migration in [20260406000000_init_senatla_ops.sql](../supabase/migrations/20260406000000_init_senatla_ops.sql).
3. Create Auth users in Supabase Auth.
4. Insert matching rows into `public.profiles` with:
   - `id` = auth user id
   - `display_name`
   - `username`
   - `role`

## Current backend scope

Implemented now:
- Supabase-backed auth session restore and sign-in
- Supabase-backed persistent app snapshot storage for operational state only
- immutable audit writes and reads through append-only Supabase tables
- runtime config generation for local and Vercel builds

Not implemented yet:
- row-level policies for per-site data slices inside normalized tables
- server-side payroll/export endpoints
