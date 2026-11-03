# Changelog

All notable Senatla Ops changes are recorded here. Versions follow semantic versioning.

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

