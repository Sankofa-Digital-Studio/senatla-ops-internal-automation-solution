import { ProposalDocument, ProposalSummary, lineAmount } from './proposal-template.engine';

const money = (value: number) => value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 70) || 'proposal';
export const proposalFilename = (proposal: ProposalDocument, extension: 'xlsx' | 'pdf') => `${safeName(proposal.projectName)}.${extension}`;

export async function createProposalWorkbook(proposal: ProposalDocument, summary: ProposalSummary): Promise<Blob> {
  const imported = await import('exceljs');
  const ExcelJS = imported.default;
  const book = new ExcelJS.Workbook();
  book.creator = 'Senatla Ops';
  book.created = new Date();
  book.calcProperties.fullCalcOnLoad = true;
  const sheet = book.addWorksheet('Proposal', { views: [{ state: 'frozen', ySplit: 17 }] });
  sheet.columns = [
    { key: 'item', width: 13 }, { key: 'description', width: 56 }, { key: 'uom', width: 15 },
    { key: 'quantity', width: 15 }, { key: 'rate', width: 20 }, { key: 'amount', width: 23 },
  ];
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = proposal.projectName;
  sheet.getCell('A1').font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17212D' } };
  sheet.getRow(1).height = 32;
  sheet.mergeCells('A2:F2');
  sheet.getCell('A2').value = `Client: ${proposal.clientName}  |  Reference: ${proposal.contractRef || 'Not entered'}  |  Duration: ${proposal.durationMonths ?? 'Not entered'} months`;
  sheet.mergeCells('A3:F3');
  sheet.getCell('A3').value = `DRAFT PROPOSAL  |  ${proposal.templateName}  |  ${summary.unpricedLines} unpriced line(s)`;
  sheet.getCell('A3').font = { bold: true, color: { argb: 'FF9A3412' } };
  sheet.getCell('A5').value = 'FINANCIAL SUMMARY';
  sheet.getCell('A5').font = { bold: true, color: { argb: 'FF183B54' } };
  sheet.getCell('B5').value = 'Rate %';
  sheet.getCell('C5').value = 'Amount (ZAR)';
  const summaryRows: [number, string, number | null, string | null, number][] = [
    [6, 'Direct spend', null, null, summary.directSpend],
    [7, 'Preliminaries and general', proposal.pgPct, 'C6*B7/100', summary.pgAmount],
    [8, 'Subtotal before contingency', null, 'C6+C7', summary.subtotalBeforeContingency],
    [9, 'Contingency', proposal.contingencyPct, 'C8*B9/100', summary.contingencyAmount],
    [10, 'Project cost', null, 'C8+C9', summary.projectCost],
    [11, 'Profit', proposal.profitPct, 'C10*B11/100', summary.profitAmount],
    [12, 'Tender excluding VAT', null, 'C10+C11', summary.tenderExclVat],
    [13, 'VAT', proposal.vatPct, 'C12*B13/100', summary.vatAmount],
    [14, 'Tender including VAT', null, 'C12+C13', summary.tenderInclVat],
  ];
  for (const [rowNumber, label, percent, formula, result] of summaryRows) {
    sheet.getCell(`A${rowNumber}`).value = label;
    if (percent !== null) {
      sheet.getCell(`B${rowNumber}`).value = percent;
      sheet.getCell(`B${rowNumber}`).numFmt = '0.##"%"';
    }
    sheet.getCell(`C${rowNumber}`).value = formula ? { formula, result } : result;
    sheet.getCell(`C${rowNumber}`).numFmt = '"R" #,##0.00';
    if ([6, 10, 12, 14].includes(rowNumber)) {
      sheet.getRow(rowNumber).font = { bold: true, color: { argb: 'FF17212D' } };
      sheet.getRow(rowNumber).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF0F4' } };
    }
  }
  sheet.getCell('A16').value = 'BILL OF QUANTITIES';
  sheet.getCell('A16').font = { bold: true, color: { argb: 'FF183B54' } };
  sheet.getRow(17).values = ['Item', 'Description', 'UOM', 'Quantity', 'Rate (ZAR)', 'Amount (ZAR)'];
  sheet.getRow(17).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(17).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF183B54' } };
  const subtotalCells: string[] = [];
  for (const section of proposal.sections) {
    const heading = sheet.addRow([section.title]);
    sheet.mergeCells(heading.number, 1, heading.number, 6);
    heading.font = { bold: true, color: { argb: 'FF17212D' } };
    heading.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EEF2' } };
    const firstLine = sheet.rowCount + 1;
    for (const line of section.lines) {
      const row = sheet.addRow([line.itemNo, line.description, line.uom, line.quantity, line.rate]);
      const value = lineAmount(line);
      row.getCell(6).value = { formula: `IF(OR(D${row.number}="",E${row.number}=""),"",D${row.number}*E${row.number})`, result: value ?? '' };
      row.getCell(5).numFmt = '"R" #,##0.00';
      row.getCell(6).numFmt = '"R" #,##0.00';
      row.alignment = { vertical: 'top', wrapText: true };
    }
    const subtotal = sheet.addRow(['', `Subtotal: ${section.title}`]);
    const lastLine = subtotal.number - 1;
    subtotal.getCell(6).value = { formula: firstLine <= lastLine ? `SUM(F${firstLine}:F${lastLine})` : '0', result: summary.sectionTotals[section.id] ?? 0 };
    subtotal.getCell(6).numFmt = '"R" #,##0.00';
    subtotal.font = { bold: true };
    subtotalCells.push(`F${subtotal.number}`);
  }
  sheet.getCell('C6').value = { formula: subtotalCells.length ? `SUM(${subtotalCells.join(',')})` : '0', result: summary.directSpend };
  sheet.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:3' };
  const bytes = await book.xlsx.writeBuffer();
  return new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function createProposalPdf(proposal: ProposalDocument, summary: ProposalSummary): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.setProperties({ title: proposal.projectName, subject: 'Director proposal draft', author: 'Senatla Ops' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(proposal.projectName, 14, 18, { maxWidth: 268 });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Client: ${proposal.clientName}   Reference: ${proposal.contractRef || 'Not entered'}`, 14, 27, { maxWidth: 268 });
  pdf.text(`Draft ${proposal.templateName} | ${summary.unpricedLines} unpriced line(s)`, 14, 33);
  autoTable(pdf, {
    startY: 39, head: [['Summary', 'Rate %', 'Amount ZAR']],
    body: [
      ['Direct spend', '', money(summary.directSpend)],
      ['Preliminaries and general', proposal.pgPct, money(summary.pgAmount)],
      ['Subtotal before contingency', '', money(summary.subtotalBeforeContingency)],
      ['Contingency', proposal.contingencyPct, money(summary.contingencyAmount)],
      ['Project cost', '', money(summary.projectCost)],
      ['Profit', proposal.profitPct, money(summary.profitAmount)],
      ['Tender excluding VAT', '', money(summary.tenderExclVat)],
      ['VAT', proposal.vatPct, money(summary.vatAmount)],
      ['Tender including VAT', '', money(summary.tenderInclVat)],
    ],
    theme: 'grid', headStyles: { fillColor: [24, 59, 84] }, styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  let cursor = (pdf as typeof pdf & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 95;
  for (const section of proposal.sections) {
    if (cursor > 165) { pdf.addPage(); cursor = 18; }
    autoTable(pdf, {
      startY: cursor + 7,
      head: [[section.title, 'Description', 'UOM', 'Quantity', 'Rate ZAR', 'Amount ZAR']],
      body: [
        ...section.lines.map(line => [line.itemNo, line.description, line.uom.replace('³', '3'), line.quantity ?? '', line.rate === null ? '' : money(line.rate), lineAmount(line) === null ? '' : money(lineAmount(line)!)]),
        ['', 'Section subtotal', '', '', '', money(summary.sectionTotals[section.id] ?? 0)],
      ],
      theme: 'grid', headStyles: { fillColor: [24, 59, 84] }, styles: { fontSize: 8, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 22 }, 3: { cellWidth: 27 }, 4: { cellWidth: 35 }, 5: { cellWidth: 37 } },
      margin: { left: 14, right: 14, top: 18, bottom: 17 },
    });
    cursor = (pdf as typeof pdf & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursor + 25;
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.text(`Senatla Ops | Draft proposal | Page ${page} of ${pages}`, 14, 200);
  }
  return pdf.output('blob');
}
