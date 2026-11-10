'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  ATTENDANCE_STATUS_BADGE,
  MISSING_ROW_CLASS,
} from '@/components/attendance/attendanceStatus';
import { WorkTimeline, WorkTimelineAxis } from '@/components/attendance/WorkTimeline';
import { WORK_PATTERN_BADGE } from '@/components/attendance/workPattern';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { secondaryButtonClass } from '@/components/form';
import { LeaveDetailModal } from '@/components/leave/LeaveDetailModal';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { compactTdBaseClass, compactTdClass, thClass } from '@/components/table';
import { Tooltip } from '@/components/Tooltip';
import type { AttendanceSheet, LeaveBalance, SheetDay } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import {
  approvedFullDayLeave,
  formatSheetDate,
  parseSheetMonth,
  toTimelineSegments,
  weekdayIndex,
  workPatternOf,
} from '@/lib/attendance-sheet';
import { formatMonthLabel, shiftMonth } from '@/lib/calendar';
import { tokyoToday } from '@/lib/date-range';
import { formatClockOut, formatTokyoTime, formatWorkMinutes } from '@/lib/format';
import { useHorizontalOverflow } from '@/lib/useHorizontalOverflow';
import { messages } from '@/messages/ja';
import { CurrentDateTimeCard } from './CurrentDateTimeCard';
import { MonthlySummarySection } from './MonthlySummarySection';

const t = messages.attendance;
const s = t.sheet;
const TODAY_REFRESH_MS = 60_000;

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path
        d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconButtonClass = `${secondaryButtonClass} flex size-9 items-center justify-center`;
const textNavButtonClass = `${secondaryButtonClass} h-9 px-4 text-sm/5 disabled:cursor-not-allowed disabled:text-general-60 disabled:hover:bg-white`;

// 休日扱いの行(土日・祝日・承認済みの終日休暇)は灰色にする
function isGreyRow(day: SheetDay): boolean {
  return day.dayType !== 'WEEKDAY' || approvedFullDayLeave(day) !== undefined;
}

function renderWorkPattern(day: SheetDay) {
  const pattern = workPatternOf(day);
  const label =
    pattern.kind === 'LEAVE'
      ? messages.leave.types[pattern.leaveType]
      : { NORMAL: s.normalDay, DAY_OFF: s.dayOff, HOLIDAY: s.holiday }[pattern.kind];
  return (
    <Badge variant={WORK_PATTERN_BADGE[pattern.kind]} shape="pill">
      {label}
    </Badge>
  );
}

// 日付の文字色: 土は青、日・祝日は赤
function dateColorClass(day: SheetDay): string {
  const weekday = weekdayIndex(day.date);
  if (weekday === 0 || day.dayType === 'HOLIDAY') return 'text-danger-100';
  if (weekday === 6) return 'text-primary-100';
  return 'text-general-100';
}

function timelineLabel(day: SheetDay): string {
  const { attendance, breakTime } = day;
  if (!attendance) return s.timelineNone;
  if (attendance.status !== 'DONE' || attendance.clockOut === null) {
    return s.timelineStartedLabel(formatTokyoTime(attendance.clockIn));
  }
  const breakRange =
    breakTime?.start && breakTime.end
      ? `${formatTokyoTime(breakTime.start)}〜${formatTokyoTime(breakTime.end)}`
      : null;
  return s.timelineLabel(
    formatTokyoTime(attendance.clockIn),
    formatTokyoTime(attendance.clockOut),
    breakRange,
  );
}

function remarks(day: SheetDay): string {
  const parts = [day.holidayName, day.attendance?.modifiedAt ? t.modified : null];
  return parts.filter((part): part is string => part !== null).join(s.separator);
}

// 行の背景(選択 > 退勤漏れ > 灰色 > 白)。日付セルは横スクロール時に下の内容が透けないよう不透明にする
function rowTone(day: SheetDay, selected: boolean): { row: string; sticky: string } {
  if (selected) return { row: 'bg-primary-30', sticky: 'bg-primary-30' };
  if (day.attendance?.status === 'MISSING_CLOCK_OUT') {
    return {
      row: MISSING_ROW_CLASS,
      sticky: 'bg-white bg-linear-to-r from-danger-30/40 to-danger-30/40',
    };
  }
  if (isGreyRow(day)) return { row: 'bg-general-30', sticky: 'bg-general-30' };
  return { row: 'bg-white', sticky: 'bg-white' };
}

interface SheetDayRowProps {
  day: SheetDay;
  today: string;
  selected: boolean;
  onSelect: () => void;
  onOpenLeave: (leaveId: string) => void;
}

