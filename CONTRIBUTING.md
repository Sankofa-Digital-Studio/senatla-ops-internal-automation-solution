# Contributing to Senatla Ops

Senatla Ops is an internal Senatla Trading product. The public company website is frozen and outside this repository's delivery scope.

## Work authorization

1. Link every change to a GitHub issue with an operational outcome and acceptance evidence.
2. Use `feature/<issue>-description` or `fix/<issue>-description`; Codex branches use `sankofa/<issue>-description`.
3. Use `type(scope): description` commits.
4. Submit a focused pull request and complete the evidence checklist.
5. Feature and fix pull requests target `dev` and normally use squash merge after CI and review.
6. Release pull requests promote `dev` to `main` with a merge commit so long-lived branch ancestry is preserved.
7. Authors do not approve or merge their own release pull requests. A different eligible CODEOWNER must approve.
8. After release, merge `main` back into `dev`; never rewrite either protected branch.

## Definition of done

- Every operational record resolves to Senatla Trading.
- Every mutation creates an attributable audit event.
- Authorization is enforced in Supabase RLS, not only in the Angular client.
- UI changes are checked at desktop and 390 px widths.
- Migrations pass a clean local reset and negative RLS tests.
- No production personal information or service-role credential enters Git, logs, issues or screenshots.
- Rollback and recovery instructions are included for high-risk changes.

Run `npm run verify` before requesting review. That application gate must show evidence for lint, typecheck, headless tests and build. Normal pull requests target `dev`, the integration and demo branch. Supabase changes also require the pinned local stack, a clean database reset, and all pgTAP contracts. Production changes reach `main` only through the reviewed release procedure in the runbook.
