import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';
import { dateSchema } from '../../../common/validation/date-schema.js';
import { EMPLOYMENT_STATUSES } from '../employment-status.js';

const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const adminUserQuerySchema = paginationQuerySchema
  .extend({
    keyword: z
      .string()
      .trim()
      .max(100, '検索キーワードは 100 文字以内で入力してください。')
      .optional(),
    name: z.string().trim().max(100).optional(),
    empId: z.string().trim().max(50).optional(),
    departmentId: z.uuid().optional(),
    jobTitleId: z.uuid().optional(),
    role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
    approvalRequired: booleanQuery.optional(),
    isActive: booleanQuery.optional(),
    status: z.enum(EMPLOYMENT_STATUSES).optional(),
    hireDateFrom: dateSchema.optional(),
    hireDateTo: dateSchema.optional(),
  })
  .refine(
    (value) => !value.hireDateFrom || !value.hireDateTo || value.hireDateFrom <= value.hireDateTo,
    {
      path: ['hireDateFrom'],
      message: '開始日は終了日より後にできません。',
    },
  );

export type AdminUserQueryDto = z.infer<typeof adminUserQuerySchema>;
