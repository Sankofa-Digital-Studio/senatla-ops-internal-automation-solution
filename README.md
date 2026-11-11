# Senatla Ops

[![Application quality gates](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/workflows/ci.yml)
[![Native platform gates](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/workflows/native-platforms.yml/badge.svg?branch=main)](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/workflows/native-platforms.yml)
[![Hosted smoke preflight](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/workflows/hosted-smoke.yml/badge.svg?branch=main)](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/workflows/hosted-smoke.yml)
[![Documentation Portal](https://img.shields.io/badge/Docs-GitHub%20Pages-155780?logo=github&logoColor=white)](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/)
[![Latest Release](https://img.shields.io/github/v/release/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution?color=007ec6&label=release)](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/releases/tag/v0.5.5)
[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![Ionic](https://img.shields.io/badge/Ionic-8-3880FF?logo=ionic&logoColor=white)](https://ionicframework.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

Senatla Ops is Senatla Trading's internal operations control platform. It connects field attendance, safety, workforce administration, payroll controls, assets, maintenance, approvals, audit evidence, and executive oversight in one accountable workflow.

> **Internal operations system:** access is role-controlled. Do not place credentials, employee information, private evidence, or service-role keys in issues, pull requests, screenshots, or generated artifacts.

The public Senatla Trading website is maintained outside this repository and remains out of scope.

## Access policy

- Authentication is email and password only; Google sign-in and public registration are not supported.
- Operational users must use provisioned `@senatlatrading.com` addresses.
- `thosontula@gmail.com` is the single permanent developer override with cross-workspace management access.
- Plus-address aliases, including `thosontula+tag@gmail.com`, are ordinary accounts and do not inherit the developer override.
- New users receive a temporary password and must replace it before opening a workspace.

Current release candidate: [v0.5.6](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/releases/tag/v0.5.6) ([Release notes](docs/release-notes-0.5.6.md) · [Director flow](docs/director-flow-v0.5.6.md)). Previous release: [v0.5.5](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/releases/tag/v0.5.5) ([Release notes](docs/release-notes-0.5.5.md)). Hosted production target: [senatla-ops.vercel.app](https://senatla-ops.vercel.app). Public landing page: [senatla-ops.vercel.app/landing](https://senatla-ops.vercel.app/landing). Documentation portal: [GitHub Pages](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/).

## Product outcome

Senatla Ops gives each operational record an explainable history: who acted, where the work happened, when it changed, which approval applied, and what source evidence supports it. This operational heartbeat helps field, office, and executive users work from the same facts without turning the system into a generic ERP.

## Product boundary

- Senatla Trading is the single legal owner in the current release.
- Engineering is a functional label, not a separate tenant.
- Supabase is the production persistence and authorization boundary.
- Serial number, VIN, and registration plate are case-insensitive alternate asset identifiers; at least one is required.
- AI recommendations, full spares ERP, telematics, and multi-company user interfaces are deferred.

## Application roles

| Role | Primary responsibility | Typical evidence |
|---|---|---|
| Site Manager | Capture attendance, safety, daily site records, and signed synchronization | Attendance rows, safety topics, comments, evidence, and sync status |
| Office Administrator | Administer workforce, sites, issues, payroll, assets, vendors, and requests | Reconciliations, assignments, approvals, exports, and audit history |
| Director and Reviewer | Review source-backed metrics and complete assigned maker-checker decisions | Drill-down records, approval decisions, release and exception evidence |

## Core capabilities

- Attributable attendance and site-day synchronization with offline recovery.
- Workforce, issue, payroll, vendor, and approval controls.
- Asset identity, custody, compliance, fuel, cost, and maintenance records.
- Private evidence capture with human-reviewed OCR provenance.
- Executive readiness and cost views linked to persisted source records.
- Phase-based costing with explicit category applicability and quotation reconciliation.
- Dedicated proposal builder with editable templates, formula Excel, and draft PDF exports.
- Public landing page with strict landing-only SEO and opt-in privacy-first GA4 analytics.
- Immutable audit events and role-negative database contracts.
- Responsive web delivery plus Android and iOS application foundations.

## Architecture

```mermaid
flowchart LR
    A[Angular and Ionic workspaces] --> B[Domain services and validation]
    B --> C[Gateway interfaces]
    C --> D[Supabase Auth and Postgres]
    C --> E[Local review adapters]
    D --> F[Row Level Security]
    D --> G[Private evidence storage]
    D --> H[Audit and integration outbox]
    I[Capacitor Android and iOS] --> A
```

The application keeps user-interface concerns separate from domain validation and persistence gateways. Database policies enforce authorization; route guards and hidden controls are usability measures, not security boundaries. See [Architecture](docs/architecture.md) and [ADR 0001](docs/adr-0001-supabase-auth-boundary.md).

## Technology

| Layer | Technology |
|---|---|
| Web application | Angular 22, Ionic 8, TypeScript 6, RxJS |
| Native application | Capacitor 8, Android, iOS |
| Data and identity | Supabase Auth, PostgreSQL, Row Level Security, Storage |
| Verification | Jasmine and Karma, Playwright, Cypress, pgTAP |
| Delivery | GitHub Actions, Vercel, and GitHub Pages |

## Prerequisites

- Node.js 24 and npm.
- Docker Desktop with a working Linux container engine for local Supabase validation.
- Chromium dependencies for Playwright and Chrome Headless tests.
- Xcode on macOS for iOS builds and an Android SDK for Android builds.

## Local setup

1. Clone the repository and install the locked dependencies.

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env` and provide the environment-specific values. Never commit `.env`.

3. Start the web application.

   ```bash
   npm start
   ```

4. For database work, start the local Supabase stack and run its contracts.

   ```bash
   npm run supabase:start
   npm run supabase:test
   ```

Runtime configuration is generated by `scripts/write-runtime-config.mjs`. Production builds must fail closed when required Supabase configuration is missing.

## Quality gates

```bash
npm run verify
```

`npm run verify` is the deterministic application release gate. It runs lint, application and specification type-checking, a production build, and headless unit tests with per-step evidence.

Additional gates:

```bash
npm run test:responsive
npm run test:e2e:cypress
npm run supabase:test
npm run native:sync:android
npm run native:sync:ios
```

Compilation alone does not prove that browser flows, database policies, native builds, or Supabase contracts pass. Use the [testing strategy](docs/testing.md) and [release checklist](docs/release-checklist.md) for the required evidence.

## Repository map

| Path | Purpose |
|---|---|
| `src/app` | Angular pages, reusable components, domain services, gateways, and tests |
| `supabase/migrations` | Versioned database schema, policies, triggers, and functions |
| `supabase/tests` | pgTAP and SQL contract tests |
| `tests/responsive` | Desktop and mobile responsive evidence |
| `android` and `ios` | Capacitor native projects |
| `docs` | Architecture, runbooks, UAT, release, and client-review sources |
| `scripts` | Runtime configuration, verification, validation, and artifact generation |
| `output` | Generated review artifacts; source files remain authoritative |

## Delivery workflow

- GitHub Issues authorize work and define acceptance criteria.
- Integration pull requests target `dev`; reviewed releases promote through `preview` to `main`.
- The [Senatla Ops project board](https://github.com/orgs/Sankofa-Digital-Studio/projects/2) records the actual delivery state.
- A merged pull request is not release evidence by itself. Required application, database, responsive, native, deployment, rollback, and UAT checks must be recorded. The current v0.5.4 promotion passed the required application, Supabase, responsive, Android, iOS, and native-required gates.
- Durable documents must reference a commit and the current deployment record, not an old immutable preview URL.

See [Contributing](CONTRIBUTING.md), [Changelog](CHANGELOG.md), and the [GitHub delivery backlog](docs/github-delivery-backlog.md).

## Security and privacy

- Do not report security-sensitive findings in a public issue.
- Keep service-role credentials, access tokens, personal data, OCR text, and private storage paths out of logs and artifacts.
- Test authorization with direct database and API requests, including negative role and site cases.
- Use reviewed forward migrations for production database changes and record rollback steps before deployment.

## Documentation portal

Access the live [Senatla Ops Documentation Portal on GitHub Pages](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/).

### Release management & guides
- [v0.5.5 Release Notes](docs/release-notes-0.5.5.md)
- [v0.5.6 Release Notes](docs/release-notes-0.5.6.md)
- [Director Flow v0.5.6](docs/director-flow-v0.5.6.md)
- [v0.5.4 Release & Support Guide](docs/v0.5.4-release-guide.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/v0.5.4-release-guide.html))
- [v0.5.4 Release Notes](docs/release-notes-0.5.4.md)
- [v0.5.3 Release Notes](docs/release-notes-0.5.3.md)
- [v0.5.2 Release Notes](docs/release-notes-0.5.2.md)
- [v0.5.1 Release Notes](docs/release-notes-0.5.1.md)
- [Changelog](CHANGELOG.md)
- [Production Release Checklist](docs/release-checklist.md)

### Director & operations workspaces
- [Director Workspace Guidance](docs/director-workspace-guidance.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/director-workspace-guidance.html))
- [Director Proposal Templates & Builder](docs/director-proposal-templates.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/director-proposal-templates.html))
- [Historical Costing & Asset Review](docs/historical-costing-and-asset-review.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/historical-costing-and-asset-review.html))
- [Operations Runbook](docs/runbook.md)
- [Admin & Timesheet Register Scope](docs/admin-timesheet-register.md)

### Platform architecture & engineering
- [Engineering Handbook](docs/sankofa-senatla-ops-engineering-handbook.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/sankofa-senatla-ops-engineering-handbook.html))
- [Engineering Asset Register Plan](docs/engineering-asset-register-plan.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/engineering-asset-register-plan.html))
- [System Architecture](docs/architecture.md)
- [ADR 0001: Supabase Auth & Boundary](docs/adr-0001-supabase-auth-boundary.md)
- [Environment Boundaries](docs/environments.md)
- [Native Platform Foundation](docs/native-platform-foundation.md)

### Client planning & feedback backlog
- [Client Ecosystem Planning & Requirements](docs/client-senatla-ops-planning-requirements-guidance.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/client-senatla-ops-planning-requirements-guidance.html))
- [Client Requirements Feedback Workbook](docs/senatla-ops-client-requirements-feedback-template.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/senatla-ops-client-requirements-feedback-template.html))
- [Client Feedback Phase 1 Implementation Plan](docs/senatla-trading-client-feedback-implementation-plan.md)
- [Client Feedback Phase 1 Tasks & Issue Breakdown](docs/senatla-trading-client-feedback-tasks-and-issues.md)
- [Artifact Register](docs/artifact-register.md)
- [Client Artifact Index](docs/client-artifact-index.md)

### Verification, UAT & compliance
- [OCR Device UAT](docs/ocr-device-uat.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/ocr-device-uat.html))
- [Frontend Audit & Responsive Layout](docs/frontend-audit-2026-11-01.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/frontend-audit-2026-11-01.html))
- [GitHub Delivery Backlog](docs/github-delivery-backlog.md) ([HTML](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/github-delivery-backlog.html))
- [Testing Strategy](docs/testing.md)

### Public landing, SEO & privacy
- [Public Route SEO Indexing Matrix](docs/seo-indexing-matrix.md)
- [GA4 Analytics Privacy & Consent Architecture](docs/analytics-privacy-v0.5.4.md)
- [GA4 Analytics Workbook Guide](docs/analytics-workbook-v0.5.4.md)

## Release policy

GitHub Issues authorize work. Feature pull requests target `dev`; reviewed releases promote `dev` through `preview` to `main`. CI, database validation, desktop/mobile browser proof, and rollback notes are required before production release. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License and access

No open-source license is granted by this repository. Use and distribution are controlled by Sankofa Digital Studio and Senatla Trading.
