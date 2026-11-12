import { isWeekend } from '../../common/time/calendar-rules.js';
import { formatTokyoDateTime } from '../../common/time/tokyo-date.js';
import type { LeaveStatus, LeaveType } from '../../generated/prisma/client.js';
import { calculateAttendanceStatus, calculateWorkMinutes } from './attendance.mapper.js';
import type { AttendanceStatus } from './attendance.mapper.js';

export type DayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';
export type BreakSource = 'LEGAL_MINIMUM';

// 所定労働時間(8 時間)。これを超えた分を時間外とする
const STANDARD_WORK_MINUTES = 480;
// 深夜帯 22:00〜翌 05:00(東京)
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 5;
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MINUTE_MS = 60 * 1000;

export interface SheetAttendanceInput {
  id: string;
  clockIn: Date;
  clockOut: Date | null;
  modifiedAt: Date | null;
}

export interface SheetLeaveInput {
  id: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
}

export interface SheetDay {
  date: string;
  dayType: DayType;
  holidayName: string | null;
  attendance: {
    id: string;
    clockIn: string;
    clockOut: string | null;
    status: AttendanceStatus;
    modifiedAt: string | null;
  } | null;
  breakTime: {
    minutes: number;
    source: BreakSource;
    start: string | null;
    end: string | null;
  } | null;
  actualWorkMinutes: number | null;
  overtimeMinutes: number;
  nightMinutes: number;
  leaves: { id: string; leaveType: LeaveType; status: LeaveStatus }[];
}

export interface SheetSummary {
  scheduledWorkDays: number;
  actualWorkDays: number;
  actualWorkMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  holidayWorkMinutes: number;
  paidLeaveDays: number;
}

export interface AttendanceSheetResponse {
  month: string;
  days: SheetDay[];
  summary: SheetSummary;
}

// 法定休憩(労基法 34 条)。拘束時間(分)→ 最低限必要な休憩(分)。
// 休憩を除いた実働が 6 時間・8 時間を超える場合にだけ 45 分・60 分が必要、という解釈
export function legalBreakMinutes(boundMinutes: number): number {
  if (boundMinutes <= 360) {
    return 0;
  }
  if (boundMinutes <= 405) {
    return boundMinutes - 360;
  }
  if (boundMinutes <= 525) {
    return 45;
  }
  if (boundMinutes <= 540) {
    return boundMinutes - 480;
  }
  return 60;
}

// 休憩を勤務の中央に置く: start = 出勤 + floor((拘束 - 休憩) / 2) 分
export function placeBreak(
  clockIn: Date,
  boundMinutes: number,
  breakMinutes: number,
): { start: Date; end: Date } {
  const offsetMinutes = Math.floor((boundMinutes - breakMinutes) / 2);
  const start = new Date(clockIn.getTime() + offsetMinutes * MINUTE_MS);
  return { start, end: new Date(start.getTime() + breakMinutes * MINUTE_MS) };
}

// 2 つの区間[ms]の重なり(ミリ秒)
export function overlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

// 区間と深夜帯(東京 22:00〜翌 05:00)の重なり(ミリ秒)。日をまたぐ区間も扱う
function nightOverlapMs(start: Date, end: Date): number {
  const shiftedStart = start.getTime() + TOKYO_OFFSET_MS;
  const shiftedEnd = end.getTime() + TOKYO_OFFSET_MS;
  const firstDay = Math.floor(shiftedStart / DAY_MS) - 1;
  const lastDay = Math.floor(shiftedEnd / DAY_MS);
  let total = 0;
  for (let day = firstDay; day <= lastDay; day += 1) {
    const nightStart = day * DAY_MS + NIGHT_START_HOUR * HOUR_MS;
    const nightEnd = (day + 1) * DAY_MS + NIGHT_END_HOUR * HOUR_MS;
    total += overlapMs(shiftedStart, shiftedEnd, nightStart, nightEnd);
  }
  return total;
}

// 深夜勤務の分数 = 勤務区間の深夜重なり - 休憩区間の深夜重なり
export function nightMinutes(
  work: { start: Date; end: Date },
  rest: { start: Date; end: Date } | null,
): number {
  const workMs = nightOverlapMs(work.start, work.end);
  const restMs = rest ? nightOverlapMs(rest.start, rest.end) : 0;
  return Math.max(0, Math.floor((workMs - restMs) / MINUTE_MS));
}

function resolveDayType(date: string, holidays: ReadonlyMap<string, string>): DayType {
  if (holidays.has(date)) {
    return 'HOLIDAY';
  }
  return isWeekend(date) ? 'WEEKEND' : 'WEEKDAY';
}

