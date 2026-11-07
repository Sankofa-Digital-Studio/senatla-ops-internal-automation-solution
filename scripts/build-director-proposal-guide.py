"""Rebuild the Director proposal template guide without using archived figures."""
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "docs" / "director-proposal-templates.docx"
doc = Document()
section = doc.sections[0]
section.top_margin = Inches(.7)
section.bottom_margin = Inches(.7)
section.left_margin = Inches(.9)
section.right_margin = Inches(.9)
styles = doc.styles
styles["Normal"].font.name = "Carlito"
styles["Normal"].font.size = Pt(9.5)
styles["Normal"].paragraph_format.space_after = Pt(5)
for name, size in (("Title", 25), ("Heading 1", 15), ("Heading 2", 11)):
    styles[name].font.name = "Carlito"
    styles[name].font.size = Pt(size)
    styles[name].font.color.rgb = RGBColor(22, 50, 68)
title_ppr = styles["Title"]._element.get_or_add_pPr()
for child in list(title_ppr):
    if child.tag.endswith("}pBdr"):
        title_ppr.remove(child)

doc.add_paragraph("Director Proposal Templates", "Title")
doc.add_paragraph("Senatla Ops | Director workspace | 7 November 2026", "Subtitle")
doc.add_paragraph("This guide explains how to build a proposal from a reusable format, edit sections and line items, review live totals and download a spreadsheet or PDF. The historical workbooks supplied by the owner inform presentation only; their figures are not loaded into a new proposal.")
doc.add_paragraph("Decision: use blank pricing inputs and one editable client label, Harmony Gold Mines. Confirm the exact contract party and current rates before issuing a proposal.")
doc.add_page_break()
doc.add_heading("Contents", 1)
for line in ("1  Template formats", "2  Director workflow", "3  Calculation and exports", "4  Acceptance criteria and limits"):
    doc.add_paragraph(line)
doc.add_page_break()
doc.add_heading("1  Template formats", 1)
doc.add_paragraph("West Gold and Tau Mine use the existing workspace phase structure as a baseline. The supplied ZIP contains no workbook named for either project. The other formats follow the visible grouping conventions in the supplied workbooks.")
table = doc.add_table(rows=1, cols=2)
table.style = "Light Shading Accent 1"
table.rows[0].cells[0].text = "Format"
table.rows[0].cells[1].text = "Section pattern"
for name, pattern in (
    ("West Gold phase schedule", "Mobilisation, plant demolition, rubble and rehabilitation"),
    ("Tau Mine phase schedule", "Surface works, shafts, dams and rehabilitation"),
    ("Village quotation", "Village groups with establishment, demolition and haulage"),
    ("Asbestos schedule of rates", "Preliminaries, asbestos work and clean rubble"),
    ("Civil works BOQ", "Preliminaries, earthworks, concrete and reinforcement"),
    ("Detailed cost breakdown", "Labour, equipment, materials and overheads"),
    ("Blank proposal", "One editable section and item"),
):
    row = table.add_row()
    row.cells[0].text = name
    row.cells[1].text = pattern
doc.add_heading("2  Director workflow", 1)
for line in (
    "Select a template; edit the project, client, reference and duration.",
    "Add, rename or remove sections and items. Enter UOM, quantity and rate for each needed item.",
    "Set P&G, contingency, profit and VAT percentages for this proposal. They start at zero.",
    "Review live totals, then open Preview spreadsheet to inspect section order and subtotals.",
    "Export Excel or Save PDF. At least one priced line is required for download.",
):
    doc.add_paragraph(line, style="List Number")
doc.add_heading("3  Calculation and exports", 1)
doc.add_paragraph("Direct spend is the sum of priced line amounts. P&G is applied to direct spend. Contingency follows the P&G subtotal, then profit is applied to project cost. VAT is applied to the tender amount excluding VAT. A blank quantity or rate leaves the line visibly unpriced.")
doc.add_paragraph("Excel contains editable inputs and formulas for line totals, section subtotals and the financial summary. PDF is downloaded immediately from the same proposal. Both exports carry the draft status and unpriced-line count.")
doc.add_heading("4  Acceptance criteria and limits", 1)
for line in (
    "No archived quantity, price, percentage, asset record or personnel data is loaded.",
    "Section edits and line pricing update the summary and preview immediately.",
    "The exact legal client name and current commercial terms require human review.",
    "Downloads do not save a draft to the database or change RLS policy.",
):
    doc.add_paragraph(line, style="List Bullet")
footer = section.footer.paragraphs[0]
footer.text = "Senatla Ops | Internal Director proposal guide"
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.save(DEST)
print(DEST)
