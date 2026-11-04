# Changelog

All notable Senatla Ops changes are recorded here. Versions follow semantic versioning.

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

