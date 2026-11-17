import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { loadLegacyOfficeWorkspaceRows, loadOfficeWorkspaceRows } from '../../src/app/core/workspace/office-workspace-loader';
import { RESPONSIVE_TEST_ACCOUNTS, RESPONSIVE_TEST_PASSWORD } from './accounts';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

export async function verifyWorkspaceSnapshot(url: string, anonKey: string) {
  const measurements: unknown[] = [];
  for (const role of ['office', 'director', 'site'] as const) {
    let requests = 0;
    let bytes = 0;
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async (input, init) => {
        const response = await fetch(input, init);
        if (String(input).includes('/rest/v1/')) {
          requests++;
          bytes += (await response.clone().arrayBuffer()).byteLength;
        }
        return response;
      } },
    });
    const login = await client.auth.signInWithPassword({ email: RESPONSIVE_TEST_ACCOUNTS[role].email, password: RESPONSIVE_TEST_PASSWORD });
    if (login.error) throw login.error;
    // Compare on an isolated fixture before any browser tests start writing to it.
    requests = 0; bytes = 0;
    let start = performance.now();
    const legacy = await loadLegacyOfficeWorkspaceRows(client);
    const before = { requests, responseBytes: bytes, dataReadyMs: Math.round(performance.now() - start) };
    requests = 0; bytes = 0;
    start = performance.now();
    const snapshot = await loadOfficeWorkspaceRows(client);
    const after = { requests, responseBytes: bytes, dataReadyMs: Math.round(performance.now() - start) };
    if (before.requests !== 26 || after.requests !== 1) throw new Error('Workspace request budget regression: ' + JSON.stringify({ before, after }));
    const comparable = (collections: Record<string, unknown[]>) => canonical(Object.fromEntries(Object.entries(collections).map(([table, items]) => [table, items.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))])));
    if (JSON.stringify(comparable(legacy)) !== JSON.stringify(comparable(snapshot))) throw new Error('Snapshot data differs from legacy reads for ' + role);
    measurements.push({ role, before, after, equivalent: true });
    await client.auth.signOut();
  }
  await mkdir('output/playwright', { recursive: true });
  await writeFile('output/playwright/workspace-load-benchmark.json', JSON.stringify(measurements, null, 2));
  console.log('WORKSPACE_LOAD_BENCHMARK ' + JSON.stringify(measurements));
}
