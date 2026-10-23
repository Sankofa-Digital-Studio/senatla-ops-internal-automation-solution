# Senatla Ops Implementation Journey

**Document type:** Living implementation record
**Status:** Working document
**Baseline date:** 23 August 2026
**Current branch at baseline:** `sankofa_xciv/admin-grouping-vendor-invoices`
**Product:** Existing Senatla Ops Ionic/Angular and Supabase application

## Document purpose

This document records how Senatla Ops is strengthened incrementally. It connects each implementation slice to the existing product, the operational need, the decision taken, the files and data contracts changed, verification evidence, risks, and observed outcomes.

It is not a specification for a replacement application. The source strategy document, *Senatla Trading - Harmony Mine Operations: Saaiplass #3 Rehabilitation & Demolition - Discrete Programming + Operations Research Business Ecosystem*, is used only to identify ideas that can improve current Senatla Ops features. Its Harmony/Saaiplass scenario, contract code, quantities, activities, and commercial assumptions are illustrative until separately validated.

## Governing principles

1. Enhance current workflows before adding new modules.
2. Reuse the existing Supabase trust boundary, RLS, immutable audit events, private evidence storage, and offline outbox.
3. Keep safety, legal, technical, and contractual requirements as hard constraints.
4. Keep recommendations explainable and subject to human approval.
5. Derive dashboards from persisted source records; never create a second source of truth.
6. Introduce solver-backed optimisation only after a simpler recommendation method has been measured.
7. Separate verified implementation evidence from assumptions and planned work.

## Existing baseline

At this baseline the existing application already includes:

- Supabase authentication, application roles, route guards, and row-level security.
- Sites, teams, employees, attendance, safety talks, issues, and daily synchronisation.
- Employee onboarding checks, medical status, red-ticket fields, and PPE records.
- Asset identity, evidence, custody, compliance, maintenance, meter readings, and fuel entries.
- Vendor accounts, vendor invoices, director review, and maker-checker approval patterns.
- Immutable administrative and attendance audit events.
- Durable outbox and queued offline submissions.
- Office Admin, Site Manager, Asset Register, and Director role experiences.
- Director metrics derived from recorded attendance, PPE, fuel, and vendor information.

## Enhancement map

| Current feature | Enhancement direction | Explicit boundary |
|---|---|---|
| Site Manager daily setup | Readiness summary for current crew, assets, and site controls | No replacement field application |
| Employee onboarding | Explain eligibility without exposing restricted screening detail | No duplicate workforce register |
| Asset control | Availability and compliance readiness for daily work | No duplicate asset register |
| Office Admin | Resource conflicts and ranked eligible alternatives | No automatic reassignment |
| Trip logging | Suggested stop order, estimated distance, and actual comparison | No claim of optimality in the first release |
| Existing cost records | Attribution to existing site and job number | No new accounting ledger |
| Director dashboard | Readiness, utilisation, blockers, and traceable operating cost | No manually maintained KPI totals |
| Audit and outbox | Recommendation, decision, override, and actual-outcome evidence | No parallel event store |

## Slice register

### Slice 0 - Readiness contract and baseline

**Objective:** Define a deterministic operational-readiness policy from current employee, asset, site, safety, and compliance records.

**Planned work:**

- Define `ready`, `warning`, `blocked`, and `unknown` outcomes.
- Define stable reason codes and corrective-action messages.
- Separate hard blockers from advisory warnings.
- Make safety-critical missing data fail closed.
- Add a version identifier to the policy.
- Add boundary-date, missing-data, and contradictory-data tests.

**Exit evidence:** Approved rule catalogue; passing evaluator tests; privacy review of displayed reasons; confirmation that no duplicate operational tables were introduced.

**Status:** Implemented locally. TypeScript policy tests pass; the sanitized database RPC and its pgTAP contract are authored, with runtime database execution pending a running local Docker/Supabase stack.

### Slice 1 - Site Manager readiness panel

**Objective:** Place readiness guidance inside the existing daily setup before the safety-talk and attendance workflow.

**Planned work:**

- Evaluate the active site's crew and assets.
- Display overall status, blockers, warnings, affected resources, and corrective actions.
- Prevent continuation only for confirmed hard blockers.
- Persist the readiness result and policy version through existing audit/outbox patterns.
- Preserve the current mobile field sequence and verify it at 390 px.

**Exit evidence:** Component tests for all outcomes; offline submission test; role-negative privacy test; desktop and mobile screenshots from the reviewed deployment.

