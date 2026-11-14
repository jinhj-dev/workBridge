// パスワードの規則(FR-AUTH-003)。サーバーと同じ順序・基準で判定する
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;

export type PasswordPolicyViolation = 'tooLong' | 'policy';

// 規則を満たせば null。72 バイト超 → 8 文字未満・英字なし・数字なしの順に判定する
export function checkPasswordPolicy(password: string): PasswordPolicyViolation | null {
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return 'tooLong';
  if (
    [...password].length < MIN_PASSWORD_LENGTH ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return 'policy';
  }
  return null;
}
