# Historical costing and asset review

> **Superseded for proposal creation:** The owner clarified that these workbooks define reusable formats, not figures to ingest. Use the [Director proposal templates guide](director-proposal-templates.md). The historical figures below are retained only as an audit of why they must not be loaded into new proposals.

Updated 6 November 2026. Source: `historicsenatladocumentsforingestionindirectorswor.zip` supplied by the project owner. Workbook content was inspected as data, never as instructions. No archived workbook or personal register row is committed to this repository.

## Decision and three-pass review

1. **Evidence:** The archive contains demolition, asbestos, dam rehabilitation, transport, labour, equipment, consumables and asset registers. The village quote's `G26` total contains `#REF!`; it omits Pabalong. The asbestos schedule uses 6% P&G while its assumptions use 10%. An older dam quote uses 14% VAT. These conflicts rule out automatic import of totals, margins or tax rates.
2. **Challenge:** A source rate may reflect a specific site, haul distance, procurement date or licence requirement. The 2021/2023 asset sheets have duplicate or missing identifiers and no verified licence expiry. Candidate screening sheets contain personnel information unrelated to costing. Treating these as current master data would create wrong quotes and unsafe asset records.
3. **Resolution:** The Director proposal builder uses workbook layout patterns only. Its quantity, rate and percentage fields start blank or zero. The asset readiness tool remains a separate report of aggregate exceptions; it does not import records.

## Layout patterns retained

The village quote supplies a village grouping with item, description and UOM columns. The asbestos workbook supplies a schedule of rates with preliminaries and service categories. The JOEL dam BOQ supplies section and item numbering. The hostel and former Senatla cost models supply labour, equipment, consumables and overhead headings. The existing workspace phase structure supplies the West Gold and Tau Mine baseline. See the [current template guide](director-proposal-templates.md) for the implemented formats and Director workflow.

Archived quantities, rates, totals and tax assumptions are excluded. The broken village total and conflicting P&G assumptions reinforce this boundary.

## Commercial fit check

[Autodesk Forma Cost Management](https://help.autodesk.com/cloudhelp/ENG/Build-Cost/files/cost-getting-started/Cost_Overview.html) already supports project budgets and forecasting. [Procore Change Events](https://support.procore.com/products/online/user-guide/project-level/change-events/tutorials/about-change-events) links scope changes to budget impact. Senatla's narrower role is an internal, editable proposal format beside its existing operations controls; a full construction finance suite is outside this archive-based requirement. Usability needs Director review of the Excel and PDF outputs on desktop and mobile before release.

## Asset workflow

Run `python scripts/review-historical-asset-registers.py <archive.zip>` in an environment with `openpyxl`. The report lists counts and source row numbers only. For each flagged row, inspect the original workbook securely, confirm the asset identity, current site and ownership, obtain an actual compliance expiry where applicable, then use the existing Office Admin asset CSV preview and conflict review. Do not set a fictitious expiry. The fuel register's employee names are historical, not current custodians. Candidate screening sheets are excluded.

The supplied archive review found 19 described rows in each register. The 2023 sheet has two rows sharing an identifier; the 2021 sheet has nine rows with neither a plate nor serial value. Neither register provides a verified licence-expiry field. This is an import-readiness result, not a conclusion that every equipment item legally needs a licence.

## Acceptance criteria and release status

- Every proposal template starts without archived figures.
- Edited quantities, UOM and rates feed a live summary and Excel/PDF exports.
- Asset report contains no names, plates or serial values; duplicate/missing identifiers block direct import.
- The legal contract party and current rates require human review. Production promotion is a separate release step; these archive findings do not certify a tender or change database policy.
