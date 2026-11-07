# GA4 analytics workbook — v0.5.4

The accompanying `analytics-workbook-v0.5.4.xlsx` is a blank import template. It contains formulas, formatting, and no historical, estimated, or sample results.

## Import actual GA4 results

1. In GA4 Explore, export a table with **Date**, **Event name**, and **Event count** as CSV. Use the same reporting period and timezone for all rows.
2. Paste only the three corresponding value columns into **GA4 Import**, starting at cell A5. Keep dates in `YYYYMMDD` form, event names exactly as emitted, and counts numeric.
3. Review **Overview**. The three allowed events are `landing_view`, `sign_in_click`, and `apk_download`. A nonzero **Unmapped event count** indicates that the import contains other event names or mismatched spelling; inspect the source rows before reporting.
4. For a new reporting period, clear prior input values from A5:C5004, then paste the new export. Keep the formulas on Overview intact.

The summary stays blank until at least one numeric event count is entered. Formulas cover rows 5–5004; extend those bounds in every Overview formula before importing more than 5,000 data rows. The highlighted first 200 rows are a visual input cue, not a row limit. Only aggregate event counts belong here. Do not paste user identifiers, emails, operational records, or financial amounts.

## Verification

The builder temporarily entered one numeric count, recalculated the summary, checked the formula result, removed that entry, and recalculated before export. The delivered input grid is blank. The workbook has two sheets: Overview and GA4 Import.
