import { z } from 'zod';
import { EMP_ID_PATTERN } from '../../../common/security/credentials.js';
import { dateSchema } from '../../../common/validation/date-schema.js';

// 社員名に使えない制御文字(改行・タブなど。表示の偽装を防ぐ)
const CONTROL_CHARACTERS = /[\p{Cc}\p{Zl}\p{Zp}]/u;

export const userNameSchema = z
  .string('社員名を入力してください。')
  .trim()
  .min(1, '社員名を入力してください。')
  .max(100, '社員名は 100 文字以内で入力してください。')
  .refine((value) => !CONTROL_CHARACTERS.test(value), '社員名に使用できない文字が含まれています。');

export const EMP_ID_REQUIRED_MESSAGE = '社員IDを入力してください。';
export const EMP_ID_FORMAT_MESSAGE = '社員IDは数字(50 桁以内)で入力してください。';

// 社員 ID(直接入力)。前後の空白を除き、数字 1〜50 桁
export const empIdSchema = z
  .string(EMP_ID_REQUIRED_MESSAGE)
  .trim()
  .min(1, EMP_ID_REQUIRED_MESSAGE)
  .regex(EMP_ID_PATTERN, EMP_ID_FORMAT_MESSAGE);

export const MAX_EMAIL_LENGTH = 254;
const EMAIL_REQUIRED_MESSAGE = 'メールアドレスを入力してください。';
const EMAIL_FORMAT_MESSAGE = 'メールアドレスの形式が正しくありません。';
const emailFormat = z.email();

function checkEmail(value: string, ctx: z.RefinementCtx): void {
  if (value === '') {
    ctx.addIssue({ code: 'custom', message: EMAIL_REQUIRED_MESSAGE });
  } else if (value.length > MAX_EMAIL_LENGTH || !emailFormat.safeParse(value).success) {
    ctx.addIssue({ code: 'custom', message: EMAIL_FORMAT_MESSAGE });
  }
}

// 連絡先メール(登録では必須)。空文字・形式エラーは 1 項目 1 メッセージにする
export const contactEmailSchema = z.string(EMAIL_REQUIRED_MESSAGE).trim().superRefine(checkEmail);

// 修正用の連絡先メール。null と空文字は連絡先の解除(null)として扱う
export const contactEmailUpdateSchema = z
  .string(EMAIL_FORMAT_MESSAGE)
  .nullable()
  .transform((value) => (value === null || value.trim() === '' ? null : value.trim()))
  .superRefine((value, ctx) => {
    if (value !== null) {
      checkEmail(value, ctx);
    }
  });

export const departmentIdSchema = z.uuid('部署を選択してください。');
export const jobTitleIdSchema = z.uuid('役職を選択してください。');
const HIRE_DATE_MESSAGE = '入社日を選択してください。';
export const hireDateSchema = z
  .string(HIRE_DATE_MESSAGE)
  .refine((value) => dateSchema.safeParse(value).success, HIRE_DATE_MESSAGE);
