import type { LeaveCalendarItem } from '@/lib/api/types';
import { weekdayIndex } from '@/lib/attendance-sheet';
import { messages } from '@/messages/ja';

// 休暇カレンダー(SCR-004 休暇カレンダータブ)の日付計算と配置。文字列演算と UTC のみを使い、実行環境のタイムゾーンに依存しない

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const MIN_MONTH = '2000-01';
export const MAX_MONTH = '2100-12';

function toTime(ymd: string): number {
  return Date.parse(`${ymd}T00:00:00Z`);
}

function fromTime(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

// ?month= の解釈。不正・範囲外は既定(今月)
export function parseCalendarMonth(value: string | null, currentMonth: string): string {
  if (value === null || !MONTH_PATTERN.test(value)) return currentMonth;
  return value >= MIN_MONTH && value <= MAX_MONTH ? value : currentMonth;
}

// ?date= の解釈。表示月の中の実在する日付だけ有効
export function parseCalendarDate(value: string | null, month: string): string | null {
  if (value === null || !YMD_PATTERN.test(value) || !value.startsWith(month)) return null;
  return fromTime(toTime(value)) === value ? value : null;
}

// 日曜始まりの週ごとの日付(月の前後の日付を含む。1 週目〜最終週)
export function buildMonthGrid(month: string): string[][] {
  const first = toTime(`${month}-01`);
  const start = first - new Date(first).getUTCDay() * DAY_MS;
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0));
  const end = lastDay.getTime() + (6 - lastDay.getUTCDay()) * DAY_MS;
  const weeks: string[][] = [];
  for (let weekStart = start; weekStart <= end; weekStart += 7 * DAY_MS) {
    weeks.push(Array.from({ length: 7 }, (_, i) => fromTime(weekStart + i * DAY_MS)));
  }
  return weeks;
}

export function isInMonth(date: string, month: string): boolean {
  return date.startsWith(month);
}

export interface WeekBar {
  item: LeaveCalendarItem;
  startCol: number; // 0〜6
  endCol: number; // 0〜6(含む)
  lane: number;
}

export interface WeekLayout {
  bars: WeekBar[]; // lane が maxLanes 未満のものだけ
  hidden: Record<string, number>; // 日付 → 表示しきれなかった件数
}

// 週ごとに月の中の期間だけを切り出して連続した棒にし、重なる棒は上から詰めた段(lane)へ置く。
// maxLanes を超える棒は表示せず、その日付の「+N件」に数える
export function layoutWeekLanes(
  items: readonly LeaveCalendarItem[],
  weekDates: readonly string[],
  month: string,
  maxLanes: number,
): WeekLayout {
  const inMonthCols = weekDates.flatMap((date, col) => (isInMonth(date, month) ? [col] : []));
  const bars: WeekBar[] = [];
  const hidden: Record<string, number> = {};
  if (inMonthCols.length === 0) return { bars, hidden };
  const firstCol = inMonthCols[0];
  const lastCol = inMonthCols[inMonthCols.length - 1];
  const laneEnds: number[] = []; // 段ごとの、最後に置いた棒の終了列

  for (const item of items) {
    const startCol = Math.max(
      firstCol,
      weekDates.findIndex((d) => d >= item.startDate),
    );
    const rawEnd = weekDates.findLastIndex((d) => d <= item.endDate);
    const endCol = Math.min(lastCol, rawEnd);
    if (item.startDate > weekDates[6] || item.endDate < weekDates[0] || startCol > endCol) continue;
    // weekDates.findIndex は期間の開始が週より前だと 0 を返す
    let lane = laneEnds.findIndex((end) => end < startCol);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = endCol;
    if (lane < maxLanes) {
      bars.push({ item, startCol, endCol, lane });
    } else {
      for (let col = startCol; col <= endCol; col += 1) {
        hidden[weekDates[col]] = (hidden[weekDates[col]] ?? 0) + 1;
      }
    }
  }
  return { bars, hidden };
}

export function itemsOnDate(
  items: readonly LeaveCalendarItem[],
  date: string,
): LeaveCalendarItem[] {
  return items.filter((item) => item.startDate <= date && date <= item.endDate);
}

// 休暇が重なる日数(土日・祝日を含む暦日数)
export function calendarDayCount(item: Pick<LeaveCalendarItem, 'startDate' | 'endDate'>): number {
  return Math.round((toTime(item.endDate) - toTime(item.startDate)) / DAY_MS) + 1;
}

function weekdayOf(ymd: string): string {
  return messages.calendar.weekdays[weekdayIndex(ymd)];
}

// 11/13（水）
function monthDay(ymd: string): string {
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}（${weekdayOf(ymd)}）`;
}

function halfDayLabel(item: Pick<LeaveCalendarItem, 'halfDay'>): string {
  if (item.halfDay === null) return '';
  const t = messages.leaveCalendar;
  return item.halfDay === 'AM' ? t.am : t.pm;
}

// 11/13（水）～11/15（金）。1 日だけなら 11/13（水）。半休は末尾に「午前」「午後」
export function formatLeavePeriod(
  item: Pick<LeaveCalendarItem, 'startDate' | 'endDate' | 'halfDay'>,
): string {
  const range =
    item.startDate === item.endDate
      ? monthDay(item.startDate)
      : `${monthDay(item.startDate)}～${monthDay(item.endDate)}`;
  const half = halfDayLabel(item);
  return half ? `${range} ${half}` : range;
}

// モバイルの期間行: 2026/11/13（木）～11/15（土）（3日間）。半休は（半日）
export function formatLeavePeriodWithCount(
  item: Pick<LeaveCalendarItem, 'startDate' | 'endDate' | 'halfDay'>,
): { period: string; count: string } {
  const t = messages.leaveCalendar;
  const start = `${item.startDate.replaceAll('-', '/')}（${weekdayOf(item.startDate)}）`;
  const period = item.startDate === item.endDate ? start : `${start}～${monthDay(item.endDate)}`;
  if (item.halfDay !== null) return { period, count: t.halfDay };
  const days = calendarDayCount(item);
  return { period, count: days > 1 ? t.daysSpan(days) : '' };
}

// 11月13日（木）
export function formatDateLabel(ymd: string): string {
  return `${Number(ymd.slice(5, 7))}月${Number(ymd.slice(8, 10))}日（${weekdayOf(ymd)}）`;
}

// 棒に表示する文言: 氏名 + 半休（午前）
export function barText(item: Pick<LeaveCalendarItem, 'name' | 'halfDay'>): string {
  const half = halfDayLabel(item);
  return half ? `${item.name}（${half}）` : item.name;
}
