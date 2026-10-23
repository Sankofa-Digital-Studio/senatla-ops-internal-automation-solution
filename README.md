# Senatla Ops

Senatla Ops is Senatla Trading's internal operational control system. It connects field attendance and safety, daily synchronization, workforce administration, issues, payroll controls, asset identity, maintenance, approvals, audit evidence and executive oversight.

The public Senatla Trading website is outside this repository and remains under code freeze.

## Product boundary

- One legal owner in this release: **Senatla Trading**.
- Engineering is a functional label, not a separate tenant.
- Supabase is the intended production persistence and authorization boundary.
- Serial number, VIN and registration plate are case-insensitive alternate asset identifiers; at least one is required.
- AI recommendations, full spares ERP, telematics and multi-company UI are deferred.

## Application roles

| Role | Primary responsibility |
|---|---|
| Site Manager | Daily timesheet register capture, attendance evidence and signed synchronization |
| Office Administrator | Workforce administration plus timesheet review/export, sites, issues, payroll, assets and requests |
| Director/Reviewer | Evidence-led oversight and assigned maker-checker decisions |

## Local development

```text
npm install
npm start
```

Quality commands:

```text
npm run verify
```

`npm run verify` is the deterministic application release gate. It runs lint, application/spec type-checking, production build and headless unit tests through one entrypoint with per-step pass/fail evidence. The gate sanitizes inherited npm lifecycle context before each subcommand, and the Karma step has timeout evidence so Chrome cleanup cannot hang indefinitely. Do not treat compilation as proof that the browser, Karma or Supabase contracts pass. See the current [release-readiness audit](docs/release-readiness-audit-2026-06-24.md).

## Documentation

- [Client ecosystem review](docs/client-senatla-ops-planning-requirements-guidance.md)
- [Client requirements workbook](docs/senatla-ops-client-requirements-feedback-template.md)
- [Engineering handbook](docs/sankofa-senatla-ops-engineering-handbook.md)
- [Architecture](docs/architecture.md)
- [Environment boundaries](docs/environments.md)
- [Testing strategy](docs/testing.md)
- [Admin and timesheet register scope](docs/admin-timesheet-register.md)
- [Operations runbook](docs/runbook.md)
- [Release checklist](docs/release-checklist.md)
- [Artifact register](docs/artifact-register.md)
- [GitHub delivery backlog](docs/github-delivery-backlog.md)

## Delivery workflow

GitHub Issues authorize work. Pull requests target `dev`, the repository integration and demo branch, and contain acceptance evidence. CI, database validation, desktop/mobile browser proof and rollback notes are required before release. See [CONTRIBUTING.md](CONTRIBUTING.md).
