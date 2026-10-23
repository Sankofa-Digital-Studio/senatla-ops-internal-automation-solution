import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateUatRun } from './ocr-device-uat-contract.mjs';

class SafeUatCliError extends Error {}

export function buildCliSummary(result) {
  return { ...result.summary, releaseReady: result.releaseReady };
}

export function safeUatCliErrorMessage(error) {
  if (error instanceof SafeUatCliError) return error.message;
  if (error instanceof SyntaxError) return 'UAT result file is not valid JSON.';
  if (error && typeof error === 'object' && ['ENOENT', 'EACCES', 'EPERM', 'EISDIR'].includes(error.code)) {
    return 'Unable to read the UAT result file.';
  }
  return 'UAT validation failed safely.';
}

export async function runCli(args = process.argv.slice(2)) {
  const allowIncomplete = args.includes('--allow-incomplete');
  const input = args.find((arg) => !arg.startsWith('--')) ?? 'output/uat-private/ocr-device-uat.json';
  const inputPath = resolve(input);

  try {
    const inputStat = await stat(inputPath);
    if (inputStat.size > 2_000_000) throw new SafeUatCliError('UAT result file exceeds the 2 MB evidence-metadata limit.');
    const payload = JSON.parse(await readFile(inputPath, 'utf8'));
    const result = validateUatRun(payload, { allowIncomplete });
    console.log(JSON.stringify(buildCliSummary(result), null, 2));
    if (result.issues.length) {
      for (const issue of result.issues) console.error(`[ocr-uat] ${issue}`);
    }
    return result.ok ? 0 : 1;
  } catch (error) {
    console.error(`[ocr-uat] ${safeUatCliErrorMessage(error)}`);
    console.error('[ocr-uat] Usage: npm run validate:ocr-device-uat -- <private-result.json> [--allow-incomplete]');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await runCli();
}