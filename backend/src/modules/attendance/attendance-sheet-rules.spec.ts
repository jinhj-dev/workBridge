import {
  buildSheetDay,
  legalBreakMinutes,
  nightMinutes,
  overlapMs,
  placeBreak,
  summarizeSheet,
} from './attendance-sheet-rules.js';
import type { SheetDay, SheetLeaveInput } from './attendance-sheet-rules.js';

const NO_HOLIDAYS = new Map<string, string>();
const jst = (value: string): Date => new Date(`${value}+09:00`);

describe('legalBreakMinutes', () => {
  it.each([
    [0, 0],
    [360, 0],
    [361, 1],
    [405, 45],
    [406, 45],
    [525, 45],
    [526, 46],
    [540, 60],
    [541, 60],
    [900, 60],
  ])('shouldReturnLegalBreakWhenBoundMinutesIs %i', (bound, expected) => {
    expect(legalBreakMinutes(bound)).toBe(expected);
  });

  it('shouldKeepActualWorkAtLeastSixHoursWhenBreakIsNeeded', () => {
    // 拘束 361〜405 分は休憩を引いても実働が 360 分のまま
    expect(361 - legalBreakMinutes(361)).toBe(360);
    expect(405 - legalBreakMinutes(405)).toBe(360);
    // 拘束 526〜540 分は休憩を引いて実働 480 分
    expect(526 - legalBreakMinutes(526)).toBe(480);
    expect(540 - legalBreakMinutes(540)).toBe(480);
  });
});

describe('placeBreak', () => {
  it('shouldPlaceBreakInTheMiddleOfWork', () => {
    const rest = placeBreak(jst('2026-11-02T09:00:00'), 570, 60);
    expect(rest.start.toISOString()).toBe(jst('2026-11-02T13:15:00').toISOString());
    expect(rest.end.toISOString()).toBe(jst('2026-11-02T14:15:00').toISOString());
  });
});

describe('overlapMs', () => {
  it('shouldReturnZeroWhenIntervalsDoNotOverlap', () => {
    expect(overlapMs(0, 10, 10, 20)).toBe(0);
    expect(overlapMs(0, 10, 5, 20)).toBe(5);
  });
});

describe('nightMinutes', () => {
  it('shouldCountOverlapWithTwentyTwoToFive', () => {
    const work = { start: jst('2026-11-04T13:00:00'), end: jst('2026-11-04T23:30:00') };
    expect(nightMinutes(work, null)).toBe(90);
  });

  it('shouldCountAcrossMidnight', () => {
    const work = { start: jst('2026-11-04T20:00:00'), end: jst('2026-11-05T06:00:00') };
    // 22:00〜05:00 の 7 時間
    expect(nightMinutes(work, null)).toBe(420);
  });

  it('shouldCountEarlyMorningWork', () => {
    const work = { start: jst('2026-11-04T03:00:00'), end: jst('2026-11-04T09:00:00') };
    expect(nightMinutes(work, null)).toBe(120);
  });

  it('shouldSubtractBreakOverlap', () => {
    const work = { start: jst('2026-11-04T18:00:00'), end: jst('2026-11-05T01:00:00') };
    const rest = { start: jst('2026-11-04T21:30:00'), end: jst('2026-11-04T22:30:00') };
    expect(nightMinutes(work, rest)).toBe(180 - 30);
  });

  it('shouldReturnZeroWhenWorkIsDaytimeOnly', () => {
    const work = { start: jst('2026-11-04T09:00:00'), end: jst('2026-11-04T18:00:00') };
    expect(nightMinutes(work, null)).toBe(0);
  });
});

function leave(overrides: Partial<SheetLeaveInput> = {}): SheetLeaveInput {
  return {
    id: 'leave-1',
    leaveType: 'ANNUAL',
    status: 'APPROVED',
    startDate: '2026-11-02',
    endDate: '2026-11-02',
    ...overrides,
  };
}

function day(
  date: string,
  options: {
    holidays?: Map<string, string>;
    clockIn?: string;
    clockOut?: string | null;
    leaves?: SheetLeaveInput[];
    today?: string;
  } = {},
): SheetDay {
  return buildSheetDay({
    date,
    today: options.today ?? '2026-11-20',
    holidays: options.holidays ?? NO_HOLIDAYS,
    attendance: options.clockIn
      ? {
          id: 'att-1',
          clockIn: jst(options.clockIn),
          clockOut: options.clockOut ? jst(options.clockOut) : null,
          modifiedAt: null,
        }
      : undefined,
    leaves: options.leaves ?? [],
  });
}

