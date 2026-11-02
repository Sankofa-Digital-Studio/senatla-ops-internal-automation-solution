import assert from 'node:assert/strict';
import test from 'node:test';
import { OPERATIONAL_USERS, seedOperationalUsers } from './seed-operational-users.mjs';
import { evaluatePassword } from './password-policy.mjs';

function mockAdminClient() {
  const users = new Map();
  const profiles = new Map();
  const siteAccess = [];

  return {
    state: { users, profiles, siteAccess },
    client: {
      auth: {
        admin: {
          listUsers: async () => ({
            data: { users: Array.from(users.values()) },
            error: null,
          }),
          createUser: async (payload) => {
            const id = `user-${users.size + 1}`;
            const user = { id, ...payload };
            users.set(id, user);
            return { data: { user }, error: null };
          },
          updateUserById: async (id, payload) => {
            const existing = users.get(id);
            if (!existing) return { error: { message: 'Not found' } };
            const updated = { ...existing, ...payload };
            users.set(id, updated);
            return { data: { user: updated }, error: null };
          },
        },
      },
      from: (table) => ({
        upsert: async (row) => {
          if (table === 'profiles') {
            profiles.set(row.id, row);
          } else if (table === 'site_access') {
            siteAccess.push(row);
          }
          return { error: null };
        },
      }),
    },
  };
}

test('OPERATIONAL_USERS defines the exact 3 required users and roles', () => {
  assert.equal(OPERATIONAL_USERS.length, 3);
  const byEmail = new Map(OPERATIONAL_USERS.map((u) => [u.email, u]));

  const brian = byEmail.get('brian@senatlatrading.com');
  assert.ok(brian);
  assert.equal(brian.role, 'site');

  const maggie = byEmail.get('maggie@senatlatrading.com');
  assert.ok(maggie);
  assert.equal(maggie.role, 'office');

  const rubin = byEmail.get('rubinthoso@senatlatrading.com');
  assert.ok(rubin);
  assert.equal(rubin.role, 'director');

  // Verify all temporary passwords meet password policy
  for (const user of OPERATIONAL_USERS) {
    const evalResult = evaluatePassword(user.tempPassword);
    assert.equal(evalResult.valid, true, `Temporary password for ${user.email} should be valid`);
    assert.equal(evalResult.acceptable, true, `Temporary password for ${user.email} should be acceptable`);
  }
});

test('seedOperationalUsers seeds auth users with must_change_password=true, creates profiles, and never sends emails', async () => {
  const { client, state } = mockAdminClient();
  const results = await seedOperationalUsers(OPERATIONAL_USERS, {
    adminClient: client,
    logger: { log: () => {}, error: () => {} },
  });

  assert.equal(results.length, 3);
  assert.ok(results.every((r) => r.ok));

  // Verify auth users created in DB
  assert.equal(state.users.size, 3);
  for (const user of state.users.values()) {
    assert.equal(user.app_metadata.must_change_password, true);
    assert.ok(user.password);
  }

  // Verify profiles created
  assert.equal(state.profiles.size, 3);
  const brianProfile = Array.from(state.profiles.values()).find((p) => p.username === 'brian@senatlatrading.com');
  assert.equal(brianProfile?.role, 'site');

  const maggieProfile = Array.from(state.profiles.values()).find((p) => p.username === 'maggie@senatlatrading.com');
  assert.equal(maggieProfile?.role, 'office');

  const rubinProfile = Array.from(state.profiles.values()).find((p) => p.username === 'rubinthoso@senatlatrading.com');
  assert.equal(rubinProfile?.role, 'director');

  // Verify site access was recorded for site user
  assert.ok(state.siteAccess.length >= 1);
});