**Status:** Implemented and locally verified; remote database execution and deployment remain pending the Slice 0+1 release gate.

### Slice 2 - Office Admin conflicts and suggestions

**Objective:** Help Office Admin resolve readiness problems with transparent, human-reviewed alternatives.

**Planned work:**

- Detect unavailable, non-compliant, incompatible, or conflicting employee and asset assignments.
- Rank eligible alternatives by compliance, role or asset-class fit, current association, availability, and recent utilisation.
- Explain every suggestion.
- Require explicit acceptance, rejection, or override reason.
- Reuse current persistence, approval, and audit conventions.

**Exit evidence:** Ranking tests; conflict tests; hard-blocker negative tests; audit evidence; Office/Site/Director role tests.

**Status:** Implemented and locally verified. Browser policy and UI tests pass; the 30-assertion database contract is authored, with execution pending a running Docker/Supabase engine and deployment pending the verified remote-dev target.

### Slice 3 - Site and job cost attribution

**Objective:** Attribute current operational costs to existing `site` and `jobNumber` records without creating another ledger.

**Planned work:**

- Attribute attendance-derived labour, PPE, fuel, asset work-order, and approved vendor-invoice costs.
- Add an explicit queue for unattributed costs.
- Define allocations for costs spanning more than one site.
- Preserve vendor approval, rejection, and payment states.
- Prevent double counting and reconcile every displayed total to source records.

**Exit evidence:** Cost reconciliation, period boundary, multi-site allocation, invoice-state, RLS, and role-negative tests.

**Status:** Planned; begins after the current vendor-invoice baseline is stable.

### Slice 4 - Director operational control view

**Objective:** Add decision-ready, drillable operational metrics to the existing Director experience.

**Planned work:**

- Workforce and asset readiness.
- Blocked sites or teams.
- Available versus assigned assets.
- Labour and asset utilisation.
- Fuel cost per kilometre and per site/job.
- Outstanding compliance actions.
- Late or incomplete synchronisations.
- Attributed versus unattributed costs.
- Data freshness and completeness indicators.

**Exit evidence:** Metric reconciliation tests, partial-data tests, Director access tests, and desktop/mobile visual evidence.

**Status:** Planned; depends on Slices 1 and 3.

### Slice 5 - Deterministic trip-order recommendation

**Objective:** Improve the current Site Manager trip logger with a transparent stop-order recommendation.

**Planned work:**

- Reuse current asset, GPS, kilometre, reason, and destination capture.
- Recommend a stop order using a deterministic nearest-next-stop method.
- Display estimated distance, duration when supported, fuel cost, and data-quality warnings.
- Allow acceptance, reordering, or rejection.
- Capture actual sequence, kilometres, variance, and decision reason.
- Retain offline operation.

**Exit evidence:** Algorithm tests, invalid-coordinate tests, offline tests, audit tests, and mobile field verification.

**Status:** Planned; depends on Slice 1.

### Slice 6 - Optimisation evidence gate

**Objective:** Decide from measured evidence whether solver-backed optimisation is justified.

**Evidence to collect:** Stops per trip; vehicle count and capacity constraints; time-window conflicts; manual route changes; estimated versus actual distance; planning time; acceptance rate; fuel or kilometre savings; infeasible cases.

**Decision rule:** Retain deterministic rules when they solve the operational problem adequately. Evaluate OR-Tools or another solver only when recurring constraint complexity and measurable benefit justify the additional service, security, support, and licensing burden.

**Status:** Planned; decision-only gate after Slice 5 has production evidence.

## Release sequence

1. Readiness rules.
2. Site Manager readiness.
3. Office Admin suggestions.
4. Site/job cost attribution.
5. Director operational control.
6. Deterministic trip recommendation.
7. Solver evidence decision.

## First milestone

An existing Site Manager selects the current site, sees whether assigned people and assets are ready, understands every blocker, completes the existing safety and attendance workflow, and leaves an auditable readiness record.

## Journey log

Add one entry after every meaningful implementation or verification pass.

### Entry template

**Date:**
**Slice:**
**Branch/issue/PR:**
**Outcome sought:**
**Baseline before change:**
**Decision and rationale:**
**Alternative rejected and why:**
**Files/data contracts changed:**
**Security and privacy impact:**
**Tests executed:**
**Browser/mobile evidence:**
**Result:** Verified / Partial / Blocked
**Known gaps:**
**Next action:**

