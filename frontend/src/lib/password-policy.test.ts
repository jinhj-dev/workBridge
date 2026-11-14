import { describe, expect, it } from 'vitest';
import { checkPasswordPolicy } from './password-policy';

describe('checkPasswordPolicy(クライアント側の初期パスワード検査)', () => {
  it('shouldAcceptEightCharactersWithLetterAndDigit', () => {
    expect(checkPasswordPolicy('Temp1234')).toBeNull();
  });

  it.each(['abcdefgh', '12345678', 'abc1234'])(
    'shouldReturnPolicyViolationWhen(%s)',
    (password) => {
      // 英字のみ・数字のみ・7 文字はいずれも規則違反(表示文言は messages 側で対応付ける)
      expect(checkPasswordPolicy(password)).toBe('policy');
    },
  );

  it('shouldRejectMoreThan72Bytes', () => {
    expect(checkPasswordPolicy('a1' + 'x'.repeat(71))).toBe('tooLong');
  });

  it('shouldAccept72BytesExactly', () => {
    expect(checkPasswordPolicy('a1' + 'x'.repeat(70))).toBeNull();
  });
});
