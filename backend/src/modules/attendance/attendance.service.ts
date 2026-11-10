import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { AppException } from '../../common/exceptions/app.exception.js';
import { toPage } from '../../common/pagination/pagination.js';
import type { Page } from '../../common/pagination/pagination.js';
import { Clock } from '../../common/time/clock.js';
import { fromDbDate, toDbDate, toTokyoDate } from '../../common/time/tokyo-date.js';
import { assertValidTimeRange, resolveDateRange } from './attendance-rules.js';
import { toAttendanceResponse } from './attendance.mapper.js';
import type { AttendanceResponse } from './attendance.mapper.js';
import { AttendanceRepository } from './attendance.repository.js';
import type { AdminAttendanceQueryDto } from './dto/admin-attendance-query.dto.js';
import type { AttendanceHistoryQueryDto } from './dto/attendance-history-query.dto.js';
import type { UpdateAttendanceDto } from './dto/update-attendance.dto.js';

const uuidSchema = z.guid();

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

  // 本人の勤怠履歴(FR-ATT-003)。対象は常にトークンの本人
  async listMine(
    userId: string,
    query: AttendanceHistoryQueryDto,
  ): Promise<Page<AttendanceResponse>> {
    const today = toTokyoDate(this.clock.now());
    const range = resolveDateRange(query, today);
    const { items, totalCount } = await this.attendanceRepository.findPageByUser(
      userId,
      { ...range, statuses: query.status },
      today,
      query,
    );
    return toPage(
      items.map((row) => toAttendanceResponse(row, today)),
      totalCount,
      query.page,
      query.limit,
    );
  }

  // 全ユーザーの勤怠検索(FR-ATT-004、管理者)
  async listAll(query: AdminAttendanceQueryDto): Promise<Page<AttendanceResponse>> {
    const today = toTokyoDate(this.clock.now());
    const range = resolveDateRange(query, today);
    const { items, totalCount } = await this.attendanceRepository.findPage(
      {
        ...range,
        name: query.name,
        departmentId: query.departmentId,
        status: query.status,
      },
      today,
      query,
    );
    return toPage(
      items.map((row) => toAttendanceResponse(row, today)),
      totalCount,
      query.page,
      query.limit,
    );
  }

  // 出退勤時刻の修正(FR-ATT-005、管理者)。DB の CHECK 制約より先に検証する
  async update(adminId: string, id: string, dto: UpdateAttendanceDto): Promise<AttendanceResponse> {
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundException();
    }
    const existing = await this.attendanceRepository.findById(id);
    if (!existing) {
      throw new NotFoundException();
    }
    const clockIn = new Date(dto.clockIn);
    const clockOut = dto.clockOut === null ? null : new Date(dto.clockOut);
    assertValidTimeRange({ workDate: fromDbDate(existing.workDate), clockIn, clockOut });
    const now = this.clock.now();
    const updated = await this.attendanceRepository.updateTimes({
      id,
      clockIn,
      clockOut,
      modifiedBy: adminId,
      modifiedAt: now,
    });
    return toAttendanceResponse(updated, toTokyoDate(now));
  }
}

function alreadyClockedIn(): AppException {
  return new AppException(
    'ALREADY_CLOCKED_IN',
    HttpStatus.CONFLICT,
    '本日の出勤はすでに登録されています。',
  );
}
