import type { ApiError } from '@/lib/api/client';
import { messages } from '@/messages/ja';

// 社員追加・社員編集で共通の入力規則とサーバーエラーの振り分け(SCR-006)
const v = messages.users.createModal.validation;

const EMP_ID_PATTERN = /^[0-9]{1,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 改行・タブなど(サーバーの社員名検証と同じ)
const CONTROL_CHARACTERS = /[\p{Cc}\p{Zl}\p{Zp}]/u;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

export const USER_FIELD_NAMES = [
  'empId',
  'name',
  'jobTitleId',
  'contactEmail',
  'departmentId',
  'hireDate',
  'initialPassword',
] as const;
export type UserFieldName = (typeof USER_FIELD_NAMES)[number];
export type UserFieldErrors = Partial<Record<UserFieldName, string>>;

// 各関数は問題があればメッセージ、なければ null を返す
export function validateEmpId(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return v.empIdRequired;
  if (!EMP_ID_PATTERN.test(trimmed)) return v.empIdFormat;
  return null;
}

export function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return v.nameRequired;
  if (trimmed.length > NAME_MAX_LENGTH) return v.nameLength;
  if (CONTROL_CHARACTERS.test(trimmed)) return v.nameInvalidCharacters;
  return null;
}

// required が false(社員編集)のときは空欄を許す(未設定)
export function validateEmail(value: string, required: boolean): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return required ? v.emailRequired : null;
  if (!EMAIL_PATTERN.test(trimmed) || trimmed.length > EMAIL_MAX_LENGTH) return v.emailFormat;
  return null;
}

export type UserApiErrorResult =
  // 項目に結べる誤り。reload は選択肢(部署・役職)を取り直すべきとき
  | { kind: 'fields'; errors: UserFieldErrors; reload?: 'departments' | 'jobTitles' }
  // 項目に結べない誤り(フォーム上部に表示)
  | { kind: 'form'; message: string };

export function mapUserApiError(error: ApiError): UserApiErrorResult {
  if (error.code === 'DUPLICATE_EMP_ID' || error.code === 'EMP_ID_EXHAUSTED') {
    return { kind: 'fields', errors: { empId: error.message } };
  }
  if (error.code === 'INVALID_DEPARTMENT') {
    return { kind: 'fields', errors: { departmentId: error.message }, reload: 'departments' };
  }
  if (error.code === 'INVALID_JOB_TITLE') {
    return { kind: 'fields', errors: { jobTitleId: error.message }, reload: 'jobTitles' };
  }
  if (error.statusCode === 400 && error.details.length > 0) {
    const errors: UserFieldErrors = {};
    for (const detail of error.details) {
      const field = USER_FIELD_NAMES.find((name) => name === detail.field);
      if (field) errors[field] = detail.message;
    }
    if (Object.keys(errors).length > 0) return { kind: 'fields', errors };
  }
  return { kind: 'form', message: error.message };
}
