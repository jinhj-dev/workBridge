import { z } from 'zod';

// 部署責任者候補の検索(API-DEPT-009)。空文字は条件なし
export const managerCandidatesQuerySchema = z.object({
  keyword: z.string().trim().max(100).optional(),
});

export type ManagerCandidatesQueryDto = z.infer<typeof managerCandidatesQuerySchema>;
