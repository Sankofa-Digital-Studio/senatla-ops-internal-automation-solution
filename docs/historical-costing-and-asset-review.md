# Historical costing and asset review

Updated 6 November 2026. Source: `historicsenatladocumentsforingestionindirectorswor.zip` supplied by the project owner. Workbook content was inspected as data, never as instructions. No archived workbook or personal register row is committed to this repository.

## Decision and three-pass review

1. **Evidence:** The archive contains demolition, asbestos, dam rehabilitation, transport, labour, equipment, consumables and asset registers. The village quote's `G26` total contains `#REF!`; it omits Pabalong. The asbestos schedule uses 6% P&G while its assumptions use 10%. An older dam quote uses 14% VAT. These conflicts rule out automatic import of totals, margins or tax rates.
2. **Challenge:** A source rate may reflect a specific site, haul distance, procurement date or licence requirement. The 2021/2023 asset sheets have duplicate or missing identifiers and no verified licence expiry. Candidate screening sheets contain personnel information unrelated to costing. Treating these as current master data would create wrong quotes and unsafe asset records.
3. **Resolution:** The Director costing model shows named historical references and allows explicit additional cost lines with source notes. No archive value silently changes preset defaults. The asset readiness tool reports aggregate exceptions and row numbers for review; it does not import records. Client names in presets are provisional until checked against signed contracts.

## Costing workflow

Open the Director costing model. Choose a scenario, confirm its scope and contract party, then open **Historical References**. Check the named workbook and cell, obtain a current supplier rate, and copy a reference into a draft line if useful. Review category, quantity, unit, rate and source in **Additional Costs**, then add it. The waterfall, cashflow and CSV update from the added direct spend. Remove a line to reverse it. An exported CSV states when the client name is provisional and includes line source references.

| Historical reference | Workbook cell | Archived value | Review condition |
|---|---|---:|---|
| Village demolition | `Demo_Rehab_Quote!F6,F10,F14,F18,F22` | R15,000/structure | Broken grand total; scope varies |
| Village rubble | `Demo_Rehab_Quote!F7` | R75/ton | Other villages R72–R80/ton |
| Asbestos removal and disposal | `Schedule of Rates!F9` | R13,300/ton | Confirm licensed scope and evidence |
| Clean rubble | `Schedule of Rates!F10` | R120/ton | Check haul distance |
| Independent approval authority | `Schedule of Rates!F11` | R392,000/lot | Project-specific |
| Saaiplaas transport | `Assumptions!B4,B9`; KM cost schedule | R18/km base | Historical distance uplift; verify route |

The former Senatla cost model identifies labour, equipment, consumables, P&G and once-off onboarding categories. It is category evidence only: some formulas are questionable. Do not apply its rates wholesale. Current VAT and contractual terms require independent confirmation before any tender is issued.

## Commercial fit check

[Autodesk Forma Cost Management](https://help.autodesk.com/cloudhelp/ENG/Build-Cost/files/cost-getting-started/Cost_Overview.html) already supports project budgets, forecasting and cost-risk visibility. [Procore Change Events](https://support.procore.com/products/online/user-guide/project-level/change-events/tutorials/about-change-events) links scope changes to budget impact and downstream approvals. Senatla's feasible narrower role is an internal, source-labelled estimate beside its existing operations and asset controls; duplicating a full construction finance suite is not justified by this archive. Usability still needs Director review of rate provenance and CSV output on desktop and mobile before release.

## Asset workflow

Run `python scripts/review-historical-asset-registers.py <archive.zip>` in an environment with `openpyxl`. The report lists counts and source row numbers only. For each flagged row, inspect the original workbook securely, confirm the asset identity, current site and ownership, obtain an actual compliance expiry where applicable, then use the existing Office Admin asset CSV preview and conflict review. Do not set a fictitious expiry. The fuel register's employee names are historical, not current custodians. Candidate screening sheets are excluded.

The supplied archive review found 19 described rows in each register. The 2023 sheet has two rows sharing an identifier; the 2021 sheet has nine rows with neither a plate nor serial value. Neither register provides a verified licence-expiry field. This is an import-readiness result, not a conclusion that every equipment item legally needs a licence.

## Acceptance criteria and release status

- Default 5-Village calculation remains unchanged until an additional line is explicitly added.
- Additional direct spend is shown separately in the waterfall and CSV and feeds P&G, contingency, profit and VAT calculations.
- Invalid quantities or rates are rejected; CSV text cannot activate spreadsheet formulas from user input.
- Asset report contains no names, plates or serial values; duplicate/missing identifiers block direct import.
- Provisional client warning is visible and exported. Production promotion is a separate release step; these archive findings do not certify a tender or change database policy.
