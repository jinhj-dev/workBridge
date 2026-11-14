import { z } from 'zod';
import {
  contactEmailUpdateSchema,
  departmentIdSchema,
  empIdSchema,
  hireDateSchema,
  jobTitleIdSchema,
  userNameSchema,
} from './user-fields.js';

// 変更する項目だけを送る(最低 1 項目)。パスワードや認証まわりの項目は受け付けない
export const updateUserSchema = z
  .strictObject({
    name: userNameSchema.optional(),
    empId: empIdSchema.optional(),
    jobTitleId: jobTitleIdSchema.nullable().optional(),
    contactEmail: contactEmailUpdateSchema.optional(),
    departmentId: departmentIdSchema.optional(),
    hireDate: hireDateSchema.optional(),
    role: z.enum(['ADMIN', 'EMPLOYEE'], '権限を選択してください。').optional(),
    approvalRequired: z.boolean('承認要否を指定してください。').optional(),
    isActive: z.boolean('有効・無効を指定してください。').optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: '変更する項目を指定してください。',
  });

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
