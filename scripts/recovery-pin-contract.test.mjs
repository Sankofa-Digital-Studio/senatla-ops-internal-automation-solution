import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRecoveryPinHandler,
  hashPin,
  isValidPinFormat,
} from '../api/auth/recovery-pin.mjs';

function mockResponse() {
  let statusCode = 200;
  let body = null;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      body = data;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

function mockClient({ recentPins = [], currentPin = null, user = { id: 'user-1', email: 'brian@senatlatrading.com' } } = {}) {
  const pinRows = [...recentPins];
  return {
    state: { pinRows },
    client: {
      auth: {
        getUser: async (token) => {
          if (!token || token === 'invalid') return { data: { user: null }, error: { message: 'Invalid token' } };
          return { data: { user }, error: null };
        },
        admin: {
          listUsers: async () => ({
            data: { users: [user] },
            error: null,
          }),
        },
      },
      from: (table) => {
        if (table !== 'recovery_pin_history') throw new Error(`Unexpected table ${table}`);
        return {
          select: () => ({
            eq: (field, val) => ({
              gte: (dateField, dateVal) => ({
                data: pinRows.filter((r) => r.created_at >= dateVal),
                error: null,
              }),
              eq: (field2, val2) => ({
                maybeSingle: async () => ({
                  data: currentPin,
                  error: null,
                }),
              }),
            }),
          }),
          update: (fields) => ({
            eq: () => {
              pinRows.forEach((r) => Object.assign(r, fields));
              return { error: null };
            },
          }),
          insert: async (row) => {
            pinRows.push(row);
            return { error: null };
          },
        };
      },
    },
  };
}

test('isValidPinFormat validates strictly 4 or 5 digits', () => {
  assert.equal(isValidPinFormat('1234'), true);
  assert.equal(isValidPinFormat('12345'), true);
  assert.equal(isValidPinFormat('123'), false); // too short
  assert.equal(isValidPinFormat('123456'), false); // too long
  assert.equal(isValidPinFormat('abcd'), false); // non-numeric
  assert.equal(isValidPinFormat('12a4'), false);
});

test('set-pin accepts valid 4-5 digit PIN for authenticated user and stores digest', async () => {
  process.env.SENATLA_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

  const { client, state } = mockClient();
  const handler = buildRecoveryPinHandler({ createAdminClient: () => client });

  const req = {
    method: 'POST',
    query: { action: 'set-pin' },
    headers: { authorization: 'Bearer valid-token' },
    body: { pin: '4829' },
  };
  const res = mockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(state.pinRows.length, 1);
  assert.equal(state.pinRows[0].pin_hash, hashPin('4829'));
  assert.equal(state.pinRows[0].is_current, true);
});

test('set-pin rejects reuse of same PIN within 30 days', async () => {
  process.env.SENATLA_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

  const existingHash = hashPin('9381');
  const now = new Date('2026-11-02T12:00:00Z');
  const usedTenDaysAgo = new Date('2026-10-23T12:00:00Z').toISOString();

  const { client } = mockClient({
    recentPins: [{ pin_hash: existingHash, created_at: usedTenDaysAgo }],
  });
  const handler = buildRecoveryPinHandler({ createAdminClient: () => client, now: () => now });

  const req = {
    method: 'POST',
    query: { action: 'set-pin' },
    headers: { authorization: 'Bearer valid-token' },
    body: { pin: '9381' }, // attempted reuse
  };
  const res = mockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /cannot be reused within 30 days/i);
});

test('verify-pin validates correct PIN for user email', async () => {
  process.env.SENATLA_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

  const correctHash = hashPin('72619');
  const { client } = mockClient({
    currentPin: { pin_hash: correctHash },
  });
  const handler = buildRecoveryPinHandler({ createAdminClient: () => client });

  // Correct PIN
  const reqSuccess = {
    method: 'POST',
    query: { action: 'verify-pin' },
    body: { email: 'brian@senatlatrading.com', pin: '72619' },
  };
  const resSuccess = mockResponse();
  await handler(reqSuccess, resSuccess);
  assert.equal(resSuccess.statusCode, 200);
  assert.equal(resSuccess.body.verified, true);

  // Incorrect PIN
  const reqFail = {
    method: 'POST',
    query: { action: 'verify-pin' },
    body: { email: 'brian@senatlatrading.com', pin: '1111' },
  };
  const resFail = mockResponse();
  await handler(reqFail, resFail);
  assert.equal(resFail.statusCode, 401);
});
