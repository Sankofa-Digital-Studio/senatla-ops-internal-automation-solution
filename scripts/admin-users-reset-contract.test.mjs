import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAdminUsersHandler, normalizeEmail } from '../api/admin/users-handler.mjs';

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
  authUser = { id: 'admin-1', email: 'admin@senatlatrading.com' },
  adminProfile = { role: 'office', is_active: true, organization_id: 'org-1', display_name: 'Office Admin' },
  targetProfile = {
    id: 'user-2',
    username: 'worker@senatlatrading.com',
    display_name: 'Worker',
    role: 'site',
    is_active: true,
    organization_id: 'org-1',
  },
  approvalRequests = [],
  resetError = null,
} = {}) {
  const state = {
    resetCalls: [],
    inviteCalls: [],
    authActivityEvents: [],
    lastProfileLookup: null,
    authUpdateCalls: [],
    profileUpdateCalls: [],
    profileUpsertCalls: [],
    approvalRequests: [...approvalRequests],
    approvalRequestUpdates: [],
  };

  const client = {
    auth: {
      getUser: async () => ({ data: { user: authUser }, error: null }),
      resetPasswordForEmail: async (email, options) => {
        state.resetCalls.push({ email, options });
        return resetError ? { error: resetError } : { error: null };
      },
      admin: {
        inviteUserByEmail: async (email) => {
          state.inviteCalls.push(email);
          return { data: { user: { id: 'invited-1', created_at: '2026-08-30T00:00:00.000Z' } }, error: null };
        },
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
      if (table === 'approval_requests') {
        return createApprovalRequestsQuery(state);
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  return { client, state };
}

function createApprovalRequestsQuery(state) {
  return {
    insert(payload) {
      const created = { id: `req-${state.approvalRequests.length + 1}`, ...payload };
      state.approvalRequests.push(created);
      return {
        select() {
          return {
            async maybeSingle() {
              return { data: created, error: null };
            },
          };
        },
      };
    },
    select() {
      const filters = [];
      const query = {
        eq(field, value) {
          filters.push({ field, value });
          return query;
        },
        async maybeSingle() {
          const idFilter = filters.find((f) => f.field === 'id');
          const orgFilter = filters.find((f) => f.field === 'organization_id');
          const found = state.approvalRequests.find((req) => {
            if (idFilter && req.id !== idFilter.value) return false;
            if (orgFilter && req.organization_id !== orgFilter.value) return false;
            return true;
          });
          return { data: found || null, error: null };
        },
      };
      return query;
    },
    update(payload) {
      return {
        eq(field, value) {
          state.approvalRequestUpdates.push({ payload, field, value });
          const target = state.approvalRequests.find((req) => req[field] === value);
          if (target) Object.assign(target, payload);
          return { error: null };
        },
      };
    },
  };
}

function createProfilesQuery(state, adminProfile, targetProfile) {
  return {
    async upsert(payload) {
      state.profileUpsertCalls.push(payload);
      return { error: null };
    },
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

test('normalizes only corporate email and the explicit developer mailbox aliases', () => {
  assert.equal(normalizeEmail(' Worker@SenatlaTrading.com '), 'worker@senatlatrading.com');
  assert.equal(normalizeEmail(' Thosontula@GMAIL.com '), 'thosontula@gmail.com');
  assert.equal(normalizeEmail(' Thosontula+Site.UAT@GMAIL.com '), 'thosontula+site.uat@gmail.com');

  for (const email of [
    'worker@example.com',
    'worker@senatlatrading.com.evil.example',
    'thosontula@gmail.com.evil.example',
    'thosontula+@gmail.com',
    'thosontula+site@googlemail.com',
    'not-an-email',
  ]) {
    assert.equal(normalizeEmail(email), '', email);
  }
});

test('admin invite accepts a developer plus alias and stores the normalized email', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer token-1' },
    body: { email: ' Thosontula+Provisioning@GMAIL.com ', displayName: 'Provisioning Test' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(state.inviteCalls, ['thosontula+provisioning@gmail.com']);
  assert.equal(state.profileUpsertCalls[0].username, 'thosontula+provisioning@gmail.com');
});

test('admin invite rejects external and lookalike domains before calling Supabase Auth', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  for (const email of ['worker@example.com', 'worker@senatlatrading.com.evil.example', 'thosontula+site@googlemail.com']) {
    const { client, state } = createClientDouble();
    const handler = buildAdminUsersHandler({ createAdminClient: () => client });
    const res = createResponse();

    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer token-1' },
      body: { email, displayName: 'Rejected User' },
    }, res);

    assert.equal(res.statusCode, 400, email);
    assert.deepEqual(res.jsonBody, { error: 'Email and display name are required.' });
    assert.equal(state.inviteCalls.length, 0);
  }
});

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
    message: 'Password reset email requested for worker@senatlatrading.com.',
  });
  assert.deepEqual(state.lastProfileLookup, { id: 'user-2', organizationId: 'org-1' });
  assert.deepEqual(state.resetCalls, [
    {
      email: 'worker@senatlatrading.com',
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
      username: 'worker@external.example',
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
      redirectTo: 'https://senatla.app/login/recovery',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.jsonBody, { error: 'Target user has no work email.' });
  assert.equal(state.resetCalls.length, 0);
});

test('admin send_reset rejects a syntactically valid corporate lookalike domain', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  delete process.env.SENATLA_ALLOWED_RESET_ORIGINS;

  const { client, state } = createClientDouble({
    targetProfile: {
      id: 'user-2',
      username: 'worker@senatlatrading.com.evil.example',
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
      redirectTo: 'https://senatla.app/login/recovery',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.jsonBody, { error: 'Target user has no work email.' });
  assert.equal(state.resetCalls.length, 0);
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
      redirectTo: 'https://attacker.example/login/recovery',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.jsonBody, {
    error: 'Password reset redirect must use an allowed application origin.',
  });
  assert.equal(state.resetCalls.length, 0);
});

test('admin send_reset accepts additional configured trusted origins', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  process.env.SENATLA_ALLOWED_RESET_ORIGINS = 'https://preview.senatla.app,https://staging.senatla.app';

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'send_reset',
      userId: 'user-2',
      redirectTo: 'https://preview.senatla.app/login/recovery',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(state.resetCalls, [
    {
      email: 'worker@senatlatrading.com',
      options: { redirectTo: 'https://preview.senatla.app/login/recovery' },
    },
  ]);
});

