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

## Three-step analysis applied before Phase 2

### Step 1 — Evidence and value

Phase 1 now covers the real manager problems: fragmented status, workshop blockers, poor handover, weak work readiness, shift isolation and silent staffing failures. The build is responsive and type/build validated, but the browser test runner cannot start ChromeHeadless in the current environment.

### Step 2 — Devil's advocate

- Browser persistence is useful for continuity but is not audit evidence and can be lost when a device is shared or cleared.
- A status board can become a duplicate job-card system unless it stays a thin execution overlay.
- A start gate can block legitimate work if it treats incomplete capture as proof of unsafe conditions.
- Overdue labels without an owner or escalation path merely create dashboard anxiety.
- Attendance linkage must remain read-only; a workshop manager must not be able to rewrite the attendance register through assignment controls.

### Step 3 — Improvements accepted before Phase 2

Phase 1 now uses site/date-scoped storage, a controlled start gate, explicit overdue blocker visibility, human-owned escalation, and clear separation between local draft state and signed sync evidence. Phase 2 must add server persistence, RLS, maker-checker controls and audit contracts before expanding authority.

## Definition of done

- Responsive at desktop and 390px mobile widths.
- Existing attendance, safety, readiness, telemetry and sign-off behavior remains intact.
- Manager overlay persists by site and date and survives reload without overwriting another shift.
- No cross-site data is exposed.
- Work cannot enter `in progress` without six readiness checks and an assigned present crew member.
- Overdue unresolved blockers are visibly marked and remain human-escalated.
- Unit tests cover blocker ageing, attendance staffing warnings, readiness state and site/date handover persistence.
- `npm run typecheck`, `npm run build` and focused tests pass.
