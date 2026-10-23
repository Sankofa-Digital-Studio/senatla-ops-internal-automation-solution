import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAdminUsersHandler } from '../api/admin/users-handler.mjs';

function createResponse() {
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

function createClientDouble({
  adminProfile = { role: 'office', is_active: true, organization_id: 'org-1', display_name: 'Office Admin' },
  targetProfile = {
    id: 'user-2',
    username: 'worker@example.com',
    display_name: 'Worker',
    role: 'site',
    is_active: true,
    organization_id: 'org-1',
  },
  resetError = null,
} = {}) {
  const state = {
    resetCalls: [],
    authActivityEvents: [],
    lastProfileLookup: null,
    authUpdateCalls: [],
    profileUpdateCalls: [],
  };

  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }),
      resetPasswordForEmail: async (email, options) => {
        state.resetCalls.push({ email, options });
        return resetError ? { error: resetError } : { error: null };
      },
      admin: {
        inviteUserByEmail: async () => ({ data: { user: { id: 'invited-1', created_at: '2026-08-30T00:00:00.000Z' } }, error: null }),
        updateUserById: async (userId, payload) => {
          state.authUpdateCalls.push({ userId, payload });
          return { error: null };
        },
      },
    },
    from(table) {
      if (table === 'profiles') {
        return createProfilesQuery(state, adminProfile, targetProfile);
      }
      if (table === 'auth_activity_events') {
        return {
          async insert(payload) {
            state.authActivityEvents.push(payload);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  return { client, state };
}

function createProfilesQuery(state, adminProfile, targetProfile) {
  return {
    select() {
      const filters = [];
      const query = {
        eq(field, value) {
          filters.push({ field, value });
          return query;
        },
        async maybeSingle() {
          const idFilter = filters.find((filter) => filter.field === 'id');
          const orgFilter = filters.find((filter) => filter.field === 'organization_id');

          if (idFilter?.value === 'admin-1' && !orgFilter) {
            return { data: adminProfile, error: null };
          }

          state.lastProfileLookup = { id: idFilter?.value, organizationId: orgFilter?.value };
          if (!targetProfile) return { data: null, error: null };
          if (orgFilter && orgFilter.value !== targetProfile.organization_id) {
            return { data: null, error: null };
          }
          return { data: targetProfile, error: null };
        },
        async upsert() {
          return { error: null };
        },
        update() {
          let payload = null;
          return {
            payload: null,
            updatePayload(value) {
              payload = value;
              return this;
            },
            eq() {
              if (payload) {
                state.profileUpdateCalls.push(payload);
              }
              return this;
            },
          };
        },
      };
      return query;
    },
    update(payload) {
      const filters = [];
      return {
        eq(field, value) {
          filters.push({ field, value });
          if (filters.length === 2) {
            state.profileUpdateCalls.push({ payload, filters });
          }
          return this;
        },
      };
    },
  };
}

test('admin send_reset requests a reset email, preserves redirectTo, and audits the event', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  delete process.env.SENATLA_ALLOWED_RESET_ORIGINS;

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'send_reset',
      userId: 'user-2',
      redirectTo: 'https://senatla.app/login/recovery',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.jsonBody, {
    ok: true,
    message: 'Password reset email requested for worker@example.com.',
  });
  assert.deepEqual(state.lastProfileLookup, { id: 'user-2', organizationId: 'org-1' });
  assert.deepEqual(state.resetCalls, [
    {
      email: 'worker@example.com',
      options: { redirectTo: 'https://senatla.app/login/recovery' },
    },
  ]);
  assert.equal(state.authActivityEvents.length, 1);
  assert.equal(state.authActivityEvents[0].event_type, 'password_reset_requested');
  assert.equal(state.authActivityEvents[0].target_profile_id, 'user-2');
});

test('admin send_reset omits redirect options when redirectTo is blank', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  delete process.env.SENATLA_ALLOWED_RESET_ORIGINS;

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'send_reset',
      userId: 'user-2',
      redirectTo: '   ',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(state.resetCalls.length, 1);
  assert.equal(state.resetCalls[0].options, undefined);
});

test('admin send_reset fails closed when the user is outside the admin organization scope', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  delete process.env.SENATLA_ALLOWED_RESET_ORIGINS;

  const { client, state } = createClientDouble({ targetProfile: null });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'send_reset',
      userId: 'user-404',
      redirectTo: 'https://senatla.app/login/recovery',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.jsonBody, { error: 'User profile not found.' });
  assert.equal(state.resetCalls.length, 0);
  assert.equal(state.authActivityEvents.length, 0);
});

