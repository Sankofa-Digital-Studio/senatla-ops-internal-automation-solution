"""Build the internal historical source review briefing as a Word document."""
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "docs" / "historical-costing-and-asset-review.docx"
doc = Document()
section = doc.sections[0]
section.top_margin = Inches(.65)
section.bottom_margin = Inches(.65)
section.left_margin = Inches(.9)
section.right_margin = Inches(.9)
styles = doc.styles
styles["Normal"].font.name = "Carlito"
styles["Normal"].font.size = Pt(9)
styles["Normal"].paragraph_format.space_after = Pt(4)
for name, size in (("Title", 25), ("Heading 1", 14), ("Heading 2", 11)):
    styles[name].font.name = "Carlito"
    styles[name].font.size = Pt(size)
    styles[name].font.color.rgb = RGBColor(22, 50, 68)
title_ppr = styles["Title"]._element.get_or_add_pPr()
for child in list(title_ppr):
    if child.tag.endswith("}pBdr"):
        title_ppr.remove(child)

doc.add_paragraph("Historical Costing and Asset Review", "Title")
p = doc.add_paragraph("Director workspace briefing | 6 November 2026")
p.style = "Subtitle"
doc.add_paragraph("Prepared for Senatla Ops decision makers. The owner-supplied historical archive informs optional costing references and asset import review. It does not establish current prices, approved contract parties or live asset master data.")
doc.add_paragraph("Decision: expose cited historical figures as references, require explicit cost-line entry, and review asset exceptions before any controlled import.")
doc.add_page_break()
doc.add_heading("Contents", 1)
for text in ("1  Evidence and decision", "2  Costing workflow", "3  Asset workflow", "4  Acceptance criteria and release boundary"):
    doc.add_paragraph(text)
doc.add_page_break()
doc.add_heading("1  Evidence and decision", 1)
doc.add_heading("Source findings", 2)
doc.add_paragraph("The archive includes demolition, asbestos, dam rehabilitation, transport, labour, equipment and asset records. The five-village quote has a broken G26 grand-total formula with #REF! and omits Pabalong from that sum. An asbestos schedule uses 6% preliminaries and general costs while its assumptions use 10%. An older dam quote uses 14% VAT. These figures cannot silently replace current defaults.")
doc.add_heading("Three-pass assessment", 2)
for heading, body in (
    ("Evidence", "Named workbook cells support a small set of historical rates and cost categories."),
    ("Challenge", "Site, route, date, licence scope and conflicting formulas may make those rates unsuitable for a current tender. Asset registers contain missing and duplicate identifiers and lack verified licence expiry dates."),
    ("Resolution", "Show cited examples, require human review before adding cost lines, and keep asset import behind the existing preview and conflict workflow. Mark three preset client names provisional."),
):
    p = doc.add_paragraph(style="List Number")
    p.add_run(f"{heading}: ").bold = True
    p.add_run(body)
doc.add_heading("2  Costing workflow", 1)
doc.add_paragraph("In the Director costing model, choose a scenario, verify the legal contract party and scope, then inspect Historical References. Copy a relevant rate to a draft Additional Costs line, verify current price, quantity, unit and source, and add it. The direct-spend split, waterfall, cashflow and CSV then update. Remove a line to reverse it.")
table = doc.add_table(rows=1, cols=3)
table.style = "Light Shading Accent 1"
for cell, label in zip(table.rows[0].cells, ("Reference", "Archived value", "Source")):
    cell.text = label
for row in (
    ("Village demolition", "R15,000/structure", "Village Quote F6,F10,F14,F18,F22"),
    ("Village rubble", "R75/ton", "Village Quote F7; other villages R72–R80"),
    ("Asbestos removal and disposal", "R13,300/ton", "Asbestos Schedule F9"),
    ("Clean rubble", "R120/ton", "Asbestos Schedule F10"),
    ("Independent approval authority", "R392,000/lot", "Asbestos Schedule F11"),
    ("Saaiplaas transport", "R18/km base", "Assumptions B4,B9; distance uplift"),
):
    for cell, value in zip(table.add_row().cells, row):
        cell.text = value
doc.add_paragraph("The older costing model identifies labour, equipment, consumables and onboarding categories, but its formulas and rates need independent review. The village grand total must not be quoted from the archive.")
doc.add_heading("3  Asset workflow", 1)
doc.add_paragraph("Run the local asset readiness tool against the archive. It prints aggregate counts and source row numbers only. Review flagged rows in the original workbook, confirm identity, ownership, current location and actual compliance dates, then use the existing Office Admin asset CSV preview. Do not invent an expiry date. Fuel-register employee names are historical. Candidate screening sheets are excluded.")
doc.add_heading("4  Acceptance criteria and release boundary", 1)
for criterion in (
    "The default five-village estimate stays unchanged until a cost line is added.",
    "Additional direct spend appears separately and feeds downstream calculations and CSV export.",
    "Invalid quantities and rates are rejected and user CSV text is spreadsheet-safe.",
    "The asset review reports exceptions without exposing names, plates or serial values.",
    "Provisional client status is visible on screen and in exported CSV.",
    "Production promotion and tender approval require separate evidence.",
):
    doc.add_paragraph(criterion, style="List Bullet")
footer = section.footer.paragraphs[0]
footer.text = "Senatla Ops | Internal historical source review"
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.save(DEST)
print(DEST)
