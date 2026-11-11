# Director flow v0.5.6

## Purpose

The Director workspace is an evidence-review surface. Every prominent number or risk should lead to the records and decision surface that explains it.

## Flow associations

| Surface | Association | Director action |
|---|---|---|
| Pending approvals | Packs and approval requests are summarized together | Open Review Queue |
| Asset readiness | Attention and blocked counts connect to operational risks | Inspect Workforce & Risks |
| Recognized operating costs | Cost totals sit beside invoice traceability | Review Costs & Invoices |
| Invoice traceability | Pending invoice count is surfaced in the decision summary | Reconcile before sign-off |
| Operational risks | Failed integrations route to review; asset risks route to workforce | Open the responsible tab |

## Evidence boundary

The page continues to display source-backed values only. Freshness is explicit, provisional labour remains distinct from recognized cost, and UI navigation does not replace server-side authorization or database policies.

## Verification record

- TypeScript compilation: passed.
- Production build: passed.
- Lint: passed.
- Local targeted Karma execution: stalled during browser launch; CI/hosted smoke must provide the browser evidence before production sign-off.
