import { ForbiddenException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { AppException } from '../../common/exceptions/app.exception.js';
import { toPage, toSkipTake } from '../../common/pagination/pagination.js';
import type { Page } from '../../common/pagination/pagination.js';
import { Clock } from '../../common/time/clock.js';
import { toDbDate, tokyoYear } from '../../common/time/tokyo-date.js';
import type { AuthUser } from '../auth/auth.types.js';
import type { PendingApprovalQueryDto } from './dto/pending-approval-query.dto.js';
import { calculateBalance, canProcessLeave, canViewLeave } from './leave-rules.js';
import type { LeaveBalance } from './leave-rules.js';
import { toLeaveResponse } from './leave.mapper.js';
import type { LeaveResponse } from './leave.mapper.js';
import { LeavesRepository } from './leaves.repository.js';
import type { LeaveRow } from './leaves.repository.js';

// :id が UUID 形式でなければ DB を引かずに 404 とする(DB エラーで 500 にならないようにする)
const uuidSchema = z.guid();

@Injectable()
export class LeavesService {
  constructor(
    private readonly leavesRepository: LeavesRepository,
    private readonly clock: Clock,
  ) {}

  // 本人の年休残日数(FR-LEAVE-001, FR-LEAVE-006)。年は休暇の開始日の年で集計する
  async getBalance(userId: string, year: number | undefined): Promise<LeaveBalance> {
    const targetYear = year ?? tokyoYear(this.clock.now());
    const [granted, sums] = await Promise.all([
      this.leavesRepository.findGrantedDays(userId, targetYear),
      this.leavesRepository.sumDeductibleDaysByStatus({
        userId,
        startDateFrom: toDbDate(`${targetYear}-01-01`),
        startDateTo: toDbDate(`${targetYear}-12-31`),
      }),
    ]);
    const sumOf = (status: 'APPROVED' | 'PENDING'): number =>
      sums.find((sum) => sum.status === status)?.days?.toNumber() ?? 0;
    return calculateBalance({
      year: targetYear,
      grantedDays: granted?.toNumber() ?? 0,
      approvedDays: sumOf('APPROVED'),
      pendingDays: sumOf('PENDING'),
    });
  }

  // 承認待ち一覧(FR-LEAVE-003)。scope=all は ADMIN だけ
  async listPendingApproval(
    user: AuthUser,
    query: PendingApprovalQueryDto,
  ): Promise<Page<LeaveResponse>> {
    if (query.scope === 'all' && user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    const { items, totalCount } = await this.leavesRepository.findPending({
      approverId: query.scope === 'mine' ? user.id : undefined,
      ...toSkipTake(query),
    });
    return toPage(items.map(toLeaveResponse), totalCount, query.page, query.limit);
  }

  // 休暇詳細(FR-LEAVE-005)。存在を確認してから権限を確認する
  async getDetail(user: AuthUser, id: string): Promise<LeaveResponse> {
    const leave = await this.findLeaveOrThrow(id);
    if (!canViewLeave(leave, user)) {
      throw new ForbiddenException();
    }
    return toLeaveResponse(leave);
  }

  // 承認(FR-LEAVE-002)。残日数と日付の重複は再検査しない
  approve(user: AuthUser, id: string): Promise<LeaveResponse> {
    return this.process(user, id, { status: 'APPROVED' });
  }

  // 却下(FR-LEAVE-002)
  reject(user: AuthUser, id: string, rejectReason: string): Promise<LeaveResponse> {
    return this.process(user, id, { status: 'REJECTED', rejectReason });
  }

  // 承認・却下の共通処理: 取得(404)→ 権限(403)→ 条件付き UPDATE(0 件なら 409)→ 再取得
  private async process(
    user: AuthUser,
    id: string,
    change: { status: 'APPROVED' | 'REJECTED'; rejectReason?: string },
  ): Promise<LeaveResponse> {
    const leave = await this.findLeaveOrThrow(id);
    if (!canProcessLeave(leave, user)) {
      throw new ForbiddenException();
    }
    const updatedCount = await this.leavesRepository.processPending({
      id,
      ...change,
      processedBy: user.id,
      processedAt: this.clock.now(),
    });
    if (updatedCount === 0) {
      throw new AppException(
        'ALREADY_PROCESSED',
        HttpStatus.CONFLICT,
        'すでに処理された申請です。',
      );
    }
    return toLeaveResponse(await this.findLeaveOrThrow(id));
  }

  private async findLeaveOrThrow(id: string): Promise<LeaveRow> {
    if (!uuidSchema.safeParse(id).success) {
      throw new NotFoundException();
    }
    const leave = await this.leavesRepository.findById(id);
    if (!leave) {
      throw new NotFoundException();
    }
    return leave;
  }
}
