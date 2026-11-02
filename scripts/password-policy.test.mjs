import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluatePassword,
  hasAdjacentConstraintChars,
} from './password-policy.mjs';

test('hasAdjacentConstraintChars detects adjacent uppercase, digit, or special chars', () => {
  // Valid examples where constraints are separated by lowercase letters
  assert.equal(hasAdjacentConstraintChars('theSusp3k_t#'), false);
  assert.equal(hasAdjacentConstraintChars('aB1c!d'), true); // B and 1 are adjacent
  assert.equal(hasAdjacentConstraintChars('aB!c1d'), true); // B and ! are adjacent
  assert.equal(hasAdjacentConstraintChars('a1!b'), true);   // 1 and ! are adjacent
  assert.equal(hasAdjacentConstraintChars('a!1b'), true);   // ! and 1 are adjacent
  assert.equal(hasAdjacentConstraintChars('MYPASSw0RD#'), true); // M and Y adjacent, D and # adjacent
  assert.equal(hasAdjacentConstraintChars('sEn4t!a'), false); // E, 4, ! separated by lowercase n, t
});

test('validates the specific example from prompt: theSusp3k_t# is valid', () => {
  const result = evaluatePassword('theSusp3k_t#');
  assert.equal(result.valid, true);
  assert.ok(result.score >= 75, `Expected score >= 75 but got ${result.score}`);
  assert.ok(result.tier === 'amber' || result.tier === 'green');
  assert.equal(result.acceptable, true);
  assert.equal(result.errors.length, 0);
});

test('rejects the specific example from prompt: MYPASSw0RD# is invalid due to adjacency', () => {
  const result = evaluatePassword('MYPASSw0RD#');
  assert.equal(result.valid, false);
  assert.ok(result.score < 75, `Expected invalid password score < 75 but got ${result.score}`);
  assert.equal(result.tier, 'weak');
  assert.equal(result.acceptable, false);
  assert.ok(result.errors.some((e) => e.includes('adjacent') || e.includes('next to each other')));
});

test('Option A: 12+ characters without complexity is valid', () => {
  const result = evaluatePassword('alllowercasepasswordhere');
  assert.equal(result.valid, true);
  assert.ok(result.score >= 75);
  assert.equal(result.acceptable, true);
});

test('rejects short passwords (< 8 characters)', () => {
  const result = evaluatePassword('Ab1!');
  assert.equal(result.valid, false);
  assert.equal(result.acceptable, false);
  assert.equal(result.tier, 'weak');
});

test('Option B: 8-16 characters with 1 UC, 1 digit, 1 special separated by lowercase reaches amber/green', () => {
  const res1 = evaluatePassword('sEn4t!aOps'); // 10 chars: E, 4, ! separated
  assert.equal(res1.valid, true);
  assert.ok(res1.score >= 75);
  assert.equal(res1.acceptable, true);
});

test('100% score (green tier) achieved with strong entropy and length', () => {
  const strong = evaluatePassword('sEn4t!aOperationsPlatform2026');
  assert.equal(strong.valid, true);
  assert.equal(strong.score, 100);
  assert.equal(strong.tier, 'green');
  assert.equal(strong.acceptable, true);
});