### 23 August 2026 - Planning baseline

**Slice:** Programme baseline.
**Branch:** `sankofa_xciv/admin-grouping-vendor-invoices`.
**Outcome:** Reframed the supplied Operations Research strategy as enhancements to the running Senatla Ops system.
**Decision:** Preserve existing role experiences, data stores, audit paths, and commercial workflows. Begin with operational readiness rather than a new project domain or solver service.
**Alternative rejected:** A separate project-management and Python optimisation platform, because it would duplicate current capabilities and add complexity before operational data proves the need.
**Evidence:** Current architecture, migrations, models, routes, Site Manager flow, Office Admin controls, Director metrics, and delivery backlog were inspected.
**Result:** Planning complete; implementation not started.
**Known gap:** The attached PDF was text-extracted and rendered, but the managed Windows ACL helper prevented page-image viewing in Codex.
**Next action:** Implement and verify Slice 0.

### 23 August 2026 - Slice 0 readiness foundation

**Slice:** Slice 0 - Readiness contract and baseline.
**Branch:** `sankofa_xciv/admin-grouping-vendor-invoices`.
**Outcome:** Added one versioned readiness policy for employee, asset, site, and operation outcomes; a sanitized site-readiness RPC; and five deterministic audit users with cross-site fixtures.
**Decision:** Keep confidential onboarding evidence behind existing RLS and expose only `ready`, `warning`, `blocked`, or `unknown`, stable reason codes, corrective actions, the policy version, and evaluation time.
**Alternative rejected:** Granting Site Managers direct access to medical, screening, ticket, or onboarding records, because readiness guidance does not justify disclosing protected source evidence.
**Files/data contracts changed:** `src/app/core/readiness/`; `supabase/migrations/20260823045406_readiness_evaluation_contract.sql`; `supabase/seed.sql`; and two pgTAP contracts under `supabase/tests/`.
**Security and privacy impact:** The public RPC is now a `SECURITY INVOKER` wrapper over a private, least-privilege evaluator. Both pin an empty search path; the evaluator validates the authenticated session, organisation, role, and site access and never returns raw onboarding fields.
**Hardened three-pass analysis:** Pass 1 found client/server policy-version and rule drift. Pass 2 found an avoidable privileged function in the exposed schema and challenged sensitive screening as an automatic eligibility rule. Pass 3 tested deterministic ordering, missing evidence, expiry boundaries, work orders, deployability, and artifact evidence.
**Improvements applied:** Aligned the policy version; removed unsupported screening decisions; added fail-closed invalid-date, licence, compliance-checklist, and evidence rules; added thirty-day renewal warnings and work-order blockers; moved privileged evaluation into `private`; retained a public security-invoker wrapper; and expanded contract tests.
**Tests executed:** TypeScript compilation passed; 12 of 12 focused readiness-policy tests passed in Chrome Headless. The database contracts contain 36 RPC assertions and 22 fixture assertions.
**Browser/mobile evidence:** Not applicable because Slice 0 changes policy and database contracts, not rendered UI. The scheduled full visual-regression gate remains after Slice 3.
**Result:** Partial verification: implementation and frontend policy are verified; database runtime execution is blocked until Docker Desktop's Linux engine is running.
**Known gaps:** No new induction, skills, or medical-expiry rules were invented where the current schema lacks authoritative evidence. Those cases remain `unknown`.
**Next action:** Implement Slice 1 against the hardened sanitized contract. Execute both pgTAP contracts when Docker is available, run the Slice 1 hardened three-pass gate, then deploy Slices 0 and 1 together to remote `dev`. The deterministic shared-password seed remains local-only and must not be used as remote-dev credential provisioning.
### 23 August 2026 - Slice 1 Site Manager live readiness

