import { z } from 'zod';
import { attendanceRangeQuerySchema } from './attendance-history-query.dto.js';

export const adminAttendanceQuerySchema = attendanceRangeQuerySchema.extend({
  name: z.string().trim().max(100).optional(),
  departmentId: z.guid().optional(),
  status: z.enum(['WORKING', 'DONE', 'MISSING_CLOCK_OUT']).optional(),
});

export type AdminAttendanceQueryDto = z.infer<typeof adminAttendanceQuerySchema>;
