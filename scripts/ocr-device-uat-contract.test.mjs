import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUIRED_CASES, REQUIRED_VARIANTS, validateUatRun } from './ocr-device-uat-contract.mjs';
import { buildCliSummary, safeUatCliErrorMessage } from './validate-ocr-device-uat.mjs';

function validRun() {
  const roleByVariant = { site_owner: 'site', site_peer: 'site', office: 'office', director: 'director', cross_org: 'site' };
  const participants = REQUIRED_VARIANTS.map((variant, index) => ({
    alias: `user_${index + 1}`,
    variant,
    role: roleByVariant[variant],
    organizationAlias: variant === 'cross_org' ? 'org_beta' : 'org_alpha',
    siteAlias: variant === 'site_peer' ? 'site_beta' : variant === 'cross_org' ? 'site_gamma' : 'site_alpha',
  }));
  const aliasByVariant = Object.fromEntries(participants.map((participant) => [participant.variant, participant.alias]));
  const results = REQUIRED_CASES.flatMap((requirement) => requirement.platforms.map((platform) => ({
    caseId: requirement.id,
    platform,
    participantAlias: aliasByVariant[requirement.variant],
    outcome: 'pass',
    evidenceRef: `run-001/${requirement.id}-${platform}.json`,
  })));
  return {
    runId: '10000000-0000-4000-8000-000000000001',
    environment: 'remote-dev',
    projectRef: 'btdavpeyxtirtshovjdu',
    appCommit: 'a'.repeat(40),
    startedAt: '2026-08-24T08:00:00.000Z',
    completedAt: '2026-08-24T09:00:00.000Z',
    participants,
    devices: [
      { alias: 'android_uat', platform: 'android', osVersion: '15', appBuild: 'uat-001', signed: true },
      { alias: 'ios_uat', platform: 'ios', osVersion: '19', appBuild: 'uat-001', signed: true },
    ],
    results,
  };
}

test('accepts a complete five-user signed-device release run', () => {
  const result = validateUatRun(validRun());
  assert.equal(result.ok, true, result.issues.join('\n'));
  assert.equal(result.releaseReady, true);
  assert.equal(result.summary.results, 25);
});

test('rejects unapproved case and device platform additions', () => {
  const run = validRun();
  run.devices.push({ alias: 'desktop_uat', platform: 'desktop', osVersion: '1', appBuild: 'uat-001', signed: true });
  run.results.push({
    caseId: 'unreviewed_shortcut',
    platform: 'backend',
    participantAlias: 'user_1',
    outcome: 'pass',
    evidenceRef: 'run-001/unreviewed-shortcut.json',
  });
  const result = validateUatRun(run);
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /platform is invalid/);
  assert.match(result.issues.join('\n'), /not an approved case\/platform/);
});
test('rejects secrets, direct identifiers and private device paths', () => {
  const run = validRun();
  run.participants[0].email = 'person@example.test';
  run.results[0].notes = 'file:///data/user/0/private.jpg';
  const result = validateUatRun(run);
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /forbidden sensitive field/);
  assert.match(result.issues.join('\n'), /private device path/);
});

test('rejects an incomplete or failed release run by default', () => {
  const run = validRun();
  run.results.pop();
  run.results[0].outcome = 'blocked';
  const result = validateUatRun(run);
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /missing result/);
  assert.match(result.issues.join('\n'), /release is not ready/);
});

test('allows structurally valid in-progress evidence only when explicitly requested', () => {
  const run = validRun();
  run.results[0].outcome = 'blocked';
  const result = validateUatRun(run, { allowIncomplete: true });
  assert.equal(result.ok, true, result.issues.join('\n'));
  assert.equal(result.releaseReady, false);
});
test('CLI summaries and errors do not expose caller paths or parser fragments', () => {
  const summary = buildCliSummary({
    summary: { participants: 5, devices: 2, results: 25, passed: 25, failed: 0, blocked: 0 },
    releaseReady: true,
  });
  assert.deepEqual(Object.keys(summary).sort(), ['blocked', 'devices', 'failed', 'participants', 'passed', 'releaseReady', 'results']);
  const pathError = Object.assign(new Error("ENOENT C:\\Users\\person\\private\\uat.json"), { code: 'ENOENT' });
  assert.equal(safeUatCliErrorMessage(pathError), 'Unable to read the UAT result file.');
  assert.equal(safeUatCliErrorMessage(new SyntaxError('Unexpected token near secret-value')), 'UAT result file is not valid JSON.');
  assert.equal(safeUatCliErrorMessage(new Error('C:\\private\\unexpected')), 'UAT validation failed safely.');
});