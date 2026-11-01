import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deliverTemporaryPassword,
  normalizeProvisioningEmail,
  provisionUsers,
  runProvisioningCli,
  validateProvisioningManifest,
} from './provision-users.mjs';

const validUser = {
  email: 'worker@senatlatrading.com',
  displayName: 'Worker One',
  role: 'site',
  tempPassword: 'TempPass!2345',
  organizationId: '00000000-0000-4000-8000-000000000001',
  siteIds: ['10000000-0000-4000-8000-000000000001'],
};

function createAdminDouble({ createError = null, profileError = null, accessError = null, deleteError = null } = {}) {
  const state = { createCalls: [], profileCalls: [], accessCalls: [], deleteCalls: [] };
  const client = {
    auth: {
      admin: {
        async createUser(payload) {
          state.createCalls.push(payload);
          if (createError) return { data: { user: null }, error: new Error(createError) };
          return { data: { user: { id: 'user-1' } }, error: null };
        },
        async deleteUser(userId) {
          state.deleteCalls.push(userId);
          return deleteError ? { error: new Error(deleteError) } : { error: null };
        },
      },
    },
    from(table) {
      return {
        async upsert(payload, options) {
          if (table === 'profiles') {
            state.profileCalls.push(payload);
            return profileError ? { error: new Error(profileError) } : { error: null };
          }
          state.accessCalls.push({ payload, options });
          return accessError ? { error: new Error(accessError) } : { error: null };
        },
      };
    },
  };
  return { client, state };
}

test('normalizes only corporate and developer mailbox addresses', () => {
  assert.equal(normalizeProvisioningEmail(' Worker@SenatlaTrading.com '), 'worker@senatlatrading.com');
  assert.equal(normalizeProvisioningEmail('Thosontula+Site@GMAIL.com'), 'thosontula+site@gmail.com');
  assert.equal(normalizeProvisioningEmail('worker@example.com'), '');
  assert.equal(normalizeProvisioningEmail('worker@senatlatrading.com.evil.test'), '');
});

test('validates and normalizes a provisioning manifest without exposing passwords', () => {
  const [user] = validateProvisioningManifest({ users: [{ ...validUser, email: ' WORKER@SENATLATrading.com ', siteIds: [...validUser.siteIds, ...validUser.siteIds] }] });
  assert.equal(user.email, 'worker@senatlatrading.com');
  assert.deepEqual(user.siteIds, validUser.siteIds);

  assert.throws(
    () => validateProvisioningManifest({ users: [{ ...validUser, tempPassword: 'weak' }] }),
    /12\+ characters/,
  );
  assert.throws(
    () => validateProvisioningManifest({ users: [{ ...validUser, email: 'worker@example.com' }] }),
    /unauthorized email/,
  );
});

test('creates Auth, profile, and site access before delivering the temporary password', async () => {
  const { client, state } = createAdminDouble();
  const delivered = [];
  const logs = [];
  const results = await provisionUsers([validUser], {
    adminClient: client,
    sendTemporaryPassword: async (user) => delivered.push(user.email),
    logger: { info: (message) => logs.push(message) },
  });

  assert.deepEqual(results, [{ id: 'user-1', email: validUser.email, role: 'site' }]);
  assert.deepEqual(state.createCalls, [{
    email: validUser.email,
    password: validUser.tempPassword,
    email_confirm: true,
    app_metadata: { must_change_password: true, role: 'site' },
    user_metadata: { display_name: validUser.displayName },
  }]);
  assert.equal(state.profileCalls[0].username, validUser.email);
  assert.equal(state.accessCalls[0].payload[0].profile_id, 'user-1');
  assert.deepEqual(delivered, [validUser.email]);
  assert.equal(state.deleteCalls.length, 0);
  assert.equal(logs.join(' ').includes(validUser.tempPassword), false);
});

test('rolls back the Auth user when profile setup fails', async () => {
  const { client, state } = createAdminDouble({ profileError: 'profile unavailable' });
  let delivered = false;
  await assert.rejects(
    () => provisionUsers([validUser], {
      adminClient: client,
      sendTemporaryPassword: async () => { delivered = true; },
      logger: { info() {} },
    }),
    /Provisioning failed for worker@senatlatrading.com/,
  );
  assert.deepEqual(state.deleteCalls, ['user-1']);
  assert.equal(delivered, false);
});

test('rolls back the Auth user when temporary-password delivery fails', async () => {
  const { client, state } = createAdminDouble();
  await assert.rejects(
    () => provisionUsers([validUser], {
      adminClient: client,
      sendTemporaryPassword: async () => { throw new Error('email unavailable'); },
      logger: { info() {} },
    }),
    /email unavailable/,
  );
  assert.deepEqual(state.deleteCalls, ['user-1']);
});

test('redacts the temporary password from provider errors', async () => {
  const { client } = createAdminDouble();
  await assert.rejects(
    () => provisionUsers([validUser], {
      adminClient: client,
      sendTemporaryPassword: async () => { throw new Error(`delivery rejected ${validUser.tempPassword}`); },
      logger: { info() {} },
    }),
    (error) => !error.message.includes(validUser.tempPassword) && error.message.includes('[redacted]'),
  );
});

test('delivers the temporary password only to an HTTPS webhook', async () => {
  const calls = [];
  await deliverTemporaryPassword({
    fetchImpl: async (...args) => { calls.push(args); return { ok: true, status: 202 }; },
    webhookUrl: 'https://mailer.example.test/provision',
    webhookToken: 'secret-token',
    appUrl: 'https://ops.example.test/login',
    user: validUser,
  });

  assert.equal(calls[0][0].href, 'https://mailer.example.test/provision');
  assert.equal(calls[0][1].headers.authorization, 'Bearer secret-token');
  const body = JSON.parse(calls[0][1].body);
  assert.equal(body.temporaryPassword, validUser.tempPassword);
  assert.equal(body.forcePasswordChange, true);

  await assert.rejects(
    () => deliverTemporaryPassword({ fetchImpl: async () => ({ ok: true }), webhookUrl: 'http://mailer.test', user: validUser }),
    /must use HTTPS/,
  );
});

test('CLI fails closed when required server configuration is missing', async () => {
  let readCalled = false;
  await assert.rejects(
    () => runProvisioningCli({
      argv: ['node', 'script', 'users.json'],
      env: {},
      readFileImpl: async () => { readCalled = true; return '{}'; },
    }),
    /requires Supabase admin, email webhook, and application URL configuration/,
  );
  assert.equal(readCalled, false);
});
