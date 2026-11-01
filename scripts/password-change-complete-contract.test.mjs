import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPasswordChangeCompleteHandler } from '../api/auth/password-change-complete.mjs';

function responseDouble() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function clientDouble({ email = 'worker@senatlatrading.com', mustChangePassword = true, updateError = null } = {}) {
  const state = { updates: [] };
  return {
    state,
    client: {
      auth: {
        getUser: async () => ({
          data: { user: { id: 'user-1', email, app_metadata: { role: 'site', must_change_password: mustChangePassword } } },
          error: null,
        }),
        admin: {
          updateUserById: async (userId, payload) => {
            state.updates.push({ userId, payload });
            return { error: updateError };
          },
        },
      },
    },
  };
}

function request() {
  return { method: 'POST', headers: { authorization: 'Bearer session-token' } };
}

test.beforeEach(() => {
  process.env.SENATLA_SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

test('clears only the protected forced-password flag', async () => {
  const { client, state } = clientDouble();
  const handler = buildPasswordChangeCompleteHandler({
    createAdminClient: () => client,
    now: () => new Date('2026-11-01T12:00:00.000Z'),
  });
  const res = responseDouble();

  await handler(request(), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, alreadyComplete: false });
  assert.deepEqual(state.updates, [{
    userId: 'user-1',
    payload: { app_metadata: { role: 'site', must_change_password: false, password_changed_at: '2026-11-01T12:00:00.000Z' } },
  }]);
});

test('is idempotent after the forced change is complete', async () => {
  const { client, state } = clientDouble({ mustChangePassword: false });
  const handler = buildPasswordChangeCompleteHandler({ createAdminClient: () => client });
  const res = responseDouble();

  await handler(request(), res);

  assert.deepEqual(res.body, { ok: true, alreadyComplete: true });
  assert.equal(state.updates.length, 0);
});

test('rejects a session for an external email', async () => {
  const { client, state } = clientDouble({ email: 'attacker@example.com' });
  const handler = buildPasswordChangeCompleteHandler({ createAdminClient: () => client });
  const res = responseDouble();

  await handler(request(), res);

  assert.equal(res.statusCode, 401);
  assert.equal(state.updates.length, 0);
});

test('fails closed when protected metadata cannot be cleared', async () => {
  const { client } = clientDouble({ updateError: new Error('unavailable') });
  const handler = buildPasswordChangeCompleteHandler({ createAdminClient: () => client });
  const res = responseDouble();

  await handler(request(), res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Password changed, but account activation could not be completed.' });
});
