import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { USER_SUMMARY_SELECT } from '../../common/mappers/user-summary.js';
import { toSkipTake } from '../../common/pagination/pagination.js';
import type { PaginationQuery } from '../../common/pagination/pagination.js';
import { toDbDate } from '../../common/time/tokyo-date.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AttendanceStatus } from './attendance.mapper.js';

const ATTENDANCE_SELECT = {
  id: true,
  workDate: true,
  clockIn: true,
  clockOut: true,
  modifiedAt: true,
  user: { select: USER_SUMMARY_SELECT },
} as const satisfies Prisma.AttendanceSelect;

export type AttendanceRow = Prisma.AttendanceGetPayload<{ select: typeof ATTENDANCE_SELECT }>;

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndWorkDate(userId: string, workDate: Date): Promise<AttendanceRow | null> {
    return this.prisma.attendance.findUnique({
      where: { userId_workDate: { userId, workDate } },
      select: ATTENDANCE_SELECT,
    });
  }

  // 出勤を登録する。同じ勤務日の行がすでにある(UNIQUE 違反)場合は null を返す
  async createClockIn(params: {
    userId: string;
    workDate: Date;
    clockIn: Date;
  }): Promise<AttendanceRow | null> {
    try {
      return await this.prisma.attendance.create({ data: params, select: ATTENDANCE_SELECT });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  // 退勤を登録する。退勤が未登録の行だけを更新する条件付き UPDATE(docs/05 §8)。更新件数を返す
  async updateClockOut(params: {
    userId: string;
    workDate: Date;
    clockOut: Date;
  }): Promise<number> {
    const { userId, workDate, clockOut } = params;
    const result = await this.prisma.attendance.updateMany({
      where: { userId, workDate, clockOut: null },
      data: { clockOut },
    });
    return result.count;
  }

  // 本人の勤怠一覧(期間は両端を含む)。statuses は指定した状態のいずれかに一致するものだけ(未指定なら全件)
  findPageByUser(
    userId: string,
    filter: DateRange & { statuses?: AttendanceStatus[] },
    today: string,
    pagination: PaginationQuery,
  ): Promise<AttendancePageResult> {
    const where: Prisma.AttendanceWhereInput = { userId, workDate: toRangeFilter(filter) };
    if (filter.statuses && filter.statuses.length > 0) {
      const todayDate = toDbDate(today);
      where.AND = [{ OR: filter.statuses.map((status) => toStatusWhere(status, todayDate)) }];
    }
    return this.findPageWhere(where, [{ workDate: 'desc' }], pagination);
  }

  // 全ユーザーの勤怠一覧(管理者用)。today は status 条件の判定に使う東京の日付
  findPage(
    filter: DateRange & {
      name?: string;
      departmentId?: string;
      status?: AttendanceStatus;
    },
    today: string,
    pagination: PaginationQuery,
  ): Promise<AttendancePageResult> {
    const where: Prisma.AttendanceWhereInput = { workDate: toRangeFilter(filter) };
    const userWhere: Prisma.UserWhereInput = {};
    if (filter.name) {
      userWhere.name = { contains: filter.name, mode: 'insensitive' };
    }
    if (filter.departmentId) {
      userWhere.departmentId = filter.departmentId;
    }
    if (Object.keys(userWhere).length > 0) {
      where.user = userWhere;
    }
    if (filter.status) {
      where.AND = [toStatusWhere(filter.status, toDbDate(today))];
    }
    return this.findPageWhere(
      where,
      [{ workDate: 'desc' }, { user: { name: 'asc' } }, { id: 'asc' }],
      pagination,
    );
  }

  // 本人の月間出勤簿用。期間内の勤怠(必要な列のみ、勤務日の昇順)
  findByUserInRange(userId: string, start: Date, end: Date): Promise<SheetAttendanceRow[]> {
    return this.prisma.attendance.findMany({
      where: { userId, workDate: { gte: start, lte: end } },
      select: { id: true, workDate: true, clockIn: true, clockOut: true, modifiedAt: true },
      orderBy: { workDate: 'asc' },
    });
  }

  // 期間と重なる本人の申請中・承認済みの休暇
  findActiveLeavesInRange(userId: string, start: Date, end: Date): Promise<SheetLeaveRow[]> {
    return this.prisma.leave.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true, leaveType: true, status: true, startDate: true, endDate: true },
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    });
  }

  async findHireDate(userId: string): Promise<Date> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { hireDate: true },
    });
    return user.hireDate;
  }

  findById(id: string): Promise<AttendanceRow | null> {
    return this.prisma.attendance.findUnique({ where: { id }, select: ATTENDANCE_SELECT });
  }

  updateTimes(params: {
    id: string;
    clockIn: Date;
    clockOut: Date | null;
    modifiedBy: string;
    modifiedAt: Date;
  }): Promise<AttendanceRow> {
    const { id, ...data } = params;
    return this.prisma.attendance.update({ where: { id }, data, select: ATTENDANCE_SELECT });
  }

  private async findPageWhere(
    where: Prisma.AttendanceWhereInput,
    orderBy: Prisma.AttendanceOrderByWithRelationInput[],
    pagination: PaginationQuery,
  ): Promise<AttendancePageResult> {
    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        select: ATTENDANCE_SELECT,
        orderBy,
        ...toSkipTake(pagination),
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { items, totalCount };
  }
}

export type SheetAttendanceRow = Prisma.AttendanceGetPayload<{
  select: { id: true; workDate: true; clockIn: true; clockOut: true; modifiedAt: true };
}>;

export type SheetLeaveRow = Prisma.LeaveGetPayload<{
  select: { id: true; leaveType: true; status: true; startDate: true; endDate: true };
}>;

interface DateRange {
  startDate: string;
  endDate: string;
}

interface AttendancePageResult {
  items: AttendanceRow[];
  totalCount: number;
}

function toRangeFilter(range: DateRange): Prisma.DateTimeFilter {
  return { gte: toDbDate(range.startDate), lte: toDbDate(range.endDate) };
}

// 状態は保存せず計算で決まるため、東京の今日を基準に WHERE 条件へ変換する(docs/05)
function toStatusWhere(status: AttendanceStatus, todayDate: Date): Prisma.AttendanceWhereInput {
  switch (status) {
    case 'WORKING':
      return { workDate: todayDate, clockOut: null };
    case 'DONE':
      return { clockOut: { not: null } };
    case 'MISSING_CLOCK_OUT':
      return { workDate: { lt: todayDate }, clockOut: null };
  }
}
