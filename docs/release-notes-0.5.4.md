# Senatla Ops v0.5.4 release notes

Updated: 2026-11-07
Status: Promoted through `dev` and `preview` to `main`; production deployment initiated for [senatla-ops.vercel.app](https://senatla-ops.vercel.app).

## Scope

This release improves the Director workspace entry experience, expands Director operational access, adds editable proposal formats, and strengthens public web metadata, consented analytics, and protected hosted verification.

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

## Director proposal formats

- The owner clarified that historical workbooks provide layout patterns rather than figures. The new builder offers West Gold, Tau Mine, village, asbestos, civil BOQ, detailed breakdown and blank formats. Quantities, rates and percentages start empty or zero.
- Directors can add and remove sections and items, enter units, preview the spreadsheet, and download a formula-based Excel workbook or draft PDF.
- All formats start with the editable client label Harmony Gold Mines. The exact legal contract party remains subject to review.
- The prior historical costing and asset report remains available as a source audit; its rate-ingestion workflow is superseded. No asset or personnel record is imported.

## Verification note

The Director access migration was applied to the linked Supabase project and focused policy and application checks passed during PR #105. PRs #106, #107, #109, #110, #111, and #112 passed the required application, Supabase, responsive, Android, iOS, and native-required gates before promotion. The production release was promoted to `main`; archived figures are not loaded into the editable proposal templates.

## Web delivery

- Landing-only indexing is enforced with canonical metadata, `robots.txt`, and `sitemap.xml`.
- Public analytics is consented and restricted to the documented event allow-list.
- The GA4 import workbook contains blank inputs and formula-driven summaries for reviewed aggregate data.
- Hosted smoke preflight uses the Preview environment and fails closed when required credentials are unavailable.

## Production

- Production branch: `main`.
- Production target: [senatla-ops.vercel.app](https://senatla-ops.vercel.app).
- No new Vercel project was created for this release.
