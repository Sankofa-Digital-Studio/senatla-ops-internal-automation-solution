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
- `SUPABASE_SERVICE_ROLE_KEY=...` (server-side only)
- `RESEND_API_KEY=...` (server-side only; invitation email delivery)
- `SENATLA_EMAIL_FROM=...` (verified sender address)
- `SENATLA_APP_URL=https://...` (public app origin used for invitation emails and reset redirect validation)

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

## User invitations and read-only access

Office administrators provision accounts through `/api/admin/users`. The API generates a temporary password, assigns the `readonly` role and a single active site, and emails the credentials. The first login requires the user to set and confirm a permanent password; the backend changes the password and clears the forced-change flag together. Until then, the signed app-metadata flag disables the active database session predicate, so the temporary-password session can read only its own profile and cannot access operational records. The read-only role is scoped to the assigned site's data and blocked from direct insert, update, and delete operations by restrictive RLS policies. It is not granted organization-wide admin workspace access.

Apply the migrations in timestamp order, including `20261017191400_add_readonly_role.sql` followed by `20261017191515_enforce_readonly_access.sql`. Register the deployment origin in Supabase Auth's allowed redirect URLs for ordinary password recovery. Configure `RESEND_API_KEY` and `SENATLA_EMAIL_FROM` before enabling user invitations; if email delivery is unavailable, the API rolls back the newly created account.

Public email/password signups must remain disabled in hosted Supabase Auth settings as they are in `supabase/config.toml` (`enable_signup = false`). Admin-created users continue to work through the server-side Auth Admin API.

## Current backend scope

Implemented now:
- Supabase-backed auth session restore and sign-in
- Supabase-backed persistent app snapshot storage for operational state only
- immutable audit writes and reads through append-only Supabase tables
- runtime config generation for local and Vercel builds

Not implemented yet:
- row-level policies for per-site data slices inside normalized tables
- server-side payroll/export endpoints
