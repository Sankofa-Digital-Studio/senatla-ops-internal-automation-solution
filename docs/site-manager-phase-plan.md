# Site Manager Flow Expansion Plan

## Product decision

The Site Manager flow remains one governed operational workflow. Engineering workshop managers use the same control loop with workshop-specific panels; they do not receive a second project-management system.

`Plan -> Verify readiness -> Allocate people -> Execute -> Detect blockers -> Escalate -> Handover -> Learn`

## Phase 1 — Manager Control Loop

### P1-01 — Role-aware manager command centre

- Show shift status, current site, crew totals, active blockers, workshop work in progress, and the next recommended human action.
- Keep recommendations explainable and rule-based.
- Acceptance: a manager can see the operational state without opening every workflow step.

### P1-02 — Shift intention and handover

- Capture the shift objective, top risk, support required, and end-of-shift handover note.
- Persist by site and work date.
- Acceptance: the next manager can understand the plan, unresolved work, and requested support.

### P1-03 — Engineering workshop execution board

- Provide a lightweight board for workshop work packages: queued, ready, in progress, quality check, complete, blocked.
- Capture workstation, owner, due date and blocker reason.
- Acceptance: workshop managers can move work without losing the operational evidence trail.

### P1-04 — Workstation readiness matrix

- Verify machine, tools, materials, competent operator, current instruction and inspection point before work starts.
- Readiness is advisory in Phase 1; it does not bypass the existing site-readiness gate.
- Acceptance: incomplete readiness is visible and explained.

### P1-05 — Blocker andon system

- Capture blocker category, severity, owner, due time and escalation state.
- Link blockers to a work package where available.
- Acceptance: blockers are ageing, actionable and visible from the command centre.

### P1-06 — Attendance-to-work linkage

- Use available attendance state to show whether a work package has an available assigned person.
- Do not alter attendance records from the workshop board.
- Acceptance: an absence creates a visible staffing warning rather than a silent execution failure.

### P1-07 — Correct site/date persistence boundary

- Store the manager overlay under an authorized site identifier and work date, not one global browser key.
- Restore the selected manager mode and clear only the selected site/date when no snapshot exists.
- Acceptance: changing date or site does not overwrite another shift's manager plan.

### P1-08 — Readiness and staffing start gate

- Prevent a workshop package from entering `in progress` until all six workstation checks are complete and its assigned person is marked present.
- Keep this separate from the server-authoritative site-readiness and safety locks.
- Acceptance: the manager receives an actionable explanation when the start gate fails.

### P1-09 — Blocker ageing visibility

- Display an overdue state when an unresolved blocker passes its due date.
- Keep escalation human-controlled in Phase 1; do not send automatic notifications or change permissions.
- Acceptance: overdue blockers are visible from the operations view and command centre count.

### P1-10 — Evidence-safe handover

- Keep handover notes attached to the selected site/date snapshot and show the open blocker, work-package and readiness counts beside them.
- Do not claim that local browser persistence is server audit evidence.
- Acceptance: the next manager can distinguish a local draft from a signed operational sync.

## Phase 2 — Governed execution task backlog

### P2-01 — Competence and authorisation gates

- Model role, skill, induction, certificate, expiry and evidence reference.
- Show `verified`, `due for renewal`, `missing evidence` and `not authorised` states.
- Acceptance: assignment is warned or blocked according to policy, with an attributable override path.
- Dependency: P1-06 attendance linkage and the existing employee/site authority model.

### P2-02 — Dynamic toolbox talks

- Build the topic from planned work, open blockers, active assets, recent incidents and workshop hazards.
- Require manager confirmation plus crew acknowledgement evidence.
- Acceptance: the briefing explains why the topic was selected and never silently replaces the existing safety lock.

### P2-03 — Permit and hold-point workflow

- Support requested, reviewed, authorised, work started, inspection required and released states.
- Separate requester and approver; record reason, actor, time and evidence.
- Acceptance: hot work, lifting, energisation, confined-space and return-to-service examples have negative authorisation tests.

### P2-04 — Quality inspection and non-conformance loop

- Add inspection points to work packages with result, evidence, inspector, rework action and due date.
- Failed checks create linked non-conformance records rather than only changing a colour.
- Acceptance: a package cannot be released as complete when a mandatory inspection is failed or outstanding.

### P2-05 — Material and consumable readiness

- Track required, ordered, received, inspected, issued, short and substituted states.
- Support controlled notes for batch, heat, cylinder or consumable references where applicable.
- Acceptance: material shortages can be linked to a blocker and do not mutate procurement records from the Site Manager role.

### P2-06 — Governed server persistence

- Move Phase 1 browser snapshots into an authorized server-backed manager-shift record.
- Preserve draft, submitted, accepted and rejected delivery states with idempotency keys.
- Acceptance: two authorized managers can see the same handover while unauthorized site access remains blocked by RLS.

### P2-07 — Cross-role escalation inbox

- Route blockers, permits, competence exceptions and quality failures to Office Admin, Engineering or Director review queues.
- Include SLA, owner, evidence and acknowledgement state.
- Acceptance: every escalation has one accountable owner and a visible acknowledgement or overdue state.

### P2-08 — Phase 2 audit and migration contract

- Add clean-reset migrations, negative RLS tests, browser role tests and rollback notes before production use.
- Acceptance: no Phase 2 feature is released on UI evidence alone.

## Phase 3 — Intelligence and scale

- P3-01 asset-health impact on work packages.
- P3-02 contextual photo, voice and evidence capture.
- P3-03 explainable recommendations with alternatives and overrides.
- P3-04 metacognitive manager review and learning loop.

## Phase 1 three-pass audit and Phase 2 evolution — 18 Nov 2026

### Pass 1 — Verify the delivered behavior

