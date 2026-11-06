# Senatla Ops v0.5.4 draft integration notes

Updated: 2026-11-06
Status: Director changes merged to `dev`; `preview` and `main` promotion pending. The v0.5.4 SEO/analytics release checklist remains open.

## Scope

This release improves the Director workspace entry experience, expands Director operational access, and makes authentication and sign-out failures visible to users.

## Director guidance and help

- First-time Director sign-in opens a mandatory, responsive walkthrough.
- Tour steps navigate to the relevant workspace route and administration tab, then scroll the target into view.
- The final step supports a per-user “Don’t show this guide again” preference.
- The shared authenticated header now provides Help and replay-tour actions.
- Director dashboard shortcuts expose People, Sites, Assets, and Asset OCR.

## Access and OCR

- The exact `thosontula@gmail.com` and `thosontula+tag@gmail.com` developer/director accounts may enter the shared administration workflows. Ordinary Directors retain oversight access without administrative writes or migration access.
- Employee, site, assignment, asset, and OCR workflows remain organization-scoped and audited for authorized accounts.
- Employee-site assignment uses a controlled server-side workflow with readiness checks and audit evidence.

## Authentication experience

- Sign-out shows an active loader and prevents duplicate requests.
- Slow or failed sign-out produces retry guidance instead of a frozen screen.
- Login HTTP failures are shown immediately in plain language with a support reference.
- Login checkbox controls now share consistent sizing, spacing, typography, and touch targets.

## Documentation

- [Director workspace guidance](director-workspace-guidance.md)
- [Responsive HTML guide](director-workspace-guidance.html)
- [Word guide](director-workspace-guidance.docx)
- [Historical costing and asset review](historical-costing-and-asset-review.md), with [responsive HTML](historical-costing-and-asset-review.html) and [Word](historical-costing-and-asset-review.docx) versions.

## Historical source review pending integration

- The costing screen now provides source-labelled historical reference rates and explicitly added direct-cost lines for asbestos, labour, equipment, materials and transport. Archived rates do not alter scenario defaults by themselves.
- Three scenario client names are marked provisional on screen and in CSV pending signed-contract verification.
- The asset readiness review flags missing and duplicate identifiers without importing historical asset or personnel records.

## Verification note

The Director access migration was applied to the linked Supabase project and focused policy and application checks passed during PR #105. Production UI deployment has not been asserted here. Historical costing references are examples only; the archived village grand-total formula is broken, and preset client names remain provisional until confirmed against contracts.