test('admin send_reset rejects users without a valid work email', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  delete process.env.SENATLA_ALLOWED_RESET_ORIGINS;

  const { client, state } = createClientDouble({
    targetProfile: {
      id: 'user-2',
      username: 'not-an-email',
      display_name: 'Worker',
      role: 'site',
      is_active: true,
      organization_id: 'org-1',
    },
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'send_reset',
      userId: 'user-2',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.jsonBody, { error: 'Target user has no work email.' });
  assert.equal(state.resetCalls.length, 0);
  assert.equal(state.authActivityEvents.length, 0);
});

test('admin send_reset rejects redirectTo values outside the configured application origins', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  delete process.env.SENATLA_ALLOWED_RESET_ORIGINS;

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'send_reset',
      userId: 'user-2',
      redirectTo: 'https://evil.example/login/recovery',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.jsonBody, { error: 'Password reset redirect must use an allowed application origin.' });
  assert.equal(state.resetCalls.length, 0);
  assert.equal(state.authActivityEvents.length, 0);
});

test('admin send_reset accepts additional configured trusted origins', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  process.env.SENATLA_ALLOWED_RESET_ORIGINS = 'https://uat.senatla.app, https://ops.senatla.app';

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'send_reset',
      userId: 'user-2',
      redirectTo: 'https://uat.senatla.app/login/recovery?from=admin',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(state.resetCalls, [
    {
      email: 'worker@example.com',
      options: { redirectTo: 'https://uat.senatla.app/login/recovery?from=admin' },
    },
  ]);
});

test('admin update_profile updates auth and profile records and audits role changes', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  delete process.env.SENATLA_ALLOWED_RESET_ORIGINS;

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'update_profile',
      userId: 'user-2',
      email: 'Updated.Worker@Example.com',
      displayName: 'Updated Worker',
      role: 'director',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.jsonBody, {
    ok: true,
    user: {
      id: 'user-2',
      username: 'updated.worker@example.com',
      displayName: 'Updated Worker',
      role: 'director',
      isActive: true,
    },
  });
  assert.deepEqual(state.authUpdateCalls, [
    { userId: 'user-2', payload: { email: 'updated.worker@example.com' } },
  ]);
  assert.deepEqual(state.profileUpdateCalls, [
    {
      payload: {
        username: 'updated.worker@example.com',
        display_name: 'Updated Worker',
        role: 'director',
      },
      filters: [
        { field: 'id', value: 'user-2' },
        { field: 'organization_id', value: 'org-1' },
      ],
    },
  ]);
  assert.equal(state.authActivityEvents.length, 1);
  assert.deepEqual(state.authActivityEvents[0].details, { from: 'site', to: 'director' });
});

test('admin update_profile rejects invalid profile payloads before mutating auth or profiles', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'update_profile',
      userId: 'user-2',
      email: 'bad-email',
      displayName: '   ',
      role: 'super-admin',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.jsonBody, { error: 'Email, display name, and role are required.' });
  assert.equal(state.authUpdateCalls.length, 0);
  assert.equal(state.profileUpdateCalls.length, 0);
  assert.equal(state.authActivityEvents.length, 0);
});

test('admin suspend rejects self-suspension before mutating auth or profiles', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    targetProfile: {
      id: 'admin-1',
      username: 'admin@example.com',
      display_name: 'Office Admin',
      role: 'office',
      is_active: true,
      organization_id: 'org-1',
    },
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'suspend',
      userId: 'admin-1',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.jsonBody, { error: 'Office administrators cannot suspend their own account.' });
  assert.equal(state.authUpdateCalls.length, 0);
  assert.equal(state.profileUpdateCalls.length, 0);
  assert.equal(state.authActivityEvents.length, 0);
});

test('admin suspend deactivates the target account and records the lifecycle audit event', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'suspend',
      userId: 'user-2',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(state.profileUpdateCalls, [
    {
      payload: { is_active: false },
      filters: [
        { field: 'id', value: 'user-2' },
        { field: 'organization_id', value: 'org-1' },
      ],
    },
  ]);
  assert.deepEqual(state.authUpdateCalls, [
    { userId: 'user-2', payload: { ban_duration: '876000h' } },
  ]);
  assert.equal(state.authActivityEvents.length, 1);
  assert.equal(state.authActivityEvents[0].event_type, 'account_deactivated');
});

test('admin activate re-enables the target account and records the lifecycle audit event', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    targetProfile: {
      id: 'user-2',
      username: 'worker@example.com',
      display_name: 'Worker',
      role: 'site',
      is_active: false,
      organization_id: 'org-1',
    },
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'activate',
      userId: 'user-2',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(state.profileUpdateCalls, [
    {
      payload: { is_active: true },
      filters: [
        { field: 'id', value: 'user-2' },
        { field: 'organization_id', value: 'org-1' },
      ],
    },
  ]);
  assert.deepEqual(state.authUpdateCalls, [
    { userId: 'user-2', payload: { ban_duration: 'none' } },
  ]);
  assert.equal(state.authActivityEvents.length, 1);
  assert.equal(state.authActivityEvents[0].event_type, 'account_activated');
});
