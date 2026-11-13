# Senatla Ops v0.5.7

## Summary

This release promotes the dashboard usability and profile-control work from `preview` through `dev` into `main`, with verified dependency maintenance and no rollback of the current CI, security, or deployment configuration.

## User-facing changes

- Profile users can update their display name; the database policy restricts the write to the authenticated user’s own `display_name` column.
- Role guidance cards now navigate directly to the relevant workspace section.
- Workforce and dashboard scope selection uses Head Office, Engineering, Demo & Rehab, and Underground.
- Engineering job-card tables now provide search, status multi-filtering, sorting, clear filters, pagination, fixed headers, and less compressed rows.
- Director source metadata places the freshness/source line below the source-backed label.

## Session data behavior

Dashboard records used during a signed-in session are cached in `sessionStorage` so navigation and local table interactions do not require repeated reads. CRUD actions update the in-memory view and cache after the mutation succeeds. The cache is cleared when the user signs out.

## Dependency maintenance

- `zone.js`: `0.15.1` → `0.16.3`
- `@playwright/test`: `1.62.1` → `1.65.0`
- `karma-jasmine-html-reporter`: `2.2.0` → `2.3.0`

Stale Dependabot branches based on the old `0.5.5` tree were not merged wholesale because they would remove current scripts, security configuration, and workflow safeguards. Only the intended dependency changes were retained.

## Verification and promotion record

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `preview`: verified feature commit before synchronization.
- `dev`: synchronized and verified before promotion.
- `main`: promoted only after the dependency-aware build passed.

## Rollback

Use the preceding `main` commit or the prior GitHub release tag if rollback is required. Database migration `20261113190000_profile_display_name_self_update.sql` must be reviewed with the normal Supabase migration rollback procedure before reversing production data policy changes.
