import { describe, expect, it } from 'vitest';
import type { SheetDay } from '@/lib/api/types';
import {
  formatSheetDate,
  parseSheetMonth,
  toTimelineSegments,
  weekdayIndex,
  workPatternOf,
} from './attendance-sheet';

function day(overrides: Partial<SheetDay> = {}): SheetDay {
  return {
    date: '2026-11-02',
    dayType: 'WEEKDAY',
    holidayName: null,
    attendance: {
      id: 'att-1',
      clockIn: '2026-11-02T09:00:00+09:00',
      clockOut: '2026-11-02T18:30:00+09:00',
      status: 'DONE',
      modifiedAt: null,
    },
    breakTime: {
      minutes: 60,
      source: 'LEGAL_MINIMUM',
      start: '2026-11-02T13:15:00+09:00',
      end: '2026-11-02T14:15:00+09:00',
    },
    actualWorkMinutes: 510,
    overtimeMinutes: 30,
    nightMinutes: 0,
    leaves: [],
    ...overrides,
  };
}

describe('parseSheetMonth', () => {
  it.each([
    ['2026-10', '2026-10'],
    [null, '2026-11'],
    ['', '2026-11'],
    ['2026-13', '2026-11'],
    ['2026-00', '2026-11'],
    ['1999-12', '2026-11'],
    ['2101-01', '2026-11'],
    ['2026-1', '2026-11'],
    ['2026-10-01', '2026-11'],
  ])('shouldParse(%s)As(%s)', (value, expected) => {
    expect(parseSheetMonth(value, '2026-11')).toBe(expected);
  });
});

describe('formatSheetDate', () => {
  it('shouldFormatDayWithFullWidthWeekday', () => {
    expect(formatSheetDate('2026-11-02')).toBe('2日（月）');
    expect(formatSheetDate('2026-11-14')).toBe('14日（土）');
  });

  it('shouldReturnSundayAsZero', () => {
    expect(weekdayIndex('2026-11-08')).toBe(0);
  });
});

describe('toTimelineSegments', () => {
  it('shouldInsertBreakBetweenWorkSegmentsWhenDone', () => {
    expect(toTimelineSegments(day()).segments).toEqual([
      { startMinute: 540, endMinute: 795, kind: 'work' },
      { startMinute: 795, endMinute: 855, kind: 'break' },
      { startMinute: 855, endMinute: 1110, kind: 'work' },
    ]);
  });

  it('shouldReturnSingleWorkSegmentWhenBreakHasNoRange', () => {
    const result = toTimelineSegments(
      day({ breakTime: { minutes: 0, source: 'LEGAL_MINIMUM', start: null, end: null } }),
    );
    expect(result.segments).toEqual([{ startMinute: 540, endMinute: 1110, kind: 'work' }]);
  });

  it('shouldExtendPastMidnightWhenClockOutIsNextDay', () => {
    const result = toTimelineSegments(
      day({
        attendance: {
          id: 'att-1',
          clockIn: '2026-11-02T20:00:00+09:00',
          clockOut: '2026-11-03T02:00:00+09:00',
          status: 'DONE',
          modifiedAt: null,
        },
        breakTime: null,
      }),
    );
    expect(result.segments).toEqual([{ startMinute: 1200, endMinute: 1560, kind: 'work' }]);
  });

  it('shouldReturnOnlyMarkerWhenStillWorking', () => {
    const result = toTimelineSegments(
      day({
        attendance: {
          id: 'att-1',
          clockIn: '2026-11-02T09:00:00+09:00',
          clockOut: null,
          status: 'WORKING',
          modifiedAt: null,
        },
        breakTime: null,
        actualWorkMinutes: null,
      }),
    );
    expect(result).toEqual({ segments: [], markerMinute: 540 });
  });

  it('shouldReturnNoSegmentsWhenNoAttendance', () => {
    expect(toTimelineSegments(day({ attendance: null, breakTime: null }))).toEqual({
      segments: [],
    });
  });
});

describe('出勤簿の表示計算はローカルのタイムゾーンに依存しない', () => {
  it('shouldReturnSameResultsUnderDifferentTimezones', () => {
    const original = process.env.TZ;
    try {
      for (const tz of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
        process.env.TZ = tz;
        expect(formatSheetDate('2026-11-02')).toBe('2日（月）');
        expect(toTimelineSegments(day()).segments).toEqual([
          { startMinute: 540, endMinute: 795, kind: 'work' },
          { startMinute: 795, endMinute: 855, kind: 'break' },
          { startMinute: 855, endMinute: 1110, kind: 'work' },
        ]);
        const overnight = day({
          attendance: {
            id: 'att-1',
            clockIn: '2026-11-02T20:00:00+09:00',
            clockOut: '2026-11-03T02:00:00+09:00',
            status: 'DONE',
            modifiedAt: null,
          },
          breakTime: null,
        });
        expect(toTimelineSegments(overnight).segments).toEqual([
          { startMinute: 1200, endMinute: 1560, kind: 'work' },
        ]);
      }
    } finally {
      if (original === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = original;
      }
    }
  });
});

describe('formatSheetDate(新形式)', () => {
  it('shouldUseFullWidthParenthesesWithoutMonth', () => {
    expect(formatSheetDate('2026-11-01')).toBe('1日（日）');
    expect(formatSheetDate('2026-11-30')).toBe('30日（月）');
    expect(formatSheetDate('2026-02-28')).toBe('28日（土）');
    const text = formatSheetDate('2026-11-01');
    expect(text).not.toMatch(/[/()]/);
    expect(text).toContain('（');
    expect(text).toContain('）');
  });
});

describe('workPatternOf', () => {
  type LeaveInput = {
    leaveType: 'ANNUAL' | 'SPECIAL' | 'OTHER' | 'HALF_AM';
    status: 'APPROVED' | 'PENDING';
  };
  const leave = ({ leaveType, status }: LeaveInput) => ({ id: 'l1', leaveType, status });

  it('shouldReturnLeaveWithTypeForApprovedFullDayLeave', () => {
    for (const leaveType of ['ANNUAL', 'SPECIAL', 'OTHER'] as const) {
      expect(workPatternOf(day({ leaves: [leave({ leaveType, status: 'APPROVED' })] }))).toEqual({
        kind: 'LEAVE',
        leaveType,
      });
    }
  });

  it('shouldPreferLeaveOverHoliday', () => {
    const leaves = [leave({ leaveType: 'ANNUAL', status: 'APPROVED' })];
    expect(workPatternOf(day({ dayType: 'HOLIDAY', leaves })).kind).toBe('LEAVE');
  });

  it('shouldReturnHolidayDayOffAndNormalByDayType', () => {
    expect(workPatternOf(day({ dayType: 'HOLIDAY' })).kind).toBe('HOLIDAY');
    expect(workPatternOf(day({ dayType: 'WEEKEND' })).kind).toBe('DAY_OFF');
    expect(workPatternOf(day({ dayType: 'WEEKDAY' })).kind).toBe('NORMAL');
  });

  it('shouldReturnNormalForHalfDayOrPendingLeave', () => {
    const half = [leave({ leaveType: 'HALF_AM', status: 'APPROVED' })];
    const pending = [leave({ leaveType: 'ANNUAL', status: 'PENDING' })];
    expect(workPatternOf(day({ leaves: half })).kind).toBe('NORMAL');
    expect(workPatternOf(day({ leaves: pending })).kind).toBe('NORMAL');
  });
});
