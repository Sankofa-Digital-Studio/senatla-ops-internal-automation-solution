# Senatla Ops v0.5.2 release notes

Date: 2026-11-04  
Release path: `dev` → `preview` → `main`  
Application commit: `7c93a5b0db372637f494daf4589c2b70ebfbbf9b`  
Release-record commit: identified by the `v0.5.2` tag

## Scope

This patch release restores quotation accuracy, introduces the first dedicated costing workspace, stabilizes page scrolling, and completes the Angular build-system migration without changing the database schema.

## Costing and quotation controls

- Added a pure calculation engine and responsive Director costing workspace.
- Added typed phase-level category applicability for site establishment, steel dismantling, concrete breakup, rubble haulage, and shaping or levelling.
- Categories remain enabled when applicability is unspecified, preserving existing general costing behavior.
- The village quotation includes site establishment, steel dismantling and rubble haulage.
- Concrete breakup and shaping or levelling are excluded from that quotation.
- The approved village baseline now reconciles to **R2,077,960**, correcting the previous R5,635,820 result.

## Front-end and build stability

- Restored native vertical scrolling while clipping unintended horizontal overflow in the application shell.
- Corrected landing-page mouse-wheel scrolling, icon-only sign-in presentation, hero viewport alignment and chevron positioning.
- Migrated application builds to `@angular/build` and enabled reusable Angular CI caching.
- Removed obsolete Ionic build packages no longer used by the application.
- Replaced the removed Angular `disable-host-check` setting with Vite-compatible `allowedHosts` configuration.

## Verification record

Application commit `7c93a5b0db372637f494daf4589c2b70ebfbbf9b` passed:

- Application verification, lint, type checking and unit tests.
- Supabase migration and pgTAP contracts.
- Responsive Playwright journeys.
- Android debug build, synchronization and APK publication.
- iOS simulator build and synchronization.

Evidence:

- Quality CI: <https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/runs/41773590086>
- Native CI: <https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/runs/41773590126>
- Preview: <https://senatla-fnmnosqqr-ohhttooexcivs-projects.vercel.app>
- Production artifact: <https://senatla-cemjh8aln-ohhttooexcivs-projects.vercel.app>
- Production alias: <https://senatla-ops.vercel.app>

At promotion, `dev`, `preview`, and `main` all referenced the exact application commit. The later documentation commit changes release metadata only and is identified by the `v0.5.2` tag; it is not represented as a different tested application artifact.

## Database and migration impact

No database migration is included. Existing Supabase schema, row-level security policies and retained profile or issue history remain unchanged.

## Known limitations

- Director margin, fleet, safety and time-saved cards still require reconciliation to source-backed actuals; issues #92 and #14 remain the owning records.
- Office Admin and Site Manager scroll-fatigue redesigns remain separate delivery bundles.
- Public SEO, consented GA4 and the GA4 import workbook are not part of this release.
- The currently deployed project uses `senatla-ops.vercel.app`; the future public canonical-origin decision remains part of the SEO checkpoint.

## Rollback

The immediately preceding verified application baseline is `cdb771513a8d963c3d9ae73d654c8dba3816855e`. It contains the corrected R2,077,960 quotation and passed the full quality and native gates before the build-system migration. Use that commit for application rollback if the Angular build migration causes a production regression.

For a full release rollback to v0.5.1, use tag `v0.5.1` at `131fcbd`. No database rollback is required for v0.5.2 because this release contains no schema change. Immutable APK releases remain available by commit-specific dev tags.
