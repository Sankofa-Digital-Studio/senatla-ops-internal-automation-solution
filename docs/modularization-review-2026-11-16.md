# Senatla Ops Modularization Review and Plan

16 November 2026 | Architecture assessment | Implementation not started

## Consolidation update and execution order — 16 November 2026

This update supersedes the earlier working-tree scope and sequencing below. The integration combines release commit 3f1d0b3 and commercial/workforce commit 6e95238 through PR #148. The six swarm branches point to the same commercial commit; they are not six independent features. Main promotion and branch deletion are conditional on the combined commit passing CI.

No feature removal is planned. Preserve routes, permissions, stored records and drafts, exports, approvals, device workflows, and current payroll behavior. The consolidation fixes rate metadata lost on database reload, invalid rate inputs, and repeat commercial generation overwriting job-card edits. New regression cases cover rate round trips and repeated/invalid generation.

### Ordered delivery

1. Finish integration and run one combined CI gate: application verification, database contracts, responsive checks, Android build and iOS simulator build. Record any device/UAT limitations separately.
2. Merge the verified integration into main, confirm both source commits are ancestors, then delete integrated feature branch names. Detach checked-out feature worktrees while retaining their files and untracked projects. Preserve long-lived dev and preview branches.
3. Highest-value refactor: narrow OfficeAdminService data loading and state ownership, beginning with the existing vendor workflow. First capture requests, transferred bytes, ready time, and failure behavior. Extract only its persistence/state boundary behind the existing API; retain one writable state owner and existing approval/audit orchestration. Then independently introduce feature-scoped loading and retry so one failed dataset cannot blank unrelated work. Do not create a repository/state/service trio unless distinct responsibilities justify all three.
4. Extract duplicated payroll calculations into a pure module with explicit caller policies. Preserve the existing zero-rate fallback and employee-inclusion differences until business rules are approved. Test the differing cases before consolidation.
5. Separate dashboard fixture data and browser-session storage from operational data contracts. Commercial packages and designation baselines currently remain browser-session scoped; the seeded package is not proof of a shared production record. Shared persistence is a separate functional delivery, not an incidental refactor.
6. Finish Office Admin component ownership using existing sub-features, then isolate engineering job-card panels, Site Manager workflows, and asset device adapters where their dependencies justify it.
7. Remove proven dead handlers and temporary compatibility bridges only after callers migrate. Re-measure request counts, bytes, bundles and failure recovery. Stop splitting when further layers add navigation without independent responsibility.

### Review challenge and acceptance

Compared with the previous pass, the priority is narrower: fix observed data-loss defects first, reduce eager loading next, and avoid multiplying services merely to reduce line counts. The argument against extraction is additional indirection and regression risk; the acceptance gate is fewer unrelated dependencies, preserved outputs, isolated retries, and measured loading improvement. No speedup percentage is claimed without a runtime baseline. Native build success does not establish physical-device usability.

The remaining user-supplied release input is approved letterhead artwork: provide the original approved logo/letterhead and intended header/footer placement so exports can match the brand without invented artwork. This does not block code consolidation.

---

## Original assessment — Decision

Senatla Ops has clear modularization candidates. Prioritize OfficeAdminService, the ownership of dashboard data, duplicated payroll logic, and the Office Admin and Site Manager workspaces. Retain the current deployment model and evolve toward a modular monolith with feature-owned state, explicit contracts, and focused UI components.

The goal is safer changes and trustworthy operational records. A smaller file is useful only when it also has a clearer responsibility. There is no measured scaling, deployment, or team-ownership evidence here that justifies microservices, microfrontends, or a framework migration.

## Scope and evidence

Reviewed the current working tree in C:/Users/thoso/Sankofa_mvp/senatla-ops-internal-automation-solution, branch preview, base commit d4cf4f8. Seven application files already had uncommitted edits: app.models.ts, domain-dashboard.models.ts, office-admin.models.ts, domain-dashboard.service.ts, office-admin.service.ts, and the admin-workforce TypeScript and HTML files. Findings include those edits and must be refreshed against the implementation baseline. This review changes documentation only. A final status check also detected a concurrent engineering-dashboard.component.ts change after inspection; its counts and line references describe the inspected snapshot, not that later edit. Refresh this candidate before implementation.

