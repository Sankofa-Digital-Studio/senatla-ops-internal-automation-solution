from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

OUT = 'docs/product-teardown-2026-11-15.docx'

def shade(cell, fill):
    props = cell._tc.get_or_add_tcPr()
    element = OxmlElement('w:shd')
    element.set(qn('w:fill'), fill)
    props.append(element)

def set_cell_border(cell, color='D9D9D9', size='6'):
    props = cell._tc.get_or_add_tcPr()
    borders = props.first_child_found_in('w:tcBorders')
    if borders is None:
        borders = OxmlElement('w:tcBorders')
        props.append(borders)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        tag = 'w:' + edge
        border = borders.find(qn(tag))
        if border is None:
            border = OxmlElement(tag)
            borders.append(border)
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), size)
        border.set(qn('w:space'), '0')
        border.set(qn('w:color'), color)

def set_cell_text(cell, text, bold=False, color='000000'):
    cell.text = ''
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(9.5)
    run.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_border(cell)

doc = Document()
section = doc.sections[0]
section.top_margin = Inches(.7)
section.bottom_margin = Inches(.65)
section.left_margin = Inches(.8)
section.right_margin = Inches(.8)
styles = doc.styles
styles['Normal'].font.name = 'Aptos'
styles['Normal'].font.size = Pt(10.5)
styles['Normal'].paragraph_format.space_after = Pt(7)
for name, size in [('Title', 26), ('Heading 1', 17), ('Heading 2', 13), ('Heading 3', 11)]:
    styles[name].font.name = 'Aptos Display' if name == 'Title' else 'Aptos'
    styles[name].font.size = Pt(size)
    styles[name].font.color.rgb = RGBColor(0, 0, 0)

doc.add_paragraph('Senatla Ops Product Teardown', style='Title')
doc.add_paragraph('Adversarial review, product diamonds, and polish priorities', style='Subtitle')
doc.add_paragraph('15 November 2026', style='Normal')

doc.add_heading('Contents', level=1)
for item in ['Verdict', 'The diamonds', 'Devil’s advocate findings', 'What was polished in this pass', 'Priority sequence', 'Release evidence', 'Bottom line']:
    doc.add_paragraph(item, style='List Bullet')

doc.add_heading('Verdict', level=1)
doc.add_paragraph('Senatla Ops has a credible operational core. It is not merely a dashboard: the strongest idea is an evidence-backed operating heartbeat that connects field activity, office controls, and director decisions. The application is viable for a controlled internal rollout if the team protects that core from demo residue, workflow sprawl, and unproven assumptions about adoption.')
doc.add_paragraph('The adversarial conclusion is equally clear: the product currently asks users to trust a lot of machinery before showing them the shortest path to a safe, complete action. The next pass should deepen proof and recovery, not add more modules.')

doc.add_heading('The diamonds', level=1)
table = doc.add_table(rows=1, cols=3)
table.style = 'Table Grid'
for cell, text in zip(table.rows[0].cells, ['Diamond', 'Why it matters', 'How to polish it']):
    set_cell_text(cell, text, bold=True, color='FFFFFF'); shade(cell, '334155')
rows = [
    ('Evidence before commitment', 'OCR, approvals, audit events, and source-backed metrics create defensible records.', 'Show evidence state, owner, timestamp, and next action in one compact view.'),
    ('Role-specific lanes', 'Site, office, and director workspaces reflect different responsibilities.', 'Add a visible next best action and completion definition to each role’s landing state.'),
    ('Operational heartbeat', 'Attendance, safety, assets, approvals, and costs connect into one operating picture.', 'Give the heartbeat one freshness indicator: last source update, stale areas, and unresolved exceptions.'),
    ('Accountable handovers', 'Custody, approvals, onboarding, and synchronization preserve who acted and what changed.', 'Turn handover history into a reusable timeline across assets, requests, and payroll controls.'),
    ('Deliberate product boundary', 'Deferred AI, telematics, and multi-company interfaces reduce premature complexity.', 'Keep a public not-in-scope register so feature pressure does not dilute the core promise.'),
]
for row in rows:
    cells = table.add_row().cells
    for i, value in enumerate(row):
        set_cell_text(cells[i], value, bold=(i == 0), color='000000')
        if len(table.rows) % 2 == 0: shade(cells[i], 'F5F7FA')

doc.add_heading('Devil’s advocate findings', level=1)
for title, body in [
    ('The product can feel like a platform before it feels like a tool', 'The surface is broad. A new user may understand the architecture but still not know what to do in the first five minutes. Do not add another top-level module. Make each role’s first screen answer what is incomplete, what is urgent, and what can be safely finished now.'),
    ('Demo data is a trust hazard', 'Hosted mode correctly refuses local or demonstration records, but demo-shaped identifiers and mock recovery paths remain visible in local services. Keep fixtures, but put them behind an explicit Local review data boundary and add a release assertion that hosted bundles contain no local test-user affordance.'),
    ('Auditability is stronger than discoverability', 'The system records accountable history, but proof that is hidden behind a tab does not prevent bad decisions under pressure. Expose evidence status and provenance at the point of approval, export, sync, and asset commitment.'),
    ('Offline recovery needs operational proof', 'The offline banner, queue, and sync history are strong foundations. Use plain-language states: Saved on this device, Waiting to sync, Synced to Senatla Ops, or Needs attention.'),
]:
    doc.add_heading(title, level=2)
    doc.add_paragraph(body)

doc.add_heading('What was polished in this pass', level=1)
for item in ['The public header now says Sign in beside the familiar arrow icon.', 'The Explore platform control is now a real button with native keyboard activation and focus behaviour.', 'The landing component test was updated to protect both improvements.']:
    doc.add_paragraph(item, style='List Bullet')

doc.add_heading('Priority sequence', level=1)
for item in ['Make role home screens action-oriented: incomplete, urgent, and safe next action.', 'Standardise evidence and provenance summaries across approval and commitment flows.', 'Make sync states explicit and recoverable in field workflows.', 'Add hosted-build checks that reject local-only review affordances.', 'Validate adoption with three deterministic role journeys before expanding scope.']:
    doc.add_paragraph(item, style='List Number')

doc.add_heading('Release evidence', level=1)
for item in ['Lint passed.', 'Application, specification, and API type-checks passed.', 'Production build passed.', 'The browser unit runner reached Chrome startup but did not complete during this audit window; this is an environment verification gap, not evidence of a product failure.']:
    doc.add_paragraph(item, style='List Bullet')

doc.add_heading('Bottom line', level=1)
doc.add_paragraph('The diamond is not all operations in one app. The diamond is a trustworthy chain from work performed to evidence captured to decision made. Polish that chain until every role can see the next safe action and prove what happened afterward.')

doc.save(OUT)
print(OUT)
