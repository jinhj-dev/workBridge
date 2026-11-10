import { Injectable } from '@nestjs/common';
import type { LeaveStatus, LeaveType, Prisma } from '../../generated/prisma/client.js';
import { USER_SUMMARY_SELECT } from '../../common/mappers/user-summary.js';
import type { UserSummaryRow } from '../../common/mappers/user-summary.js';
import { toDbDate } from '../../common/time/tokyo-date.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DEDUCTIBLE_LEAVE_TYPES } from './leave-rules.js';

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

// 開始日が指定期間内の差し引き対象休暇について、APPROVED / PENDING ごとの日数合計を返す(通常・トランザクション共用)
async function groupDeductibleDays(
  client: Prisma.TransactionClient,
  params: { userId: string; startDateFrom: Date; startDateTo: Date },
): Promise<{ status: LeaveStatus; days: Prisma.Decimal | null }[]> {
  const { userId, startDateFrom, startDateTo } = params;
  const groups = await client.leave.groupBy({
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

// 休暇申請のトランザクション内で使う操作(ユーザー行をロックした後に呼ぶ)
export interface LeaveCreationTx {
  // ロック済みのユーザー行は createWithUserLock が取得し、コールバックの引数で渡される。承認者候補の存在確認(ロックしない)
  isActiveUser(userId: string): Promise<boolean>;
  // 期間が重なる PENDING / APPROVED の休暇
  findOverlapping(params: {
    userId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<{ leaveType: LeaveType; startDate: Date; endDate: Date }[]>;
  // 年休の付与日数と、承認済み+承認待ちの差し引き日数(開始日の年で集計)
  findBalanceBase(userId: string, year: number): Promise<{ grantedDays: number; usedDays: number }>;
  insert(data: Prisma.LeaveUncheckedCreateInput): Promise<string>;
}

@Injectable()
export class LeavesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ユーザー行を FOR NO KEY UPDATE でロックしたトランザクションで work を実行する(docs/05 §8)。
  // 行がなければ user は null
  createWithUserLock<T>(
    userId: string,
    work: (
      user: { isActive: boolean; approvalRequired: boolean } | null,
      tx: LeaveCreationTx,
    ) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (client) => {
      const rows = await client.$queryRaw<
        { is_active: boolean; approval_required: boolean }[]
      >`SELECT is_active, approval_required FROM users WHERE id = ${userId}::uuid FOR NO KEY UPDATE`;
      const row = rows[0];
      const user = row
        ? { isActive: row.is_active, approvalRequired: row.approval_required }
        : null;
      const tx: LeaveCreationTx = {
        isActiveUser: async (id) => {
          const found = await client.user.findUnique({
            where: { id },
            select: { isActive: true },
          });
          return found?.isActive === true;
        },
        findOverlapping: ({ userId: targetUserId, startDate, endDate }) =>
          client.leave.findMany({
            where: {
              userId: targetUserId,
              status: { in: ['PENDING', 'APPROVED'] },
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            select: { leaveType: true, startDate: true, endDate: true },
          }),
        findBalanceBase: async (targetUserId, year) => {
          const [grant, groups] = await Promise.all([
            client.leaveGrant.findUnique({
              where: { userId_year: { userId: targetUserId, year } },
              select: { grantedDays: true },
            }),
            groupDeductibleDays(client, {
              userId: targetUserId,
              startDateFrom: toDbDate(`${year}-01-01`),
              startDateTo: toDbDate(`${year}-12-31`),
            }),
          ]);
          const usedDays = groups.reduce((sum, group) => sum + (group.days?.toNumber() ?? 0), 0);
          return { grantedDays: grant?.grantedDays.toNumber() ?? 0, usedDays };
        },
        insert: async (data) => {
          const created = await client.leave.create({ data, select: { id: true } });
          return created.id;
        },
      };
      return work(user, tx);
    });
  }

  // 承認者候補: 有効なユーザー(本人を除く)。keyword は氏名(大文字小文字無視)か社員番号の部分一致
  findApprovers(params: { excludeUserId: string; keyword?: string }): Promise<UserSummaryRow[]> {
    const { excludeUserId, keyword } = params;
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: excludeUserId },
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword, mode: 'insensitive' } },
                { empId: { contains: keyword } },
              ],
            }
          : {}),
      },
      select: USER_SUMMARY_SELECT,
      orderBy: { empId: 'asc' },
    });
  }

  // 本人の休暇履歴。申請日の降順(同順位は id の降順)
  async findByUser(params: {
    userId: string;
    startDateFrom?: Date;
    startDateTo?: Date;
    status?: LeaveStatus;
    skip: number;
    take: number;
  }): Promise<{ items: LeaveRow[]; totalCount: number }> {
    const { userId, startDateFrom, startDateTo, status, skip, take } = params;
    const where: Prisma.LeaveWhereInput = {
      userId,
      ...(status ? { status } : {}),
      ...(startDateFrom && startDateTo
        ? { startDate: { gte: startDateFrom, lte: startDateTo } }
        : {}),
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

  // 取消できる行だけを CANCELLED にする条件付き UPDATE(docs/05 §8)。更新件数を返す。
  // 取消可能: PENDING、または即時承認(approver_id IS NULL)で開始日が today より後の APPROVED
  async cancelIfCancellable(params: {
    id: string;
    userId: string;
    today: Date;
    processedAt: Date;
  }): Promise<number> {
    const { id, userId, today, processedAt } = params;
    const result = await this.prisma.leave.updateMany({
      where: {
        id,
        userId,
        OR: [
          { status: 'PENDING' },
          { status: 'APPROVED', approverId: null, startDate: { gt: today } },
        ],
      },
      data: { status: 'CANCELLED', processedBy: userId, processedAt },
    });
    return result.count;
  }

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
    return groupDeductibleDays(this.prisma, params);
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
