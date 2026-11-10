import type { LeaveStatus, LeaveType } from '@/lib/api/types';

// 休暇管理(SCR-004)の日数プレビューと URL Query の解釈。最終的な日数はサーバーが計算する

const DAY_MS = 24 * 60 * 60 * 1000;
const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const YEARS_BACK = 4;

export type LeavesTab = 'apply' | 'history';

// 状態の一覧(表示順)。絞り込みの選択肢と URL Query の解釈で共通に使う
export const LEAVE_STATUSES: readonly LeaveStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

export interface LeavesQuery {
  tab: LeavesTab;
  year: number;
  status: LeaveStatus | ''; // 空文字は「すべて」
  page: number;
}

interface ParamsLike {
  get(name: string): string | null;
}

export function isHalfDay(leaveType: LeaveType | ''): boolean {
  return leaveType === 'HALF_AM' || leaveType === 'HALF_PM';
}

function isRealDate(value: string): boolean {
  if (!YMD_PATTERN.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

// 土日を除いた日数(半休は 0.5)。期間が未入力・逆順・実在しない日付のときは null
export function countLeaveDays(
  leaveType: LeaveType | '',
  startDate: string,
  endDate: string,
): number | null {
  if (!isRealDate(startDate) || !isRealDate(endDate) || startDate > endDate) return null;
  const end = Date.parse(`${endDate}T00:00:00Z`);
  let weekdays = 0;
  for (let time = Date.parse(`${startDate}T00:00:00Z`); time <= end; time += DAY_MS) {
    const weekday = new Date(time).getUTCDay();
    if (weekday !== 0 && weekday !== 6) weekdays += 1;
  }
  return isHalfDay(leaveType) ? (weekdays > 0 ? 0.5 : 0) : weekdays;
}

// 履歴の年の選択肢: 来年 〜 4 年前(降順)
export function yearOptions(currentYear: number): number[] {
  return Array.from({ length: YEARS_BACK + 2 }, (_, i) => currentYear + 1 - i);
}

// 不正・欠落した値は既定値(履歴・今年・すべて・1 ページ)に置き換える
export function parseLeavesQuery(params: ParamsLike, currentYear: number): LeavesQuery {
  const rawYear = params.get('year') ?? '';
  const year = /^\d{4}$/.test(rawYear) ? Number(rawYear) : currentYear;
  const rawPage = params.get('page') ?? '';
  const page = /^\d+$/.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : 1;
  return {
    tab: params.get('tab') === 'apply' ? 'apply' : 'history',
    year: yearOptions(currentYear).includes(year) ? year : currentYear,
    status: LEAVE_STATUSES.find((known) => known === params.get('status')) ?? '',
    page,
  };
}
