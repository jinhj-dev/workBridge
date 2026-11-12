import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';
import { commaSeparatedEnum } from './comma-separated-enum.js';

// scope=all が ADMIN だけに許されるかどうかは service で判定する(docs/07 §3)。
// status を省略すると PENDING(承認待ち)だけを対象にする
export const pendingApprovalQuerySchema = paginationQuerySchema.extend({
  scope: z.enum(['mine', 'all']).default('mine'),
  status: commaSeparatedEnum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export type PendingApprovalQueryDto = z.infer<typeof pendingApprovalQuerySchema>;
