import { isWeekend } from '../../common/time/calendar-rules.js';
import { japaneseHolidaysInRange } from '../../common/time/japanese-holiday.js';

// 当日の状態別人数(出勤 > 休暇 > 未出勤の排他 3 分類)
export interface StatusCounts {
  clockedInCount: number;
  onLeaveCount: number;
  notClockedInCount: number;
}

// 勤務日か(土日・日本の祝日は勤務日ではない)
export function isWorkday(ymd: string): boolean {
  return !isWeekend(ymd) && japaneseHolidaysInRange(ymd, ymd).size === 0;
}

// 勤務日でない日は出勤した人だけを数える(休暇・未出勤は 0)
export function applyWorkday(counts: StatusCounts, workday: boolean): StatusCounts {
  // 入力に余計な項目(部署コードなど)が混ざっていても、3 項目だけの新しいオブジェクトを返す
  return {
    clockedInCount: counts.clockedInCount,
    onLeaveCount: workday ? counts.onLeaveCount : 0,
    notClockedInCount: workday ? counts.notClockedInCount : 0,
  };
}

// 出勤率(%)= 出勤 /(出勤 + 休暇 + 未出勤)。小数 1 桁に四捨五入、分母 0 なら null
export function attendanceRate(counts: StatusCounts): number | null {
  const total = counts.clockedInCount + counts.onLeaveCount + counts.notClockedInCount;
  if (total === 0) {
    return null;
  }
  return Math.round((counts.clockedInCount * 1000) / total) / 10;
}

export function sumStatusCounts(list: StatusCounts[]): StatusCounts {
  return list.reduce<StatusCounts>(
    (sum, item) => ({
      clockedInCount: sum.clockedInCount + item.clockedInCount,
      onLeaveCount: sum.onLeaveCount + item.onLeaveCount,
      notClockedInCount: sum.notClockedInCount + item.notClockedInCount,
    }),
    { clockedInCount: 0, onLeaveCount: 0, notClockedInCount: 0 },
  );
}
