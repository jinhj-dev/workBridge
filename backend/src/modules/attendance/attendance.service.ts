import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { Clock } from '../../common/time/clock.js';
import { toDbDate, toTokyoDate } from '../../common/time/tokyo-date.js';
import { toAttendanceResponse } from './attendance.mapper.js';
import type { AttendanceResponse } from './attendance.mapper.js';
import { AttendanceRepository } from './attendance.repository.js';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly clock: Clock,
  ) {}

  // 出勤登録(FR-ATT-001)。clock_in と work_date は同じ時刻から計算する(docs/05 §9)。
  // 前の勤務日の退勤漏れがあっても登録できる
  async clockIn(userId: string): Promise<AttendanceResponse> {
    const now = this.clock.now();
    const today = toTokyoDate(now);
    const workDate = toDbDate(today);
    const existing = await this.attendanceRepository.findByUserAndWorkDate(userId, workDate);
    if (existing) {
      throw alreadyClockedIn();
    }
    // 同時要求で先に登録された場合は UNIQUE 違反となり null が返る
    const created = await this.attendanceRepository.createClockIn({
      userId,
      workDate,
      clockIn: now,
    });
    if (!created) {
      throw alreadyClockedIn();
    }
    return toAttendanceResponse(created, today);
  }

  // 退勤登録(FR-ATT-002)。当日の行だけが対象で、前の勤務日の行は更新しない
  async clockOut(userId: string): Promise<AttendanceResponse> {
    const now = this.clock.now();
    const today = toTokyoDate(now);
    const workDate = toDbDate(today);
    const updatedCount = await this.attendanceRepository.updateClockOut({
      userId,
      workDate,
      clockOut: now,
    });
    const row = await this.attendanceRepository.findByUserAndWorkDate(userId, workDate);
    if (!row) {
      throw new AppException('NOT_CLOCKED_IN', HttpStatus.CONFLICT, '本日の出勤記録がありません。');
    }
    if (updatedCount === 0) {
      throw new AppException(
        'ALREADY_CLOCKED_OUT',
        HttpStatus.CONFLICT,
        '本日の退勤はすでに登録されています。',
      );
    }
    return toAttendanceResponse(row, today);
  }

  // 当日の勤怠。未出勤なら null
  async getToday(userId: string): Promise<AttendanceResponse | null> {
    const today = toTokyoDate(this.clock.now());
    const row = await this.attendanceRepository.findByUserAndWorkDate(userId, toDbDate(today));
    return row ? toAttendanceResponse(row, today) : null;
  }
}

function alreadyClockedIn(): AppException {
  return new AppException(
    'ALREADY_CLOCKED_IN',
    HttpStatus.CONFLICT,
    '本日の出勤はすでに登録されています。',
  );
}
