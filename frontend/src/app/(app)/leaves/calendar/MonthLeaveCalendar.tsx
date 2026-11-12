'use client';

import { LEAVE_CATEGORY_CLASS } from '@/components/leave/LeaveCategoryBadge';
import { BagIcon, LeafIcon } from '@/components/leave/leaveIcons';
import type { LeaveCalendarItem } from '@/lib/api/types';
import {
  barText,
  buildMonthGrid,
  formatDateLabel,
  formatLeavePeriod,
  isInMonth,
  itemsOnDate,
  layoutWeekLanes,
} from '@/lib/leave-calendar';
import type { WeekLayout } from '@/lib/leave-calendar';
import { formatMonthLabel } from '@/lib/calendar';
import { messages } from '@/messages/ja';

const t = messages.leaveCalendar;
const PC_MAX_LANES = 2;
const MOBILE_MAX_LANES = 1;

interface MonthLeaveCalendarProps {
  month: string; // YYYY-MM
  items: readonly LeaveCalendarItem[];
  holidays: ReadonlyMap<string, string>;
  today: string; // YYYY-MM-DD
  // true: モバイル表示(セル全体がボタン、棒は 1 段のチップ)。false: PC 表示(棒・「+N件」がボタン)
  mobile: boolean;
  // モバイル: 選択中の日付と選択時の処理
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  // PC: 棒を押した(その 1 件) / 「+N件」を押した(その日の全員)
  onOpenItem?: (item: LeaveCalendarItem) => void;
  onOpenDate?: (date: string) => void;
}

function dayNumberClass(col: number, date: string, month: string, holiday: boolean): string {
  if (!isInMonth(date, month)) return 'text-general-60';
  if (col === 0 || holiday) return 'text-calendar-sunday';
  if (col === 6) return 'text-calendar-saturday';
  return 'text-general-100';
}

