import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';
import { dateSchema } from '../../../common/validation/date-schema.js';
import { commaSeparatedEnum } from './comma-separated-enum.js';

// 本人の休暇履歴(API-LEAVE-003)。year は開始日の年(省略すると全期間)。
// appliedFrom / appliedTo は申請日(東京の日付)の範囲で、両端を含む
export const myLeavesQuerySchema = paginationQuerySchema
  .extend({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    status: commaSeparatedEnum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
    leaveType: commaSeparatedEnum(['ANNUAL', 'HALF_AM', 'HALF_PM', 'SPECIAL', 'OTHER']).optional(),
    appliedFrom: dateSchema.optional(),
    appliedTo: dateSchema.optional(),
  })
  .refine(
    (query) => !query.appliedFrom || !query.appliedTo || query.appliedFrom <= query.appliedTo,
    { path: ['appliedTo'], message: '申請日の終了日は開始日以降にしてください。' },
  );

export type MyLeavesQueryDto = z.infer<typeof myLeavesQuerySchema>;
