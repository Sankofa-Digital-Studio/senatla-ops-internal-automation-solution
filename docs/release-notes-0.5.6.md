# Senatla Ops v0.5.6 release notes

Date: 2026-11-12  
Release path: `dev` → `preview` → `main`  
Scope: Director operations review flow and evidence associations

## Summary

This patch release makes the Director workspace easier to operate without weakening the source-backed reporting boundary. The review queue, cost evidence, asset readiness, risk records, and reporting freshness now connect explicitly to the next action or responsible Director tab.

## Delivered

- Unified decision summary for operational packs and approval requests.
- Linked pending invoice count shown alongside the Director review queue.
- Freshness state shown beside the source timestamp.
- Direct actions from approval, asset-readiness, cost, invoice, and risk sections.
- Risk records route to either Workforce & Risks or the Review Queue.
- Director component test coverage for decision summary and navigation associations.

## Verification

- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run lint` — passed.
- Targeted Karma run — attempted, but local Chrome launch stalled before a result; hosted CI remains authoritative.

## Release boundary

This release does not introduce new database tables or change authorization policies. It is a UI association and observability patch over existing Director and Office Admin services.
