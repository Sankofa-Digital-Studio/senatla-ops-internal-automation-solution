# Changelog

All notable Senatla Ops changes are recorded here. Versions follow semantic versioning.

## [Unreleased]

## [0.5.6] - 2026-11-12

Director-flow usability and evidence association patch release.

### Added

- Unified Director decision summary for operational packs, approvals, and linked pending invoices.
- Data-freshness state beside the Director source timestamp.
- Direct navigation from approval, asset-readiness, cost, invoice, and operational-risk indicators to the responsible review tab.
- Director-flow component coverage for decision summary and cross-section navigation.

### Verification

- `npm run typecheck` passed.
- `npm run build` passed.
- `npm run lint` passed.
- Targeted Karma execution was attempted but stalled during local browser launch; hosted CI remains authoritative for browser verification.

## [0.5.5] - 2026-11-09

Multi-domain operational dashboards, Site Manager guided workflow overhaul, field telemetry & security dwell timer, Office Admin modularization, reusable ERP UI library, and asset payload optimization.

### Added

- **Multi-Domain Operational Dashboards (`ISSUE-03`, `ISSUE-04`, `ISSUE-05`):**
  - Interactive domain navigation switcher (`app-domain-navigation-switcher`) supporting Overall Macro Scope, Engineering, Demolition & Rehabilitation, and Underground Works.
  - Engineering 70:30 Profit Split Dashboard: Gross recognized revenue minus audited expenses (materials, direct labour, absorbed overheads) with 70% Senatla operational share and 30% shareholder distribution pool.
  - Anti-Inflation Expense Lock (`TASK-03.2`): Enforces that dividends cannot be declared if unbilled vendor orders or open material draws remain unassigned.
  - Workshops 1–3 activity status (Boilermaking, Train Wheels, Assembly) with monthly overhead absorption.
  - Harmony Gold client P/O parent-child pipeline tracking (`P/O → Quote → Invoice → Job Card`).
  - Demolition & Rehabilitation Dashboard: Tracking West Gold, Tau Mine, and Mine Villages contracts with phase progress, BOQ margins, salvage credits (781 t steel, 29.8 t copper, 6,030 m³ rubble), and environmental clearance scores.
  - Overall Macro Scope Dashboard: Consolidated executive P&L rollup (R 12.62M revenue, R 4.38M net profit, 34.7% margin), free cash flow working capital, fleet telemetry, and cross-domain friction radar.
  - Underground Works Dashboard: Executive standby notice and standby shaft blueprints (Shafts 1, 3, 5).
  - Dedicated `/dashboards` route and embedding in Director Workspace and Office Admin.
- **Site Manager Shift Flow Overhaul:**
  - 5-step operational workflow sequence: Site Setup & Live Readiness, Toolbox Safety Protocol, Attendance Register & Roll-Call, Field Operations & Telemetry, and Shift Review with canvas digital sign-off.
  - Machinery fuel telemetry (hourly burn rate for heavy equipment vs odometer km for light vehicles, `ISSUE-11`).
  - Equipment breakdown and downtime logging triggering maintenance job cards (`ISSUE-10`).
  - 2.5-minute security dwell timer for scrap and salvage gate clearance (`ISSUE-12`).
- **Office Admin Sub-Feature Modularization:**
  - Monolithic template refactored into 8 discrete sub-features (`admin-overview`, `admin-users`, `admin-workforce`, `admin-timesheets`, `admin-sites`, `admin-issues`, `admin-vendors`, `admin-governance`) lazy-loaded via Angular `@defer (on idle)`.
  - Initial office-admin bundle chunk size reduced by 47.6% (162 kB to 84.9 kB).
- **Reusable ERP UI Library:**
  - Standalone UI primitives under `src/app/components/erp/`: `ErpDataTable`, `ErpStatCard`, `ErpStatusBadge`, `ErpFilterToolbar`, `ErpWorkflowStepper`, `ErpModal`, and `ErpExportTrigger`.
  - Dual export architecture: In-browser `ErpExportService` and serverless `api/export/batch.ts`.
- **Payload & Asset Optimization:**
  - Static images compressed, shedding >4.3 MB of asset payload.

### Changed

- Updated `ErpStatusBadgeComponent` with backward-compatible status inputs and automatic variant mapping across operational statuses.
- Bumped project version to `0.5.5` in `package.json`, `package-lock.json`, and `metadata.json`.

## [0.5.4] - 2026-11-07

Director guidance, source-backed costing, proposal templates, landing-page SEO, consented analytics, and protected hosted smoke preflight are integrated and promoted through `dev`, `preview`, and `main`.

### Added

- Added a mandatory Director workspace walkthrough with route navigation, responsive target scrolling, completion tracking, and a per-user “Don’t show this guide again” preference.
- Added shared Help, replay-tour, Director management shortcuts, and plain-language troubleshooting guidance.
- Added bounded sign-out loading and retry feedback plus visible login error handling for failed HTTP responses.
- Added shared employee, site, assignment, asset, and OCR workflows for the two named developer/director accounts. Ordinary Directors retain oversight access without administrative writes.
- Added source-labelled historical cost references and explicit additional direct-cost lines to the Director costing model. Preset client names remain provisional pending contract verification.
- Replaced the historical-rate costing screen with seven editable proposal formats. Templates load section labels and units only; the Director enters all quantities, rates and percentages, previews the sheet, and downloads formula-based Excel or draft PDF files.