test('director update_profile updates auth and profile records and audits role changes', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SENATLA_APP_URL = 'https://senatla.app';
  delete process.env.SENATLA_ALLOWED_RESET_ORIGINS;

  const { client, state } = createClientDouble({
    authUser: { id: 'admin-1', email: 'director@senatlatrading.com' },
    adminProfile: { role: 'director', is_active: true, organization_id: 'org-1', display_name: 'Director Admin' },
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'update_profile',
      userId: 'user-2',
      email: 'Updated.Worker@senatlatrading.com',
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
      username: 'updated.worker@senatlatrading.com',
      displayName: 'Updated Worker',
      role: 'director',
      isActive: true,
    },
  });
  assert.deepEqual(state.authUpdateCalls, [
    { userId: 'user-2', payload: { email: 'updated.worker@senatlatrading.com' } },
  ]);
  assert.deepEqual(state.profileUpdateCalls, [
    {
      payload: {
        username: 'updated.worker@senatlatrading.com',
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
  assert.equal(state.authActivityEvents[0].event_type, 'role_changed');
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
      email: 'invalid-email',
      displayName: ' ',
      role: 'unknown-role',
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

test('negative privilege: office admin cannot elevate a user to Director', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    adminProfile: { role: 'office', is_active: true, organization_id: 'org-1', display_name: 'Office Admin' },
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const req = {
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'update_profile',
      userId: 'user-2',
      email: 'worker@senatlatrading.com',
      displayName: 'Worker',
      role: 'director',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.jsonBody, { error: 'Office administrators cannot modify Director accounts or elevate users to Director.' });
  assert.equal(state.authUpdateCalls.length, 0);
  assert.equal(state.profileUpdateCalls.length, 0);
});

test('negative privilege: office admin cannot modify or suspend an existing Director', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    adminProfile: { role: 'office', is_active: true, organization_id: 'org-1', display_name: 'Office Admin' },
    targetProfile: {
      id: 'director-1',
      username: 'director@senatlatrading.com',
      display_name: 'Director User',
      role: 'director',
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
      userId: 'director-1',
    },
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.jsonBody, { error: 'Office administrators cannot modify Director accounts.' });
  assert.equal(state.authUpdateCalls.length, 0);
  assert.equal(state.profileUpdateCalls.length, 0);
});

test('negative privilege: site role actor is blocked from user management', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client } = createClientDouble({
    adminProfile: { role: 'site', is_active: true, organization_id: 'org-1', display_name: 'Site Worker' },
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer token-1' },
    body: { email: 'worker@senatlatrading.com', displayName: 'Worker' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.jsonBody, { error: 'Only authorized administrators and directors can manage users.' });
});

test('office admin inviting a director routes to approval request (maker-checker)', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    adminProfile: { role: 'office', is_active: true, organization_id: 'org-1', display_name: 'Office Admin' },
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer token-1' },
    body: { email: 'new.director@senatlatrading.com', displayName: 'New Director', role: 'director' },
  }, res);

  assert.equal(res.statusCode, 202);
  assert.equal(res.jsonBody.pendingApproval, true);
  assert.equal(state.approvalRequests.length, 1);
  assert.equal(state.approvalRequests[0].request_type, 'director_creation');
  assert.equal(state.approvalRequests[0].status, 'pending');
  assert.equal(state.inviteCalls.length, 0); // Not invited yet
});

