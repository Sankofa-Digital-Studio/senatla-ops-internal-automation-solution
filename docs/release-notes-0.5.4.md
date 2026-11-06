# Senatla Ops v0.5.4 draft integration notes

Updated: 2026-11-07
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
- [Historical source audit](historical-costing-and-asset-review.md), superseded for proposal creation.
- [Director proposal templates](director-proposal-templates.md), with [responsive HTML](director-proposal-templates.html) and [Word](director-proposal-templates.docx) versions.

## Director proposal formats pending integration

- The owner clarified that historical workbooks provide layout patterns rather than figures. The new builder offers West Gold, Tau Mine, village, asbestos, civil BOQ, detailed breakdown and blank formats. Quantities, rates and percentages start empty or zero.
- Directors can add and remove sections and items, enter units, preview the spreadsheet, and download a formula-based Excel workbook or draft PDF.
- All formats start with the editable client label Harmony Gold Mines. The exact legal contract party remains subject to review.
- The prior historical costing and asset report remains available as a source audit; its rate-ingestion workflow is superseded. No asset or personnel record is imported.

## Verification note

The Director access migration was applied to the linked Supabase project and focused policy and application checks passed during PR #105. Production UI deployment has not been asserted here. The proposal format update requires its own verification before integration; archived figures are not loaded into its templates.
