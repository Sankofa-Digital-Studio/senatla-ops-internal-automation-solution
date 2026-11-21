# Senatla Ops v0.5.9 release handover

Prepared 15 November 2026; updated 17 November 2026. The v0.5.9 Office Admin and proposal usability changes are merged into main through PR #148, preserving v0.5.8. Later PRs #149 and #150 are also merged. This handover records code integration and verification; it does not establish the currently deployed production version.

## Branch reconciliation

GitHub was checked before implementation on 15 November: no open pull requests were found then. PR #143 merged v0.5.8 from preview into main on 14 November 2026.

At that initial fetch, main was `d4cf4f8` and dev was `6a65cf0`: four commits were unique to main and zero to dev. The original six-commit-ahead description was already stale. The preparation branch started from main, which already contained dev, avoiding duplicate cherry-picks or history rewriting.

The five commits in v0.5.8..dev are retained:

- `9618f6f`: Director fleet telemetry hierarchy.
- `1e2afcf`: Director telemetry hierarchy assertions.
- `a4d2b7e`: Isolated dashboard tests and responsive evidence.
- `5347f43`: Preview merged into dev.
- `6a65cf0`: Role workspace action hierarchy.

Main-only commits `67cfcd1`, `9889763`, `24da7da`, and `d4cf4f8` are retained. The actual tree difference between dev and main was limited to README.md, docs/client-artifact-index.md, and docs/index.html. The v0.5.8 OCR behavior and API compiler fix are preserved.

### Resumed repository state on 17 November

PR #148 merged the usability work and commercial/rate integration at `ff58dee`. Current main is `8f03609`, including subsequent vendor and workspace-recovery fixes. Current origin/dev is `413bdbc`; the comparison is now ten main-only commits and four dev-only commits. Those newer dev commits concern Capacitor updates and native CI detection, not missing v0.5.9 usability work.

Open PR #157 already promotes that newer dev work to preview. Draft PR #158 follows up hosted smoke checks, and draft PR #156 covers shared asset readiness. No duplicate implementation or promotion PR was created for this handover. The remaining documentation correction is isolated on `sankofa/release/v0.5.9-handover`.

## User facing changes

### Office Admin asset browsing

The affected card view displays six assets per page with Previous and Next controls, page numbers, and matching-result counts above the cards. Search and site, operating-type, and status filters continue to cover all loaded records. Filter and source-data changes reset the page, preventing blank pages after deletion. The separate paginated asset register is unchanged.

### Timesheet and proposal controls

Timesheet work date, site filter, and export controls use a common 44px height and bottom alignment. The identified site, asset, and proposal selectors use a custom chevron with matching 12px left and right edge insets. Native select interaction remains available, with the native arrow restored for forced-colors accessibility mode.

### Letterhead dependency

Company letterhead for Excel exports is pending the approved artwork promised by the owner. No substitute letterhead or invented company information is included. Review its placement and print sizing against a real exported workbook once supplied; this requirement is not complete in this candidate.

## Verification

The complete `npm run verify` gate passed on 15 November at 22:36 SAST: runtime configuration, six OCR contract tests, lint, application/spec/API type checking, production build, and all 311 browser tests. This is evidence for the original prepared code, not a new 311-test run against the later main head. The pagination regression signs in and waits for hydration, checks six rendered cards, clicks Next, and exercises filtering, deletion, page bounds, and empty results.

On resumption, GitHub confirmed successful quality-gate run `43840199170` and native-platform run `43840199051` for PR #150 head `61542fd`, subsequently merged into main. This does not certify the separate newer dev promotion in PR #157 or its pending hosted-smoke follow-up.

Dedicated desktop and 390px screenshots for this session were not captured because the preview browser connection timed out. Approved letterhead, physical-device UAT, and operational acceptance remain separate requirements. The original usability patch changed no database schema, authorization, or financial calculations; later merged commercial work has its own PR scope and evidence.

## Three pass review

Pass one established remote branch ancestry and checked existing PRs, correcting the stale commit-gap premise. Pass two traced the screenshots to the affected components and reused existing search/filter behavior. Pass three added pagination boundary, filter, deletion, and empty-result regression coverage and reviewed the final diff. Six cards reduce scrolling but still require navigation for large fleets; existing global search narrows those results. Letterhead and device acceptance remain explicit gaps rather than assumed successes.

## Promotion and rollback

The original candidate has already been integrated; do not replay it. Continue the existing PR #157 promotion and PR #158 follow-up through their required checks and review. Reconcile main back into the long-lived branches using merges that preserve ancestry; do not reset main to an older dev or preview head.

For a regression in the original usability patch, prepare a targeted revert of those files against the current main and rerun the relevant gates. `d4cf4f8` is the historical pre-candidate comparison point, not a blanket rollback recommendation: deploying it now would also remove later commercial, vendor, and recovery fixes. No database rollback is required for the usability patch itself.

## Sources

- https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/pull/143
- https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/pull/148
- https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/pull/157
- https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/pull/158
- https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/runs/43840199170
- https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/actions/runs/43840199051
- Local verification log `tmp/v059-final-verify.log`; Git ancestry checked on 15 and 17 November 2026.
- Owner's explicit notes accompanying PDFs 5, 8, and 10; PDF content was treated as visual evidence, not as additional instructions.