function SheetDayRow({ day, today, selected, onSelect, onOpenLeave }: SheetDayRowProps) {
  const { attendance } = day;
  const isToday = day.date === today;
  const tone = rowTone(day, selected);

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    // 行の中のボタン(申請)の操作は行の選択にしない
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  }

  function renderClockOut() {
    if (!attendance) return '';
    if (attendance.status === 'DONE') return formatClockOut(day.date, attendance.clockOut);
    const badge = (
      <Badge variant={ATTENDANCE_STATUS_BADGE[attendance.status]}>
        {t.statuses[attendance.status]}
      </Badge>
    );
    return attendance.status === 'MISSING_CLOCK_OUT' ? (
      <Tooltip content={t.missingHint}>{badge}</Tooltip>
    ) : (
      badge
    );
  }

  return (
    <tr
      tabIndex={0}
      aria-selected={selected}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100 ${tone.row}`}
    >
      <td
        aria-current={isToday ? 'date' : undefined}
        className={`${compactTdBaseClass} sticky left-0 z-1 whitespace-nowrap tabular-nums ${tone.sticky} ${dateColorClass(day)} ${
          isToday ? 'font-bold' : 'font-medium'
        }`}
      >
        {formatSheetDate(day.date)}
      </td>
      <td className={`${compactTdClass} whitespace-nowrap`}>{renderWorkPattern(day)}</td>
      <td className={`${compactTdClass} whitespace-nowrap tabular-nums`}>
        {attendance ? formatTokyoTime(attendance.clockIn) : ''}
      </td>
      <td className={`${compactTdClass} whitespace-nowrap tabular-nums`}>{renderClockOut()}</td>
      <td className={`${compactTdClass} whitespace-nowrap tabular-nums`}>
        {day.breakTime && (
          <>
            {formatWorkMinutes(day.breakTime.minutes)}{' '}
            <span className="text-xs/4 text-general-80">{s.computed}</span>
          </>
        )}
      </td>
      <td className={`${compactTdClass} whitespace-nowrap tabular-nums`}>
        {day.actualWorkMinutes === null ? '' : formatWorkMinutes(day.actualWorkMinutes)}
      </td>
      <td className={`${compactTdClass} whitespace-nowrap`}>{remarks(day)}</td>
      <td className={compactTdClass}>
        <span className="flex flex-nowrap gap-1">
          {day.leaves.map((leave) => {
            const type = s.requestKinds.LEAVE;
            const status = messages.leave.statuses[leave.status];
            return (
              <button
                key={leave.id}
                type="button"
                aria-label={s.leaveBadgeLabel(type, status)}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenLeave(leave.id);
                }}
                className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
              >
                <LeaveStatusBadge status={leave.status}>
                  {s.leaveBadge(type, status)}
                </LeaveStatusBadge>
              </button>
            );
          })}
        </span>
      </td>
    </tr>
  );
}

interface TimelineRowProps {
  day: SheetDay;
  selected: boolean;
  onSelect: () => void;
}

// 右側(時間帯)の行。選択は左側の行と同じ背景・クリックで連動する(キーボード操作は左側の行だけ)
function TimelineRow({ day, selected, onSelect }: TimelineRowProps) {
  const timeline = toTimelineSegments(day);
  return (
    <tr onClick={onSelect} className={`cursor-pointer ${rowTone(day, selected).row}`}>
      <td className={compactTdClass}>
        <WorkTimeline
          segments={timeline.segments}
          markerMinute={timeline.markerMinute}
          label={s.timelineDayLabel(formatSheetDate(day.date), timelineLabel(day))}
        />
      </td>
    </tr>
  );
}

// SCR-003 出勤簿。月は URL Query(?month=YYYY-MM)に持つ(03 共通規則)
export function AttendanceSheetView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [today, setToday] = useState(() => tokyoToday(new Date()));
  // 画面を開いたまま日付が変わっても「今日」の強調・今月の判定を追従させる(同じ日付なら再描画されない)
  useEffect(() => {
    const timer = setInterval(() => setToday(tokyoToday(new Date())), TODAY_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);
  const currentMonth = today.slice(0, 7);
  const month = parseSheetMonth(searchParams.get('month'), currentMonth);
  const year = Number(month.slice(0, 4));

  // 選択は表示だけで URL には持たない。月が変わったら「今日」(その月にあれば)に戻す
  const [selection, setSelection] = useState<{ month: string; date: string } | null>(null);
  const selectedDate =
    selection?.month === month ? selection.date : month === currentMonth ? today : null;
  const [leaveId, setLeaveId] = useState<string | null>(null);
  // 時間帯の領域は、横にあふれてスクロールできるときだけキーボードで操作できるようにする
  const [regionRef, timelineOverflowing] = useHorizontalOverflow<HTMLDivElement>();

  // 月を移る間は前の表を薄く残す(読み込み表示に置き換えない)
  const sheet = useApiQuery<AttendanceSheet>(`/attendance/monthly?month=${month}`, {
    keepPreviousData: true,
  });
  const balance = useApiQuery<LeaveBalance>(`/leaves/balance?year=${year}`, {
    keepPreviousData: true,
  });

  function goToMonth(next: string) {
    router.push(`${pathname}?month=${next}`);
  }

  function handleLeaveProcessed() {
    sheet.reload();
    balance.reload();
  }

  function renderTable() {
    if (sheet.status === 'loading') return <SkeletonLines count={8} />;
    if (sheet.status === 'error' || !sheet.data) return <SectionError onRetry={sheet.reload} />;
    return (
      <div
        aria-busy={sheet.isStale}
        className={sheet.isStale ? 'opacity-60 transition-opacity' : undefined}
      >
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm/5 text-general-80">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-6 bg-primary-100" />
            {s.legendWork}
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-6 bg-general-50" />
            {s.legendBreak}
          </span>
        </div>
        <div className="flex items-start overflow-x-auto">
          <div className="shrink-0 border-r-2 border-general-60">
            <table aria-label={s.tableTitle} className="border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={`${thClass} sticky left-0 z-1 bg-white`}>
                    {s.date}
                  </th>
                  <th scope="col" className={thClass}>
                    {s.workPattern}
                  </th>
                  <th scope="col" className={thClass}>
                    {s.clockInTime}
                  </th>
                  <th scope="col" className={thClass}>
                    {s.clockOutTime}
                  </th>
                  <th scope="col" className={thClass}>
                    <Tooltip content={s.breakHint}>{s.breakTime}</Tooltip>
                  </th>
                  <th scope="col" className={thClass}>
                    {s.actualWork}
                  </th>
                  <th scope="col" className={thClass}>
                    {t.remarks}
                  </th>
                  <th scope="col" className={thClass}>
                    {s.leaveRequest}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sheet.data.days.map((day) => (
                  <SheetDayRow
                    key={day.date}
                    day={day}
                    today={today}
                    selected={day.date === selectedDate}
                    onSelect={() => setSelection({ month, date: day.date })}
                    onOpenLeave={setLeaveId}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div
            role="region"
            aria-label={s.timeline}
            ref={regionRef}
            tabIndex={timelineOverflowing ? 0 : undefined}
            className="min-w-40 flex-1 overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100"
          >
            <table className="w-full min-w-120 border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={thClass}>
                    <span className="sr-only">{s.timeline}</span>
                    <WorkTimelineAxis />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sheet.data.days.map((day) => (
                  <TimelineRow
                    key={day.date}
                    day={day}
                    selected={day.date === selectedDate}
                    onSelect={() => setSelection({ month, date: day.date })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1 className="text-h5 font-bold text-general-100">{t.title}</h1>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label={s.prevMonth}
            onClick={() => goToMonth(shiftMonth(month, -1))}
            className={iconButtonClass}
          >
            <Chevron direction="left" />
          </button>
          <span
            aria-live="polite"
            className="text-center text-base/6 font-medium whitespace-nowrap text-general-100 tabular-nums sm:min-w-28"
          >
            {formatMonthLabel(month)}
          </span>
          <button
            type="button"
            aria-label={s.nextMonth}
            onClick={() => goToMonth(shiftMonth(month, 1))}
            className={iconButtonClass}
          >
            <Chevron direction="right" />
          </button>
          <button
            type="button"
            disabled={month === currentMonth}
            onClick={() => goToMonth(currentMonth)}
            className={textNavButtonClass}
          >
            {s.thisMonth}
          </button>
        </div>
      </div>

      <CurrentDateTimeCard />

      <Card title={s.tableTitle}>{renderTable()}</Card>

      <MonthlySummarySection
        status={sheet.status}
        summary={sheet.data?.summary}
        year={year}
        remainingDays={
          balance.status === 'success' && balance.data ? balance.data.remainingDays : null
        }
        isStale={sheet.isStale}
        onRetry={sheet.reload}
      />

      <LeaveDetailModal
        leaveId={leaveId}
        onClose={() => setLeaveId(null)}
        onProcessed={handleLeaveProcessed}
      />
    </div>
  );
}
