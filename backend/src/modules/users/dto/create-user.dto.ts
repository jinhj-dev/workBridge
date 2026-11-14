import { z } from 'zod';
import { checkPasswordPolicy } from '../../../common/security/password-policy.js';
import {
  EMP_ID_FORMAT_MESSAGE,
  EMP_ID_REQUIRED_MESSAGE,
  contactEmailSchema,
  departmentIdSchema,
  empIdSchema,
  hireDateSchema,
  jobTitleIdSchema,
  userNameSchema,
} from './user-fields.js';

const INITIAL_PASSWORD_REQUIRED_MESSAGE = '初期パスワードを入力してください。';

// 初期パスワードは管理者が入力する(FR-AUTH-003 の規則をサーバーでも検証する)。値は検証エラーに含めない
const initialPasswordSchema = z
  .string(INITIAL_PASSWORD_REQUIRED_MESSAGE)
  .superRefine((value, ctx) => {
    if (value === '') {
      ctx.addIssue({ code: 'custom', message: INITIAL_PASSWORD_REQUIRED_MESSAGE });
      return;
    }
    const violation = checkPasswordPolicy(value);
    if (violation) {
      ctx.addIssue({ code: 'custom', message: violation });
    }
  });

export const createUserSchema = z
  .strictObject({
    empIdMode: z.enum(['AUTO', 'MANUAL'], '社員IDの入力方法を指定してください。'),
    // AUTO のときは無視する(null・省略可)。MANUAL のときだけ下の superRefine で検証する
    empId: z.string().nullish(),
    name: userNameSchema,
    initialPassword: initialPasswordSchema,
    jobTitleId: jobTitleIdSchema,
    contactEmail: contactEmailSchema,
    departmentId: departmentIdSchema,
    hireDate: hireDateSchema,
    role: z.enum(['ADMIN', 'EMPLOYEE'], '権限を選択してください。'),
    approvalRequired: z.boolean('承認要否を指定してください。'),
  })
  .superRefine((value, ctx) => {
    if (value.empIdMode !== 'MANUAL') {
      return;
    }
    const result = empIdSchema.safeParse(value.empId ?? undefined);
    if (!result.success) {
      const missing = value.empId === undefined || value.empId === null;
      ctx.addIssue({
        code: 'custom',
        path: ['empId'],
        message: missing
          ? EMP_ID_REQUIRED_MESSAGE
          : (result.error.issues[0]?.message ?? EMP_ID_FORMAT_MESSAGE),
      });
    }
  })
  .transform(({ empIdMode, empId, ...rest }) => ({
    ...rest,
    // AUTO は null(採番はトランザクション内で行う)、MANUAL は前後の空白を除いた値
    empId: empIdMode === 'MANUAL' ? (empId ?? '').trim() : null,
  }));

export type CreateUserDto = z.infer<typeof createUserSchema>;
