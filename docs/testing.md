# Testing Strategy

| Layer | Required evidence |
|---|---|
| Static | ESLint plus application and specification TypeScript compilation |
| Unit | Components, services, route guards, calculations and identifier normalization |
| Database | Clean migration reset, role-positive and role-negative pgTAP contracts |
| Browser | Login-to-workspace flow, asset lifecycle action, desktop and 390 px layout |
| Resilience | Idempotent retry, duplicate submission and recovery |
| Finance | Reconciliation, masking, approvals and immutable payroll periods |
| Release | Production build, backup/restore rehearsal and rollback check |

A successful build is not a browser test. A successful client test is not proof of RLS. Evidence must identify the command, environment, result and remaining risk.

## Application release gate

`npm run verify` is the one deterministic application gate for local review and GitHub Actions. It executes runtime-config, OCR UAT, admin-user reset and auth-provisioning contract tests, followed by `lint`, `typecheck`, `build` and `tests` through a Node orchestrator that emits timestamped start/pass/fail lines for each step. The orchestrator removes inherited `npm_lifecycle_*` variables before launching subcommands so Angular sees the canonical `build` lifecycle when the build step runs.

The headless unit-test step uses `ChromeHeadlessCI`, not plain `ChromeHeadless`, because the previous `ng test --configuration=ci --browsers=ChromeHeadless` path could hang before producing Karma evidence in the local Windows runner. The CI launcher applies the headless flags used by the release gate and runs with `CI=true`.

The build step deliberately runs before Karma and with inherited npm lifecycle variables removed. In the local Windows sandbox, Angular build under a non-build npm lifecycle can fail path resolution with false `Cannot read directory "../../../.."` and missing `src/*` errors even when the same files exist and the standalone build passes. GitHub Actions must call `npm run verify` rather than duplicating raw `ng build` so this environment contract stays consistent.

The Supabase migration and pgTAP job starts only the local database container; it excludes API, dashboard, and other services that those SQL-only checks do not use. This keeps database validation focused and avoids unnecessary container pulls.
