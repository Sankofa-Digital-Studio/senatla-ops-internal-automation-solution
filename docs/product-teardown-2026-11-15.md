# Senatla Ops Product Teardown

## Verdict

Senatla Ops has a credible operational core. It is not merely a dashboard: the strongest idea is an evidence-backed operating heartbeat that connects field activity, office controls, and director decisions. The application is viable for a controlled internal rollout if the team protects that core from demo residue, workflow sprawl, and unproven assumptions about adoption.

The adversarial conclusion is equally clear: the product currently asks users to trust a lot of machinery before showing them the shortest path to a safe, complete action. The next pass should deepen proof and recovery, not add more modules.

## The diamonds

| Diamond | Why it matters | How to polish it |
| --- | --- | --- |
| Evidence before commitment | OCR, approvals, audit events, and source-backed metrics create defensible records instead of attractive numbers. | Make every high-risk decision show its evidence state, owner, timestamp, and next action in one compact view. |
| Role-specific lanes | Site, office, and director workspaces reflect different responsibilities without pretending one screen fits everyone. | Add a visible “next best action” and completion definition to each role’s landing state. |
| Operational heartbeat | Attendance, safety, assets, approvals, and costs are connected into one operating picture. | Give the heartbeat a single freshness indicator: last source update, stale areas, and unresolved exceptions. |
| Accountable handovers | Custody, approvals, onboarding, and synchronization preserve who acted and what changed. | Turn handover history into a reusable timeline component across assets, requests, and payroll controls. |
| Deliberate product boundary | Deferred AI, telematics, and multi-company interfaces reduce premature complexity. | Keep a public “not in scope yet” register so feature pressure does not quietly dilute the core promise. |
| Local-first review discipline | The app can be reviewed without fabricating live records, while hosted mode is required to use Supabase. | Keep local fixtures unmistakably labelled and make it impossible to confuse review data with operational data. |

## Devil’s advocate findings

### 1. The product can feel like a platform before it feels like a tool

The capability surface is broad: workforce, issues, payroll, vendors, assets, OCR, costing, proposals, dashboards, and native foundations. A new user may understand the architecture but still not know what to do in the first five minutes.

Decision: do not add another top-level module. Make each role’s first screen answer three questions: what is incomplete, what is urgent, and what can I safely finish now?

### 2. Demo data is a trust hazard

The code deliberately keeps hosted mode from loading local or demonstration records, which is good. However, demo-shaped identifiers and mock recovery paths remain visible in local services. That is acceptable for development but dangerous if any test affordance, fixture label, or local fallback leaks into a customer walkthrough.

Decision: keep fixtures, but put them behind an explicit “Local review data” boundary and add a release assertion that hosted bundles contain no local test-user affordance.

### 3. Auditability is stronger than discoverability

The system records accountable history, but the user experience does not always make that proof the centre of the decision. Audit data that is technically present but hidden behind a tab does not prevent bad decisions under pressure.

Decision: expose evidence status and provenance at the point of approval, export, sync, and asset commitment.

### 4. Offline recovery is a promise that needs operational proof

The offline banner, queue, and sync history are strong foundations. The risk is that a field user may not know whether a record is safely queued, rejected, duplicated, or fully committed.

Decision: use plain-language states: Saved on this device, Waiting to sync, Synced to Senatla Ops, or Needs attention. Include the last retry and the recovery action.

### 5. The public landing page explains responsibility better than value proof

The page communicates roles and assurance well. It is lighter on measurable outcomes, such as fewer unresolved exceptions, faster payroll reconciliation, or clearer asset readiness.

Decision: add proof only when it can be sourced from real customer evidence. Until then, keep claims operational and avoid invented percentages.

## What was polished in this pass

- The public header now says “Sign in” beside the familiar arrow icon. A cryptic icon-only control was a preventable discovery failure.
- The “Explore platform” control is now a real button instead of a clickable `div`, so keyboard users receive native activation and focus behaviour.
- The landing component test was updated to protect both improvements.

## Priority sequence

1. Make role home screens action-oriented: incomplete, urgent, and safe next action.
2. Standardise evidence/provenance summaries across approval and commitment flows.
3. Make sync states explicit and recoverable in field workflows.
4. Add hosted-build checks that reject local-only review affordances.
5. Validate adoption with three deterministic role journeys before expanding scope.

## Release evidence

- Lint passed.
- Application, specification, and API type-checks passed.
- Production build passed.
- The browser unit runner reached Chrome startup but did not complete during this audit window; this is an environment verification gap, not evidence of a product failure.

## Bottom line

The diamond is not “all operations in one app.” The diamond is a trustworthy chain from work performed to evidence captured to decision made. Polish that chain until every role can see the next safe action and prove what happened afterward.