// 退勤済みの行の休憩・実働・時間外・深夜を計算する
function calculateDoneDay(
  attendance: SheetAttendanceInput & { clockOut: Date },
  dayType: DayType,
): Pick<SheetDay, 'breakTime' | 'actualWorkMinutes' | 'overtimeMinutes' | 'nightMinutes'> {
  const boundMinutes = calculateWorkMinutes(attendance.clockIn, attendance.clockOut) ?? 0;
  const breakMinutes = legalBreakMinutes(boundMinutes);
  const rest = breakMinutes > 0 ? placeBreak(attendance.clockIn, boundMinutes, breakMinutes) : null;
  const actualWorkMinutes = boundMinutes - breakMinutes;
  return {
    breakTime: {
      minutes: breakMinutes,
      source: 'LEGAL_MINIMUM',
      start: rest ? formatTokyoDateTime(rest.start) : null,
      end: rest ? formatTokyoDateTime(rest.end) : null,
    },
    actualWorkMinutes,
    overtimeMinutes:
      dayType === 'WEEKDAY' ? Math.max(0, actualWorkMinutes - STANDARD_WORK_MINUTES) : 0,
    nightMinutes: nightMinutes({ start: attendance.clockIn, end: attendance.clockOut }, rest),
  };
}

// 1 日分の行を作る。holidays は 'YYYY-MM-DD' → 祝日名(ライブラリに直接依存しない)。
// 休暇は土日(曜日基準)の行には入れない(休暇日数の計算が土日を除くため)
export function buildSheetDay(params: {
  date: string;
  today: string;
  holidays: ReadonlyMap<string, string>;
  attendance: SheetAttendanceInput | undefined;
  leaves: SheetLeaveInput[];
}): SheetDay {
  const { date, today, holidays, attendance, leaves } = params;
  const dayType = resolveDayType(date, holidays);
  const dayLeaves = isWeekend(date)
    ? []
    : leaves
        .filter((leave) => leave.startDate <= date && date <= leave.endDate)
        .map(({ id, leaveType, status }) => ({ id, leaveType, status }));
  const base = {
    date,
    dayType,
    holidayName: dayType === 'HOLIDAY' ? (holidays.get(date) ?? null) : null,
    leaves: dayLeaves,
  };
  const noWork = {
    breakTime: null,
    actualWorkMinutes: null,
    overtimeMinutes: 0,
    nightMinutes: 0,
  };
  if (!attendance) {
    return { ...base, attendance: null, ...noWork };
  }
  const attendanceView = {
    id: attendance.id,
    clockIn: formatTokyoDateTime(attendance.clockIn),
    clockOut: attendance.clockOut ? formatTokyoDateTime(attendance.clockOut) : null,
    status: calculateAttendanceStatus(date, attendance.clockOut, today),
    modifiedAt: attendance.modifiedAt ? formatTokyoDateTime(attendance.modifiedAt) : null,
  };
  if (attendance.clockOut === null) {
    return { ...base, attendance: attendanceView, ...noWork };
  }
  return {
    ...base,
    attendance: attendanceView,
    ...calculateDoneDay({ ...attendance, clockOut: attendance.clockOut }, dayType),
  };
}

// 有給として数える休暇の日数(SPECIAL・OTHER は残日数の対象外)
const PAID_LEAVE_DAYS: Partial<Record<LeaveType, number>> = {
  ANNUAL: 1,
  HALF_AM: 0.5,
  HALF_PM: 0.5,
};

// 月間の合計。hireDate は入社日 'YYYY-MM-DD'(これより前の平日は所定労働日に数えない)
export function summarizeSheet(days: SheetDay[], hireDate: string): SheetSummary {
  const summary: SheetSummary = {
    scheduledWorkDays: 0,
    actualWorkDays: 0,
    actualWorkMinutes: 0,
    overtimeMinutes: 0,
    nightMinutes: 0,
    holidayWorkMinutes: 0,
    paidLeaveDays: 0,
  };
  for (const day of days) {
    if (day.dayType === 'WEEKDAY' && day.date >= hireDate) {
      summary.scheduledWorkDays += 1;
    }
    if (day.attendance?.status === 'DONE') {
      summary.actualWorkDays += 1;
    }
    const worked = day.actualWorkMinutes ?? 0;
    summary.actualWorkMinutes += worked;
    summary.overtimeMinutes += day.overtimeMinutes;
    summary.nightMinutes += day.nightMinutes;
    if (day.dayType !== 'WEEKDAY') {
      summary.holidayWorkMinutes += worked;
    }
    for (const leave of day.leaves) {
      if (leave.status === 'APPROVED') {
        summary.paidLeaveDays += PAID_LEAVE_DAYS[leave.leaveType] ?? 0;
      }
    }
  }
  return summary;
}
