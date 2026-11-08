import { describe, expect, it } from 'vitest';
import { checkPasswordPolicy } from './password-policy.js';

const RULE_MESSAGE = 'パスワードは8文字以上で、英字と数字を含めてください。';
const BYTES_MESSAGE = 'パスワードは72バイト以内で入力してください。';

describe('checkPasswordPolicy', () => {
  it.each(['abcdefgh', '12345678', 'abc1234', '', 'ａｂｃｄ１２３４'])(
    'shouldReturnRuleMessageWhenPasswordViolatesRule(%j)',
    (password) => {
      expect(checkPasswordPolicy(password)).toBe(RULE_MESSAGE);
    },
  );

  it.each(['abcd1234', 'Temp1234'])('shouldReturnNullWhenPasswordSatisfiesRule(%j)', (password) => {
    expect(checkPasswordPolicy(password)).toBeNull();
  });

  it('shouldReturnNullWhenPasswordIsExactly72Bytes', () => {
    const password = `${'a'.repeat(71)}1`;
    expect(Buffer.byteLength(password, 'utf8')).toBe(72);
    expect(checkPasswordPolicy(password)).toBeNull();
  });

  it('shouldReturnBytesMessageWhenPasswordIs73AsciiBytes', () => {
    const password = `${'a'.repeat(72)}1`;
    expect(checkPasswordPolicy(password)).toBe(BYTES_MESSAGE);
  });

  it('shouldReturnBytesMessageWhenMultibytePasswordExceeds72Bytes', () => {
    // 'あ' は UTF-8 で 3 バイト。24 文字 + 'a1' = 74 バイト
    const password = `${'あ'.repeat(24)}a1`;
    expect(Buffer.byteLength(password, 'utf8')).toBe(74);
    expect(checkPasswordPolicy(password)).toBe(BYTES_MESSAGE);
  });
});
