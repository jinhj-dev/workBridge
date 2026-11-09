import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';

// 対象ユーザーは常にトークンの本人。userId は受け取らない
export const attendanceHistoryQuerySchema = paginationQuerySchema.extend({
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
});

export type AttendanceHistoryQueryDto = z.infer<typeof attendanceHistoryQuerySchema>;
