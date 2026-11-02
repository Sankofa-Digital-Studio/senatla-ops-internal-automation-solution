import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_TARGETS,
  checkUrlOffline,
  formatReport,
  validateReleaseHealth,
} from './validate-release-health.mjs';

test('offline check validates valid URLs without network egress', () => {
  const result = checkUrlOffline({ url: 'https://example.com/asset.apk' });
  assert.equal(result.ok, true);
  assert.equal(result.simulated, true);

  const invalid = checkUrlOffline({ url: 'ftp://bad-url' });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /Invalid protocol/);
});

test('validateReleaseHealth in offline mode evaluates all default targets successfully', async () => {
  const report = await validateReleaseHealth({ offline: true });

  assert.equal(report.passed, true);
  assert.equal(report.mode, 'offline');
  assert.equal(report.results.length, DEFAULT_TARGETS.length);
  assert.equal(report.failures.length, 0);

  const formatted = formatReport(report);
  assert.match(formatted, /=== Senatla Ops Release Health Report \(OFFLINE\) ===/);
  assert.match(formatted, /Overall status: PASS/);
  assert.match(formatted, /Canonical Dev APK Asset/);
});

test('validateReleaseHealth flags failures and provides actionable instructions', async () => {
  const mockChecker = async (target) => {
    if (target.id === 'canonical-dev-apk') {
      return { ok: false, status: 404, error: 'Unexpected status 404' };
    }
    return { ok: true, status: 200, error: null };
  };

  const report = await validateReleaseHealth({ checker: mockChecker });

  assert.equal(report.passed, false);
  assert.equal(report.failures.length, 1);
  assert.equal(report.failures[0].target.id, 'canonical-dev-apk');

  const formatted = formatReport(report);
  assert.match(formatted, /Overall status: FAIL/);
  assert.match(formatted, /Actionable resolution:/);
  assert.match(formatted, /native-platforms\.yml/);
});