describe('buildSheetDay', () => {
  it('shouldCalculateWeekdayOvertimeWhenWorkedOverEightHours', () => {
    const result = day('2026-11-02', {
      clockIn: '2026-11-02T09:00:00',
      clockOut: '2026-11-02T18:30:00',
    });
    expect(result.dayType).toBe('WEEKDAY');
    expect(result.attendance?.status).toBe('DONE');
    expect(result.breakTime).toEqual({
      minutes: 60,
      source: 'LEGAL_MINIMUM',
      start: '2026-11-02T13:15:00+09:00',
      end: '2026-11-02T14:15:00+09:00',
    });
    expect(result.actualWorkMinutes).toBe(510);
    expect(result.overtimeMinutes).toBe(30);
  });

  it('shouldCalculateBreakAndActualWorkForSixToEightHourBound', () => {
    const shortDay = day('2026-11-02', {
      clockIn: '2026-11-02T09:00:00',
      clockOut: '2026-11-02T15:00:00',
    });
    expect(shortDay.breakTime?.minutes).toBe(0);
    expect(shortDay.actualWorkMinutes).toBe(360);

    const middleDay = day('2026-11-02', {
      clockIn: '2026-11-02T09:00:00',
      clockOut: '2026-11-02T16:00:00',
    });
    expect(middleDay.breakTime?.minutes).toBe(45);
    expect(middleDay.actualWorkMinutes).toBe(375);
    expect(middleDay.overtimeMinutes).toBe(0);
  });

  it('shouldCountNightWorkAcrossMidnightMinusBreakOverlap', () => {
    const result = day('2026-11-02', {
      clockIn: '2026-11-02T18:00:00',
      clockOut: '2026-11-03T02:00:00',
      today: '2026-11-20',
    });
    expect(result.breakTime).toEqual({
      minutes: 45,
      source: 'LEGAL_MINIMUM',
      start: '2026-11-02T21:37:00+09:00',
      end: '2026-11-02T22:22:00+09:00',
    });
    expect(result.nightMinutes).toBe(218);
  });

  it('shouldCountEarlyMorningNightWorkWithoutBreakOverlap', () => {
    const result = day('2026-11-02', {
      clockIn: '2026-11-02T04:00:00',
      clockOut: '2026-11-02T13:00:00',
    });
    expect(result.breakTime?.minutes).toBe(60);
    expect(result.nightMinutes).toBe(60);
  });

  it('shouldReturnNullBreakStartAndEndWhenBreakIsZero', () => {
    const result = day('2026-11-02', {
      clockIn: '2026-11-02T09:00:00',
      clockOut: '2026-11-02T12:00:00',
    });
    expect(result.breakTime).toEqual({
      minutes: 0,
      source: 'LEGAL_MINIMUM',
      start: null,
      end: null,
    });
    expect(result.actualWorkMinutes).toBe(180);
  });

  it('shouldNotCalculateWhenNotClockedOut', () => {
    const result = day('2026-11-02', { clockIn: '2026-11-02T09:00:00' });
    expect(result.attendance?.status).toBe('MISSING_CLOCK_OUT');
    expect(result.breakTime).toBeNull();
    expect(result.actualWorkMinutes).toBeNull();
    expect(result.overtimeMinutes).toBe(0);
  });

  it('shouldReturnWorkingWhenTodayAndNotClockedOut', () => {
    const result = day('2026-11-02', { clockIn: '2026-11-02T09:00:00', today: '2026-11-02' });
    expect(result.attendance?.status).toBe('WORKING');
  });

  it('shouldHaveNoOvertimeOnWeekend', () => {
    const result = day('2026-11-07', {
      clockIn: '2026-11-07T09:00:00',
      clockOut: '2026-11-07T20:00:00',
    });
    expect(result.dayType).toBe('WEEKEND');
    expect(result.actualWorkMinutes).toBe(600);
    expect(result.overtimeMinutes).toBe(0);
  });

  it('shouldPreferHolidayOverWeekend', () => {
    const holidays = new Map([['2026-11-07', '仮の祝日']]);
    const result = day('2026-11-07', { holidays });
    expect(result.dayType).toBe('HOLIDAY');
    expect(result.holidayName).toBe('仮の祝日');
  });

  it('shouldReturnNullHolidayNameWhenNotHoliday', () => {
    expect(day('2026-11-02').holidayName).toBeNull();
  });

  it('shouldNotAddLeavesOnWeekend', () => {
    const result = day('2026-11-07', {
      leaves: [leave({ startDate: '2026-11-06', endDate: '2026-11-09' })],
    });
    expect(result.leaves).toEqual([]);
  });

  it('shouldAddLeavesOnWeekdayHoliday', () => {
    const holidays = new Map([['2026-11-03', '文化の日']]);
    const result = day('2026-11-03', { holidays, leaves: [leave({ endDate: '2026-11-04' })] });
    expect(result.dayType).toBe('HOLIDAY');
    expect(result.leaves).toEqual([{ id: 'leave-1', leaveType: 'ANNUAL', status: 'APPROVED' }]);
  });

  it('shouldNotAddLeavesOutsideLeavePeriod', () => {
    expect(day('2026-11-04', { leaves: [leave()] }).leaves).toEqual([]);
  });

  it('shouldCountNightMinutesAcrossBreak', () => {
    const result = day('2026-11-04', {
      clockIn: '2026-11-04T13:00:00',
      clockOut: '2026-11-04T23:30:00',
    });
    expect(result.actualWorkMinutes).toBe(570);
    expect(result.overtimeMinutes).toBe(90);
    expect(result.nightMinutes).toBe(90);
  });
});

