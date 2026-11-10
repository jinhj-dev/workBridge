import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';

// 照会期間とページ(本人用・管理者用で共通)
export const attendanceRangeQuerySchema = paginationQuerySchema.extend({
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
});

// 状態の複数指定。カンマ区切り(例: DONE,MISSING_CLOCK_OUT)で、重複は除く。指定した状態のいずれかに一致する
const statusListSchema = z
  .string()
  .transform((value) => value.split(','))
  .pipe(z.array(z.enum(['WORKING', 'DONE', 'MISSING_CLOCK_OUT'])))
  .transform((statuses) => [...new Set(statuses)]);

// 対象ユーザーは常にトークンの本人。userId は受け取らない
export const attendanceHistoryQuerySchema = attendanceRangeQuerySchema.extend({
  status: statusListSchema.optional(),
});

export type AttendanceHistoryQueryDto = z.infer<typeof attendanceHistoryQuerySchema>;
