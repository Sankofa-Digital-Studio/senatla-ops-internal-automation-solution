import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import ExcelJS from 'exceljs';

const out = resolve('output', 'proposal-export-contract');
await mkdir(out, { recursive: true });
const bundle = resolve(out, 'proposal-export.mjs');
await build({ entryPoints: ['src/app/core/services/proposal-export.service.ts'], outfile: bundle,
  bundle: true, platform: 'node', format: 'esm', external: ['exceljs', 'jspdf', 'jspdf-autotable'] });
const { createProposalWorkbook, createProposalPdf } = await import(pathToFileURL(bundle).href);
const { createProposal, calculateProposal } = await import('../src/app/core/services/proposal-template.engine.ts');

test('Excel export contains editable inputs, formulas and no archived rates', async () => {
  const proposal = createProposal('west-gold');
  proposal.sections[0].lines[0].quantity = 2;
  proposal.sections[0].lines[0].rate = 100;
  proposal.pgPct = 10;
  const summary = calculateProposal(proposal);
  const blob = await createProposalWorkbook(proposal, summary);
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 2).toString(), 'PK');
  await writeFile(resolve(out, 'sample-proposal.xlsx'), bytes);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes);
  const sheet = book.getWorksheet('Proposal');
  assert.equal(sheet.getCell('A2').value.includes('Harmony Gold Mines'), true);
  assert.equal(sheet.getCell('B7').value, 10);
  assert.equal(sheet.getCell('C7').value.formula, 'C6*B7/100');
  assert.equal(sheet.getCell('C6').value.result, 200);
  assert.equal(sheet.getCell('C14').value.result, 220);
  assert.equal(proposal.sections[0].lines[1].rate, null);
});

test('PDF export downloads the same draft proposal', async () => {
  const proposal = createProposal('tau-mine');
  proposal.sections[0].lines[0].quantity = 1;
  proposal.sections[0].lines[0].rate = 50;
  const blob = await createProposalPdf(proposal, calculateProposal(proposal));
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
  assert.ok(bytes.length > 1000);
  await writeFile(resolve(out, 'sample-proposal.pdf'), bytes);
});