function DayNumber({
  date,
  col,
  month,
  holidayName,
  today,
}: {
  date: string;
  col: number;
  month: string;
  holidayName: string | undefined;
  today: boolean;
}) {
  const color = today ? 'bg-primary-100 text-white' : '';
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span
        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-sm/5 font-medium tabular-nums md:size-6 ${
          today ? color : dayNumberClass(col, date, month, holidayName !== undefined)
        }`}
      >
        {Number(date.slice(8, 10))}
      </span>
      {holidayName && isInMonth(date, month) && (
        <span
          title={holidayName}
          className="hidden min-w-0 truncate text-cal-holiday text-calendar-sunday md:inline"
        >
          {holidayName}
        </span>
      )}
    </span>
  );
}

// 月カレンダー(PC・モバイル共通の骨組み。週ごとに棒を重ねて描く)
export function MonthLeaveCalendar({
  month,
  items,
  holidays,
  today,
  mobile,
  selectedDate,
  onSelectDate,
  onOpenItem,
  onOpenDate,
}: MonthLeaveCalendarProps) {
  const weeks = buildMonthGrid(month);
  const maxLanes = mobile ? MOBILE_MAX_LANES : PC_MAX_LANES;

  function renderPcWeek(week: string[], layout: WeekLayout) {
    return (
      <div key={week[0]} className="relative border-t border-general-40">
        <div aria-hidden="true" className="absolute inset-0 grid grid-cols-7">
          {week.map((date) => (
            <div key={date} className="border-r border-general-40 last:border-r-0" />
          ))}
        </div>
        <div className="relative grid min-h-25 grid-cols-7 grid-rows-[auto_1.5rem_1.5rem_1.25rem] gap-y-0.5 pb-2">
          {week.map((date, col) => (
            <div key={date} style={{ gridColumn: col + 1, gridRow: 1 }} className="px-2 pt-2">
              <DayNumber
                date={date}
                col={col}
                month={month}
                holidayName={holidays.get(date)}
                today={date === today}
              />
            </div>
          ))}
          {layout.bars.map((bar) => (
            <button
              key={`${bar.item.empId}-${bar.item.startDate}-${bar.item.halfDay ?? ''}-${bar.item.category}`}
              type="button"
              onClick={() => onOpenItem?.(bar.item)}
              aria-label={t.barLabel(bar.item.name, formatLeavePeriod(bar.item))}
              style={{ gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`, gridRow: 2 + bar.lane }}
              className={`mx-1 min-w-0 truncate rounded-md px-2 text-left text-xs/6 font-medium hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-100 ${LEAVE_CATEGORY_CLASS[bar.item.category]}`}
            >
              {barText(bar.item)}
            </button>
          ))}
          {week.map((date, col) =>
            layout.hidden[date] ? (
              <button
                key={date}
                type="button"
                onClick={() => onOpenDate?.(date)}
                aria-label={t.moreLabel(formatDateLabel(date), layout.hidden[date])}
                style={{ gridColumn: col + 1, gridRow: 4 }}
                className="mx-1 rounded px-1 text-left text-xs/5 font-medium text-primary-100 hover:underline focus-visible:outline-2 focus-visible:outline-primary-100"
              >
                {t.moreCount(layout.hidden[date])}
              </button>
            ) : null,
          )}
        </div>
      </div>
    );
  }

  function renderMobileWeek(week: string[], layout: WeekLayout) {
    return (
      <div key={week[0]} className="relative border-t border-general-40">
        <div className="grid grid-cols-7">
          {week.map((date, col) => {
            const inMonth = isInMonth(date, month);
            const cellClass = 'relative flex h-20 min-w-0 flex-col items-start border-r border-general-40 px-1 pt-1.5 text-left last:border-r-0';
            if (!inMonth) {
              return (
                <div key={date} className={cellClass}>
                  <DayNumber date={date} col={col} month={month} holidayName={undefined} today={false} />
                </div>
              );
            }
            const selected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDate?.(date)}
                aria-pressed={selected}
                aria-label={t.cellLabel(formatDateLabel(date), itemsOnDate(items, date).length)}
                title={holidays.get(date)}
                className={`${cellClass} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100 ${
                  selected ? 'rounded-lg bg-primary-30' : ''
                }`}
              >
                <DayNumber
                  date={date}
                  col={col}
                  month={month}
                  holidayName={holidays.get(date)}
                  today={date === today}
                />
              </button>
            );
          })}
        </div>
        {/* 選択中の輪郭は棒より上に重ねる(棒の背景が輪郭からはみ出して見えないように) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 grid grid-cols-7">
          {week.map((date) => (
            <span
              key={date}
              className={
                date === selectedDate && isInMonth(date, month)
                  ? 'rounded-lg ring-[1.5px] ring-primary-100 ring-inset'
                  : ''
              }
            />
          ))}
        </div>
        {/* 棒は見た目だけ(押す先はセル全体のボタン)。左右に余白を取り、選択中の輪郭の内側に収める */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-7 grid grid-cols-7 grid-rows-[1.25rem_1rem] gap-y-0.5"
        >
          {layout.bars.map((bar) => (
            <span
              key={`${bar.item.empId}-${bar.item.startDate}-${bar.item.halfDay ?? ''}-${bar.item.category}`}
              style={{ gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`, gridRow: 1 + bar.lane }}
              className={`mx-[3px] flex min-w-0 items-center justify-center gap-0.5 overflow-hidden rounded px-px text-cal-chip font-medium whitespace-nowrap ${LEAVE_CATEGORY_CLASS[bar.item.category]}`}
            >
              {bar.endCol > bar.startCol && (
                <span className="size-3.5 shrink-0">
                  {bar.item.category === 'SPECIAL' ? <LeafIcon /> : <BagIcon />}
                </span>
              )}
              <span className="min-w-0 truncate">{t.chipLabel[bar.item.category]}</span>
            </span>
          ))}
          {week.map((date, col) =>
            layout.hidden[date] ? (
              <span
                key={date}
                style={{ gridColumn: col + 1, gridRow: 2 }}
                className="min-w-0 truncate px-1.5 text-cal-note font-medium text-general-80"
              >
                {t.moreCount(layout.hidden[date])}
              </span>
            ) : null,
          )}
        </div>
      </div>
    );
  }

  return (
    <div role="group" aria-label={t.calendarLabel(formatMonthLabel(month))}>
      <div aria-hidden="true" className="grid grid-cols-7 pb-2">
        {messages.calendar.weekdays.map((weekday, col) => (
          <span
            key={weekday}
            className={`text-center text-sm/5 font-bold md:text-base/6 ${
              col === 0 ? 'text-calendar-sunday' : col === 6 ? 'text-calendar-saturday' : 'text-general-100'
            }`}
          >
            {weekday}
          </span>
        ))}
      </div>
      {weeks.map((week) => {
        const layout = layoutWeekLanes(items, week, month, maxLanes);
        return mobile ? renderMobileWeek(week, layout) : renderPcWeek(week, layout);
      })}
    </div>
  );
}