**Slice:** Slice 1 - Site Manager readiness panel.
**Branch:** `sankofa_xciv/admin-grouping-vendor-invoices`.
**Outcome:** Extended the existing start-of-shift modal with authenticated site selection, live sanitized readiness, corrective actions, fail-closed progression, and atomic server confirmation.
**Decision:** Use a narrow readiness gateway over the existing Supabase client and normalized site/RPC contracts. Site identity is a UUID from the authenticated access set; display names are never authorization inputs.
**Alternative rejected:** Reusing broad Office Admin snapshot loading or client-side readiness heuristics, because both can fall back to demo data or disclose more evidence than a Site Manager requires.
**Files/data contracts changed:** Readiness gateway and service; existing Site Manager component/template/tests; Staff Data remote-fallback guard; runtime configuration loader; readiness migration/pgTAP contract; focused Cypress responsive evidence.
**Security and privacy impact:** Remote snapshot absence now loads no demonstration staff/sites and performs no snapshot save. Readiness rows are schema-validated, policy-versioned, and limited to safe labels, outcomes, reason codes, actions, and evaluation time. Atomic confirmation re-evaluates at the server and records one sanitized immutable event per actor/site/Johannesburg day.
**Hardened three-pass analysis:** Pass 1 challenged identity, malformed responses, privacy leakage, and remote fallback. Pass 2 challenged refresh/confirm races and added atomic confirmation plus idempotent audit evidence. Pass 3 challenged runtime startup, mobile reachability, duplication, tests, and deployability against current `origin/dev`.
**Improvements applied:** Removed hard-coded Site Manager demo asset/site IDs; selected sites only from authenticated/RLS-filtered UUIDs; failed closed for loading, unavailable, blocked, unknown, malformed, and policy-mismatch states; allowed warning only after server confirmation; preserved GPS, targets, trip, safety, attendance, and sync sequence; eliminated silent runtime-config fallback.
**Tests executed:** TypeScript compilation passed; production build passed; targeted lint passed; 22 of 22 focused readiness, real-data-boundary, and Site Manager tests passed in Chrome Headless; runtime-config tests passed 3 of 3. The database contract now contains 48 pgTAP assertions, with runtime execution pending an available database engine or linked safe test environment.
**Browser/mobile evidence:** Focused Cypress flow passed with one desktop and one 390 px screenshot using intercepted test-only responses. The test verifies warning guidance, confidential-field absence, modal scrolling, and reachability of the final action without persisting mock data. Full visual regression remains scheduled after Slice 3.
**Result:** Local implementation and clean integration onto current `origin/dev` are verified at release-candidate commit `41c8e62`; remote database/application deployment and real-user provisioning remain blocked by target configuration.
**Credentials:** Passwords and service keys are excluded from this document and Git. The five-user credential register will be generated only after real remote-dev provisioning under ignored `output/credentials/`, with role, permitted site, activation, and rotation status.
**Known gaps:** The generated Supabase URL and public-key project references do not match; Vercel Preview's three Senatla runtime variables currently resolve empty; and the authenticated Supabase CLI lists no Senatla project. Existing normalized remote data remains authoritative, and no local seed will be pushed.
**Next action:** Link the authoritative Senatla remote-dev project, populate matching non-empty Vercel Preview runtime values, execute the database contracts and migration, deploy the verified application candidate, invite five real users, create the ignored credential handoff, and perform cross-role/cross-site audit checks.

### 23 August 2026 - Slice 2 Office Admin reviewed assignments

**Slice:** Slice 2 - Office Admin conflicts and suggestions.
**Branch:** `sankofa_xciv/slice-01-readiness-release`.
**Outcome:** Extended the existing employee bulk-site and asset custody workflows with fail-closed reviews, transparent ranked alternatives, controlled accept/reject/override decisions, and authoritative atomic Supabase RPCs.
**Decision:** Keep recommendations advisory in the browser and re-evaluate role, organisation, target, resource state, readiness, compliance, and work orders inside the mutation transaction.
**Alternative rejected:** Client-only validation, local state mutation, a new optimisation service, and an invented recent-utilisation score. Current records do not yet support a trustworthy utilisation metric.
**Files/data contracts changed:** Existing Office Admin and Asset Operations interfaces; OfficeAdminService; src/app/core/assignment/; one Supabase migration; focused TypeScript/component tests; and a 30-assertion pgTAP contract.
**Security and privacy impact:** Only active Office Admin users may call the public security-invoker RPCs. Private definer implementations enforce organisation scope and controlled reasons, hard blockers cannot be overridden, direct table reassignment is trigger-blocked, protected medical/compliance/handover detail is excluded from generic audit payloads, and the short-lived trigger marker is cleared immediately after its guarded update.
**Hardened three-pass analysis:** Pass 1 found false warnings and false custody events for resources already at the target. Pass 2 aligned browser and database no-change, blocker, warning, and missing-licence behavior. Pass 3 completed an eight-file security diff scan and found a reusable transaction-local trigger marker.
**Improvements applied:** No-change reviews are informational; unchanged employees are not rewritten; unchanged assets create no custody event; missing licence expiry fails closed; authoritative no-change review occurs only after blocker/warning checks; and employee/asset trigger markers are cleared before audit processing.
**Tests executed:** TypeScript compilation passed; 14 of 14 focused planner and Office Admin component tests passed in Chrome Headless. The pgTAP contract contains 30 authorization, role, hard-blocker, override, no-op, direct-write, custody, and leak assertions.
**Browser/mobile evidence:** The existing responsive interfaces retain 44 px minimum decision controls. The scheduled full visual-regression gate remains after Slice 3.
**Result:** Partial verification: implementation, typecheck, focused browser tests, and hardened security review pass after remediation. Database execution is blocked because Docker Desktop's Linux engine is not running.
**Known gaps:** The deterministic ranking uses compliance, fit, association, availability, and work-order state. Recent utilisation remains deliberately excluded until an authoritative measurement contract exists. Remote deployment and five-user provisioning remain blocked by the unverified Senatla remote-dev target.
**Next action:** Commit Slice 2 as a clean candidate. Execute all pgTAP contracts and deploy only after the authoritative remote-dev project and matching runtime variables are verified; then provision five real users and create the ignored credential handoff.
### 24 August 2026 - OCR-0 native platform foundation

