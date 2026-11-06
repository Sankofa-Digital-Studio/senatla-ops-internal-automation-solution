# Senatla Ops GitHub Delivery Backlog
Updated 6 November 2026

This backlog converts the repository audit into implementation-ready work. The broad issues remain as outcome epics; the new tasks define smaller delivery boundaries with acceptance criteria, dependencies, estimates, owners, milestones, and board fields.

## Current delivery state

- All repository issues are assigned to OhhttooeXCIV. The existing Sankofa-Digital-XCIV assignment remains on issues 19 and 20.
- Issues 4 through 20 and tasks 86 through 97 are on the [Senatla Ops board](https://github.com/orgs/Sankofa-Digital-Studio/projects/2).
- Repository milestones now separate governance, operational foundations, controlled pilot work, UAT and release, and reusable foundations.
- The board uses corrected Target Date, Delivery Stage, Risk Category, and Client Decision fields.
- Pull request 82 is classified as P0 Security work in Code Review because technical review, database proof, and deployment evidence remain incomplete.
- v0.5.3 closeout evidence: physical UAT confirmed successful forced-password replacement and Director navigation for the exact `thosontula+tag@gmail.com` account; the exact `thosontula@gmail.com` developer override and alias anti-escalation regressions are covered locally.
- #87 remains externally unverified for GitHub branch-protection settings; #88 has public production runtime evidence, but authenticated hosted smoke still requires the canonical Vercel project and protected QA credentials.
- Historical costing and asset source review is integrated as a separate development change. Its archived rates are optional references; three scenario client names remain provisional. No asset rows or candidate records are auto-imported.

## Ordered micro-task and version register

| Order | Version | Micro-task | Completion evidence |
|---:|---|---|---|
| 1 | v0.5.3 closeout | Physically sign in with `thosontula+tag@gmail.com`, change the temporary password, and confirm Director navigation | Successful forced-password journey and authenticated Director workspace |
| 2 | v0.5.3 closeout | Verify exact `thosontula@gmail.com` still receives permanent cross-workspace access | Role-route assertions; no credential reset |
| 3 | v0.5.3 closeout | Add regression coverage distinguishing the exact developer address from Gmail aliases | Exact address gets override; alias receives only assigned Director access |
| 4 | v0.5.4 | Audit current metadata, robots rules, sitemap and public/authenticated route boundaries | Route-indexing matrix |
| 5 | v0.5.4 | Index only `/landing` | Canonical, indexable landing page |
| 6 | v0.5.4 | Add `noindex, nofollow, noarchive` to login, recovery and protected routes | Automated metadata tests |
| 7 | v0.5.4 | Add canonical origin runtime configuration | Production canonical resolves to the landing URL |
| 8 | v0.5.4 | Add factual Open Graph, Twitter and SoftwareApplication metadata | Structured-data and social-card validation |
| 9 | v0.5.4 | Add accessible Accept/Decline analytics consent | Keyboard-operable, versioned local preference |
| 10 | v0.5.4 | Add runtime-configurable GA4 loader | Blank measurement ID disables all analytics |
| 11 | v0.5.4 | Implement the three-event allow-list | Landing view, sign-in click and APK download only |
| 12 | v0.5.4 | Add analytics privacy tests | No identities, operational data, amounts or authenticated-route events |
| 13 | v0.5.4 | Clone and adapt the analytics workbook | Formula-preserving, GA4 import-ready `.xlsx` with no synthetic results |
| 14 | v0.5.4 | Run SEO, consent, accessibility and responsive verification | Green focused tests and full verification |
| 15 | v0.5.4 | Deploy, record release evidence and stop | Preview/production URLs, changelog, README, release notes and version commit |
| 16 | v0.5.5 | Group Office Admin navigation into five operational areas | Today, People & Sites, Finance, Assets, Governance |
| 17 | v0.5.5 | Reduce dashboard scroll density | One primary action and one exception queue per view |
| 18 | v0.5.5 | Split the 1,375-line template into focused components | Preserved authorization and behavior |
| 19 | v0.5.5 | Remove nested vertical scrolling and defer inactive tabs | Stable viewport and reduced initial rendering |
| 20 | v0.5.5 | Verify Office Admin accessibility | Focus order, modal restoration, announcements and long-table behavior |
| 21 | v0.5.5 | Deploy, document and stop | Green release checkpoint |
| 22 | v0.5.6 | Convert the Site Manager workflow into a progressive mobile sequence | Setup → attendance → safety → evidence → review → sync |
| 23 | v0.5.6 | Collapse completed workflow sections | Less repeat scrolling without hiding status |
| 24 | v0.5.6 | Keep connectivity and save/sync state persistent | Offline and retry evidence |
| 25 | v0.5.6 | Stabilize evidence images and lightbox navigation | Images render correctly; buttons work; no swipe-only dependency |
| 26 | v0.5.6 | Validate the sticky final action | Never covers inputs, errors or keyboard focus |
| 27 | v0.5.6 | Deploy, document and stop | Green mobile-first release checkpoint |
| 28 | v0.5.7 | Complete the cross-role accessibility matrix | Site Manager, Office Admin and Director keyboard/screen-reader journeys |
| 29 | v0.5.7 | Complete remaining route-negative and error-feedback tests | Unauthorized routes rejected and HTTP feedback announced on time |
| 30 | v0.5.7 | Add external release-link health monitoring | Scheduled checks for landing, APK and published release links |
| 31 | v0.5.7 | Final consistency and dead-CTA audit | Every visible control has a verified destination or action |
| 32 | v0.5.7 | Final release, documentation and board reconciliation | All branches, issues, board state and release history agree |

Implementation-ready tasks: Make dev the integration default and protect main releases [#87](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/87); verify Vercel runtime configuration and authenticated preview smoke tests [#88](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/88).

## Delivery roadmap

| Milestone | Purpose | Exit evidence |
|---|---|---|
| M0 Governance and Access | Align branch rules, identity, data boundaries, deployment access, and client decisions | Protected release path, access proof, negative security tests, and recorded decisions |
| M1 Operational Foundations | Complete site-day, workforce, offline recovery, private evidence, and document controls | Persisted workflows, retry evidence, auditable operations, and reproducible artifacts |
| M2 Controlled Pilot | Complete asset, inspection, maintenance, and source-backed analytics | Clean pilot import, safety blocks, independent approvals, and reconciled metrics |
| M3 UAT and Release | Prove recovery, role journeys, production mapping, and operational acceptance | Desktop and mobile evidence, restore rehearsal, approved commit, rollback target, and sign-off |
| M4 Reuse and Scale | Extract reusable architecture and delivery workflows | Domain-neutral packages, consumer example, adoption checklist, and versioned reusable gates |

## Implementation-ready tasks

| Issue | Priority | Parent | Task | Estimate | Stage |
|---|---|---|---|---:|---|
| [86](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/86) | P1 | 10 | Persist site setup, trips, safety, signature, and attendance as one idempotent site-day record | 3 to 5 days | M1 |
| [87](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/87) | P0 | 4 | Make dev the integration default and protect main releases | 0.5 to 1 day | M0 |
| [88](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/88) | P0 | 7 | Verify Vercel runtime configuration and authenticated preview smoke tests | 1 to 2 days | M0 |
| [89](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/89) | P1 | 11 | Enforce issue ownership, SLA, and immutable status history in PostgreSQL | 3 to 4 days | M1 |
| [90](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/90) | P1 | 13 | Convert failed pre-start inspections into defects and asset safety blocks | 5 to 8 days | M2 |
| [91](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/91) | P1 | 12 | Stage asset CSV imports with conflict reporting before writes | 4 to 6 days | M2 |
| [92](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/92) | P1 | 14 | Replace hard-coded executive claims with source-backed metric definitions | 3 to 5 days | M2 |
| [93](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/93) | P1 | 13 | Enforce independent return-to-service approval at the database boundary | 2 to 4 days | M2 |
| [94](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/94) | P1 | 15 | Replace inline and free-text evidence with private storage objects | 4 to 6 days | M1 |
| [95](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/95) | P2 | 16 | Generate and verify all approved documents from one command | 3 to 5 days | M1 |
| [96](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/96) | P0 | 17 | Add desktop and 390 px release journeys for every operational role | 4 to 7 days | M3 |
| [97](https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/issues/97) | P1 | 20 | Publish a reusable Sankofa application quality workflow | 2 to 4 days | M4 |

## Critical execution sequence

1. Complete issue 87 so new work targets dev and main remains a reviewed production branch.
2. Resolve issue 88 to prove hosted runtime configuration and controlled QA access.
3. Complete issues 86, 89, 94, and 95 as the operational foundation.
4. Complete issues 90, 91, 92, and 93 for the controlled pilot.
5. Run issue 96 after the dependent role workflows are stable.
6. Complete issue 97 after the Senatla-specific gate is stable enough to extract without weakening it.

## Definition of done

- A focused pull request links to the issue.
- Acceptance criteria are demonstrated, not only described.
- New mutations create the required audit evidence.
- Authorization changes include role-negative and cross-site tests.
- Rendered changes have desktop and 390 px proof against the reviewed commit.
- Schema changes have clean reset and database-contract evidence.
- Deployment changes record the approved commit, environment, current deployment, and rollback target.
- Durable documents do not depend on an old immutable preview URL.
- The public Senatla Trading website remains untouched.

## Commercial viability review

The current market already contains mature maintenance and fleet products. [MaintainX](https://www.getmaintainx.com/use-cases/work-order-management) covers mobile work orders, evidence, templates, and approvals. [Fleetio](https://www.fleetio.com/features/asset-management-software) covers asset records, assignment, utilization, and total cost. [HCSS Equipment360](https://www.hcss.com/equipment360/what-is-equipment360/) covers equipment maintenance, work orders, schedules, and mechanic capture.

Senatla Ops should not reproduce a broad CMMS or fleet suite. Its viable boundary is a source-linked operational record for one operating company: people, safety, attendance, payroll control, site synchronization, assets, maintenance, maker-checker decisions, and audit evidence share one authorization and audit model. The differentiator is the explainable operational heartbeat, where a manager can trace an outcome to the actor, site, time, approval, and source record.

## Three-pass review

### Pass 1 Repository gaps

The first pass found broad epics, incomplete board coverage, inconsistent repository metadata, narrow cross-role browser proof, and unfinished persistence boundaries for site-day, inspection, evidence, and reporting workflows.

### Pass 2 Duplication challenge

Authentication, negative RLS contracts, deterministic verification, attendance retry, readiness confirmation, and parts of the offline outbox already exist. New issues for those features would duplicate closed or active work.

### Pass 3 Reconciled backlog

The final tasks target observable remaining boundaries: live GitHub configuration, hosted deployment proof, missing persisted fields, mutable history, controlled import, absent inspection and safety-block contracts, database-enforced return approval, private evidence representation, source-backed metrics, reproducible documents, cross-role UAT, and reusable CI.

### Deferred dependency modernization

- **Vitest migration (deferred):** keep the current Karma/browser test runner until Angular's existing-project migration is stable enough for this repository's full browser, responsive, and native release gates. Reassess after a later Angular/toolchain upgrade; acceptance requires equivalent coverage, deterministic CI, and no loss of screen-reader or responsive journeys.
