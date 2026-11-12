// 勤務進捗。表示専用で、勤怠の判定や記録には使わない

// 実労働 8 時間 + 休憩 60 分
export const EXPECTED_WORK_MINUTES = 540;

const MS_PER_MINUTE = 60_000;

// 出勤から until までの経過 ÷ 540 分(0〜100 に収め、小数は切り捨て)。出勤前は 0
export function workProgressPercent(clockIn: string | null, until: Date): number {
  if (clockIn === null) return 0;
  const elapsedMinutes = (until.getTime() - new Date(clockIn).getTime()) / MS_PER_MINUTE;
  const percent = Math.floor((elapsedMinutes / EXPECTED_WORK_MINUTES) * 100);
  return Math.min(100, Math.max(0, percent));
}
