import type { z } from 'zod';
import { leaveCalendarQuerySchema } from '../../dashboard/dto/leave-calendar-query.dto.js';

// month は省略可能(省略時は東京の今月)。規則は API-DASH-002 の month と同じ
export const attendanceMonthlyQuerySchema = leaveCalendarQuerySchema;

export type AttendanceMonthlyQueryDto = z.infer<typeof attendanceMonthlyQuerySchema>;
