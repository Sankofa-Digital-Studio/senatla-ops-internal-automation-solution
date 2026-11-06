import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { expect, test } from 'playwright/test';
import ExcelJS from 'exceljs';
import { RESPONSIVE_TEST_ACCOUNTS, RESPONSIVE_TEST_PASSWORD } from './accounts';

test('Director builds, previews and downloads a proposal on mobile and desktop', async ({ page }, testInfo) => {
  test.skip(!['mobile', 'desktop'].includes(testInfo.project.name), 'Focused mobile and desktop proposal journey');
  test.setTimeout(120_000);
  const supabaseUrl = process.env.SENATLA_SUPABASE_URL || 'http://127.0.0.1:54321';
  const anonKey = process.env.SENATLA_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('SENATLA_SUPABASE_ANON_KEY is required.');
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: RESPONSIVE_TEST_ACCOUNTS.director.email,
    password: RESPONSIVE_TEST_PASSWORD,
  });
  if (error || !data.session) throw new Error(error?.message || 'Director fixture sign-in failed.');
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: storageKey, session: data.session });
  await page.goto('/costing-model');
  await expect(page.getByRole('heading', { name: 'Proposal templates' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('combobox', { name: 'Proposal template' })).toHaveValue('west-gold');
  await expect(page.getByRole('spinbutton', { name: 'Quantity for 1.1' })).toHaveValue('');
  await expect(page.getByRole('spinbutton', { name: 'Rate for 1.1' })).toHaveValue('');

  await page.getByRole('combobox', { name: 'Proposal template' }).selectOption('tau-mine');
  await expect(page.getByRole('textbox', { name: 'Section title' }).first()).toHaveValue('Mobilisation and preliminaries');
  await page.getByRole('spinbutton', { name: 'Quantity for 1.1' }).fill('2');
  await page.getByRole('spinbutton', { name: 'Rate for 1.1' }).fill('100');
  await expect(page.getByText('200.00').first()).toBeVisible();
  await page.getByRole('button', { name: 'Add section' }).click();
  await page.getByRole('textbox', { name: 'Section title' }).last().fill('Custom work');
  await page.getByRole('button', { name: 'Preview spreadsheet' }).click();
  await expect(page.getByRole('region', { name: 'Spreadsheet preview' })).toContainText('Custom work');
  await expect(page.getByRole('region', { name: 'Spreadsheet preview' })).toContainText('200.00');

  const excelDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel' }).click();
  const excelDownload = await excelDownloadPromise;
  expect(excelDownload.suggestedFilename()).toMatch(/\.xlsx$/);
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(await excelDownload.path());
  const sheet = book.getWorksheet('Proposal')!;
  expect(sheet.getCell('C6').value).toMatchObject({ result: 200 });
  expect(sheet.getCell('A2').value).toContain('Harmony Gold Mines');

  await expect(page.getByRole('button', { name: 'Export Excel' })).toBeEnabled();
  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PDF' }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
  expect((await readFile(await pdfDownload.path())).subarray(0, 4).toString()).toBe('%PDF');
  const width = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(width).toBeLessThanOrEqual(1);
});
