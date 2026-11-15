# Senatla Ops client artifact index

Status: controlled deployment reference index
Integration branch: `dev`
Preview branch: `preview`
Production branch: `main`
Deployment evidence: `docs/deployment-records/`

## Current deployment record

Two Vercel projects currently report deployments for this repository. The owner must identify the canonical project before a hosted release can be approved. Until that decision is recorded, hosted smoke results are diagnostic and issue #88 remains blocked.

Every approved deployment record must identify the deployment URL, environment, exact commit, rollback commit, responsible owner, smoke result, and evidence timestamp. Runtime configuration, authentication credentials, bypass tokens, and private application data must never be copied into the record.

## Client-safe materials

| Artifact | Purpose | Status |
| --- | --- | --- |
| `output/pdf/Senatla-Ops-Client-Review-Pack.pdf` | Role, ecosystem, and asset-lifecycle discussion | Client review |
| `output/pdf/Senatla-Ops-Client-Requirements-Feedback-Template.pdf` | Pilot sites, roles, fields, asset rules, privacy, and UAT decisions | Client input required |
| `docs/visuals/senatla-ops-ecosystem.png` | Operations ecosystem overview | Client-safe concept |
| `docs/visuals/senatla-ops-role-experiences.png` | Role-shaped experience overview | Client-safe concept |
| `docs/visuals/senatla-ops-asset-lifecycle-story.png` | Asset control and lifecycle narrative | Client-safe concept |
| `docs/product-teardown-2026-11-15.html` | Evidence-led product teardown and UX priorities | Client-safe review |
| `docs/site-manager-phase-plan.md` | Governed Site Manager and workshop flow roadmap | Client planning |

## Public-facing references

The public landing page is the approved product overview: [senatla-ops.vercel.app/landing](https://senatla-ops.vercel.app/landing). The GitHub Pages portal is the approved documentation index: [Senatla Ops Documentation Portal](https://sankofa-digital-studio.github.io/senatla-ops-internal-automation-solution/).

Public material may describe the product boundary, role-shaped workflows, evidence model, and release status. It must not expose credentials, employee information, private evidence, service-role keys, unreleased deployment URLs, or local review-user affordances.

## Demo boundary

The demo uses no payroll, employee pay, full employee identifiers, invoice scans, vendor attachments, or unapproved source documents. Reference material is archived locally under `output/reference-archive/` and is intentionally excluded from Git.
