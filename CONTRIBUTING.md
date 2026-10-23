# Contributing to Senatla Ops

Senatla Ops is an internal Senatla Trading product. The public company website is frozen and outside this repository's delivery scope.

## Work authorization

1. Link every change to a GitHub issue with an operational outcome and acceptance evidence.
2. Use `feature/<issue>-description` or `fix/<issue>-description`; Codex branches use `codex/<issue>-description`.
3. Use `type(scope): description` commits.
4. Submit a focused pull request and complete the evidence checklist.
5. Squash merge only after CI and CODEOWNER review. Authors do not self-merge.
6. GitHub dev is the only integration and demo source of truth. main and master are not merge targets for Senatla Ops demo work.

## Definition of done

- Every operational record resolves to Senatla Trading.
- Every mutation creates an attributable audit event.
- Authorization is enforced in Supabase RLS, not only in the Angular client.
- UI changes are checked at desktop and 390 px widths.
- Migrations pass a clean local reset and negative RLS tests.
- No production personal information or service-role credential enters Git, logs, issues or screenshots.
- Rollback and recovery instructions are included for high-risk changes.

Run `npm run verify` before requesting review. That single application gate must show evidence for lint, typecheck, headless tests and build. Pull requests target `dev`, the repository integration and demo branch. Supabase changes also require `npx supabase@2.107.0 start`, `db reset --local`, and `test db`.
