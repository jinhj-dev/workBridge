import { z } from 'zod';

const isoDateTime = z.iso.datetime({ offset: true });

// clockOut は必須キー(null で退勤なし)
export const updateAttendanceSchema = z.object({
  clockIn: isoDateTime,
  clockOut: isoDateTime.nullable(),
});

export type UpdateAttendanceDto = z.infer<typeof updateAttendanceSchema>;