test('director can invite a director directly without pending approval', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    adminProfile: { role: 'director', is_active: true, organization_id: 'org-1', display_name: 'Director Admin' },
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer token-1' },
    body: { email: 'new.director@senatlatrading.com', displayName: 'New Director', role: 'director' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(state.approvalRequests.length, 0);
  assert.deepEqual(state.inviteCalls, ['new.director@senatlatrading.com']);
  assert.equal(state.profileUpsertCalls[0].role, 'director');
});

test('director approves pending director creation request', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    adminProfile: { role: 'director', is_active: true, organization_id: 'org-1', display_name: 'Director Admin' },
    approvalRequests: [
      {
        id: 'req-42',
        request_type: 'director_creation',
        status: 'pending',
        organization_id: 'org-1',
        payload: { email: 'approved.director@senatlatrading.com', displayName: 'Approved Director', role: 'director' },
      },
    ],
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: { action: 'approve_director', requestId: 'req-42' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonBody.ok, true);
  assert.deepEqual(state.inviteCalls, ['approved.director@senatlatrading.com']);
  assert.equal(state.profileUpsertCalls[0].role, 'director');
  assert.equal(state.approvalRequests[0].status, 'approved');
});

test('negative privilege: office admin cannot approve a director creation request', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    adminProfile: { role: 'office', is_active: true, organization_id: 'org-1', display_name: 'Office Admin' },
    approvalRequests: [
      {
        id: 'req-42',
        request_type: 'director_creation',
        status: 'pending',
        organization_id: 'org-1',
        payload: { email: 'approved.director@senatlatrading.com', displayName: 'Approved Director', role: 'director' },
      },
    ],
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: { action: 'approve_director', requestId: 'req-42' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.jsonBody, { error: 'Only Directors and the developer can approve Director creation requests.' });
  assert.equal(state.inviteCalls.length, 0);
});

test('developer thosontula@gmail.com has full control over user management and approval', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    authUser: { id: 'dev-1', email: 'thosontula@gmail.com' },
    adminProfile: { role: 'site', is_active: true, organization_id: 'org-1', display_name: 'Developer' }, // Even with site role stored
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer token-1' },
    body: { email: 'dev.invited@senatlatrading.com', displayName: 'Invited by Dev', role: 'director' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(state.inviteCalls, ['dev.invited@senatlatrading.com']);
  assert.equal(state.profileUpsertCalls[0].role, 'director');
});

test('admin suspend rejects self-suspension before mutating auth or profiles', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    targetProfile: {
      id: 'admin-1',
      username: 'admin@senatlatrading.com',
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
      username: 'worker@senatlatrading.com',
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
