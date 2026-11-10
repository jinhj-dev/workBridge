import { z } from 'zod';
import { dateSchema } from '../../../common/validation/date-schema.js';

// 休暇申請(API-LEAVE-001)。approverId の形式・存在確認は service で行う
export const createLeaveSchema = z.object({
  leaveType: z.enum(['ANNUAL', 'HALF_AM', 'HALF_PM', 'SPECIAL', 'OTHER']),
  startDate: dateSchema,
  endDate: dateSchema,
  reason: z.string().trim().min(1).max(500),
  approverId: z.string().optional(),
});

export type CreateLeaveDto = z.infer<typeof createLeaveSchema>;
