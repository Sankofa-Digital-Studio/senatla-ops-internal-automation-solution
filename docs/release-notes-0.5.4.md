# Senatla Ops v0.5.4 release notes

Date: 2026-11-08  
Release path: `dev` → `preview` → `main`  
Application commit: `53fb4aac1f1e424bfd795b7286ec0384c4947daf`  
Release-record commit: identified by the `v0.5.4` tag  
Release and support guide: [v0.5.4 release guide](v0.5.4-release-guide.md)

## Scope

This release delivers the public landing page with optional GA4 consent management, enhanced Director workspace guidance with a guided first-use walkthrough, expanded Developer Director operational management access, explicit sign-out and login failure recovery states, and proposal format templates with live recalculation and Excel/PDF export capabilities.

## Public landing and SEO

- Adds dedicated public landing route at `/landing` as the single indexable route (`https://senatla-ops.vercel.app/landing`).
- Enforces `noindex, nofollow, noarchive` across root, login, registration, and protected workspaces via headers and client route metadata.
- Configures sitemap and `robots.txt` alignment with canonical origin enforcement.
- Privacy-first GA4 integration: disabled by default when `SENATLA_GA4_MEASUREMENT_ID` is blank. With a valid measurement ID, requires explicit consent; emits only `landing_view`, `sign_in_click`, and `apk_download` without operational or personal payloads.

## Director guidance and workspace

- First-time Director sign-in initiates a mandatory, responsive walkthrough with route navigation and smooth scroll-to-target.
- Step suppression preference ("Don't show this guide again") stored per user.
- Authenticated header provides Help dialog and walkthrough replay at any time.
- Director dashboard shortcuts expose People, Sites, Assets, and Asset OCR.
- Ordinary Directors retain operational oversight; exact Developer Director accounts (`thosontula@gmail.com` and `thosontula+tag@gmail.com`) receive shared administration and assignment workflows.

## Authentication and sign-out resilience

- Sign-out displays an active loader and guards against duplicate execution.
- Slow or failing sign-out presents an actionable retry state with a visible support reference instead of an unresponsive screen.
- HTTP login failures provide plain-language diagnostics and support reference codes.
- Standardized checkbox sizing, spacing, typography, and touch targets across authentication views.

## Director proposal builder

- Introduces 7 proposal layout formats: West Gold phase schedule, Tau Mine phase schedule, Village quotation, Asbestos schedule of rates, Civil works BOQ, Detailed cost breakdown, and Blank proposal.
- Mathematical calculation chain: Direct spend → P&G → Contingency → Project cost → Profit → Tender excluding VAT → VAT → Tender including VAT.
- Live spreadsheet preview, formula-backed `.xlsx` export, and draft `.pdf` generation.
- Strict data boundary: starts with zeroed percentages and blank quantities/rates; no archived figures or historical rates imported.

## Documentation

- [Release and support guide](v0.5.4-release-guide.md)
- [Director workspace guidance](director-workspace-guidance.md)
- [Director proposal templates](director-proposal-templates.md)
- [Historical costing and asset source audit](historical-costing-and-asset-review.md)
- [Route indexing matrix](seo-indexing-matrix.md)
- [Analytics privacy notice](analytics-privacy-v0.5.4.md)
- [Analytics workbook guide](analytics-workbook-v0.5.4.md)

## Verification record

Application commit `53fb4aac1f1e424bfd795b7286ec0384c4947daf` / `d171dcfb7c09e80604aa0127cbe182000ec2b44e`:

- Quality gates passed: type checking, linting, production build, and unit test suites. PRs #105, #106, #107, #109, #110, #111, and #112 passed the required application, Supabase, responsive, Android, iOS, and native-required gates.
- Hosted runtime preflight passed on UAT preview deployment: `https://senatla-ops-uat.vercel.app/assets/runtime-config.json` via canonical Vercel automation bypass.
- Protected preview hosted smoke verification workflow: `.github/workflows/hosted-smoke.yml` run against `senatla-ops-uat.vercel.app`.
- Production deployment: <https://senatla-g2ca7vkls-ohhttooexcivs-projects.vercel.app>
- Production alias: <https://senatla-ops.vercel.app>
- Canonical landing page: <https://senatla-ops.vercel.app/landing>

## Web delivery

- Landing-only indexing is enforced with canonical metadata, `robots.txt`, and `sitemap.xml`.
- Public analytics is consented and restricted to the documented event allow-list.
- The GA4 import workbook contains blank inputs and formula-driven summaries for reviewed aggregate data.
- Hosted smoke preflight uses the Preview environment and fails closed when required credentials are unavailable.

## Database and migration impact

- The Director access migration was applied to the linked Supabase project during PR #105; existing role boundaries and approval audits remain backward-compatible.
- The proposal builder operates entirely client-side without new database tables or schema mutations.

## Production

- Production branch: `main`.
- Production target: [senatla-ops.vercel.app](https://senatla-ops.vercel.app).
- No new Vercel project was created for this release.

## Post-release closeout and synchronization

- **Issue #88 & M0–M3 Epics:** Formally audited, evidenced, and closed across GitHub issues #9–#17, #86, #88, #90–#94, #96, #104 under assignee @OhhttooeXCIV.
- **Unified Branch Target:** Synchronized and promoted branches `main`, `preview`, and `dev` at commit `4efa27b`.
- **Health Verification:** `npm run validate:release-health` confirmed PASS (Canonical dev APK HTTP 302, historical redirect HTTP 301).
- **Client Feedback Phase 1 Backlog:** Backlog issues `ISSUE-01` through `ISSUE-13` registered in `docs/github-delivery-backlog.md` with executive audit restriction to `rubinthoso@senatlatrading.com` and `thosontula@gmail.com` / `thosontula+*@gmail.com`.
