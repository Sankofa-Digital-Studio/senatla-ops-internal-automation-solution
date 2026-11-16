# Senatla Ops v0.5.9 release candidate

Prepared 15 November 2026. This candidate preserves the merged v0.5.8 release and addresses the supplied Office Admin and proposal usability feedback. Production promotion has not been performed.

## Branch reconciliation

GitHub was checked before implementation: no open pull requests were found. PR #143 merged v0.5.8 from preview into main on 14 November 2026.

After fetching origin, main was `d4cf4f8` and dev was `6a65cf0`. The actual comparison was four commits unique to main and zero unique to dev. The earlier six-commit-ahead description no longer matches the repository. The release branch `sankofa/release/v0.5.9` starts from main, which already contains dev, so no cherry-picks or history rewriting are required.

The five commits in v0.5.8..dev are retained:

- `9618f6f`: Director fleet telemetry hierarchy.
- `1e2afcf`: Director telemetry hierarchy assertions.
- `a4d2b7e`: Isolated dashboard tests and responsive evidence.
- `5347f43`: Preview merged into dev.
- `6a65cf0`: Role workspace action hierarchy.

Main-only commits `67cfcd1`, `9889763`, `24da7da`, and `d4cf4f8` are retained. The actual tree difference between dev and main was limited to README.md, docs/client-artifact-index.md, and docs/index.html. The v0.5.8 OCR behavior and API compiler fix are preserved.

## User facing changes

### Office Admin asset browsing

The affected card view displays six assets per page with Previous and Next controls, page numbers, and matching-result counts above the cards. Search and site, operating-type, and status filters continue to cover all loaded records. Filter and source-data changes reset the page, preventing blank pages after deletion. The separate paginated asset register is unchanged.

### Timesheet and proposal controls

Timesheet work date, site filter, and export controls use a common 44px height and bottom alignment. The identified site, asset, and proposal selectors use a custom chevron with matching 12px left and right edge insets. Native select interaction remains available, with the native arrow restored for forced-colors accessibility mode.

### Letterhead dependency

Company letterhead for Excel exports is pending the approved artwork promised by the owner. No substitute letterhead or invented company information is included. Review its placement and print sizing against a real exported workbook once supplied; this requirement is not complete in this candidate.

## Verification

Type checking (application, specs, and API), lint, production build, OCR contracts (6 tests), and runtime configuration checks passed. The focused component run passed 22 tests. A subsequent expanded pagination rendering test exposed missing authentication in its fixture; the fixture now signs in and waits for hydration before checking the cards and clicking Next. The complete release gate is being rerun after that correction.

Desktop and 390px application screenshots remain pending because the local preview browser connection timed out. Hosted responsive, Android, iOS, and operational acceptance remain promotion gates. No database schema, authorization, or financial calculation change is included.

## Three pass review

Pass one established remote branch ancestry and checked existing PRs, correcting the stale commit-gap premise. Pass two traced the screenshots to the affected components and reused existing search/filter behavior. Pass three added pagination boundary, filter, deletion, and empty-result regression coverage and reviewed the final diff. Six cards reduce scrolling but still require navigation for large fleets; existing global search narrows those results. Letterhead and device acceptance remain explicit gaps rather than assumed successes.

## Promotion and rollback

Integrate this candidate into dev with a fast-forward or merge commit so the main ancestry is retained; do not squash the branch reconciliation. Validate preview using the existing pipeline, and promote only after required checks, separate CODEOWNER review, and acceptance pass. Do not reset main to the older dev head. The candidate includes main as an ancestor, preserving the already released changes. Roll back by reverting the candidate commit or redeploying the pre-candidate main commit `d4cf4f8`; no database rollback is required.

## Sources

- https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/pull/143
- Local and fetched Git ancestry on 15 November 2026.
- Owner's explicit notes accompanying PDFs 5, 8, and 10; PDF content was treated as visual evidence, not as additional instructions.
