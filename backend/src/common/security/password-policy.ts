// パスワード規則(FR-AUTH-003): 8 文字以上、英字と数字を含む、UTF-8 で 72 バイト以下。
// パスワード変更と、今後の社員登録(初期パスワード)で共有する。

// bcrypt は先頭 72 バイトしか見ないため、それを超えるパスワードは受け付けない
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;

// 英字・数字は ASCII のみ数える(全角文字は含めない)
const LETTER_PATTERN = /[A-Za-z]/;
const DIGIT_PATTERN = /[0-9]/;

// 違反時は利用者向けのメッセージ、適合時は null を返す
export function checkPasswordPolicy(password: string): string | null {
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return 'パスワードは72バイト以内で入力してください。';
  }
  // 文字数はコードポイント単位で数える(サロゲートペアを 2 文字と数えない)
  if (
    [...password].length < MIN_PASSWORD_LENGTH ||
    !LETTER_PATTERN.test(password) ||
    !DIGIT_PATTERN.test(password)
  ) {
    return 'パスワードは8文字以上で、英字と数字を含めてください。';
  }
  return null;
}
