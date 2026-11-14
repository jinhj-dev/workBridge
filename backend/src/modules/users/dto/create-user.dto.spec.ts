// 社員登録 DTO の検証(design-backend 「API-USER-002 필드 규칙」)
import { createUserSchema } from './create-user.dto.js';

const VALID_UUID = '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f9a01';

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    empIdMode: 'AUTO',
    empId: null,
    name: '山田 太郎',
    initialPassword: 'Temp1234',
    jobTitleId: VALID_UUID,
    contactEmail: 'yamada@example.com',
    departmentId: VALID_UUID,
    hireDate: '2026-12-01',
    role: 'EMPLOYEE',
    approvalRequired: true,
    ...overrides,
  };
}

// 失敗時の details(field, message) を返す。成功時は null
function errorsOf(body: Record<string, unknown>): { field: string; message: string }[] | null {
  const result = createUserSchema.safeParse(body);
  if (result.success) return null;
  return result.error.issues.map((issue) => ({
    field: String(issue.path[0] ?? ''),
    message: issue.message,
  }));
}

describe('createUserSchema(社員登録 DTO)', () => {
  it('shouldAcceptValidAutoBody', () => {
    expect(errorsOf(validBody())).toBeNull();
  });

  it('shouldRequireEmpIdWhenModeIsManual', () => {
    const errors = errorsOf(validBody({ empIdMode: 'MANUAL', empId: null }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'empId', message: '社員IDを入力してください。' }),
      ]),
    );
  });

  it('shouldRejectNonNumericOrTooLongEmpIdWhenManual', () => {
    expect(errorsOf(validBody({ empIdMode: 'MANUAL', empId: 'AB12' }))).not.toBeNull();
    expect(errorsOf(validBody({ empIdMode: 'MANUAL', empId: '1'.repeat(51) }))).not.toBeNull();
  });

  it('shouldIgnoreEmpIdWhenModeIsAuto', () => {
    expect(errorsOf(validBody({ empIdMode: 'AUTO', empId: 'NOT-A-NUMBER' }))).toBeNull();
  });

  it('shouldRejectNameWithControlCharacters', () => {
    for (const name of ['山田\n太郎', '山田\r太郎', '山田\t太郎']) {
      expect(errorsOf(validBody({ name }))).not.toBeNull();
    }
  });

  it('shouldRejectNameOver100Characters', () => {
    expect(errorsOf(validBody({ name: 'あ'.repeat(101) }))).not.toBeNull();
  });

  it('shouldRequireJobTitleAndDepartmentAndHireDate', () => {
    expect(errorsOf(validBody({ jobTitleId: undefined }))).not.toBeNull();
    expect(errorsOf(validBody({ departmentId: undefined }))).not.toBeNull();
    expect(errorsOf(validBody({ hireDate: undefined }))).not.toBeNull();
  });

  it('shouldRejectNonexistentCalendarDate', () => {
    expect(errorsOf(validBody({ hireDate: '2026-02-30' }))).not.toBeNull();
  });

  it('shouldRequireContactEmailWithValidFormat', () => {
    const missing = errorsOf(validBody({ contactEmail: undefined }));
    expect(missing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'contactEmail',
          message: 'メールアドレスを入力してください。',
        }),
      ]),
    );
    expect(errorsOf(validBody({ contactEmail: 'not-an-email' }))).not.toBeNull();
  });

  it('shouldTrimContactEmailBeforeValidation', () => {
    const result = createUserSchema.safeParse(validBody({ contactEmail: '  a@example.com  ' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contactEmail).toBe('a@example.com');
  });

  it('shouldRequireInitialPassword', () => {
    const errors = errorsOf(validBody({ initialPassword: undefined }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'initialPassword',
          message: '初期パスワードを入力してください。',
        }),
      ]),
    );
  });

  it.each([
    ['abcdefgh', 'パスワードは8文字以上で、英字と数字を含めてください。'],
    ['12345678', 'パスワードは8文字以上で、英字と数字を含めてください。'],
    ['abc1234', 'パスワードは8文字以上で、英字と数字を含めてください。'],
  ])('shouldRejectPolicyViolation(%s)', (initialPassword, message) => {
    const errors = errorsOf(validBody({ initialPassword }));
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'initialPassword', message })]),
    );
  });

  it('shouldRejectPasswordOver72Bytes', () => {
    // 英数字 73 バイト(8 文字以上・英数字含む)
    const initialPassword = 'a1' + 'x'.repeat(71);
    expect(Buffer.byteLength(initialPassword)).toBe(73);
    const errors = errorsOf(validBody({ initialPassword }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'initialPassword',
          message: 'パスワードは72バイト以内で入力してください。',
        }),
      ]),
    );
  });

  it('shouldAcceptPasswordExactly72Bytes', () => {
    const initialPassword = 'a1' + 'x'.repeat(70);
    expect(Buffer.byteLength(initialPassword)).toBe(72);
    expect(errorsOf(validBody({ initialPassword }))).toBeNull();
  });

  it('shouldNotTrimInitialPassword', () => {
    const result = createUserSchema.safeParse(validBody({ initialPassword: ' Temp1234 ' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.initialPassword).toBe(' Temp1234 ');
  });

  it('shouldNotEchoPasswordValueInErrorMessages', () => {
    const secret = 'abcdefgh';
    const errors = errorsOf(validBody({ initialPassword: secret }));
    expect(JSON.stringify(errors)).not.toContain(secret);
  });

  it('shouldRejectUnknownFieldsInStrictMode', () => {
    expect(errorsOf(validBody({ passwordHash: 'x' }))).not.toBeNull();
    expect(errorsOf(validBody({ mustChangePassword: false }))).not.toBeNull();
  });
});
