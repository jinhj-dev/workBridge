import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';

// scope=all が ADMIN だけに許されるかどうかは service で判定する(docs/07 §3)
export const pendingApprovalQuerySchema = paginationQuerySchema.extend({
  scope: z.enum(['mine', 'all']).default('mine'),
});

export type PendingApprovalQueryDto = z.infer<typeof pendingApprovalQuerySchema>;
