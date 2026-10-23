import assert from 'node:assert/strict';
import test from 'node:test';
import { dockerDesktopCandidates, ensureDocker } from './ensure-docker.mjs';

test('returns immediately when Docker is already ready', async () => {
  let launches = 0;
  const result = await ensureDocker({ ready: () => true, launch: () => { launches += 1; }, log: () => {} });
  assert.deepEqual(result, { started: false });
  assert.equal(launches, 0);
});

test('starts Docker Desktop and waits until the engine is ready', async () => {
  let checks = 0; let launches = 0; let clock = 0;
  const result = await ensureDocker({
    platform: 'win32', env: { ProgramFiles: 'C:\\Program Files', SENATLA_DOCKER_START_TIMEOUT_MS: '10000' },
    exists: () => true, ready: () => ++checks >= 3, launch: () => { launches += 1; },
    sleep: async () => { clock += 2000; }, now: () => clock, log: () => {},
  });
  assert.deepEqual(result, { started: true });
  assert.equal(launches, 1);
});

test('fails clearly when automatic startup is disabled', async () => {
  await assert.rejects(() => ensureDocker({ ready: () => false, env: { SENATLA_DOCKER_AUTOSTART: '0' }, log: () => {} }), /automatic startup is disabled/);
});

test('supports an explicit Docker Desktop path before defaults', () => {
  assert.equal(dockerDesktopCandidates({ SENATLA_DOCKER_DESKTOP_PATH: 'D:\\Docker Desktop.exe', ProgramFiles: 'C:\\Program Files' })[0], 'D:\\Docker Desktop.exe');
});