The assessment used three passes: inventory and size; responsibility and dependency inspection; then a challenge of the proposed boundaries against existing abstractions, regression risk, and unnecessary complexity. File sizes count physical lines after trimming trailing whitespace, including comments, blank lines, fixtures, and inline templates. They are indicators, not complexity scores. Import counts are not used as a complete dependency graph because aliases and dynamic imports require further resolution.

This is a source assessment, not a production performance or security certification. No application build, runtime workflow, live database query, or device test was run. High confidence applies to the code locations and responsibilities below; performance benefits and delivery estimates remain hypotheses. An accuracy percentage cannot be established from static inspection alone.

## Prioritized candidates

| Priority | Candidate | Measured size | Recommended boundary |
| --- | --- | --- | --- |
| P1 | OfficeAdminService | 2,713 TS lines | Feature services and repositories behind a temporary compatibility facade |
| P1 | DomainDashboardService | 1,757 TS lines | Engineering commands, domain read models, explicit fixture adapter |
| P1 | OfficeAdminComponent | 1,101 TS and 934 HTML lines | Navigation shell plus feature-owned workflows |
| P1 | Payroll logic in two services | StaffDataService 826 TS lines | Shared pure calculation with explicit rate policy |
| P2 | SiteManagerComponent | 820 TS and 1,166 HTML lines | Site-day coordinator, step components, device adapters |
| P2 | Engineering dashboard | 1,419 TS lines | Job-card editor, financial summary, commercial traceability panels |
| P2 | Demolition dashboard | 1,054 TS lines | Contract detail, claims, salvage and compliance panels |
| P2 | AssetRegistrationService | 744 TS lines | Registration repository, evidence transport, device notifications |
| P3 | app.models.ts | 639 TS lines | Feature contracts with transitional type re-exports |
| P3 | API admin users handler | 584 MJS lines | Shared request boundary and explicit action handlers |

P1 means highest modularization value, not a declaration of a critical production incident. Sequence work by risk and dependency rather than by file size alone.

## Findings and proposed boundaries

### Office administration combines unrelated reasons to change

Evidence: src/app/core/services/office-admin.service.ts:257 begins the service. User administration starts at 393, approvals at 446, workforce writes at 724, vendors at 895, assets at 1105, payroll at 1376, persistence at 1606, row mapping at 2057, approval execution at 2380, and report generation at 2457.

loadFromSupabase at 1629 issues 26 dataset reads in one Promise.all. At 1687 any result error fails the aggregate load; loadWorkspace at 1617 then applies a default workspace. This couples unrelated feature availability. It is evidence of a shared failure path, not a measured latency problem.

Introduce workforce, sites, assets, procurement, payroll, approvals, and reporting services, each with typed repository contracts and explicit read models. Audit and delivery infrastructure remain shared. Initially OfficeAdminService delegates through its existing public surface so consumers can move incrementally. Do not replace it with a single OfficeRepository containing all the same responsibilities.

Keep each entity collection authoritative in one store. The compatibility facade exposes the same store references or read-only views; it must not copy state into a second writable cache. Commands own persistence and update state after their defined success condition. Cross-feature approvals coordinate explicit commands without making domain services depend back on the facade.

Counterargument: splitting a mature service increases indirection and can break coordinated approvals. Mitigation: start with one bounded workflow, preserve payloads and authorization, and keep approval orchestration together until its contracts are characterized. No colocated office-admin.service.spec.ts was found; component tests exist, but their presence does not establish service coverage.

### Dashboard data and production records need explicit ownership

Evidence: src/app/core/services/domain-dashboard.service.ts:149 contains seeded financial signals; engineering orders begin at 189 and demolition projects at 613. Calculated summaries start at 1089. The constructor at 1228 hydrates cache and session storage; persistToStorage at 1272 and job-card mutation methods from 1357 share the same service. No production repository is imported by this service.

