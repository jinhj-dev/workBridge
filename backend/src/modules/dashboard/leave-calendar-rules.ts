import type { LeaveType } from '../../generated/prisma/client.js';

export type HalfDay = 'AM' | 'PM';

// 'YYYY-MM' → その月の初日・末日('YYYY-MM-DD')
export function monthRange(month: string): { start: string; end: string } {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

// 土日か(祝日は平日扱い)
export function isWeekend(ymd: string): boolean {
  const weekday = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

// その日の承認済み休暇の種類一覧 → 半休の区分。
// 午前のみ → AM、午後のみ → PM、午前+午後・終日休暇を含む場合 → null
export function resolveHalfDay(leaveTypes: LeaveType[]): HalfDay | null {
  const hasFullDay = leaveTypes.some((type) => type !== 'HALF_AM' && type !== 'HALF_PM');
  if (hasFullDay) {
    return null;
  }
  const hasAm = leaveTypes.includes('HALF_AM');
  const hasPm = leaveTypes.includes('HALF_PM');
  if (hasAm && !hasPm) {
    return 'AM';
  }
  if (hasPm && !hasAm) {
    return 'PM';
  }
  return null;
}
