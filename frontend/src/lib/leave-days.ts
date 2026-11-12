import type { LeaveStatus, LeaveType } from '@/lib/api/types';

// 休暇管理(SCR-004)の日数プレビューと URL Query の解釈。最終的な日数はサーバーが計算する

const DAY_MS = 24 * 60 * 60 * 1000;
const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// 状態の一覧(表示順)。絞り込みの選択肢と URL Query の解釈で共通に使う
export const LEAVE_STATUSES: readonly LeaveStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

// 休暇種別の一覧(表示順)。申請モーダルの選択肢・絞り込み・URL Query の解釈で共通に使う
export const LEAVE_TYPES: readonly LeaveType[] = [
  'ANNUAL',
  'HALF_AM',
  'HALF_PM',
  'SPECIAL',
  'OTHER',
];

export interface LeavesQuery {
  appliedFrom: string; // 空は指定なし(YYYY-MM-DD)
  appliedTo: string; // 空は指定なし(YYYY-MM-DD)
  leaveType: LeaveType | ''; // 空は「すべて」
  status: LeaveStatus | ''; // 空は「すべて」
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

// 不正・欠落した値は既定値(指定なし・すべて・1 ページ)に置き換える。
// 種別・ステータスは単一値のみ有効(カンマ区切りの複数値は先頭を使う)。旧 year は無視する
export function parseLeavesQuery(params: ParamsLike): LeavesQuery {
  const rawPage = params.get('page') ?? '';
  const page = /^\d+$/.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : 1;
  const from = params.get('appliedFrom') ?? '';
  const to = params.get('appliedTo') ?? '';
  const firstOf = (value: string | null): string => (value ?? '').split(',')[0];
  const validFrom = isRealDate(from) ? from : '';
  const validTo = isRealDate(to) ? to : '';
  // 開始日が終了日より後(URL の直接編集)の範囲は API が 400 を返すため捨てる
  const reversed = validFrom !== '' && validTo !== '' && validFrom > validTo;
  return {
    appliedFrom: reversed ? '' : validFrom,
    appliedTo: reversed ? '' : validTo,
    leaveType: LEAVE_TYPES.find((type) => type === firstOf(params.get('leaveType'))) ?? '',
    status: LEAVE_STATUSES.find((status) => status === firstOf(params.get('status'))) ?? '',
    page,
  };
}
