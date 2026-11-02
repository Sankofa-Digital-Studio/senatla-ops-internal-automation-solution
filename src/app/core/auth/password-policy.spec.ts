import { evaluatePassword, hasAdjacentConstraintChars } from './password-policy';

describe('Password Policy & Strength Meter', () => {
  it('correctly detects adjacent constraint characters', () => {
    expect(hasAdjacentConstraintChars('theSusp3k_t#')).toBeFalse();
    expect(hasAdjacentConstraintChars('MYPASSw0RD#')).toBeTrue();
    expect(hasAdjacentConstraintChars('aB1c!d')).toBeTrue();
    expect(hasAdjacentConstraintChars('sEn4t!a')).toBeFalse();
  });

  it('validates the prompt example: theSusp3k_t# is valid and acceptable (score >= 75)', () => {
    const result = evaluatePassword('theSusp3k_t#');
    expect(result.valid).toBeTrue();
    expect(result.acceptable).toBeTrue();
    expect(result.tier).toBe('amber');
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.errors.length).toBe(0);
  });

  it('rejects the prompt example: MYPASSw0RD# due to adjacent uppercase and symbols', () => {
    const result = evaluatePassword('MYPASSw0RD#');
    expect(result.valid).toBeFalse();
    expect(result.acceptable).toBeFalse();
    expect(result.tier).toBe('weak');
    expect(result.score).toBeLessThan(75);
    expect(result.errors.some((e) => e.includes('adjacent') || e.includes('next to each other'))).toBeTrue();
  });

  it('allows 12+ characters without requiring complex constraint separation (Option A)', () => {
    const result = evaluatePassword('alllowercasepasswordhere');
    expect(result.valid).toBeTrue();
    expect(result.acceptable).toBeTrue();
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('achieves 100% green tier with high entropy, non-adjacency, and sufficient length', () => {
    const result = evaluatePassword('sEn4t!aOperationsPlatform2026');
    expect(result.valid).toBeTrue();
    expect(result.acceptable).toBeTrue();
    expect(result.tier).toBe('green');
    expect(result.score).toBe(100);
  });
});