### Documentation

- Added Director workspace guidance in Markdown, responsive HTML, and Word formats.
- Added a Director proposal template guide in Markdown, responsive HTML, and Word formats.

### Web delivery

- Added landing-only indexing, canonical metadata, `robots.txt`, and `sitemap.xml` coverage.
- Added a consented public analytics allow-list with three application events and privacy notes.
- Added a formula-driven GA4 import workbook with blank input cells and documented formulas.
- Added a protected hosted-smoke preflight that fails closed when preview credentials are unavailable.

### Delivery

- Promoted the verified release through `dev` and `preview` to `main`.
- Application, Supabase, responsive, Android, iOS, and native-required gates passed during promotion.
- Production deployment target: [senatla-ops.vercel.app](https://senatla-ops.vercel.app).

## [0.5.3] - 2026-11-04

### Changed

- The Director workspace now starts with the actionable review queue, then period controls, actual operating costs, workforce, risks and invoice evidence.
- Director indicators are limited to recorded attendance, pending decisions, recognized operating cost and asset readiness.
- Director report dialogs trap focus, close with Escape, restore focus and announce decision feedback.
- Responsive tests now exercise the authenticated Director journey across all six supported viewport profiles.

### Removed

- Unsupported margin, fleet, zero-harm and time-saved claims from the Director UI, report model, generator and approval payload.
- Dormant Gmail OAuth source and the unreachable Gmail communications component; application access remains email/password only.
- The Director page's nested vertical scroll container.

### Fixed

- Responsive test configuration now uses the repository-pinned Supabase CLI instead of downloading a stale CLI version during local discovery.
- Restored first-time recovery-PIN enrollment by applying the missing production history-table migration; first PINs now return available instead of blocking forced password replacement.
- Restricted recovery PIN digests to server-side access only; anonymous and authenticated clients have no table privileges.

### Delivery

- Application, Supabase, responsive, Android and iOS gates passed for application commit `a689c2229500a5ee93f2aba5822f70de87fc8e53`.
- Preview and production deployments reached `READY`; no database migration was required.
- Post-release verification confirmed production Supabase project `btdavpeyxtirtshovjdu` active and healthy on the free plan; a forced-password-change Director alias was provisioned for physical UAT without modifying the permanent developer account.
- Hotfix verification passed recovery-PIN and password-completion contracts, lint, type checking, production build, production schema/RLS checks, and a live first-PIN availability request. The local Chrome process failed to attach to Karma; CI remains the authoritative browser gate.

## [0.5.2] - 2026-11-04

### Added

- A typed costing engine and Director costing workspace with phase-level quantities, category rates, responsive results and calculation tests.
- Optional per-phase cost-category applicability; unspecified categories remain enabled to preserve general costing behavior.

### Changed

- The approved village quotation includes site establishment, steel dismantling and rubble haulage while excluding concrete breakup and shaping.
- Angular builds now use `@angular/build`, universal CI caching and the Vite development server host allow-list option.
- The application shell uses native vertical scrolling and clipped horizontal overflow to reduce nested-scroll viewport movement.

### Fixed

- The approved village quotation now reconciles to R2,077,960 instead of the incorrect R5,635,820 calculation.
- Responsive CI starts successfully with the Angular Vite builder instead of passing the removed `disable-host-check` option.
- Landing-page wheel scrolling, icon-only sign-in presentation and hero viewport alignment.

### Delivery

- Application, Supabase, responsive, Android and iOS gates passed for application commit `7c93a5b0db372637f494daf4589c2b70ebfbbf9b`.
- Preview and production deployments reached `READY`; no database migration was required.

## [0.5.1] - 2026-11-03

### Added

- Deterministic Site Manager, Office Admin and Director test identities on `@senatlatrading.com`, plus exact-developer and non-elevated Gmail-alias coverage.
- Normalized operational issue history with tenant-scoped read policies, immutable event records and audited save/transition functions.
- A stable APK download resolver for commit-specific immutable GitHub prereleases.

### Changed

- Local test-user guidance now matches the five approved deterministic identities.
- Attendance delivery fixtures now satisfy the versioned site-day contract.
- Landing navigation restores semantic Capabilities and Security destinations on desktop and mobile.
- Native publishing creates a draft with its APK before publishing the immutable prerelease.

### Fixed

- Profile-history migration tenant helper resolution.
- Office Admin workspace fallback caused by missing issue-history schema.
- Responsive queue checks across mobile, tablet, laptop, mini-PC, desktop and TV viewports.
- Recovery-mode instruction test initialization and intentional skip-link clipping detection.

### Security

- Email/password remains the only interactive authentication flow.
- Standard access is restricted to provisioned `@senatlatrading.com` accounts.
- Only the exact normalized `thosontula@gmail.com` identity receives the permanent developer override; plus aliases remain ordinary accounts.

