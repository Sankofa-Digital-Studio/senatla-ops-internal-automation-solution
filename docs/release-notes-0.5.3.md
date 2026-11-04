# Senatla Ops v0.5.3 release notes

Date: 2026-11-04  
Release path: `dev` → `preview` → `main`  
Application commit: `a689c2229500a5ee93f2aba5822f70de87fc8e53`  
Release-record commit: identified by the `v0.5.3` tag

## Scope

This release completes the actual-only Director operations workspace, removes the remaining dormant Gmail OAuth implementation, and adds an authenticated Director responsive journey. It does not change the database schema.

## Director operations review

- Places the actionable Director review queue before reporting controls and supporting evidence.
- Groups content as review queue, period and actuals, recognized operating costs, workforce, risks and invoice traceability.
- Limits headline indicators to attendance, pending decisions, recognized operating cost and asset readiness.
- Removes unsupported margin certainty, margin target, fleet-scaling, zero-harm and time-saved claims.
- Stops generating or attaching synthetic executive-advantage values to new report packs and approval requests.
- Preserves the costing workspace entry point and values owned by the cost-attribution service.
- Uses document-level vertical scrolling to reduce nested-scroll fatigue and viewport movement.

## Accessibility and authentication

- Director report dialogs now expose dialog semantics, trap focus, close with Escape and restore focus to the invoking control.
- Decision feedback uses a polite atomic live region and the dismiss control has an accessible name and touch target.
- Period controls expose their selected state and remain keyboard reachable.
- Dormant Gmail OAuth service and communications component source were deleted. Operational authentication remains provisioned email/password only.

## Verification record

Application commit `a689c2229500a5ee93f2aba5822f70de87fc8e53` passed:

- Local type checking, lint, production build and 19 focused Director/Office Admin browser tests.
- Full application verification and Angular unit suite.
- Supabase migration reset and pgTAP contracts.
- Authenticated responsive Playwright journeys across mobile, tablet, mini-PC, laptop, desktop and TV viewports.
- Android debug build, synchronization and APK publication.
- iOS simulator build and synchronization.

Evidence:

- Quality CI: <https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/runs/41799982440>
- Native CI: <https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/runs/41799982259>
- Preview: <https://senatla-ei8lahy85-ohhttooexcivs-projects.vercel.app>
- Production artifact: <https://senatla-5u8m4ygmw-ohhttooexcivs-projects.vercel.app>
- Production alias: <https://senatla-ops.vercel.app>

## Database and migration impact

No database migration is included. Existing row-level security, profile history, role boundaries and approval records are unchanged. Older locally retained Director reports may still contain deprecated extra properties, but the application no longer displays, generates or forwards them.

## Operational limitation

The production Supabase project remains paused because the account already has two active free-plan projects. Application deployment is healthy, but production authentication and physical UAT require pausing one of those active projects before the production project can be restored. No paid-plan upgrade was requested or performed.

## Rollback

The preceding verified release is tag `v0.5.2`. Because v0.5.3 has no database migration, application rollback requires only redeploying that tag. Immutable APK releases remain available through commit-specific dev tags.
