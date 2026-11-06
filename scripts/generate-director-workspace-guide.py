from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn

out = r"C:\Users\thoso\Sankofa_mvp\senatla-ops-internal-automation-solution\docs\director-workspace-guidance.docx"
doc = Document()
section = doc.sections[0]
section.top_margin = Inches(.75); section.bottom_margin = Inches(.75)
section.left_margin = Inches(.85); section.right_margin = Inches(.85)
styles = doc.styles
styles['Normal'].font.name = 'Aptos'; styles['Normal'].font.size = Pt(10.5)
for name, size in [('Title', 26), ('Heading 1', 17), ('Heading 2', 13)]:
    styles[name].font.name = 'Aptos Display'; styles[name].font.size = Pt(size); styles[name].font.color.rgb = RGBColor(0,0,0)
title_ppr = styles['Title']._element.pPr
if title_ppr is not None:
    title_border = title_ppr.find(qn('w:pBdr'))
    if title_border is not None:
        title_ppr.remove(title_border)

p = doc.add_paragraph(style='Title'); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.add_run('Director Workspace Guidance')
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.add_run('Senatla Operations').italic = True
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.add_run('Internal workspace guide | November 2026')
doc.add_page_break()
doc.add_heading('Contents', level=1)
for item in ['Purpose', 'Guided walkthrough', 'Director capabilities', 'Developer Director administration', 'Help and troubleshooting', 'Acceptance criteria']:
    doc.add_paragraph(item, style='List Bullet')
doc.add_heading('Purpose', level=1)
doc.add_paragraph('The director workspace opens with a guided walkthrough after sign-in. Every director sees oversight, detail review, help, and safe sign-out. The two authorised developer Directors also see employee and site management, assets, and OCR steps.')
doc.add_heading('Guided walkthrough', level=1)
doc.add_paragraph('The walkthrough is mandatory on first entry. Each step can navigate the director to the relevant route and scroll the target into view. The final step includes a Don’t show this guide again checkbox. The Help dialog can replay the guide at any time.')
doc.add_heading('Director capabilities', level=1)
for item in ['Review cross-site operating status, costs, risks, attendance, invoices, and decision queues.', 'Open source-backed operational records behind executive summaries.', 'Review common issues and recovery steps from the shared Help control.']:
    doc.add_paragraph(item, style='List Bullet')
doc.add_heading('Developer Director administration', level=1)
doc.add_paragraph('Only the exact thosontula@gmail.com and thosontula+tag@gmail.com accounts, while active Directors, receive shared Office Admin management access. Ordinary Directors retain oversight and their existing review responsibilities.')
for item in ['Manage employees and employment status.', 'Assign employees to sites through the reviewed assignment workflow.', 'Maintain sites and organization assets.', 'Use asset OCR to capture evidence, review extracted fields, correct values, and verify before saving.']:
    doc.add_paragraph(item, style='List Bullet')
doc.add_page_break()
doc.add_heading('Help and troubleshooting', level=1)
for title, body in [('The page is still loading', 'Check the network connection and try again. If a reference code is shown, share it with support.'), ('A person or site is missing', 'If you have management access, open the shared administration workspace and review the active filters in People or Sites. Otherwise, contact your Office Admin.'), ('OCR read a value incorrectly', 'Compare every extracted value with the source document. Correct the value and verify the evidence before saving.'), ('Sign out is taking too long', 'Wait for the sign-out request to finish. If the retry message appears, try again or contact support with any reference code.')]:
    doc.add_heading(title, level=2); doc.add_paragraph(body)
doc.add_heading('Acceptance criteria', level=1)
for item in ['First successful director sign-in opens the complete guide before normal use.', 'No step is skipped accidentally.', 'Suppression works per user and role.', 'Help is accessible from the authenticated header.', 'Tour targets are visible on desktop and mobile layouts.', 'Auth errors are visible without developer tools.', 'Sign-out never leaves a permanent frozen loader.', 'Only the two named developer Directors can administer; their actions remain audited and organization-scoped.']:
    doc.add_paragraph(item, style='List Bullet')
doc.save(out)
print(out)
