import type { LeaveType, Role } from '../../generated/prisma/client.js';

// 年休から差し引く休暇の種類(FR-LEAVE-001)
export const DEDUCTIBLE_LEAVE_TYPES = ['ANNUAL', 'HALF_AM', 'HALF_PM'] as const;

export function isDeductibleLeaveType(leaveType: LeaveType): boolean {
  return (DEDUCTIBLE_LEAVE_TYPES as readonly LeaveType[]).includes(leaveType);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 休暇日数(FR-LEAVE-004)。土日を除く勤務日数。半休は 0.5 日。祝日は除かない。
// start / end は 'YYYY-MM-DD'(start <= end 前提)
export function countLeaveDays(leaveType: LeaveType, start: string, end: string): number {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  let weekdays = 0;
  for (let time = startTime; time <= endTime; time += DAY_MS) {
    const weekday = new Date(time).getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      weekdays += 1;
    }
  }
  if (leaveType === 'HALF_AM' || leaveType === 'HALF_PM') {
    return weekdays > 0 ? 0.5 : 0;
  }
  return weekdays;
}

// 期間の不正理由(INVALID_DATE_RANGE の message)。問題なければ null
export function validateLeavePeriod(
  leaveType: LeaveType,
  start: string,
  end: string,
): string | null {
  if (start > end) {
    return '終了日は開始日より前にできません。';
  }
  if (start.slice(0, 4) !== end.slice(0, 4)) {
    return '年をまたぐ休暇は年ごとに分けて申請してください。';
  }
  if ((leaveType === 'HALF_AM' || leaveType === 'HALF_PM') && start !== end) {
    return '半休は開始日と終了日を同じ日にしてください。';
  }
  return null;
}

interface LeavePeriod {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
}

// 日付が重なる既存休暇と衝突するか。同じ日の午前半休と午後半休の組み合わせだけ衝突しない。
// 呼び出し側は期間が重なる行だけを渡す
export function isLeaveConflict(existing: LeavePeriod, requested: LeavePeriod): boolean {
  const overlaps =
    existing.startDate <= requested.endDate && existing.endDate >= requested.startDate;
  if (!overlaps) {
    return false;
  }
  const isAmPmPair =
    (existing.leaveType === 'HALF_AM' && requested.leaveType === 'HALF_PM') ||
    (existing.leaveType === 'HALF_PM' && requested.leaveType === 'HALF_AM');
  const sameSingleDay =
    existing.startDate === existing.endDate &&
    requested.startDate === requested.endDate &&
    existing.startDate === requested.startDate;
  return !(isAmPmPair && sameSingleDay);
}

// 年休残日数(API-LEAVE-006 の応答)
export interface LeaveBalance {
  year: number;
  grantedDays: number;
  approvedDays: number;
  pendingDays: number;
  remainingDays: number;
}

// 残日数 = 付与 − 承認済み − 承認待ち(FR-LEAVE-001)。付与が未登録なら grantedDays に 0 を渡す
export function calculateBalance(params: {
  year: number;
  grantedDays: number;
  approvedDays: number;
  pendingDays: number;
}): LeaveBalance {
  const { year, grantedDays, approvedDays, pendingDays } = params;
  return {
    year,
    grantedDays,
    approvedDays,
    pendingDays,
    remainingDays: grantedDays - approvedDays - pendingDays,
  };
}

// 承認・却下できる人か(FR-LEAVE-002)。申請者本人は ADMIN でも不可。
// 割り当てられた承認者か ADMIN なら可。状態(PENDING かどうか)はここでは見ない
export function canProcessLeave(
  leave: { userId: string; approverId: string | null },
  user: { id: string; role: Role },
): boolean {
  if (leave.userId === user.id) {
    return false;
  }
  return leave.approverId === user.id || user.role === 'ADMIN';
}

// 休暇詳細を見られる人か(FR-LEAVE-005)。申請者、割り当てられた承認者、ADMIN
export function canViewLeave(
  leave: { userId: string; approverId: string | null },
  user: { id: string; role: Role },
): boolean {
  return leave.userId === user.id || leave.approverId === user.id || user.role === 'ADMIN';
}
