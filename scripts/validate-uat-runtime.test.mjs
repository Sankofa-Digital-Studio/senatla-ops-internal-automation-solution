import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUatRuntime } from './validate-uat-runtime.mjs';
const valid = () => ({ api: { mode: 'supabase', baseUrl: 'https://uat.example.com', supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'sb_publishable_test_fixture_only' } });
test('accepts connected UAT configuration', () => assert.doesNotThrow(() => validateUatRuntime(valid())));
test('rejects local, missing endpoints, insecure endpoints, and privileged keys', () => {
  for (const patch of [{mode:'local'}, {baseUrl:''}, {baseUrl:'http://example.com'}, {supabaseUrl:'https://localhost'}, {supabaseAnonKey:'sb_secret_do_not_ship'}, {supabaseAnonKey:''}]) {
    assert.throws(() => validateUatRuntime({api:{...valid().api,...patch}}));
  }
});
test('accepts legacy anon but rejects service role JWT', () => {
  const token = role => 'header.' + Buffer.from(JSON.stringify({role})).toString('base64url') + '.signature';
  assert.doesNotThrow(() => validateUatRuntime({api:{...valid().api,supabaseAnonKey:token('anon')}}));
  assert.throws(() => validateUatRuntime({api:{...valid().api,supabaseAnonKey:token('service_role')}}));
});