The delivered interface covers shift objective, risk, support, handover, site/date scoping, workshop work packages, six readiness checks, attendance warnings and manually owned blockers. Existing code confirms the overlay was stored in browser storage. The earlier plan explicitly disclaimed audit-grade sync evidence. So Phase 1 improves continuity and visibility, but does not establish a shared operational record.

### Pass 2 — Challenge the assumptions and failure paths

- **Shared handover:** a second manager or device could not reliably see the first manager's draft. Browser storage can also be cleared or remain on a shared device.
- **Gate bypass:** the UI checked readiness and presence, but a direct database write could skip that client check. Work date was also inferred from due date, which is not the same operational date.
- **Audit trust:** allowing clients to insert audit rows would let a client manufacture events; appending records from only some code paths would leave gaps.
- **Review boundary:** a reviewer needs authority to accept or reject a handover, but should not gain broad permission to rewrite the manager's operational records.
- **Product boundary:** a second job-card, attendance, procurement or safety system would duplicate existing sources of truth. Phase 2 must remain an execution overlay and read existing records for gates.
- **Partial failure and concurrency:** saving the parent snapshot, readiness, packages and blockers is multiple writes. A failure can leave a partial save, and concurrent managers can overwrite a newer draft unless the contract adds explicit conflict control.

### Pass 3 — Accepted improvements and trade-offs

The first Phase 2 slice adds an RLS-protected server model and a local gateway fallback, separates shift work date from package deadline, gates `in_progress` at both RPC and database trigger boundaries, restricts reviewer authority to the status RPC, and creates append-only event rows from database triggers. The browser still gives quick feedback; the database remains the enforcement point.

The trade-off is deliberate: this delivers governed manager records and start controls before expanding into permits, competence, inspection or procurement. The multi-table save now runs through one database transaction with an idempotency key and expected-version check. Phase 2 still needs the remaining execution domains and their negative authorization tests before the full phase can be called complete.

## Phase 2 delivery status

| Task | Status | Evidence / remaining work |
| --- | --- | --- |
| P2-01 Competence and authorisation | Not started | Add evidence-backed competence records and an attributable override path. |
| P2-02 Dynamic toolbox talks | Not started | Compose topics from existing work/risk data and capture acknowledgements. |
| P2-03 Permit and hold-point workflow | Foundation only | The work-start gate is hardened; permit states, maker-checker review and hazard-specific negative tests remain. |
| P2-04 Quality and non-conformance | Not started | Add inspection results and linked NCR/rework states. |
| P2-05 Materials and consumables | Not started | Add readiness references without writing to procurement records. |
| P2-06 Governed server persistence | Core slice implemented | Shift snapshots, readiness, packages and blockers save atomically with RLS, an expected-version check and an idempotency key. Reviewer status and database event audit are governed separately. |
| P2-07 Cross-role escalation inbox | Not started | Add accountable queue, acknowledgement and SLA behavior. |
| P2-08 Audit and migration contract | Core contract executed | Clean-reset migration chain and 33-assertion pgTAP contract added and executed against the connected database, including authenticated save, idempotent replay and stale-version rejection. Full local database suite remains unavailable because Docker is not installed in this environment. |

## Additional Phase 2 tasks added by the audit

- **P2-09 — Shift-date integrity:** persist work date independently from due date and use it for readiness and attendance checks. Status: implemented in the governance hardening migration.
- **P2-10 — Server-enforced execution gate:** reject direct writes that start work without all six checks and an assigned present employee. Status: implemented in RPC and trigger paths; verify with local Supabase negative tests.
- **P2-11 — Trustworthy audit events:** generate audit rows from database changes and deny direct client insert/update/delete. Status: implemented in trigger and grants; verify in database tests.
- **P2-12 — Rejected handover revision:** permit a rejected draft to be revised and resubmitted while keeping accepted handovers immutable. Status: implemented in trigger and status RPC; add workflow UI and behavioral tests.
- **P2-13 — Conflict-safe saves:** add idempotency/version checks and atomic persistence for manager snapshot collections. Status: implemented in `save_manager_control_state_v1`; request replays return their original version, concurrent first inserts serialize, and stale edits fail with a reload message instead of silently overwriting a newer version.
- **P2-14 — Multi-role negative authorization suite:** prove office reviewers can review without editing manager records, and Site-role users outside their assigned site scope cannot read or write manager control records. Status: schema contract coverage added; role fixtures and negative RLS behavior tests remain.
- **P2-15 — Reviewer role guard:** keep review writes invoker-rights and enforce that only Office Admin or Director can accept/reject submitted handovers without editing their content. Status: implemented in RLS and the status trigger; add fixture-based behavior tests.
- **P2-16 — Phase 2 database query path:** add covering foreign-key indexes and init-plan-safe auth checks after the Supabase advisor surfaced avoidable per-row work. Status: applied; the advisor no longer reports new Phase 2 foreign-key or auth-initplan warnings. New indexes are currently unused because these records have no sustained production workload yet.

## Definition of done

- Responsive at desktop and 390px mobile widths.
- Existing attendance, safety, readiness, telemetry and sign-off behavior remains intact.
- Hosted manager overlay persists by authorized site and work date; local review mode remains site/date isolated.
- No cross-site data is exposed.
- Work cannot enter `in progress` without six readiness checks and an assigned present crew member.
- Overdue unresolved blockers are visibly marked and remain human-escalated.
- Unit tests cover blocker ageing, attendance staffing warnings, readiness state, site/date handover persistence and workshop start gating.
- Database tests cover RLS, function privilege boundaries, work-date separation and append-only audit permissions.
- `npm run typecheck`, `npm run lint`, `npm run build`, focused browser tests and the full Supabase database suite pass before production release.
