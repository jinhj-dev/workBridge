import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { AppException } from '../../common/exceptions/app.exception.js';
import { toUserSummary } from '../../common/mappers/user-summary.js';
import type { UserSummary } from '../../common/mappers/user-summary.js';
import { toPage, toSkipTake } from '../../common/pagination/pagination.js';
import type { Page } from '../../common/pagination/pagination.js';
import { Clock } from '../../common/time/clock.js';
import { monthRange } from '../../common/time/calendar-rules.js';
import { japaneseHolidaysInRange } from '../../common/time/japanese-holiday.js';
import {
  fromDbDate,
  toDbDate,
  toTokyoDate,
  tokyoDayStart,
  tokyoNextDayStart,
  tokyoYear,
} from '../../common/time/tokyo-date.js';
import type { AuthUser } from '../auth/auth.types.js';
import type { ApproversQueryDto } from './dto/approvers-query.dto.js';
import type { CreateLeaveDto } from './dto/create-leave.dto.js';
import type { LeaveCalendarQueryDto } from './dto/leave-calendar-query.dto.js';
import { toCalendarCategory, toHalfDay } from './leave-calendar-rules.js';
import type { CalendarResponse } from './leave-calendar-rules.js';
import type { MyLeavesQueryDto } from './dto/my-leaves-query.dto.js';
import type { PendingApprovalQueryDto } from './dto/pending-approval-query.dto.js';
import {
  calculateBalance,
  canProcessLeave,
  canViewLeave,
  countLeaveDays,
  isDeductibleLeaveType,
  isLeaveConflict,
  validateLeavePeriod,
} from './leave-rules.js';
import type { LeaveBalance } from './leave-rules.js';
import { toLeaveResponse } from './leave.mapper.js';
import type { LeaveResponse } from './leave.mapper.js';
import { LeavesRepository } from './leaves.repository.js';
import type { LeaveCreationTx, LeaveRow } from './leaves.repository.js';

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

  // 休暇申請(FR-LEAVE-001, FR-LEAVE-004, NFR-004)。期間の検査 → ユーザー行ロック → 各種検査 → INSERT
  async create(user: AuthUser, dto: CreateLeaveDto): Promise<LeaveResponse> {
    const { leaveType, startDate, endDate, reason } = dto;
    const periodError = validateLeavePeriod(leaveType, startDate, endDate);
    if (periodError) {
      throw new AppException('INVALID_DATE_RANGE', HttpStatus.BAD_REQUEST, periodError);
    }
    const days = countLeaveDays(leaveType, startDate, endDate);
    if (days === 0) {
      throw new AppException(
        'NO_WORKING_DAYS',
        HttpStatus.BAD_REQUEST,
        '申請期間に勤務日がありません。',
      );
    }

    const createdId = await this.leavesRepository.createWithUserLock(
      user.id,
      async (lockedUser, tx) => {
        // ロックした行で再判定する(トークンの値は使わない)
        if (!lockedUser?.isActive) {
          throw new UnauthorizedException();
        }
        let approverId: string | null = null;
        if (lockedUser.approvalRequired) {
          approverId = await this.resolveApprover(user.id, dto.approverId, tx);
        }

        const existing = await tx.findOverlapping({
          userId: user.id,
          startDate: toDbDate(startDate),
          endDate: toDbDate(endDate),
        });
        const requested = { leaveType, startDate, endDate };
        const conflicted = existing.some((row) =>
          isLeaveConflict(
            {
              leaveType: row.leaveType,
              startDate: fromDbDate(row.startDate),
              endDate: fromDbDate(row.endDate),
            },
            requested,
          ),
        );
        if (conflicted) {
          throw new AppException(
            'LEAVE_CONFLICT',
            HttpStatus.CONFLICT,
            'その期間にはすでに申請された休暇があります。',
          );
        }

        if (isDeductibleLeaveType(leaveType)) {
          const { grantedDays, usedDays } = await tx.findBalanceBase(
            user.id,
            Number(startDate.slice(0, 4)),
          );
          const remainingDays = grantedDays - usedDays;
          if (remainingDays < days) {
            throw new AppException(
              'INSUFFICIENT_LEAVE_BALANCE',
              HttpStatus.UNPROCESSABLE_ENTITY,
              `年次休暇の残日数が不足しています。(残り ${remainingDays} 日)`,
            );
          }
        }

        const now = this.clock.now();
        return tx.insert({
          userId: user.id,
          leaveType,
          startDate: toDbDate(startDate),
          endDate: toDbDate(endDate),
          days,
          reason,
          createdAt: now,
          ...(approverId
            ? { status: 'PENDING', approverId }
            : { status: 'APPROVED', approverId: null, processedBy: user.id, processedAt: now }),
        });
      },
    );
    return toLeaveResponse(await this.findLeaveOrThrow(createdId));
  }

  // 承認が必要なユーザーの承認者を検証する。問題なければその ID を返す
  private async resolveApprover(
    userId: string,
    approverId: string | undefined,
    tx: LeaveCreationTx,
  ): Promise<string> {
    if (!approverId) {
      throw new AppException(
        'APPROVER_REQUIRED',
        HttpStatus.BAD_REQUEST,
        '承認者を選択してください。',
      );
    }
    const invalid = new AppException(
      'INVALID_APPROVER',
      HttpStatus.BAD_REQUEST,
      '承認者を選び直してください。',
    );
    if (!uuidSchema.safeParse(approverId).success || approverId === userId) {
      throw invalid;
    }
    if (!(await tx.isActiveUser(approverId))) {
      throw invalid;
    }
    return approverId;
  }

  // 承認者候補(API-LEAVE-002)
  async listApprovers(userId: string, query: ApproversQueryDto): Promise<UserSummary[]> {
    const rows = await this.leavesRepository.findApprovers({
      excludeUserId: userId,
      keyword: query.keyword || undefined,
    });
    return rows.map(toUserSummary);
  }

  // 本人の休暇履歴(API-LEAVE-003)
  async listMine(userId: string, query: MyLeavesQueryDto): Promise<Page<LeaveResponse>> {
    const { items, totalCount } = await this.leavesRepository.findByUser({
      userId,
      statuses: query.status,
      leaveTypes: query.leaveType,
      ...(query.year !== undefined
        ? {
            startDateFrom: toDbDate(`${query.year}-01-01`),
            startDateTo: toDbDate(`${query.year}-12-31`),
          }
        : {}),
      // 申請日は東京の日付で比較する(終了日は翌日 0 時を排他的な終端にする)
      ...(query.appliedFrom ? { createdAtFrom: tokyoDayStart(query.appliedFrom) } : {}),
      ...(query.appliedTo ? { createdAtTo: tokyoNextDayStart(query.appliedTo) } : {}),
      ...toSkipTake(query),
    });
    return toPage(items.map(toLeaveResponse), totalCount, query.page, query.limit);
  }

  // 共有休暇カレンダー(API-LEAVE-010, FR-LEAVE-005)。承認済み・有効な社員の休暇を公開項目だけで返す
  async getCalendar(query: LeaveCalendarQueryDto): Promise<CalendarResponse> {
    const month = query.month ?? toTokyoDate(this.clock.now()).slice(0, 7);
    const { start, end } = monthRange(month);
    const rows = await this.leavesRepository.findApprovedInRange({
      start: toDbDate(start),
      end: toDbDate(end),
      departmentId: query.departmentId,
      name: query.name,
      empId: query.empId,
    });
    const holidays = [...japaneseHolidaysInRange(start, end)].map(([date, name]) => ({
      date,
      name,
    }));
    return {
      month,
      holidays,
      items: rows.map((row) => ({
        name: row.user.name,
        empId: row.user.empId,
        departmentName: row.user.department.name,
        startDate: fromDbDate(row.startDate),
        endDate: fromDbDate(row.endDate),
        category: toCalendarCategory(row.leaveType),
        halfDay: toHalfDay(row.leaveType),
      })),
    };
  }

  // 取消(API-LEAVE-005): 取得(404)→ 申請者確認(403)→ 条件付き UPDATE(0 件なら 409)→ 再取得
  async cancel(user: AuthUser, id: string): Promise<LeaveResponse> {
    const leave = await this.findLeaveOrThrow(id);
    if (leave.userId !== user.id) {
      throw new ForbiddenException();
    }
    const now = this.clock.now();
    const updatedCount = await this.leavesRepository.cancelIfCancellable({
      id,
      userId: user.id,
      today: toDbDate(toTokyoDate(now)),
      processedAt: now,
    });
    if (updatedCount === 0) {
      throw new AppException('NOT_CANCELLABLE', HttpStatus.CONFLICT, '取り消せない状態です。');
    }
    return toLeaveResponse(await this.findLeaveOrThrow(id));
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
      statuses: query.status ?? ['PENDING'],
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
