import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCompletePasswordSetupHandler } from '../api/auth/complete-password-setup.mjs';
import { buildAdminUsersHandler } from '../api/admin/users-handler.mjs';

function response() {
  return {
    statusCode: 200,
    jsonBody: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
  };
}

function adminClientDouble() {
  const state = { created: null, profile: null, siteAccess: null, deleted: [], authUpdate: null };
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }),
      admin: {
        createUser: async (payload) => {
          state.created = payload;
          return { data: { user: { id: 'user-1', created_at: '2026-10-17T00:00:00Z' } }, error: null };
        },
        deleteUser: async (id) => {
          state.deleted.push(id);
          return { error: null };
        },
        updateUserById: async (id, payload) => {
          state.authUpdate = { id, payload };
          return { error: null };
        },
      },
    },
    from(table) {
      if (table === 'profiles' || table === 'sites') {
        const filters = {};
        const query = {
          select() { return query; },
          eq(field, value) { filters[field] = value; return query; },
          async maybeSingle() {
            return table === 'profiles'
              ? { data: { role: 'office', is_active: true, organization_id: 'org-1' }, error: null }
              : { data: filters.id === '11111111-1111-4111-8111-111111111111' && filters.organization_id === 'org-1' ? { id: filters.id } : null, error: null };
          },
          async upsert(payload) {
            if (table === 'profiles') state.profile = payload;
            if (table === 'sites') state.siteAccess = payload;
            return { error: null };
          },
        };
        return query;
      }
      if (table === 'profile_site_access') {
        return { async upsert(payload) { state.siteAccess = payload; return { error: null }; } };
      }
      if (table === 'auth_activity_events') {
        return { async insert() { return { error: null }; } };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
  return { client, state };
}

function setProvisioningEnv() {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.RESEND_API_KEY = 'test-mail-key';
  process.env.SENATLA_EMAIL_FROM = 'Senatla Ops <no-reply@example.com>';
  process.env.SENATLA_APP_URL = 'https://senatla.example';
}

test('admin invitation provisions scoped read-only user and sends temporary credentials by email', async (t) => {
  setProvisioningEnv();
  const { client, state } = adminClientDouble();
  const oldFetch = globalThis.fetch;
  let sentEmail;
  globalThis.fetch = async (_url, options) => {
    sentEmail = JSON.parse(options.body);
    return { ok: true };
  };
  t.after(() => { globalThis.fetch = oldFetch; });

  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer verified-admin-token' },
    body: {
      email: 'new.user@example.com',
      displayName: 'New User',
      role: 'director',
      siteId: '11111111-1111-4111-8111-111111111111',
    },
  };
  const res = response();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonBody.user.role, 'readonly');
  assert.equal(res.jsonBody.user.username, 'new.user@example.com');
  assert.equal('tempPassword' in res.jsonBody, false);
  assert.equal(state.created.email, 'new.user@example.com');
  assert.equal(state.created.app_metadata.must_change_password, true);
  assert.match(state.created.password, /[A-Z]/);
  assert.match(state.created.password, /[a-z]/);
  assert.match(state.created.password, /[0-9]/);
  assert.match(state.created.password, /[!]/);
  assert.deepEqual(state.profile, {
    id: 'user-1',
    username: 'new.user@example.com',
    display_name: 'New User',
    role: 'readonly',
    is_active: true,
    organization_id: 'org-1',
  });
  assert.deepEqual(state.siteAccess, {
    profile_id: 'user-1',
    site_id: '11111111-1111-4111-8111-111111111111',
    organization_id: 'org-1',
  });
  assert.deepEqual(sentEmail.to, ['new.user@example.com']);
  assert.match(sentEmail.text, new RegExp(state.created.password));
  assert.match(sentEmail.text, /Username: new\.user@example\.com/);
  assert.match(sentEmail.text, /required to choose and confirm a new password/);
});

test('invitation rolls back the account if email delivery fails', async (t) => {
  setProvisioningEnv();
  const { client, state } = adminClientDouble();
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false });
  t.after(() => { globalThis.fetch = oldFetch; });

  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer verified-admin-token' },
    body: {
      email: 'new.user@example.com',
      displayName: 'New User',
      siteId: '11111111-1111-4111-8111-111111111111',
    },
  };
  const res = response();

  await handler(req, res);

  assert.equal(res.statusCode, 502);
  assert.deepEqual(state.deleted, ['user-1']);
});

test('password setup requires an authenticated pending account and updates password with the flag atomically', async () => {
  setProvisioningEnv();
  let adminUpdate;
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-1', app_metadata: { must_change_password: true, provider: 'email' } } },
        error: null,
      }),
      admin: {
        updateUserById: async (id, payload) => {
          adminUpdate = { id, payload };
          return { error: null };
        },
      },
    },
  };
  const handler = buildCompletePasswordSetupHandler({ createAdminClient: () => client });
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer verified-user-token' },
    body: { password: 'New-Strong-Password9!' },
  };
  const res = response();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(adminUpdate, {
    id: 'user-1',
    payload: {
      password: 'New-Strong-Password9!',
      app_metadata: { must_change_password: false, provider: 'email' },
    },
  });
});

test('password setup rejects short passwords without calling the admin update endpoint', async () => {
  setProvisioningEnv();
  let updateCalled = false;
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-1', app_metadata: { must_change_password: true } } },
        error: null,
      }),
      admin: {
        updateUserById: async () => {
          updateCalled = true;
          return { error: null };
        },
      },
    },
  };
  const handler = buildCompletePasswordSetupHandler({ createAdminClient: () => client });
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer verified-user-token' },
    body: { password: 'short' },
  };
  const res = response();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(updateCalled, false);
});
