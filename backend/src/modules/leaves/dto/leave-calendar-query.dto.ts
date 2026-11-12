import { z } from 'zod';

// 空文字は「条件なし」として扱う
function optionalSearchText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || undefined)
    .optional();
}

// 共有休暇カレンダー(API-LEAVE-010)。month は 'YYYY-MM'(2000〜2100 年)
export const leaveCalendarQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .refine((value) => {
      const year = Number(value.slice(0, 4));
      return year >= 2000 && year <= 2100;
    })
    .optional(),
  departmentId: z.uuid().optional(),
  name: optionalSearchText(100),
  empId: optionalSearchText(50),
});

export type LeaveCalendarQueryDto = z.infer<typeof leaveCalendarQuerySchema>;
