import { Injectable } from '@nestjs/common';
import { Clock } from '../../common/time/clock.js';
import { japaneseHolidaysInRange } from '../../common/time/japanese-holiday.js';
import { fromDbDate, toDbDate, toTokyoDate } from '../../common/time/tokyo-date.js';
import { monthRange } from '../dashboard/leave-calendar-rules.js';
import { buildSheetDay, summarizeSheet } from './attendance-sheet-rules.js';
import type { AttendanceSheetResponse, SheetAttendanceInput } from './attendance-sheet-rules.js';
import { AttendanceRepository } from './attendance.repository.js';

@Injectable()
export class AttendanceSheetService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  // 出勤簿の月間表示(API-ATT-007)。対象は常にトークンの本人。month 省略時は東京の今月
  async getMonthly(userId: string, month?: string): Promise<AttendanceSheetResponse> {
    const today = toTokyoDate(this.clock.now());
    const targetMonth = month ?? today.slice(0, 7);
    const { start, end } = monthRange(targetMonth);
    const [attendances, leaves, hireDate] = await Promise.all([
      this.attendanceRepository.findByUserInRange(userId, toDbDate(start), toDbDate(end)),
      this.attendanceRepository.findActiveLeavesInRange(userId, toDbDate(start), toDbDate(end)),
      this.attendanceRepository.findHireDate(userId),
    ]);
    const holidays = japaneseHolidaysInRange(start, end);
    const attendanceByDate = new Map<string, SheetAttendanceInput>(
      attendances.map((row) => [fromDbDate(row.workDate), row]),
    );
    const leaveInputs = leaves.map((leave) => ({
      id: leave.id,
      leaveType: leave.leaveType,
      status: leave.status,
      startDate: fromDbDate(leave.startDate),
      endDate: fromDbDate(leave.endDate),
    }));
    const lastDay = Number(end.slice(8, 10));
    const days = Array.from({ length: lastDay }, (_, index) => {
      const date = `${targetMonth}-${String(index + 1).padStart(2, '0')}`;
      return buildSheetDay({
        date,
        today,
        holidays,
        attendance: attendanceByDate.get(date),
        leaves: leaveInputs,
      });
    });
    return { month: targetMonth, days, summary: summarizeSheet(days, fromDbDate(hireDate)) };
  }
}