Extract EngineeringJobCardService for commands, EngineeringDashboardQuery and DemolitionDashboardQuery for read models, and MacroDashboardQuery for aggregation. Move seeded records into an explicit review/demo data adapter. Give each read model source, freshness, and error metadata so a missing production source cannot silently look like verified operational data. Existing SessionDataCacheService should remain a cache adapter rather than becoming the source of business truth.

Counterargument: much of the 1,757 lines is data, so splitting the service into many small classes could merely relocate fixtures. First establish the source boundary and isolate the engineering workflow. Add further services only where commands, state ownership, or test scenarios differ. Wiring genuine persisted data is a behavior change and belongs in a separate delivery slice from extraction.

### Office UI decomposition has started but is incomplete

Evidence: src/app/pages/office-admin/office-admin.component.ts:1 imports eight existing sub-features. Its HTML at 33 uses deferred child components, while the assets section starts inline at 77. The parent still owns workforce imports, vendor actions, payroll, report generation, and asset/site/employee modals. AdminWorkforceComponent:19 and AdminVendorsComponent:16 both inject the broad OfficeAdminService.

Retain the existing sub-features. Move remaining asset operations, payroll controls, cost reporting, and executive report composition into feature components. The parent should own navigation, route state, and workspace-level feedback. Trace template and test references before deleting parent methods: overlapping responsibilities are confirmed, but unused code has not been proven.

Counterargument: components already exist, so another visual split could leave coupling unchanged. Migrate service ownership with each selected workflow; avoid passing the entire parent component or facade as a child input.

### Payroll duplication already contains a behavioral difference

Evidence: StaffDataService.calculateMonthlyPayroll at src/app/core/services/staff-data.service.ts:398 multiplies days by basicRate. OfficeAdminService.calculateMonthlyPayroll at 1481 adds an effective-hourly-rate fallback when basicRate is not positive. CSV generation is also duplicated at staff-data.service.ts:435 and office-admin.service.ts:1530; the latter uses activeEmployees while the former uses its complete employee state.

Introduce a pure payroll calculation accepting employee data, period, financial types, and a named rate policy. Preserve each caller's current policy first. Add characterization cases for zero and positive rates, missing employees, manual adjustments, inactive financial types, and month boundaries. Separately reconcile the rate and employee-inclusion policies before converging behavior. This assessment does not validate the legal correctness of payroll or deduction formulas.

StaffDataService also owns attendance, site-day drafts, safety, audit, synchronization, and snapshot persistence. Extract payroll first; later isolate attendance delivery and site-day state without changing idempotency or audit order.

### Site Manager needs a workflow boundary and device seams

Evidence: src/app/pages/site-manager/site-manager.component.ts:93 defines five steps. Field operations begin at 277, browser persistence at 434, GPS at 486, attendance evidence at 502, safety at 593, signature canvas at 623, and synchronization at 748.

Keep one SiteDayCoordinator for the selected site/date and draft lifecycle. Extract setup, safety, attendance, operations, and signoff views. Isolate signature drawing and location/camera access behind focused components or ports. Reuse AttendanceRowComponent and TimesheetRegisterService. Version persisted drafts and retain existing keys/read compatibility during extraction.

Counterargument: these steps belong to one operational transaction. Do not give every step an independent copy of the draft or move final submission into several components. Verify cancellation, reload, offline retry, date rollover, touch input, and permission denial together.

### Dashboard size is mostly inline presentation

EngineeringDashboardComponent starts its class at line 1173; its inline template occupies approximately 1,154 lines. DemolitionRehabDashboardComponent starts its class at 978 with approximately 960 template lines. These are large views, not equally large business-logic classes.

Move templates to HTML for navigation, then extract independently meaningful panels and modal workflows. Engineering candidates are job-card list/editor, material and labour editors, profit detail, and commercial discrepancy review. Demolition candidates are contract detail tabs and claims/salvage/compliance panels. Moving a template alone is housekeeping, not architectural modularization.

src/app/pages/dashboards/multi-domain-dashboard.component.ts:5 imports all four domain views and renders them through a switch. Evaluate deferred views or child routes after measuring emitted chunks. Top-level routes already use loadComponent in src/app/app.routes.ts:34 onward; do not propose adding lazy routes as if they are absent.

