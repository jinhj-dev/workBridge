import { Injectable } from '@nestjs/common';
import type { LeaveType, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface TodaySummaryCounts {
  clockedInCount: number;
  notClockedInCount: number;
  onLeaveCount: number;
  pendingLeaveCount: number;
}

export interface LeaveCalendarDayCount {
  date: string;
  count: number;
}

export interface UserOnLeave {
  id: string;
  name: string;
  departmentName: string;
  leaveTypes: LeaveType[];
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 当日の全体状況を集計する(FR-DASH-001)。人数は活性ユーザーのみ、承認待ちは全件。
  // 4 つの件数は同じトランザクションで数える
  async countTodaySummary(today: Date): Promise<TodaySummaryCounts> {
    const attendedToday: Prisma.AttendanceWhereInput = { workDate: today };
    // 今日が期間に含まれる承認済み休暇(種類は問わない、半休も含む)
    const onLeaveToday: Prisma.LeaveWhereInput = {
      status: 'APPROVED',
      startDate: { lte: today },
      endDate: { gte: today },
    };
    const [clockedInCount, onLeaveCount, notClockedInCount, pendingLeaveCount] =
      await this.prisma.$transaction([
        this.prisma.user.count({
          where: { isActive: true, attendances: { some: attendedToday } },
        }),
        this.prisma.user.count({ where: { isActive: true, leaves: { some: onLeaveToday } } }),
        this.prisma.user.count({
          where: {
            isActive: true,
            attendances: { none: attendedToday },
            leaves: { none: onLeaveToday },
          },
        }),
        this.prisma.leave.count({ where: { status: 'PENDING' } }),
      ]);
    return { clockedInCount, notClockedInCount, onLeaveCount, pendingLeaveCount };
  }

  // 月間の日付ごとの休暇者数(承認済み・活性ユーザー・土日除外、ユーザー単位の DISTINCT)。
  // 休暇者がいる日だけ返す。start / end は 'YYYY-MM-DD'(パラメータバインドのみ)
  async countApprovedLeavesByDay(start: string, end: string): Promise<LeaveCalendarDayCount[]> {
    const rows = await this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT to_char(days.d, 'YYYY-MM-DD') AS date, COUNT(DISTINCT l.user_id) AS count
      FROM (
        SELECT generate_series(${start}::timestamp, ${end}::timestamp, interval '1 day')::date AS d
      ) AS days
      JOIN leaves l ON l.start_date <= days.d AND l.end_date >= days.d
      JOIN users u ON u.id = l.user_id AND u.is_active
      WHERE l.status = 'APPROVED'
        AND l.start_date <= ${end}::date
        AND l.end_date >= ${start}::date
        AND EXTRACT(ISODOW FROM days.d) < 6
      GROUP BY days.d
      ORDER BY days.d`;
    return rows.map((row) => ({ date: row.date, count: Number(row.count) }));
  }

  // 指定日に承認済み休暇を持つ活性ユーザー(社員番号順)。休暇は種類のみ読む(事由などは読まない)
  async findUsersOnApprovedLeave(date: Date): Promise<UserOnLeave[]> {
    const approvedOnDate: Prisma.LeaveWhereInput = {
      status: 'APPROVED',
      startDate: { lte: date },
      endDate: { gte: date },
    };
    const users = await this.prisma.user.findMany({
      where: { isActive: true, leaves: { some: approvedOnDate } },
      select: {
        id: true,
        name: true,
        department: { select: { name: true } },
        leaves: { where: approvedOnDate, select: { leaveType: true } },
      },
      orderBy: [{ empId: 'asc' }, { id: 'asc' }],
    });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      departmentName: user.department.name,
      leaveTypes: user.leaves.map((leave) => leave.leaveType),
    }));
  }
}
