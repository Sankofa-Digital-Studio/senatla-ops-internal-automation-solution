export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0 to 100
  tier: 'weak' | 'amber' | 'green';
  acceptable: boolean; // score >= 75 && valid
  errors: string[];
}

export function isUpper(char: string): boolean {
  return /[A-Z]/.test(char);
}

export function isLower(char: string): boolean {
  return /[a-z]/.test(char);
}

export function isDigit(char: string): boolean {
  return /[0-9]/.test(char);
}

export function isSpecial(char: string): boolean {
  return /[^A-Za-z0-9\s]/.test(char);
}

export type ConstraintCharType = 'upper' | 'digit' | 'special';

export function getConstraintType(char: string): ConstraintCharType | null {
  if (isUpper(char)) return 'upper';
  if (isDigit(char)) return 'digit';
  if (isSpecial(char)) return 'special';
  return null;
}

export function hasAdjacentConstraintChars(password: string): boolean {
  for (let i = 0; i < password.length - 1; i++) {
    const typeA = getConstraintType(password[i]);
    const typeB = getConstraintType(password[i + 1]);
    if (typeA !== null && typeB !== null) {
      return true;
    }
  }
  return false;
}

export function evaluatePassword(password: string): PasswordValidationResult {
  const pwd = password || '';
  const len = pwd.length;
  const errors: string[] = [];

  if (len === 0) {
    return {
      valid: false,
      score: 0,
      tier: 'weak',
      acceptable: false,
      errors: ['Password cannot be empty.'],
    };
  }

  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(pwd);

  const meetsOptionA = len >= 12;
  const inOptionBRange = len >= 8 && len <= 16;
  const hasAdjacent = hasAdjacentConstraintChars(pwd);
  const meetsOptionB = inOptionBRange && hasUpper && hasDigit && hasSpecial && !hasAdjacent;

  const valid = meetsOptionA || meetsOptionB;

  if (!valid) {
    if (len < 8) {
      errors.push('Password must be at least 8 characters long.');
    } else if (inOptionBRange && (!hasUpper || !hasDigit || !hasSpecial)) {
      errors.push('Must contain at least 1 uppercase letter, 1 number, and 1 special character (or be 12+ characters).');
    }
    if (inOptionBRange && hasAdjacent && !meetsOptionA) {
      errors.push('Uppercase letters, numbers, and special characters cannot appear next to each other.');
    }
  }

  let score = 0;

  if (!valid) {
    score = Math.min(65, len * 5);
  } else {
    score = 75;

    if (len >= 20) score += 15;
    else if (len >= 16) score += 10;
    else if (len >= 14) score += 5;

    const diversityCount = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
    if (diversityCount >= 4) {
      score += 10;
    } else if (diversityCount === 3) {
      score += 5;
    }
  }

  score = Math.min(100, Math.max(0, score));

  let tier: 'weak' | 'amber' | 'green' = 'weak';
  if (score >= 100) {
    tier = 'green';
  } else if (score >= 75) {
    tier = 'amber';
  }

  const acceptable = valid && score >= 75;

  return {
    valid,
    score,
    tier,
    acceptable,
    errors,
  };
}
