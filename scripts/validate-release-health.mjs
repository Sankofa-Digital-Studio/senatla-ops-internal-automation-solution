import http from 'node:http';
import https from 'node:https';

export const DEFAULT_TARGETS = [
  {
    id: 'canonical-dev-apk',
    label: 'Canonical Dev APK Asset',
    url: 'https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/releases/download/dev-latest/senatla-ops-dev.apk',
    expectedStatuses: [200, 301, 302],
    critical: true,
  },
  {
    id: 'historical-dev-apk',
    label: 'Historical Dev APK Redirect',
    url: 'https://github.com/Sankofa-Digital-Studio/senatla-ops/releases/download/dev-latest/senatla-ops-dev.apk',
    expectedStatuses: [200, 301, 302],
    critical: false,
  },
];

export function checkUrlOffline(target) {
  try {
    const parsed = new URL(target.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, error: `Invalid protocol: ${parsed.protocol}` };
    }
    if (!parsed.hostname.includes('.')) {
      return { ok: false, error: `Invalid hostname: ${parsed.hostname}` };
    }
    return { ok: true, status: 200, simulated: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function checkUrlOnline(target, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(target.url);
      const transport = parsed.protocol === 'https:' ? https : http;

      const req = transport.request(
        parsed,
        {
          method: 'HEAD',
          headers: {
            'User-Agent': 'SenatlaOps-ReleaseHealthValidator/1.0',
          },
          timeout: timeoutMs,
        },
        (res) => {
          const status = res.statusCode || 0;
          const ok = target.expectedStatuses.includes(status);
          resolve({
            ok,
            status,
            location: res.headers['location'],
            error: ok ? null : `Unexpected status ${status}; expected ${target.expectedStatuses.join(', ')}`,
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 0, error: `Timeout after ${timeoutMs}ms` });
      });

      req.on('error', (err) => {
        resolve({ ok: false, status: 0, error: err.message });
      });

      req.end();
    } catch (err) {
      resolve({ ok: false, status: 0, error: err.message });
    }
  });
}

export async function validateReleaseHealth({ targets = DEFAULT_TARGETS, offline = false, checker = null } = {}) {
  const runCheck = checker || (offline ? checkUrlOffline : checkUrlOnline);
  const results = [];

  for (const target of targets) {
    const checkResult = await runCheck(target);
    results.push({
      target,
      ...checkResult,
    });
  }

  const failures = results.filter((r) => !r.ok && r.target.critical);
  const passed = failures.length === 0;

  return {
    passed,
    timestamp: new Date().toISOString(),
    mode: offline ? 'offline' : 'online',
    results,
    failures,
  };
}

export function formatReport(report) {
  const lines = [
    `=== Senatla Ops Release Health Report (${report.mode.toUpperCase()}) ===`,
    `Checked at: ${report.timestamp}`,
    `Overall status: ${report.passed ? 'PASS' : 'FAIL'}`,
    '',
  ];

  for (const r of report.results) {
    const symbol = r.ok ? '✓' : '✗';
    const statusText = r.status ? `(HTTP ${r.status})` : '';
    lines.push(`  ${symbol} ${r.target.label} ${statusText}`);
    lines.push(`    URL: ${r.target.url}`);
    if (r.location) lines.push(`    Redirect: ${r.location}`);
    if (r.error) lines.push(`    ERROR: ${r.error}`);
  }

  if (report.failures.length > 0) {
    lines.push('', 'Actionable resolution:');
    for (const f of report.failures) {
      lines.push(`  - Verify that CI workflow (native-platforms.yml) uploaded ${f.target.label} to tag 'dev-latest' in GitHub Releases.`);
    }
  }

  return lines.join('\n');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const offline = process.argv.includes('--offline');
  validateReleaseHealth({ offline }).then((report) => {
    console.log(formatReport(report));
    if (!report.passed) {
      process.exitCode = 1;
    }
  });
}