**Slice:** OCR-0 - production native backbone before OCR logic.
**Branch / PR:** `sankofa_xciv/authoritative-slices-0-2`; PR #53 into `dev`.
**Outcome:** Added committed Android and iOS Capacitor projects under the permanent identifier `za.co.senatlatrading.ops`, exact-version install-script approvals, unsigned native build gates, and native privacy controls. No replacement app and no OCR SDK were introduced.
**Decision:** Establish and verify the native security/build boundary before defining scanning contracts or selecting Android ML Kit and Apple Vision/VisionKit adapters.
**Alternative rejected:** Browser-only capture or an immediate cross-platform OCR dependency, because either would weaken native scanning quality, offline behavior, privacy control, and long-term platform ownership.
**Files/contracts changed:** Capacitor identity and dependencies; generated `android/` and `ios/` projects; native CI workflow; Swift package path normalizer; browser support baseline; signing exclusions; native foundation guide.
**Security and privacy impact:** Android backup is disabled; FileProvider grants are restricted to a dedicated evidence cache; iOS camera, photo-library, and location purposes are explicit; signing/API keys are ignored; no signing secret or service credential is stored in Git or this document.
**Hardened three-pass analysis:** Pass 1 aligned application IDs, platform versions, browser floors, permissions, and deterministic sync. Pass 2 exposed backup leakage, root-storage sharing, stale template test identities, missing signing exclusions, incomplete CI triggers, and a silent Swift-normalizer failure mode. Pass 3 ran the full web gate, native synchronisation, manifest parsing, forbidden-pattern checks, dependency audits, and remote native CI.
**Improvements applied:** Disabled Android backups; limited file sharing; corrected unit and instrumentation package identities; compiled Android tests in CI; expanded native CI triggers; made iOS normalization fail closed; documented exact install-script trust and release-stage gates.
**Tests executed:** Local release gate passed: runtime-config 3/3, lint, typecheck, production build, and 80/80 Chrome Headless tests. Android and iOS synchronisation passed after repeated regeneration. Production dependency audit found zero vulnerabilities; nine development-tool advisories remain because the offered forced fix would downgrade Angular to an unsafe/incompatible version.
**Native evidence:** GitHub Actions run 32676423136 passed: Android app lint, unit tests, instrumentation-test APK compilation, and unsigned debug APK built on Linux in 3m54s; the unsigned iOS simulator app built on macOS in 2m14s. https://github.com/Sankofa-Digital-Studio/senatla-ops/actions/runs/32676423136
**Visual evidence:** No rendered application UI changed in OCR-0. The scheduled full visual-regression gate remains after Slice 3; native app launch/scanner visual evidence starts with the first rendered OCR slice.
**Result:** Verified native foundation, subject to the recorded release-stage gates.
**Known gaps:** Local Android compilation is unavailable because this Windows host has no JDK/Android SDK; iOS compilation requires macOS. Release signing, Android shrinking/version allocation, store identities, and a committed Swift dependency resolution remain deliberately out of OCR-0.
**Next action:** OCR-1 will add the stable TypeScript scanning contract and privacy lifecycle before platform OCR adapters.
### 24 August 2026 - OCR-1 and OCR-2 production scanning bundle

