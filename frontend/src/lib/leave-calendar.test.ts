import { describe, expect, it } from 'vitest';
import type { LeaveCalendarItem } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import {
  buildMonthGrid,
  calendarDayCount,
  formatLeavePeriod,
  formatLeavePeriodWithCount,
  layoutWeekLanes,
  parseCalendarMonth,
} from './leave-calendar';

function item(overrides: Partial<LeaveCalendarItem> & Pick<LeaveCalendarItem, 'startDate' | 'endDate'>): LeaveCalendarItem {
  return {
    name: '山田太郎',
    empId: '10001',
    departmentName: '営業部',
    category: 'PAID',
    halfDay: null,
    ...overrides,
  };
}

// 2026-11 の 1 週目(日〜土)
const WEEK_ONE = buildMonthGrid('2026-11')[0];

describe('buildMonthGrid(FC-01)', () => {
  it('shouldStartOnSundayAndIncludeLeadingAndTrailingDays', () => {
    const grid = buildMonthGrid('2026-11');
    // 2026-11-01 は日曜のため先頭の前月日は無い。最終週は 12/05(土) まで
    expect(grid[0][0]).toBe('2026-11-01');
    expect(grid[grid.length - 1][6]).toBe('2026-12-05');
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it('shouldIncludePreviousMonthDaysWhenMonthStartsMidWeek', () => {
    // 2026-10-01 は木曜。先頭週は 9/27(日) から始まる
    const grid = buildMonthGrid('2026-10');
    expect(grid[0][0]).toBe('2026-09-27');
    expect(grid[0][4]).toBe('2026-10-01');
  });
});

describe('layoutWeekLanes(FC-02)', () => {
  it('shouldPlaceContinuousLeaveInOneLane', () => {
    const leave = item({ startDate: '2026-11-02', endDate: '2026-11-04' });
    const layout = layoutWeekLanes([leave], WEEK_ONE, '2026-11', 3);
    // 11/01 は日曜(col 0)。11/02(月)〜11/04(水) は col 1〜3
    expect(layout.bars).toEqual([{ item: leave, startCol: 1, endCol: 3, lane: 0 }]);
    expect(layout.hidden).toEqual({});
  });

  it('shouldSplitLeaveAtWeekBoundary', () => {
    // 11/05(木)〜11/10(火): 1 週目は 11/05〜11/07、2 週目は 11/08〜11/10
    const leave = item({ startDate: '2026-11-05', endDate: '2026-11-10' });
    const first = layoutWeekLanes([leave], WEEK_ONE, '2026-11', 3);
    expect(first.bars).toEqual([{ item: leave, startCol: 4, endCol: 6, lane: 0 }]);

    const secondWeek = buildMonthGrid('2026-11')[1];
    const second = layoutWeekLanes([leave], secondWeek, '2026-11', 3);
    expect(second.bars).toEqual([{ item: leave, startCol: 0, endCol: 2, lane: 0 }]);
  });

  it('shouldStackOverlappingLeavesInSeparateLanes', () => {
    const a = item({ name: 'A', startDate: '2026-11-02', endDate: '2026-11-04' });
    const b = item({ name: 'B', startDate: '2026-11-04', endDate: '2026-11-06' });
    const layout = layoutWeekLanes([a, b], WEEK_ONE, '2026-11', 3);
    expect(layout.bars.map((bar) => [bar.item.name, bar.lane])).toEqual([
      ['A', 0],
      ['B', 1],
    ]);
  });

  it('shouldCountOverflowLanesPerDayAsHidden', () => {
    const a = item({ name: 'A', startDate: '2026-11-02', endDate: '2026-11-04' });
    const b = item({ name: 'B', startDate: '2026-11-02', endDate: '2026-11-04' });
    const c = item({ name: 'C', startDate: '2026-11-03', endDate: '2026-11-03' });
    const layout = layoutWeekLanes([a, b, c], WEEK_ONE, '2026-11', 2);
    expect(layout.bars.map((bar) => bar.item.name)).toEqual(['A', 'B']);
    // C は 3 段目になるため表示せず、その日の +N件 に数える
    expect(layout.hidden).toEqual({ '2026-11-03': 1 });
  });

  it('shouldExcludeDaysOutsideMonth', () => {
    // 10/28(水)〜11/02(月): 月の中は 11/01・11/02 だけ
    const leave = item({ startDate: '2026-10-28', endDate: '2026-11-02' });
    const layout = layoutWeekLanes([leave], WEEK_ONE, '2026-11', 3);
    expect(layout.bars).toEqual([{ item: leave, startCol: 0, endCol: 1, lane: 0 }]);
  });

  it('shouldReturnNothingWhenWeekHasNoDaysInMonth', () => {
    const leave = item({ startDate: '2026-10-25', endDate: '2026-10-28' });
    const octoberWeek = ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'];
    expect(layoutWeekLanes([leave], octoberWeek, '2026-11', 3)).toEqual({ bars: [], hidden: {} });
  });
});

describe('formatLeavePeriod / calendarDayCount(FC-03)', () => {
  const weekdays = messages.calendar.weekdays;
  // 2026-11-13 は金曜、11-15 は日曜
  const fri = weekdays[5];
  const sun = weekdays[0];

  it('shouldFormatSingleDay', () => {
    expect(formatLeavePeriod(item({ startDate: '2026-11-13', endDate: '2026-11-13' }))).toBe(
      `11/13（${fri}）`,
    );
  });

  it('shouldFormatRangeWithWeekdays', () => {
    expect(formatLeavePeriod(item({ startDate: '2026-11-13', endDate: '2026-11-15' }))).toBe(
      `11/13（${fri}）～11/15（${sun}）`,
    );
  });

  it.each([
    ['AM', messages.leaveCalendar.am],
    ['PM', messages.leaveCalendar.pm],
  ] as const)('shouldAppendHalfDayLabel(%s)', (halfDay, label) => {
    expect(
      formatLeavePeriod(item({ startDate: '2026-11-13', endDate: '2026-11-13', halfDay })),
    ).toBe(`11/13（${fri}） ${label}`);
  });

  it('shouldCountCalendarDaysInclusively', () => {
    expect(calendarDayCount(item({ startDate: '2026-11-13', endDate: '2026-11-15' }))).toBe(3);
    expect(calendarDayCount(item({ startDate: '2026-11-13', endDate: '2026-11-13' }))).toBe(1);
  });

  it('shouldShowDaySpanForRangeAndHalfDayMarkForHalf', () => {
    expect(
      formatLeavePeriodWithCount(item({ startDate: '2026-11-13', endDate: '2026-11-15' })).count,
    ).toBe(messages.leaveCalendar.daysSpan(3));
    expect(
      formatLeavePeriodWithCount(
        item({ startDate: '2026-11-13', endDate: '2026-11-13', halfDay: 'AM' }),
      ).count,
    ).toBe(messages.leaveCalendar.halfDay);
  });
});

describe('parseCalendarMonth', () => {
  it.each([
    [null, '2026-11'],
    ['2026-13', '2026-11'],
    ['1999-12', '2026-11'],
    ['2026-10', '2026-10'],
  ])('shouldParseMonth(%s)', (value, expected) => {
    expect(parseCalendarMonth(value, '2026-11')).toBe(expected);
  });
});
