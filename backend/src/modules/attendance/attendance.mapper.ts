import { toUserSummary } from '../../common/mappers/user-summary.js';
import type { UserSummary } from '../../common/mappers/user-summary.js';
import { formatTokyoDateTime, fromDbDate } from '../../common/time/tokyo-date.js';
import type { AttendanceRow } from './attendance.repository.js';

export type AttendanceStatus = 'WORKING' | 'DONE' | 'MISSING_CLOCK_OUT';

// docs/06 §0 の Attendance
export interface AttendanceResponse {
  id: string;
  user: UserSummary;
  workDate: string;
  clockIn: string;
  clockOut: string | null;
  workMinutes: number | null;
  status: AttendanceStatus;
  modifiedAt: string | null;
}

// 勤怠状態を計算する(docs/05 §4)。workDate と today は東京の日付 'YYYY-MM-DD'
export function calculateAttendanceStatus(
  workDate: string,
  clockOut: Date | null,
  today: string,
): AttendanceStatus {
  if (clockOut) {
    return 'DONE';
  }
  return workDate === today ? 'WORKING' : 'MISSING_CLOCK_OUT';
}

// 勤務時間(分、切り捨て)。退勤がなければ null
export function calculateWorkMinutes(clockIn: Date, clockOut: Date | null): number | null {
  if (!clockOut) {
    return null;
  }
  return Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);
}

export function toAttendanceResponse(row: AttendanceRow, today: string): AttendanceResponse {
  const workDate = fromDbDate(row.workDate);
  return {
    id: row.id,
    user: toUserSummary(row.user),
    workDate,
    clockIn: formatTokyoDateTime(row.clockIn),
    clockOut: row.clockOut ? formatTokyoDateTime(row.clockOut) : null,
    workMinutes: calculateWorkMinutes(row.clockIn, row.clockOut),
    status: calculateAttendanceStatus(workDate, row.clockOut, today),
    modifiedAt: row.modifiedAt ? formatTokyoDateTime(row.modifiedAt) : null,
  };
}
