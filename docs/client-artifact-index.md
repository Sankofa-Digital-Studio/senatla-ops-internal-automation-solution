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

## Demo boundary

The demo uses no payroll, employee pay, full employee identifiers, invoice scans, vendor attachments, or unapproved source documents. Reference material is archived locally under `output/reference-archive/` and is intentionally excluded from Git.
