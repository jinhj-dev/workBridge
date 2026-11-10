import { z } from 'zod';

// 実在する日付の 'YYYY-MM-DD' だけを受け付ける
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

// 休暇申請(API-LEAVE-001)。approverId の形式・存在確認は service で行う
export const createLeaveSchema = z.object({
  leaveType: z.enum(['ANNUAL', 'HALF_AM', 'HALF_PM', 'SPECIAL', 'OTHER']),
  startDate: dateSchema,
  endDate: dateSchema,
  reason: z.string().trim().min(1).max(500),
  approverId: z.string().optional(),
});

export type CreateLeaveDto = z.infer<typeof createLeaveSchema>;