**Slice:** OCR-1 stable scan contract and OCR-2 Android/iOS native adapters.
**Branch / PR:** `sankofa_xciv/ocr-1-2-native-scanning`; PR [#54](https://github.com/Sankofa-Digital-Studio/senatla-ops/pull/54) merged into `dev` as `05df90a`.
**Outcome:** Enhanced the existing asset-registration flow with native document scanning, on-device OCR, evidence provenance, byte-integrity verification, and explicit human review. Android uses the Google Play services ML Kit document scanner plus bundled ML Kit text recognition. iOS uses VisionKit capture plus accurate Vision text recognition. Browser upload and device-camera capture remain controlled fallbacks; no replacement application or local production data source was introduced.
**Decision:** Keep a strict TypeScript contract between application and native code, accept only private `file://` JPEG artifacts, validate dimensions/size/UUIDs/SHA-256 before materialising a `File`, and delete native artifacts before Supabase upload once JavaScript owns the verified bytes.
**Alternative rejected:** Base64 bridge payloads, public/shared native files, cloud OCR as the default, automatic application of detected values, and silent fallback after cancellation or permission denial. These paths increase memory pressure, privacy exposure, ambiguity, or unsafe automation.
**Files/contracts changed:** Existing asset-registration models, service, component, workspace and tests; `src/app/core/scanning/`; Android ML Kit adapter and internal scanner activity; iOS VisionKit/Vision adapter and bridge registration; evidence-provenance migration and pgTAP contract.
**Security and privacy impact:** Native results are contract-validated; evidence is limited to 15 MiB and five pages at the platform boundary; native cache paths are never logged or persisted; OCR text is capped at 8,000 characters in the business record and excluded from activity logs; Supabase RLS/private Storage remain authoritative; OCR values cannot change an asset until a human applies and verifies them.
**Hardened three-pass analysis:** Pass 1 challenged contract ambiguity, fallback semantics, content integrity, data minimisation, role boundaries, and human-review enforcement. Pass 2 challenged native lifecycle, traversal/symlink cleanup, process interruption, concurrency, resource bounds, and bridge error leakage. Pass 3 completed a Codex Security compact diff review across all 20 changed source files and the supporting RLS/Storage controls. The first pass retained two native defence-in-depth candidates. An independent adversarial pass then found two medium persistence weaknesses; both were remediated before the final 20-file scan closed with no reportable finding.
**Improvements applied:** Android now holds its scanner guard until OCR/cache finalisation completes; Android and iOS safely sweep validated stale scan sessions on startup; Android cleanup rejects symbolic links; native failures resolve on the bridge main thread; malformed native results trigger whole-session cleanup; activity logs contain provenance and detected field names but no raw OCR or private URI; two-phase pending-row upload, checked rollback, immutable ready objects/provenance, and uploader-only finalisation close the independent critic findings.
**Tests executed:** Runtime-config 3/3, lint, TypeScript compilation, production build, and 93/93 Chrome Headless tests passed. Focused OCR coordinator, web-fallback, MIME/size, provenance, and human-review tests are included. `git diff --check`, Capacitor Android/iOS synchronisation, linked Supabase lint, and migration dry-run passed. PR #54 then passed application, 208-test Supabase pgTAP, Android lint/unit/debug APK, iOS simulator, and both Vercel preview checks after one evidence-backed CI repair.
**Browser/mobile evidence:** The existing capture workspace now explains human review and displays capture provenance/OCR confidence. Full visual regression remains scheduled after operational Slice 3. Signed physical-device proof of camera permission, capture, cancellation, process interruption, and cleanup remains mandatory before store release.
**Result:** Implementation, remote migrations, native CI, Supabase pgTAP, and both Vercel preview gates pass. PR #54 merged to `dev` as `05df90a`; the post-merge application, Supabase, Android, iOS, and both Vercel deployments passed. Signed physical-device QA remains the explicit store-release gate.
**Known gaps:** The official client recomputes SHA-256 immediately before immutable upload, but the digest and capture source are not cryptographic device attestation. OCR accuracy on South African licence discs, low-light images, rotated pages, and platform-specific permission flows requires the five-role UAT matrix and signed devices.
**Next action:** Execute signed physical-device UAT across the five-role matrix, covering permissions, capture, cancellation, interruption, OCR review, upload rollback, and role access without storing credentials in Git or this document.
### 24 August 2026 - OCR-3 signed-device UAT gate

**Slice:** OCR-3 - five-role signed-device release gate.
**Branch:** `sankofa_xciv/ocr-3-device-uat-gate`.
**Outcome:** Added an executable release-evidence contract for five real access variants, one signed Android device, one signed iOS device, and all 25 required device/access results. Added a private ignored UAT-results boundary plus responsive operator documentation. No user result, credential, or physical-device evidence was fabricated.
**Decision:** Treat physical UAT as release evidence, not a seed dataset. Persist aliases and safe external evidence references only; require the exact remote-dev project and deployed commit; reject incomplete, duplicate, unknown, unsigned, cross-scope, or privacy-unsafe records.
**Alternative rejected:** Committed credentials/results, a pass-by-checklist document without an executable gate, synthetic users presented as UAT, or a single happy-path site account. These would create leakage, false assurance, and access-control blind spots.
**Files/contracts changed:** OCR device UAT contract, CLI validator, Node contract tests, release gate, private-output ignore rule, and Markdown/HTML operating guide.
**Security and privacy impact:** The validator recursively rejects sensitive keys and values, including credentials, emails, identity numbers, raw OCR, native URIs, private paths, and device identifiers. It prints summaries/issues only and never echoes the submitted payload.
**Hardened three-pass analysis:** Pass 1 reconciled 16 scenarios to 25 platform results and required exact five-user relationships. Pass 2 challenged secret/PII/path leakage, unsafe evidence references, unknown cases/platforms, and payload logging. Pass 3 challenged release semantics: signed-build proof, exact target/commit, unique results, in-progress isolation, and failure behavior.
**Improvements applied:** Corrected the initial 24-result assertion to the canonical 25; rejected extra device platforms and unapproved case/platform pairs; isolated private records under ignored output; made `--allow-incomplete` structural-only so it cannot set release readiness.
**Tests executed:** Six of six OCR UAT contract tests pass, covering a complete matrix, unknown additions, leakage, missing/failed evidence, and explicitly in-progress validation.
**Browser/mobile evidence:** The guide is mobile-responsive for Android/iOS viewing. This slice changes the release gate and operator documentation, not application UI. Physical scanner visual evidence remains the purpose of the pending UAT run.
**Result:** Gate implementation verified locally; physical UAT remains pending and OCR is not device-certified.
**Known gaps:** Signed builds, the five real remote-dev participant assignments, controlled credential handoff, and physical evidence must be supplied/executed by authorised operators. No result will be inferred or backfilled.
**Next action:** Deploy the gate to remote dev after the full repository and CI checks pass, then execute the controlled five-user signed-device run and validate its private JSON record.
## Decision log

| ID | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| D-001 | 23 Aug 2026 | Enhance the existing application; do not build a replacement | Existing Senatla features already cover the required operational foundation | Accepted |
| D-002 | 23 Aug 2026 | Begin with readiness rules | Immediate safety and operational value using data already held | Accepted |
| D-003 | 23 Aug 2026 | Keep recommendations human-reviewed | Operational and safety accountability cannot be delegated silently | Accepted |
| D-004 | 23 Aug 2026 | Defer solver adoption | Complexity and benefit must first be measured using the deterministic pilot | Accepted |
| D-005 | 23 Aug 2026 | Sanitize readiness at the database boundary | Site users need actionable outcomes, not confidential source evidence | Accepted |
| D-006 | 23 Aug 2026 | Bundle Slice 0 and Slice 1 for remote dev | Avoid deploying an unused backend contract before its UI consumer passes the same hardened gate | Accepted |
| D-007 | 23 Aug 2026 | Prohibit remote fallback to demonstration state | Missing or failed remote reads must never create client-facing records | Accepted |
| D-008 | 23 Aug 2026 | Confirm readiness atomically at the server | Prevent stale UI evidence from self-certifying start of shift | Accepted |
| D-009 | 23 Aug 2026 | Keep credential register outside Git and DOCX | Limit secret exposure and support controlled UAT handoff | Accepted |
| D-010 | 23 Aug 2026 | Re-evaluate assignments atomically and clear trigger markers immediately | Prevent stale UI decisions, direct-write bypass, and reusable transaction authorization | Accepted |
| D-011 | 24 Aug 2026 | Establish native security/build foundation before OCR logic | Native capture and OCR require controlled platform identity, privacy, and build evidence | Accepted |
| D-012 | 24 Aug 2026 | Use native on-device scanning behind a strict cross-platform contract | Preserve privacy, offline capability, bounded resources, and testable lifecycle ownership | Accepted |
| D-013 | 24 Aug 2026 | Treat OCR as reviewable evidence, not authoritative asset data | Prevent recognition errors from silently changing operational records | Accepted |
| D-014 | 24 Aug 2026 | Keep physical UAT private, alias-only, and executable | Prevent false certification and sensitive-data leakage while proving five access variants | Accepted |

## Evidence register

| Evidence ID | Slice | Evidence expected | Status | Location/reference |
|---|---|---|---|---|
| E-001 | 0 | Readiness rule catalogue and evaluator tests | Partial | Typecheck and 12/12 policy tests pass; combined RPC contract has 48 assertions pending database execution |
| E-002 | 1 | Site Manager component, privacy, real-data boundary, audit, and browser proof | Partial | 22/22 focused tests, build, lint, and desktop/390 px Cypress pass; database and remote five-user proof pending |
| E-003 | 2 | Conflict/ranking and audit tests | Partial | 14/14 focused tests and security remediation pass; 30 pgTAP assertions await database execution |
| E-004 | 3 | Cost reconciliation and RLS tests | Pending | To be recorded |
| E-005 | 4 | KPI reconciliation and responsive browser proof | Pending | To be recorded |
| E-006 | 5 | Route heuristic, offline, audit, and field proof | Pending | To be recorded |
| E-007 | 6 | Pilot measurements and solver decision | Pending | To be recorded |
| E-008 | OCR-0 | Android/iOS identity, sync, security, and unsigned build proof | Verified | Local release gate and sync pass; PR #53 native CI recorded in journey log |
| E-009 | OCR-1 | Contract validation, integrity, cleanup, fallback, and human-review proof | Verified locally | Full release gate passed with 92/92 browser tests; formal security scan covered all 20 changed source files |
| E-010 | OCR-2 | Android ML Kit and iOS VisionKit/Vision compile and device proof | Partial | Remote Android/iOS CI passed; signed physical-device UAT pending |
| E-011 | OCR-3 | Five-role signed-device UAT contract, privacy gate, and execution guide | Verified locally | 6/6 contract tests pass; physical UAT results intentionally pending |

## Risk register

| Risk | Consequence | Control | Current state |
|---|---|---|---|
| Illustrative Harmony/Saaiplass assumptions treated as fact | Contractual or reputational harm | Keep scenario labels and validate every customer-specific requirement | Open |
| Sensitive employee screening detail exposed | Privacy breach | Return eligibility reasons with least-detail role filtering | Open |
| UI-only safety checks bypassed | Unsafe or unauthorised allocation | Enforce authoritative rules at the database/service boundary | Open |
| Duplicate operational data structures | Divergent sources of truth | Extend existing entities and gateways | Controlled by plan |
| Dashboard totals drift from source records | Incorrect management decisions | Require drill-down and reconciliation tests | Open |
| Recommendation mistaken for instruction | Accountability and safety risk | Human approval, explanation, and override audit | Controlled by plan |
| Solver introduced before data is ready | Cost without operational value | Production evidence gate after deterministic pilot | Controlled by plan |
| Interrupted native scan leaves sensitive cache residue | Recoverable evidence remains on a device longer than intended | Dedicated private/protected cache, finally cleanup, safe startup sweep, no backup, no path logging | Controlled in code; physical-device kill test pending |
| OCR suggestion is mistaken for verified truth | Incorrect identifiers or expiry dates enter operations | Explicit apply-and-verify gate, confidence/provenance display, immutable audit metadata | Controlled in code; UAT accuracy matrix pending |

## Definition of done for each slice

- Existing workflow is enhanced rather than duplicated.
- Acceptance criteria are demonstrated.
- New mutations leave immutable audit evidence.
- Authorization changes include role-negative tests.
- Schema changes include migration/reset and rollback evidence.
- Desktop and 390 px proof is captured for rendered changes.
- Metrics reconcile to persisted records.
- Documentation, journey log, decision log, evidence register, and risk register are updated.
- Verified completion is distinguished from external or environmental blockers.

## Source material

- *Senatla Trading - Harmony Mine Operations: Saaiplass #3 Rehabilitation & Demolition - Discrete Programming + Operations Research Business Ecosystem*, 13 pages, supplied August 2026. Treated as illustrative strategy material.
- Current Senatla Ops repository architecture, delivery backlog, migrations, models, routes, role experiences, and tests inspected during the planning pass.