### Asset registration and API handlers are secondary candidates

AssetRegistrationService imports camera/platform APIs, Supabase, auth, validation, ScanCoordinator, and OCR evaluation in its first 26 lines. Keep its workflow facade, extract draft/evidence persistence and notification adapters, and reuse the existing scanning modules. Do not create a second OCR coordinator.

api/admin/users-handler.mjs:3 contains a handler factory, with normalization and audit helpers below line 506. Separate action handlers only after preserving the common authorization and validation sequence. Existing reset/provisioning contract tests are useful starting points. File length alone makes this lower priority than the cross-domain services.

Split app.models.ts by entity ownership as features migrate. Keep deliberate type-only re-exports temporarily to reduce import churn. Do not create a shared-model package or move every type at once.

## Target architecture and constraints

Feature views call feature facades or query services. Facades execute pure policies and typed repository commands. Repository adapters call existing backend APIs or Supabase; review-mode adapters provide explicit fixture data. Cross-feature read models consume public query contracts. Platform adapters own storage, camera, scanning, location, downloads, and notifications where an actual test seam is needed.

Proposed feature folders are workforce, sites, attendance, assets, procurement, payroll, approvals, reporting, engineering, and demolition. Adopt them gradually; moving all files before establishing ownership would create churn without reducing coupling. Shared platform code holds runtime configuration, auth, audit transport, and device adapters. Shared UI holds domain-neutral controls already present in components/erp.

Dependency rules: features cannot import another feature's private persistence or writable store; domain policies cannot import Angular, browser APIs, or Supabase; API handlers cannot import browser components; fixtures cannot become the implicit production fallback. Check these rules with import-boundary linting after choosing the first feature layout.

Preserve Supabase as the authorization boundary, including role-negative tests. Preserve existing SQL/RPC transaction boundaries, maker-checker rules, idempotency keys, evidence provenance, and audit events. Historical migrations are deployment history and should not be split retrospectively. Frontend module boundaries do not replace database policies.

## Delivery sequence and acceptance gates

### Stage 0 Establish the baseline

Capture the intended implementation revision and reconcile the seven existing modified files without overwriting them. Record the current tests and known failures. Inventory each proposed feature's state owner, callers, storage keys, API/RPC contracts, and authorization requirements. Measure representative request counts and emitted bundles before claiming performance gains.

Acceptance: an agreed baseline, feature ownership map, and characterization cases for payroll, approval execution, office loading failures, session changes, and report generation. The inspected report generator at office-admin.service.ts:2457 can create missing operational records and writes an attendance log; decide its intended behavior separately rather than preserving that side effect accidentally in a read-only reporting module.

### Stage 1 Establish one narrow pattern

First PR: extract the pure payroll engine with explicit compatibility policies and move no persistence or UI. Add focused characterization tests proving both callers retain their existing results and selection rules. A second PR can resolve policy differences against approved examples.

Next, extract the vendor account/invoice workflow as a vertical slice: repository, state owner, service, and existing AdminVendorsComponent. Keep approval submission coordinated through an explicit port, with exactly one audit and approval event per successful operation. Keep the remaining OfficeAdminService API as a delegating bridge.

Acceptance: existing consumers work, no duplicated writable vendor state, unchanged request payloads and role outcomes, tested partial-failure/retry behavior, and no new dependency cycles. These slices are small relative to the full service; they are not risk-free.

### Stage 2 Reduce office coupling

Migrate workforce, assets, payroll orchestration, and sites in separate PRs using the proven pattern. Introduce independent feature load/error states and fetch only what an active workflow needs, with shared reference data loaded once. Cross-feature reports explicitly report incomplete source data. Change loading behavior separately from mechanical extraction so failure semantics are reviewable.

Acceptance: an asset data failure does not erase a valid workforce view; unauthorized data remains unavailable; logout/account changes clear or invalidate feature state; approval requests and audit evidence retain their identifiers and order. Remove a facade member only after its callers have migrated.

### Stage 3 Clarify dashboards and field workflows

