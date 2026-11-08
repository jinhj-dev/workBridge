import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface TodaySummaryCounts {
  clockedInCount: number;
  notClockedInCount: number;
  onLeaveCount: number;
  pendingLeaveCount: number;
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
}
