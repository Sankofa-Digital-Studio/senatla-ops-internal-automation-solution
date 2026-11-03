# Senatla Ops v0.5.1 release notes

Date: 2026-11-03  
Release path: `dev` → `preview` → `main`  
Next-task branch: `feat/build_angular_migration_optimization` after release branches are synchronized

## Scope

This patch release completes the current authentication boundary, migration recovery, responsive journey and delivery-pipeline stabilization work.

### Authentication and user management

- Email/password only; no Google sign-in and no public registration.
- Three deterministic role accounts use the Senatla Trading domain: Site Manager, Office Admin and Director.
- `thosontula@gmail.com` is the exact permanent developer override.
- `thosontula+tag@gmail.com` is retained as an alias regression account and does not inherit override privilege.
- Provisioned users receive a temporary password and must replace it before workspace access.
- Office Administrators remain less privileged than Directors; Director creation requires eligible approval.
- Profile history supports audited rollback by profile ID.

### Database and operational history

- Corrected the profile-history tenant helper reference.
- Restored the previously empty operational issue-history migration.
- Added issue versioning, normalized immutable issue events, indexed foreign keys, tenant RLS and server-side save/transition functions.
- Updated responsive attendance fixtures to the current versioned site-day payload.

### Front end and accessibility

- Restored Capabilities and Security in-page navigation for desktop and mobile.
- Kept the cornerstone loader non-interactive.
- Aligned the local test-user dialog with the approved deterministic identities.
- Preserved the keyboard skip link while excluding its intentionally hidden state from clipping diagnostics.
- Retained evidence-lightbox keyboard, button and swipe navigation from the preceding UI bundle.

### Delivery and release health

- Dev APKs use immutable `dev-<commit>` prereleases.
- CI creates the APK-bearing release as a draft before publishing it, matching GitHub immutable-release requirements.
- `/api/download-apk` resolves the newest published dev APK and has an explicit last-known fallback.
- Release branches remain limited to `dev`, `preview` and `main`; the named Angular migration feature branch is reserved for the next task.

## Verification record

Completed locally:

- TypeScript application and specification typecheck.
- Angular lint.
- APK download contract: 5 passing tests.
- Migration and responsive defects reproduced from GitHub Actions traces and corrected at their source.

Completed release evidence:

- Release commit: `cba6b8b1eaeb258c7ba49adea7ad6e82f2a2d506`.
- GitHub `application`, `supabase`, `responsive-layout` and `native-required` gates passed for the exact release commit.
- Vercel preview and production deployments reached `READY` from the exact release baseline.
- `dev`, `preview`, `main` and the reserved next-task branch point to the same baseline.
- `preview` and `main` were fast-forwarded only after the verified preview deployment.

## Rollback

Use the prior verified release commit for application rollback. Database rollback must use a reviewed compensating migration; do not edit an applied migration or delete issue/profile history. Immutable APK releases remain available by their commit-specific tag.