Separate dashboard fixtures from operational read models before adding more commercial features. Extract engineering commands and focused dashboard panels. Then decompose Site Manager and asset registration around their existing workflow coordinators and device contracts.

Acceptance: source/freshness is visible, missing production data is not replaced by seeded totals, job-card totals and discrepancy handling are stable, and site-day submission/retry produces the same payload and idempotency behavior. Verify relevant flows in Android Chrome and iOS Safari and on native devices for camera, notifications, and signature interactions.

### Stage 4 Enforce and remove transitional code

Adopt import-boundary checks; move feature models opportunistically; remove verified dead parent handlers and compatibility exports; consider the admin API action split. Re-measure bundles and requests. Stop splitting when a unit has one coherent responsibility and can be tested without unrelated domain setup.

Acceptance: feature consumers use public contracts, no duplicated business calculations, no new cycles, and each critical command has a focused regression test. Smaller line counts are supporting evidence, not the release gate.

## Verification and rollback

For each implementation slice, run targeted unit/contract tests plus npm run typecheck and npm run lint. Use npm run test:ci and the production build at the integration gate. Run the relevant Playwright suites through npm run test:responsive; run npm run supabase:test when persistence, RPC, or authorization boundaries are affected. Existing database contracts include assignment_planning_contract.sql, workforce_ppe_fuel_contract.sql, attendance_queue_delivery_bridge.sql, access_contract.sql, and audit_contract.sql. Do not infer passing status from their presence.

Each PR should be independently revertible. Preserve routes, repository contracts, and stored-draft compatibility while moving code. Avoid schema changes in the initial extraction stages. If later behavior changes require a migration, give it its own data compatibility and rollback plan; reverting frontend code alone may then be insufficient.

## Alternatives and product fit

Retaining everything has the lowest immediate regression risk but leaves demonstrated rule duplication and broad loading dependencies. A modular monolith requires careful extraction yet reuses the current runtime and infrastructure. Microservices add network and operational boundaries without evidence that independent scaling or deployment is needed. The recommended choice is the modular monolith.

ERPNext already offers accounting, procurement, assets, manufacturing, and HR/payroll modules. Odoo Maintenance offers preventive/corrective maintenance workflows, equipment tracking, scheduling, and operational statistics. These are reference products, not evidence that Senatla should migrate platforms. Avoid rebuilding their entire ERP breadth. Preserve Senatla's field-to-office evidence, explainable approvals, recovery, and role-specific operational flow as the differentiation.

Viability is plausible for that focused internal workflow, but return on investment is unmeasured. Technical feasibility is supported by existing gateways, pure policies, and child components. Usability must be tested through completion time, error recovery, and comprehension on real field devices; source inspection cannot establish it. Before expanding generic accounting or maintenance breadth, compare integration cost with bespoke ownership cost.

## Three pass review outcome

Pass 1 identified large files and suggested broad decomposition. Its weakness was treating size as complexity. Pass 2 traced persistence, consumers, and workflow responsibilities; it found the 26-read failure path and divergent payroll calculations. Compared with pass 1, dashboards moved below service/data ownership because most of their size is template markup or fixtures.

Pass 3 challenged the implementation risk. Existing lazy routes, deferred office sub-features, scanning, readiness, assignment policies, and gateway interfaces should be reused. The resulting plan separates extraction from behavior changes, keeps one state owner, and sequences acceptance gates. Remaining gaps are runtime baselines, exact dead-code analysis, stakeholder-approved payroll/reporting behavior, and field-device verification. These gaps affect implementation acceptance, not the identification of the candidates.

## Sources

- Local code locations and test paths above are relative to the reviewed repository. Counts reflect the working tree on 16 November 2026.
- Angular style guide: https://angular.dev/style-guide — supports organizing by feature and keeping related responsibilities together.
- Supabase row level security: https://supabase.com/docs/guides/database/postgres/row-level-security — authorization must remain enforced at the data boundary.
- ERPNext product overview: https://frappe.io/erpnext — reference capability breadth, accessed 16 November 2026.
- Odoo Maintenance: https://www.odoo.com/app/maintenance — reference maintenance capabilities, search-index content checked 16 November 2026 after direct fetch timed out.