describe('summarizeSheet', () => {
  const holidays = new Map([['2026-11-03', '文化の日']]);

  it('shouldSummarizeDays', () => {
    const days = [
      day('2026-11-02', {
        clockIn: '2026-11-02T09:00:00',
        clockOut: '2026-11-02T18:30:00',
        leaves: [leave({ id: 'l1', leaveType: 'HALF_PM', status: 'PENDING' })],
      }),
      day('2026-11-03', {
        holidays,
        leaves: [leave({ id: 'l2', startDate: '2026-11-03', endDate: '2026-11-03' })],
      }),
      day('2026-11-04', {
        leaves: [
          leave({ id: 'l3', leaveType: 'HALF_AM', startDate: '2026-11-04', endDate: '2026-11-04' }),
          leave({ id: 'l4', leaveType: 'HALF_PM', startDate: '2026-11-04', endDate: '2026-11-04' }),
          leave({ id: 'l5', leaveType: 'SPECIAL', startDate: '2026-11-04', endDate: '2026-11-04' }),
        ],
      }),
      day('2026-11-07', {
        clockIn: '2026-11-07T10:00:00',
        clockOut: '2026-11-07T14:00:00',
      }),
      day('2026-11-08', { holidays: new Map([['2026-11-08', '仮の祝日']]) }),
    ];
    expect(summarizeSheet(days, '2026-01-01')).toEqual({
      scheduledWorkDays: 2,
      actualWorkDays: 2,
      actualWorkMinutes: 510 + 240,
      overtimeMinutes: 30,
      nightMinutes: 0,
      holidayWorkMinutes: 240,
      paidLeaveDays: 1 + 0.5 + 0.5,
    });
  });

  it('shouldExcludeDaysBeforeHireDateFromScheduledWorkDays', () => {
    const days = [day('2026-11-02'), day('2026-11-04'), day('2026-11-05')];
    expect(summarizeSheet(days, '2026-11-04').scheduledWorkDays).toBe(2);
  });
});

describe('legalBreakMinutes(追加の境界)', () => {
  it.each([
    [380, 20],
    [480, 45],
    [535, 55],
    [1440, 60],
  ])('shouldReturnLegalBreakWhenBoundMinutesIs %i', (bound, expected) => {
    expect(legalBreakMinutes(bound)).toBe(expected);
  });
});

describe('出勤簿の規則(祝日・休暇の追加シナリオ)', () => {
  it('shouldTreatWeekdayHolidayWorkAsHolidayWorkNotOvertime', () => {
    const holidays = new Map([['2026-11-03', '文化の日']]);
    const result = day('2026-11-03', {
      holidays,
      clockIn: '2026-11-03T09:00:00',
      clockOut: '2026-11-03T18:30:00',
    });
    expect(result.dayType).toBe('HOLIDAY');
    expect(result.holidayName).toBe('文化の日');
    expect(result.actualWorkMinutes).toBe(510);
    expect(result.overtimeMinutes).toBe(0);
    expect(summarizeSheet([result], '2026-01-01')).toMatchObject({
      holidayWorkMinutes: 510,
      overtimeMinutes: 0,
      scheduledWorkDays: 0,
    });
  });

  it('shouldSubtractWeekdayHolidaysFromScheduledWorkDays', () => {
    const holidays = new Map([
      ['2026-11-03', '文化の日'],
      ['2026-11-04', '仮の祝日'],
    ]);
    const days = [
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ].map((date) => day(date, { holidays }));
    // 平日 5 日 − 平日の祝日 2 日
    expect(summarizeSheet(days, '2026-01-01').scheduledWorkDays).toBe(3);
    // 入社日以降の平日(11/5・11/6)だけ数える
    expect(summarizeSheet(days, '2026-11-05').scheduledWorkDays).toBe(2);
  });

  it('shouldCountWeekdayHolidayInsideApprovedLeaveAsPaidLeaveDay', () => {
    const holidays = new Map([['2026-11-03', '文化の日']]);
    const rangeLeave = leave({ id: 'l-range', startDate: '2026-11-02', endDate: '2026-11-04' });
    const days = ['2026-11-02', '2026-11-03', '2026-11-04'].map((date) =>
      day(date, { holidays, leaves: [rangeLeave] }),
    );
    expect(days[1]?.leaves).toEqual([{ id: 'l-range', leaveType: 'ANNUAL', status: 'APPROVED' }]);
    // 月・火(祝日)・水の 3 日。FR-LEAVE-001 の差し引きと一致させる
    expect(summarizeSheet(days, '2026-01-01').paidLeaveDays).toBe(3);
  });

  it('shouldNotAddLeaveToSaturdayHolidayInsideLeaveRange', () => {
    const result = day('2026-11-07', {
      holidays: new Map([['2026-11-07', '仮の祝日']]),
      leaves: [leave({ startDate: '2026-11-06', endDate: '2026-11-09' })],
    });
    expect(result.dayType).toBe('HOLIDAY');
    expect(result.leaves).toEqual([]);
  });
});
