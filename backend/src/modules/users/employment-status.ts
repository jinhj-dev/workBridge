import { toDbDate, toTokyoDate } from '../../common/time/tokyo-date.js';
import type { Prisma } from '../../generated/prisma/client.js';

// 在籍状態(保存せず、isActive と入社日から計算する。基準日は東京の今日)
export const EMPLOYMENT_STATUSES = ['ACTIVE', 'UPCOMING', 'INACTIVE'] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

// hireDate は 'YYYY-MM-DD'、now は Clock の現在時刻(東京の日付に直して比較する)
export function employmentStatusOf(
  user: { hireDate: string; isActive: boolean },
  now: Date,
): EmploymentStatus {
  if (!user.isActive) {
    return 'INACTIVE';
  }
  return user.hireDate <= toTokyoDate(now) ? 'ACTIVE' : 'UPCOMING';
}

// 状態による絞り込み条件(employmentStatusOf と同じ定義)
export function employmentStatusWhere(status: EmploymentStatus, now: Date): Prisma.UserWhereInput {
  const today = toDbDate(toTokyoDate(now));
  switch (status) {
    case 'ACTIVE':
      return { isActive: true, hireDate: { lte: today } };
    case 'UPCOMING':
      return { isActive: true, hireDate: { gt: today } };
    case 'INACTIVE':
      return { isActive: false };
  }
}
