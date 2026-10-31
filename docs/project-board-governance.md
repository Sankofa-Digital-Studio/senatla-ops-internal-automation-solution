# Senatla Ops Delivery Board

The [Senatla Ops project](https://github.com/orgs/Sankofa-Digital-Studio/projects/2) is the authoritative delivery board for the internal operations control platform. It records planning, implementation, verification, client decisions, and release evidence.

## Delivery order

1. M0 Governance and Access
2. M1 Operational Foundations
3. M2 Controlled Pilot
4. M3 UAT and Release
5. M4 Reuse and Scale

## Workflow

| Status | Entry rule | Exit rule |
|---|---|---|
| Inbox | New item has not been reviewed | Scope, owner, and destination status are confirmed |
| Requirements Review | A client, security, or architecture decision is still required | The decision and its evidence are recorded |
| Ready | Scope, acceptance criteria, dependencies, owner, priority, and estimate are clear | Implementation starts |
| In Progress | An owner is actively implementing the agreed scope | Code and required evidence are ready for review |
| Code Review | A pull request is open and the application gate has run | Required review is complete and blocking comments are resolved |
| QA | Technical review is complete | Browser, database, native, deployment, and recovery checks required by the change pass |
| Client Review | The work requires operational, finance, or client acceptance | The named decision owner records approval or a rejection reason |
| Blocked | Progress needs external access, a decision, or a dependency | The blocking condition is resolved and evidence is linked |
| Done | Acceptance criteria and required evidence are complete | Closed issues remain Done as delivery history |

## Required fields

Every open implementation item must have:

- An owner.
- Priority.
- Work Type.
- Repository milestone.
- Delivery Stage.
- Risk Category.
- An estimate when the delivery boundary is known.
- A parent epic or linked outcome.
- Verifiable acceptance criteria.

Use the corrected fields Target Date, Delivery Stage, Risk Category, and Client Decision. The older custom Milestones and misspelled Client Decsion fields are legacy fields and must not receive new values.

## Issue rules

- Issues authorize work and describe the outcome, work boundary, acceptance criteria, dependencies, estimate, and evidence location.
- Broad epics remain on the board, but implementation uses smaller tasks that can be verified independently.
- Closed issues remain Done as release evidence.
- Public Senatla Trading website work is out of scope.
- Sensitive findings, credentials, personal data, OCR text, and private storage paths must not be placed in public issues.

## Pull request rules

- Integration pull requests target dev; production promotions target main.
- New pull requests enter Code Review after the application gate runs.
- A pull request moves to QA only after required review is complete.
- A merged pull request does not automatically become Done.
- Done requires the browser, database, native, deployment, rollback, UAT, or client evidence that applies to the change.

## Recommended views

- Current Delivery groups open issues and pull requests by Status.
- Roadmap groups items by repository Milestone and sorts by Priority then Target Date.
- Workstreams groups issues by bundle label.
- Release Gate shows P0 work plus QA, Client Review, Blocked, and Done items.
- Ownership groups work by Assignee.

