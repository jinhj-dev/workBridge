import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';

// 本人の休暇履歴(API-LEAVE-003)。year は開始日の年。省略すると全期間
export const myLeavesQuerySchema = paginationQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
});

export type MyLeavesQueryDto = z.infer<typeof myLeavesQuerySchema>;
