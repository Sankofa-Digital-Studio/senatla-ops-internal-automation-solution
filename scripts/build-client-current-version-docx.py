from pathlib import Path
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'client-current-version' / 'Senatla-Ops-Client-Current-Version-Review.docx'
doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(.65); sec.bottom_margin = Inches(.65); sec.left_margin = Inches(.75); sec.right_margin = Inches(.75)
for name, size, color in [('Normal', 10, '10233C'), ('Title', 24, '071A33'), ('Heading 1', 17, '0D2A4A'), ('Heading 2', 13, '16B8A6')]:
    doc.styles[name].font.name = 'Arial'; doc.styles[name].font.size = Pt(size); doc.styles[name].font.color.rgb = RGBColor.from_string(color)

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr(); shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), fill); tcPr.append(shd)

doc.add_heading('Senatla Ops Current Application Review', 0)
p = doc.add_paragraph('Client: Senatla Trading\nPrepared by: Sankofa Digital Studio\nCurrent release: v0.5.7 release candidate\nUAT reference: https://senatla-ops-uat.vercel.app/landing\nDate: 14 November 2026')
p.style = 'Subtitle'
doc.add_paragraph('This review explains the current application journey for a non-technical audience. It separates capability, release evidence and decisions that still need client confirmation.')
doc.add_heading('Contents', 1)
for item in ['Product outcome', 'Application flow', 'Role journeys', 'Control points', 'Asset and maintenance flow', 'UAT position', 'Client confirmations']:
    doc.add_paragraph(item, style='List Number')
doc.add_heading('Product outcome', 1)
doc.add_paragraph('Senatla Ops connects field activity, workforce controls, asset evidence, approvals and director oversight in one accountable operating record. It is intended to answer whether people are present and safe, which exceptions need action, where each asset is and whether it is safe to use, which approvals remain open, and whether each decision can be traced to evidence.')
doc.add_heading('Application flow', 1)
for h, b in [('Capture', 'A Site Manager records attendance, safety, inspections and evidence.'), ('Validate', 'Rules check identity, completeness, role and site scope.'), ('Resolve', 'Office users work exceptions, issues, assets, payroll and vendors.'), ('Approve', 'A named reviewer completes a maker-checker decision.'), ('Oversee', 'Directors review source-backed readiness, cost and risk.')]:
    p = doc.add_paragraph(style='List Number'); p.add_run(f'{h}: ').bold = True; p.add_run(b)
doc.add_heading('Role journeys', 1)
t = doc.add_table(rows=1, cols=4); t.style = 'Table Grid'
for i, h in enumerate(['Role', 'Primary job', 'Main workspace', 'Key handoff']):
    t.rows[0].cells[i].text = h; shade(t.rows[0].cells[i], '071A33')
for row in [('Site Manager','Complete the site day','Readiness, attendance, safety, inspections and evidence','Sync and exception creation'), ('Office Administrator','Resolve exceptions and maintain records','Workforce, sites, issues, payroll, assets and vendors','Controlled approval request'), ('Director or Reviewer','Decide with evidence','Readiness, costs, risks and approval queue','Approval, rejection or revision request')]:
    cells = t.add_row().cells
    for i, value in enumerate(row): cells[i].text = value
doc.add_heading('Control points', 1)
for h, items in [('Implemented in the product', ['Role-aware routes and workspace guidance', 'Asset identity using serial, VIN or registration plate', 'Audit events with actor, time, action and entity', 'Human review before OCR suggestions become authoritative', 'Offline queue and idempotency design for field continuity']), ('Verified in release evidence', ['v0.5.7 typecheck and production build passed', 'Preview and production promotion records exist', 'Responsive and contract test suites are part of the release gate', 'Session cache clears when the user signs out']), ('Still needs confirmation', ['Physical Android and iOS OCR-3 execution', 'Pilot sites and pilot asset list', 'Named reviewers, custody owners and return-to-service approvers', 'Evidence retention and controlled export rules'])]:
    doc.add_heading(h, 2)
    for item in items: doc.add_paragraph(item, style='List Bullet')
doc.add_heading('Asset and maintenance flow', 1)
doc.add_paragraph('An asset remains one dossier across identity, inspection, defect, repair, independent return approval and leadership review. Failed pre-start checks can create defects or work orders. Critical work blocks return to service until an independent approval is recorded. Custody, meters, evidence and audit history remain traceable when responsibility changes.')
doc.add_heading('UAT position', 1)
doc.add_paragraph('The UAT preview entry screen is available at the reference URL. It shows the role model, capabilities, assurance controls and employee sign-in route before operational data is exposed. The OCR-3 gate is implemented, but physical-device execution remains pending. Release readiness requires all 25 required access and device outcomes to pass on one signed Android build and one signed iOS build.')
doc.add_heading('Client confirmations', 1)
for item in ['Which sites and assets enter the first controlled pilot?', 'Who owns custody, evidence review and return-to-service decisions?', 'Which asset classes, statuses and site groups should be standard?', 'How long should photos, signatures, invoices and audit exports be retained?', 'Who may approve payroll, vendor, asset and operational requests?', 'Which readiness, safety, downtime and reconciliation measures define acceptance?']:
    doc.add_paragraph(item, style='List Number')
doc.add_heading('Source record', 1)
doc.add_paragraph('Prepared from README.md, docs/release-notes-0.5.7.md, docs/client-senatla-ops-planning-requirements-guidance.md, docs/director-flow-v0.5.6.md, docs/ocr-device-uat.md, docs/environments.md and the hosted UAT landing route. The accompanying visuals are client-safe design references with illustrative data.')
doc.save(OUT)
print(OUT)
