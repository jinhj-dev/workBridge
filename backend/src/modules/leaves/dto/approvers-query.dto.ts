import { z } from 'zod';

// 承認者候補の検索(API-LEAVE-002)。空文字は条件なし
export const approversQuerySchema = z.object({
  keyword: z.string().trim().max(100).optional(),
});

export type ApproversQueryDto = z.infer<typeof approversQuerySchema>;
