import { z } from 'zod';
import { dateSchema } from '../../../common/validation/date-schema.js';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function isYearInRange(value: string): boolean {
  const year = Number(value.slice(0, 4));
  return year >= MIN_YEAR && year <= MAX_YEAR;
}

// month は省略可能(省略時は東京の今月)。'YYYY-MM'、年 2000〜2100、月 01〜12
export const leaveCalendarQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .refine(isYearInRange)
    .optional(),
});

// date は必須。実在する 'YYYY-MM-DD'、年 2000〜2100
export const leaveCalendarDayQuerySchema = z.object({
  date: dateSchema.refine(isYearInRange),
});

export type LeaveCalendarQueryDto = z.infer<typeof leaveCalendarQuerySchema>;
export type LeaveCalendarDayQueryDto = z.infer<typeof leaveCalendarDayQuerySchema>;
