import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';

// カンマ区切りの複数指定(例: PENDING,APPROVED)。重複は除き、指定した値のいずれかに一致する。空要素・未知の値は検証エラー
function commaSeparatedEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(z.enum(values)))
    .transform((items) => [...new Set(items)]);
}

// 本人の休暇履歴(API-LEAVE-003)。year は開始日の年。省略すると全期間
export const myLeavesQuerySchema = paginationQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: commaSeparatedEnum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  leaveType: commaSeparatedEnum(['ANNUAL', 'HALF_AM', 'HALF_PM', 'SPECIAL', 'OTHER']).optional(),
});

export type MyLeavesQueryDto = z.infer<typeof myLeavesQuerySchema>;
