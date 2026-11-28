# Senatla Ops Operations Runbook

## Release

1. Confirm `dev` is green and contains only the approved release scope.
2. Confirm every included issue and pull request contains acceptance evidence.
3. Open a pull request from `dev` to `preview`. For each promotion pull request, obtain independent approval from an eligible CODEOWNER who did not author the pull request or push its last change.
4. Confirm `application`, `supabase`, `responsive-layout`, and `native-required` are green for the exact candidate commit. Merge using a merge commit.
5. Verify the Vercel preview deployment and compare its Supabase project ref with production. Rehearse migrations and run role-negative tests against an isolated database. Treat a shared Preview and Production Supabase project as production for all writes.
6. Back up the production database and verify the recovery point and rollback commit before any migration on production or a shared project. Apply production migrations only in the approved release window. Attach hosted preview smoke evidence for the exact candidate to the release record.
7. Open a pull request from `preview` to `main`. Confirm the reviewed preview contents, required checks, and independent approval before merging with a merge commit.
8. Verify the immutable production artifact with review bypass disabled. Smoke-test each role, asset lookup, protected-route behavior, and one read-only dashboard path.
9. Verify the GitHub Pages build from `main:/docs` and open the live portal and current release links.
10. Record both promotion pull requests, candidate and deployed commits, migration identifiers, deployment URLs, approvers, release owner, and rollback point in the release record.
11. Reconcile any production-only changes back into `preview` and `dev` through pull requests. Confirm the branches contain the expected changes.

### Dev APK publication

GitHub Releases are immutable. Native CI must create a commit-specific `dev-<sha>` draft with `senatla-ops-dev.apk` attached, then publish that draft as a prerelease. Never overwrite `dev-latest`. The stable `/api/download-apk` endpoint resolves the newest published dev prerelease and falls back to the last known immutable asset if GitHub's release API is temporarily unavailable.

## Rollback

Stop new writes when data integrity is uncertain. Restore the prior web artifact first for application-only regressions. Revert through a reviewed pull request; never force-push or rewrite `main`. For schema failures, use the documented compensating migration; do not edit applied migration files. Restore from backup only after Operations and the technical lead confirm data-loss implications.

## Incident handling

Preserve logs and audit events, rotate exposed credentials immediately, revoke affected sessions, identify impacted organizations and records, and avoid placing personal information in tickets. Notify Operations, Finance and the technical lead according to impact.

## Offline recovery

Do not delete failed outbox records. Inspect idempotency key, attempt count and error; correct the underlying conflict; retry once; escalate repeated failures with the original audit reference.


## Authentication recovery

1. Confirm the user exists in Supabase Auth and has one active protected profile.
2. Confirm the profile organisation and profile_site_access assignments match approved access.
3. Use the office-admin server workflow to request password reset, change role, activate or deactivate an account.
4. Never edit role or active status from the browser client or user metadata.
5. Review auth_activity_events for successful application events and Supabase Auth audit logs for failed sign-ins.
6. For suspected token exposure, deactivate the profile, ban or revoke the Auth session, rotate affected credentials and preserve the audit reference.

Rollback authentication changes with a new compensating migration and the prior immutable web artifact. Never re-enable demo credentials or the removed review bypass.

