import { z } from 'zod';

// 却下理由は必須、前後の空白を除いて 1〜500 文字(FR-LEAVE-002)
export const rejectLeaveSchema = z.object({
  rejectReason: z.string().trim().min(1).max(500),
});

export type RejectLeaveDto = z.infer<typeof rejectLeaveSchema>;
