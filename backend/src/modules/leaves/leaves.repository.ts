import { Injectable } from '@nestjs/common';
import type { LeaveStatus, Prisma } from '../../generated/prisma/client.js';
import { USER_SUMMARY_SELECT } from '../../common/mappers/user-summary.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const LEAVE_SELECT = {
  id: true,
  userId: true,
  approverId: true,
  leaveType: true,
  startDate: true,
  endDate: true,
  days: true,
  reason: true,
  status: true,
  processedAt: true,
  rejectReason: true,
  createdAt: true,
  user: { select: USER_SUMMARY_SELECT },
  approver: { select: USER_SUMMARY_SELECT },
  processor: { select: USER_SUMMARY_SELECT },
} as const satisfies Prisma.LeaveSelect;

export type LeaveRow = Prisma.LeaveGetPayload<{ select: typeof LEAVE_SELECT }>;

// 年休から差し引く休暇の種類(FR-LEAVE-001)
const DEDUCTIBLE_LEAVE_TYPES = ['ANNUAL', 'HALF_AM', 'HALF_PM'] as const;

@Injectable()
export class LeavesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<LeaveRow | null> {
    return this.prisma.leave.findUnique({ where: { id }, select: LEAVE_SELECT });
  }

  // 承認待ちの一覧。approverId を指定するとその承認者に割り当てられたものだけ。
  // 申請日の降順(同順位は id の降順)
  async findPending(params: {
    approverId?: string;
    skip: number;
    take: number;
  }): Promise<{ items: LeaveRow[]; totalCount: number }> {
    const { approverId, skip, take } = params;
    const where: Prisma.LeaveWhereInput = {
      status: 'PENDING',
      ...(approverId ? { approverId } : {}),
    };
    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.leave.findMany({
        where,
        select: LEAVE_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.leave.count({ where }),
    ]);
    return { items, totalCount };
  }

  // 付与日数。未登録なら null
  async findGrantedDays(userId: string, year: number): Promise<Prisma.Decimal | null> {
    const grant = await this.prisma.leaveGrant.findUnique({
      where: { userId_year: { userId, year } },
      select: { grantedDays: true },
    });
    return grant?.grantedDays ?? null;
  }

  // 開始日が指定期間内の差し引き対象休暇について、APPROVED / PENDING ごとの日数合計を返す
  async sumDeductibleDaysByStatus(params: {
    userId: string;
    startDateFrom: Date;
    startDateTo: Date;
  }): Promise<{ status: LeaveStatus; days: Prisma.Decimal | null }[]> {
    const { userId, startDateFrom, startDateTo } = params;
    const groups = await this.prisma.leave.groupBy({
      by: ['status'],
      where: {
        userId,
        leaveType: { in: [...DEDUCTIBLE_LEAVE_TYPES] },
        status: { in: ['APPROVED', 'PENDING'] },
        startDate: { gte: startDateFrom, lte: startDateTo },
      },
      _sum: { days: true },
    });
    return groups.map((group) => ({ status: group.status, days: group._sum.days }));
  }

  // PENDING の行だけを処理済みにする条件付き UPDATE(docs/05 §8)。更新件数を返す
  async processPending(params: {
    id: string;
    status: 'APPROVED' | 'REJECTED';
    processedBy: string;
    processedAt: Date;
    rejectReason?: string;
  }): Promise<number> {
    const { id, status, processedBy, processedAt, rejectReason } = params;
    const result = await this.prisma.leave.updateMany({
      where: { id, status: 'PENDING' },
      data: { status, processedBy, processedAt, ...(rejectReason ? { rejectReason } : {}) },
    });
    return result.count;
  }
}
