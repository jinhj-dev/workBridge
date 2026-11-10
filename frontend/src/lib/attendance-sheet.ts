import type { LeaveType, SheetDay, SheetLeave } from '@/lib/api/types';
import { messages } from '@/messages/ja';

// 出勤簿(SCR-003)の表示用計算。文字列と UTC だけを使い、ローカルのタイムゾーンに依存しない

export const MINUTES_PER_DAY = 1440;

export interface TimelineSegment {
  startMinute: number;
  endMinute: number;
  kind: 'work' | 'break';
}

export interface DayTimeline {
  segments: TimelineSegment[];
  // 勤務中・退勤漏れの日は出勤時刻の位置だけを示す
  markerMinute?: number;
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

// ?month=YYYY-MM の解釈。なし・形式誤り・範囲外は今月にする
export function parseSheetMonth(value: string | null, currentMonth: string): string {
  const match = value === null ? null : MONTH_PATTERN.exec(value);
  if (!match) return currentMonth;
  const year = Number(match[1]);
  return year >= MIN_YEAR && year <= MAX_YEAR ? match[0] : currentMonth;
}

// 日付(YYYY-MM-DD)の曜日の番号(0 = 日)
export function weekdayIndex(ymd: string): number {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

// 2日(月)(全角括弧、月なし、先頭 0 なし)
export function formatSheetDate(ymd: string): string {
  const day = ymd.split('-')[2] ?? '';
  return `${Number(day)}日（${messages.calendar.weekdays[weekdayIndex(ymd)]}）`;
}

// 勤務パターンの種類。見た目(Pill の色)は components/attendance/workPattern.ts に分ける
export type WorkPatternKind = 'NORMAL' | 'DAY_OFF' | 'HOLIDAY' | 'LEAVE';

// 申請の表示上の分類(出張機能を追加するときは 'BUSINESS_TRIP' を足す)
export type SheetRequestKind = 'LEAVE';

// 承認済みの終日休暇(半休は含まない)
export function approvedFullDayLeave(day: SheetDay): SheetLeave | undefined {
  return day.leaves.find(
    (leave) =>
      leave.status === 'APPROVED' && leave.leaveType !== 'HALF_AM' && leave.leaveType !== 'HALF_PM',
  );
}

// 勤務パターンの判定(承認済みの終日休暇 > 祝日 > 土日 > 通常)
export type WorkPattern =
  | { kind: 'LEAVE'; leaveType: LeaveType }
  | { kind: Exclude<WorkPatternKind, 'LEAVE'> };

export function workPatternOf(day: SheetDay): WorkPattern {
  const leave = approvedFullDayLeave(day);
  if (leave) return { kind: 'LEAVE', leaveType: leave.leaveType };
  if (day.dayType === 'HOLIDAY') return { kind: 'HOLIDAY' };
  if (day.dayType === 'WEEKEND') return { kind: 'DAY_OFF' };
  return { kind: 'NORMAL' };
}

// 勤務日の東京 0 時からの経過分
function minutesFromMidnight(date: string, iso: string): number {
  return Math.round((Date.parse(iso) - Date.parse(`${date}T00:00:00+09:00`)) / 60000);
}

// 時間帯の棒グラフ用の区間。退勤済みは勤務の間に休憩(計算値)を挟み、
// それ以外は出勤時刻の位置だけを返す
export function toTimelineSegments(day: SheetDay): DayTimeline {
  const { attendance, breakTime } = day;
  if (!attendance) return { segments: [] };
  const start = minutesFromMidnight(day.date, attendance.clockIn);
  if (attendance.status !== 'DONE' || attendance.clockOut === null) {
    return { segments: [], markerMinute: start };
  }
  const end = minutesFromMidnight(day.date, attendance.clockOut);
  if (end <= start) return { segments: [] };

  if (breakTime?.start && breakTime.end) {
    const breakStart = minutesFromMidnight(day.date, breakTime.start);
    const breakEnd = minutesFromMidnight(day.date, breakTime.end);
    if (start <= breakStart && breakStart < breakEnd && breakEnd <= end) {
      const segments: TimelineSegment[] = [
        { startMinute: start, endMinute: breakStart, kind: 'work' },
        { startMinute: breakStart, endMinute: breakEnd, kind: 'break' },
        { startMinute: breakEnd, endMinute: end, kind: 'work' },
      ];
      return { segments: segments.filter((segment) => segment.endMinute > segment.startMinute) };
    }
  }
  return { segments: [{ startMinute: start, endMinute: end, kind: 'work' }] };
}
