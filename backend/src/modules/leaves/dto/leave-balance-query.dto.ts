import { z } from 'zod';

// year は省略可能(省略時は東京の今年)。範囲外・整数でない値は VALIDATION_ERROR
export const leaveBalanceQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type LeaveBalanceQueryDto = z.infer<typeof leaveBalanceQuerySchema>;
