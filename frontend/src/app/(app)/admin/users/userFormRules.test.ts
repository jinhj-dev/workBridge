import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { messages } from '@/messages/ja';
import { mapUserApiError, validateEmail, validateEmpId, validateName } from './userFormRules';

const v = messages.users.createModal.validation;

describe('userFormRules(社員入力規則)', () => {
  it('shouldRejectEmptyEmpIdAndNonDigitEmpId', () => {
    expect(validateEmpId('   ')).toBe(v.empIdRequired);
    expect(validateEmpId('10A01')).toBe(v.empIdFormat);
    expect(validateEmpId('10001')).toBeNull();
  });

  it('shouldRejectNameWithControlCharacters', () => {
    expect(validateName('山田\u0007太郎')).toBe(v.nameInvalidCharacters);
    expect(validateName('山田\n太郎')).toBe(v.nameInvalidCharacters);
    expect(validateName('山田 太郎')).toBe(v.nameInvalidCharacters);
  });

  it('shouldAcceptNormalNameAndTrimSurroundingSpaces', () => {
    expect(validateName('  山田 太郎  ')).toBeNull();
  });

  it('shouldRejectNameLongerThan100Characters', () => {
    expect(validateName('a'.repeat(100))).toBeNull();
    expect(validateName('a'.repeat(101))).toBe(v.nameLength);
  });

  it('shouldRequireEmailOnlyWhenRequiredFlagIsTrue', () => {
    expect(validateEmail('', true)).toBe(v.emailRequired);
    expect(validateEmail('', false)).toBeNull();
    expect(validateEmail('a@b', false)).toBe(v.emailFormat);
    expect(validateEmail('yamada@example.com', true)).toBeNull();
  });

  it('shouldMapDuplicateEmpIdToEmpIdField', () => {
    const result = mapUserApiError(new ApiError(409, 'DUPLICATE_EMP_ID', '社員IDが重複しています。'));
    expect(result).toEqual({ kind: 'fields', errors: { empId: '社員IDが重複しています。' } });
  });

  it('shouldMapInvalidJobTitleToFieldAndRequestReload', () => {
    const result = mapUserApiError(new ApiError(400, 'INVALID_JOB_TITLE', '役職が無効です。'));
    expect(result).toEqual({
      kind: 'fields',
      errors: { jobTitleId: '役職が無効です。' },
      reload: 'jobTitles',
    });
  });

  it('shouldMapValidationDetailsToKnownFieldsOnly', () => {
    const result = mapUserApiError(
      new ApiError(400, 'VALIDATION_ERROR', '入力内容を確認してください。', [
        { field: 'name', message: '社員名に使用できない文字が含まれています。' },
        { field: 'unknownField', message: '無視される' },
      ]),
    );
    expect(result).toEqual({
      kind: 'fields',
      errors: { name: '社員名に使用できない文字が含まれています。' },
    });
  });

  it('shouldFallbackToFormMessageForUnmappedError', () => {
    const result = mapUserApiError(new ApiError(500, 'INTERNAL', 'サーバーエラー'));
    expect(result).toEqual({ kind: 'form', message: 'サーバーエラー' });
  });
});
