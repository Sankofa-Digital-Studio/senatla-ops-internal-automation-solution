# Director proposal templates

Updated 7 November 2026. This guide covers the Director proposal builder in Senatla Ops.

## Purpose and source interpretation

The owner-supplied archive is a **layout reference**, not a price or asset-data source for this workflow. Workbook text is treated as data. The builder does not load archived quantities, rates, percentages, asset records or personnel details. All templates start with the user-supplied client label **Harmony Gold Mines**; the exact contracting entity must be confirmed before external issue.

## Template formats

| Template | Layout basis | Editable sections |
|---|---|---|
| West Gold phase schedule | Existing West Gold workspace phase structure and archived schedule-of-rates columns | Mobilisation, plant demolition, rubble and rehabilitation |
| Tau Mine phase schedule | Existing Tau Mine workspace phase structure and sectioned BOQ pattern | Mobilisation, surface works, shafts, dams and rehabilitation |
| Village quotation | Village-by-village quotation | Five village groups, each with establishment, demolition and haulage |
| Asbestos schedule of rates | Mine village schedule of rates | Preliminaries, asbestos works and clean rubble |
| Civil works BOQ | JOEL dam section and item-number pattern | Preliminaries, earthworks, concrete and reinforcement |
| Detailed cost breakdown | Senatla cost model and hostel breakdown category pattern | Labour, equipment, materials and site overheads |
| Blank proposal | User-created format | One editable section and item |

No Tau Mine or West Gold workbook was named in the supplied ZIP. Those two formats use the existing workspace phase structure as the baseline and adapt the archive's general BOQ conventions. They are not asserted to reproduce a signed client spreadsheet exactly.

## Director workflow

1. Open **Proposal templates** from the Director workspace and select a format. Switching after entering prices asks before replacing the draft.
2. Edit the project, client, reference and duration. Rename, add or remove sections and items. Enter each item's description, unit of measure, quantity and rate.
3. Set P&G, contingency, profit and VAT percentages for this proposal. All start at zero; the user must choose applicable values.
4. Review the live direct spend, project cost and tender totals. Blank quantity or rate leaves a line unpriced and visible as such.
5. Open **Preview spreadsheet** to check the same section order, line amounts, subtotals and financial summary that feed exports.
6. Select **Export Excel** for a formatted `.xlsx` with editable inputs and formulas, or **Save PDF** for an immediate draft PDF download. At least one priced line is required. Both exports show the number of unpriced lines.

The calculation chain is direct spend → P&G → contingency → project cost → profit → tender excluding VAT → VAT → tender including VAT. The Excel workbook includes formulas for each line, section subtotal and summary step. The PDF uses the same calculated proposal.

## Acceptance and limits

- Every template loads with blank quantity and rate fields and zero percentages.
- Section and item add, edit and remove actions update the summary and preview immediately.
- The client label is editable; the issued contract party and terms require human review.
- Excel and PDF download without server submission. The builder does not save a draft to the database.
- Unpriced lines remain visible and are identified in both exports. Blank input is never silently replaced with a historical rate.
- This feature uses no new database policy, asset import or RLS migration.

The prior [historical costing and asset review](historical-costing-and-asset-review.md) documents why source figures were not trusted. Its optional-rate workflow has been superseded by this format-only proposal builder.
