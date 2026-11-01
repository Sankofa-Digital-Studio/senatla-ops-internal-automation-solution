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
  authUser = { id: 'admin-1', email: 'director@senatlatrading.com' },
  adminProfile = { role: 'director', is_active: true, organization_id: 'org-1', display_name: 'Director Admin' },
  targetProfile = {
    id: 'user-2',
    username: 'worker@senatlatrading.com',
    display_name: 'Worker',
    role: 'site',
    is_active: true,
    organization_id: 'org-1',
  },
  initialHistory = [],
} = {}) {
  const state = {
    profileHistory: [...initialHistory],
    authUpdateCalls: [],
    profileUpdateCalls: [],
    authActivityEvents: [],
  };

  const client = {
    auth: {
      getUser: async () => ({ data: { user: authUser }, error: null }),
      admin: {
        updateUserById: async (userId, payload) => {
          state.authUpdateCalls.push({ userId, payload });
          return { error: null };
        },
      },
    },
    from(table) {
      if (table === 'profiles') {
        return {
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
                if (idFilter?.value === authUser.id && !orgFilter) {
                  return { data: adminProfile, error: null };
                }
                if (!targetProfile) return { data: null, error: null };
                if (orgFilter && orgFilter.value !== targetProfile.organization_id) {
                  return { data: null, error: null };
                }
                return { data: targetProfile, error: null };
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
                  Object.assign(targetProfile, payload);
                }
                return this;
              },
            };
          },
        };
      }

      if (table === 'profile_history') {
        return {
          async insert(payload) {
            const row = { id: `hist-${state.profileHistory.length + 1}`, recorded_at: new Date().toISOString(), ...payload };
            state.profileHistory.push(row);
            return { error: null };
          },
          select() {
            const filters = [];
            const query = {
              eq(field, value) {
                filters.push({ field, value });
                return query;
              },
              order() {
                return query;
              },
              async maybeSingle() {
                const idFilter = filters.find((f) => f.field === 'id');
                const profileFilter = filters.find((f) => f.field === 'profile_id');
                const found = state.profileHistory.find((h) => {
                  if (idFilter && h.id !== idFilter.value) return false;
                  if (profileFilter && h.profile_id !== profileFilter.value) return false;
                  return true;
                });
                return { data: found || null, error: null };
              },
              then(resolve) {
                const profileFilter = filters.find((f) => f.field === 'profile_id');
                const list = profileFilter
                  ? state.profileHistory.filter((h) => h.profile_id === profileFilter.value)
                  : state.profileHistory;
                resolve({ data: list, error: null });
              },
            };
            return query;
          },
        };
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

test('profile recovery: profile update records immutable snapshot in profile_history', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble();
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'update_profile',
      userId: 'user-2',
      email: 'promoted.worker@senatlatrading.com',
      displayName: 'Promoted Worker',
      role: 'director',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(state.profileHistory.length, 1);
  assert.equal(state.profileHistory[0].profile_id, 'user-2');
  assert.equal(state.profileHistory[0].change_type, 'role_changed');
  assert.equal(state.profileHistory[0].snapshot.role, 'director');
  assert.equal(state.profileHistory[0].snapshot.username, 'promoted.worker@senatlatrading.com');
});

test('profile recovery: negative privilege blocks office admin from rolling back profile', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    authUser: { id: 'admin-office', email: 'admin@senatlatrading.com' },
    adminProfile: { role: 'office', is_active: true, organization_id: 'org-1', display_name: 'Office Admin' },
    initialHistory: [
      {
        id: 'hist-1',
        profile_id: 'user-2',
        snapshot: { id: 'user-2', username: 'original@senatlatrading.com', display_name: 'Original', role: 'site', is_active: true },
        change_type: 'created',
      },
    ],
  });
  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'rollback_profile',
      userId: 'user-2',
      historyId: 'hist-1',
    },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.jsonBody, { error: 'Only Directors and the developer can rollback user profiles.' });
  assert.equal(state.authUpdateCalls.length, 0);
  assert.equal(state.profileUpdateCalls.length, 0);
});

test('profile recovery: director can rollback profile to previous immutable snapshot', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    authUser: { id: 'director-1', email: 'director@senatlatrading.com' },
    adminProfile: { role: 'director', is_active: true, organization_id: 'org-1', display_name: 'Director Admin' },
    targetProfile: {
      id: 'user-2',
      username: 'corrupted@senatlatrading.com',
      display_name: 'Corrupted Name',
      role: 'director',
      is_active: false,
      organization_id: 'org-1',
    },
    initialHistory: [
      {
        id: 'hist-1',
        profile_id: 'user-2',
        snapshot: {
          id: 'user-2',
          username: 'restored@senatlatrading.com',
          display_name: 'Original Worker',
          role: 'site',
          is_active: true,
          organization_id: 'org-1',
        },
        change_type: 'created',
      },
    ],
  });

  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'rollback_profile',
      userId: 'user-2',
      historyId: 'hist-1',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonBody.ok, true);
  assert.deepEqual(res.jsonBody.user, {
    id: 'user-2',
    username: 'restored@senatlatrading.com',
    displayName: 'Original Worker',
    role: 'site',
    isActive: true,
  });

  // Auth user was updated
  assert.deepEqual(state.authUpdateCalls, [
    { userId: 'user-2', payload: { email: 'restored@senatlatrading.com', ban_duration: 'none' } },
  ]);

  // Profile record was updated
  assert.deepEqual(state.profileUpdateCalls[0].payload, {
    username: 'restored@senatlatrading.com',
    display_name: 'Original Worker',
    role: 'site',
    is_active: true,
  });

  // Rollback generated a new history record
  assert.equal(state.profileHistory.length, 2);
  const rollbackRecord = state.profileHistory[1];
  assert.equal(rollbackRecord.change_type, 'rollback');
  assert.equal(rollbackRecord.snapshot.role, 'site');

  // Audit event was logged
  assert.equal(state.authActivityEvents.length, 1);
  assert.equal(state.authActivityEvents[0].event_type, 'profile_rolled_back');
});

test('profile recovery: developer thosontula@gmail.com can rollback profile', async () => {
  process.env.SENATLA_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const { client, state } = createClientDouble({
    authUser: { id: 'dev-1', email: 'thosontula@gmail.com' },
    adminProfile: { role: 'site', is_active: true, organization_id: 'org-1', display_name: 'Developer' },
    initialHistory: [
      {
        id: 'hist-good',
        profile_id: 'user-2',
        snapshot: {
          id: 'user-2',
          username: 'worker@senatlatrading.com',
          display_name: 'Good Worker',
          role: 'site',
          is_active: true,
          organization_id: 'org-1',
        },
        change_type: 'created',
      },
    ],
  });

  const handler = buildAdminUsersHandler({ createAdminClient: () => client });
  const res = createResponse();

  await handler({
    method: 'PATCH',
    headers: { authorization: 'Bearer token-1' },
    body: {
      action: 'rollback_profile',
      userId: 'user-2',
      historyId: 'hist-good',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonBody.ok, true);
  assert.equal(state.profileHistory[1].change_type, 'rollback');
});
