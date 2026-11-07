import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const destination = process.argv[2];
const previewDirectory = process.argv[3];
const artifactModule = process.env.ARTIFACT_TOOL_MODULE;
if (!destination || !previewDirectory || !artifactModule) throw new Error('Set ARTIFACT_TOOL_MODULE to the bundled artifact_tool.mjs and pass <xlsx> <preview-directory>');
const { SpreadsheetFile, Workbook } = await import(pathToFileURL(artifactModule).href);

const book = Workbook.create();
const summary = book.worksheets.add('Overview');
const imported = book.worksheets.add('GA4 Import');
summary.tabColor = '#193B57';
summary.showGridLines = false;
imported.showGridLines = false;

const base = { name: 'Arial', size: 10, color: '#243746' };
for (const sheet of [summary, imported]) {
  sheet.getRange('A1:F20').format.font = base;
  sheet.getRange('A1:F20').format.verticalAlignment = 'center';
  sheet.getRange('A:A').format.columnWidth = 29;
  sheet.getRange('B:B').format.columnWidth = 20;
  sheet.getRange('C:C').format.columnWidth = 19;
  sheet.getRange('D:D').format.columnWidth = 19;
  sheet.getRange('E:E').format.columnWidth = 18;
}

summary.getRange('A2').values = [['GA4 activity overview']];
summary.getRange('A2').format.font = { name: 'Arial', size: 14, bold: true, color: '#193B57' };
summary.getRange('A3:C3').format.borders = { bottom: { style: 'thin', color: '#9FB1BE' } };
summary.getRange('A4').values = [['Counts update when actual GA4 rows are pasted into GA4 Import.']];
summary.getRange('A4').format.font = { ...base, italic: true, color: '#526778' };
summary.getRange('A5:B5').values = [['Allowed event', 'Event count']];
summary.getRange('A5:B5').format = { fill: '#193B57', font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' }, rowHeight: 25 };
summary.getRange('A6:A8').values = [['landing_view'], ['sign_in_click'], ['apk_download']];
for (let row = 6; row <= 8; row++) {
  summary.getRange(`B${row}`).formulas = [[`=IF(COUNT('GA4 Import'!$C$5:$C$5004)=0,"",SUMIFS('GA4 Import'!$C$5:$C$5004,'GA4 Import'!$B$5:$B$5004,A${row}))`]];
}
summary.getRange('A9').values = [['Total allowed events']];
summary.getRange('B9').formulas = [['=IF(COUNT(\'GA4 Import\'!$C$5:$C$5004)=0,"",SUM(B6:B8))']];
summary.getRange('A9:B9').format = { fill: '#E9F1F6', font: { ...base, bold: true }, rowHeight: 24 };
summary.getRange('B6:B9').setNumberFormat('#,##0');
summary.getRange('A11').values = [['Import checks']];
summary.getRange('A11').format.font = { ...base, bold: true, color: '#193B57' };
summary.getRange('A12').values = [['Rows with numeric event counts']];
summary.getRange('B12').formulas = [["=IF(COUNT('GA4 Import'!$C$5:$C$5004)=0,\"\",COUNT('GA4 Import'!$C$5:$C$5004))"]];
summary.getRange('A13').values = [['Unmapped event count']];
summary.getRange('B13').formulas = [['=IF(B12="","",SUM(\'GA4 Import\'!$C$5:$C$5004)-B9)']];
summary.getRange('B12:B13').setNumberFormat('#,##0');
summary.getRange('A15').values = [['Source: GA4 Explore CSV, exported with Date, Event name, Event count.']];
summary.getRange('A16').values = [['This workbook contains no sample observations or inferred results.']];
summary.getRange('A15:A16').format.font = { ...base, italic: true, color: '#526778' };

imported.getRange('A2').values = [['GA4 import']];
imported.getRange('A2').format.font = { name: 'Arial', size: 14, bold: true, color: '#193B57' };
imported.getRange('A3').values = [['Paste real GA4 export values below the headers. Use YYYYMMDD dates.']];
imported.getRange('A3').format.font = { ...base, italic: true, color: '#526778' };
imported.getRange('A4:C4').values = [['Date', 'Event name', 'Event count']];
imported.getRange('A4:C4').format = { fill: '#193B57', font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' }, rowHeight: 25 };
imported.getRange('A5:C204').format.fill = '#FFF6DC';
imported.getRange('C5:C204').setNumberFormat('#,##0');
imported.getRange('B5:B204').dataValidation = { rule: { type: 'list', values: ['landing_view', 'sign_in_click', 'apk_download'] } };
imported.freezePanes.freezeRows(4);

// Exercise the formula chain with a temporary real-number probe, then remove it.
imported.getRange('A5:C5').values = [['20261101', 'landing_view', 7]];
book.recalculate();
const probe = summary.getRange('B6').values[0][0];
if (probe !== 7) throw new Error(`Formula probe failed: ${JSON.stringify(probe)}`);
imported.getRange('A5:C5').clear({ applyTo: 'contents' });
book.recalculate();
if (imported.getRange('C5').values[0][0] !== null) throw new Error('Temporary probe remained in delivered import cells');
const formula = summary.getRange('B6').formulas[0][0];
if (!formula?.includes('SUMIFS')) throw new Error('Summary formula missing');

await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.mkdir(previewDirectory, { recursive: true });
for (const [sheetName, range, filename] of [
  ['Overview', 'A1:C17', 'analytics-overview.png'],
  ['GA4 Import', 'A1:D13', 'analytics-import.png'],
]) {
  const preview = await book.render({ sheetName, range, scale: 1.5, format: 'png' });
  await fs.writeFile(path.join(previewDirectory, filename), new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(book);
await output.save(destination);
console.log(JSON.stringify({ destination, probe, formula, importRows: '5:5004', sheets: ['Overview', 'GA4 Import'] }));
