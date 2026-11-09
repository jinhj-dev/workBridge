import { describe, expect, it } from 'vitest';
import { AppException } from '../../common/exceptions/app.exception.js';
import { toTokyoDate } from '../../common/time/tokyo-date.js';
import { assertValidTimeRange, resolveDateRange } from './attendance-rules.js';

const TODAY = '2026-11-09';

function expectAppError(fn: () => unknown, code: string, message: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe(code);
    expect((error as AppException).message).toBe(message);
    return;
  }
  throw new Error('例外が発生するはずでしたが、成功しました');
}

describe('resolveDateRange', () => {
  it('shouldDefaultToFirstOfMonthThroughTodayWhenBothOmitted', () => {
    expect(resolveDateRange({}, TODAY)).toEqual({ startDate: '2026-11-01', endDate: TODAY });
  });

  it('shouldUseTokyoDateWhenJustAfterMidnightJst', () => {
    // 2026-11-01 00:30 JST は UTC では 10-31。東京基準で「今月」は 11 月になる
    const instant = new Date('2026-10-31T15:30:00Z');
    const today = toTokyoDate(instant);
    expect(today).toBe('2026-11-01');
    expect(resolveDateRange({}, today)).toEqual({ startDate: '2026-11-01', endDate: '2026-11-01' });
  });

  it('shouldDefaultEndDateToTodayWhenOnlyStartGiven', () => {
    expect(resolveDateRange({ startDate: '2026-10-15' }, TODAY)).toEqual({
      startDate: '2026-10-15',
      endDate: TODAY,
    });
  });

  it('shouldDefaultStartDateToFirstOfMonthWhenOnlyEndGiven', () => {
    expect(resolveDateRange({ endDate: '2026-11-05' }, TODAY)).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-05',
    });
  });

  it('shouldAllowSameStartAndEndDate', () => {
    expect(
      resolveDateRange({ startDate: '2026-11-09', endDate: '2026-11-09' }, TODAY),
    ).toEqual({ startDate: '2026-11-09', endDate: '2026-11-09' });
  });

  it('shouldRejectWhenStartDateAfterEndDate', () => {
    expectAppError(
      () => resolveDateRange({ startDate: '2026-11-09', endDate: '2026-11-08' }, TODAY),
      'INVALID_DATE_RANGE',
      '開始日は終了日より後にできません。',
    );
  });

  it('shouldAllowExactly366InclusiveDaysAcrossLeapYear', () => {
    // 2024 年は閏年。2024-01-01 〜 2024-12-31 は両端を含めて 366 日
    expect(
      resolveDateRange({ startDate: '2024-01-01', endDate: '2024-12-31' }, TODAY),
    ).toEqual({ startDate: '2024-01-01', endDate: '2024-12-31' });
  });

  it('shouldRejectWhen367InclusiveDays', () => {
    // 2024-01-01 〜 2025-01-01 は両端を含めて 367 日
    expectAppError(
      () => resolveDateRange({ startDate: '2024-01-01', endDate: '2025-01-01' }, TODAY),
      'INVALID_DATE_RANGE',
      '照会期間は最大1年です。',
    );
  });
});

describe('assertValidTimeRange', () => {
  const WORK_DATE = '2026-11-09';
  const CLOCK_IN = new Date('2026-11-09T00:00:00Z'); // 09:00 JST

  it('shouldAllowClockOutNull', () => {
    expect(() =>
      assertValidTimeRange({ workDate: WORK_DATE, clockIn: CLOCK_IN, clockOut: null }),
    ).not.toThrow();
  });

  it('shouldRejectWhenClockOutEqualsClockIn', () => {
    expectAppError(
      () => assertValidTimeRange({ workDate: WORK_DATE, clockIn: CLOCK_IN, clockOut: CLOCK_IN }),
      'INVALID_TIME_RANGE',
      '出退勤時刻を確認してください。',
    );
  });

  it('shouldRejectWhenClockOutBeforeClockIn', () => {
    expectAppError(
      () =>
        assertValidTimeRange({
          workDate: WORK_DATE,
          clockIn: CLOCK_IN,
          clockOut: new Date('2026-11-08T23:59:00Z'),
        }),
      'INVALID_TIME_RANGE',
      '出退勤時刻を確認してください。',
    );
  });

  it('shouldAllowClockOutExactly24HoursAfterClockIn', () => {
    expect(() =>
      assertValidTimeRange({
        workDate: WORK_DATE,
        clockIn: CLOCK_IN,
        clockOut: new Date(CLOCK_IN.getTime() + 24 * 60 * 60 * 1000),
      }),
    ).not.toThrow();
  });

  it('shouldRejectClockOutOver24HoursAfterClockIn', () => {
    expectAppError(
      () =>
        assertValidTimeRange({
          workDate: WORK_DATE,
          clockIn: CLOCK_IN,
          clockOut: new Date(CLOCK_IN.getTime() + 24 * 60 * 60 * 1000 + 60 * 1000),
        }),
      'INVALID_TIME_RANGE',
      '出退勤時刻を確認してください。',
    );
  });

  it('shouldAllowClockInAt2359JstOnWorkDate', () => {
    expect(() =>
      assertValidTimeRange({
        workDate: WORK_DATE,
        clockIn: new Date('2026-11-09T14:59:00Z'), // 2026-11-09 23:59 JST
        clockOut: null,
      }),
    ).not.toThrow();
  });

  it('shouldRejectClockInAtMidnightJstOfNextDay', () => {
    expectAppError(
      () =>
        assertValidTimeRange({
          workDate: WORK_DATE,
          clockIn: new Date('2026-11-09T15:00:00Z'), // 2026-11-10 00:00 JST
          clockOut: null,
        }),
      'INVALID_TIME_RANGE',
      '出退勤時刻を確認してください。',
    );
  });

  it('shouldRejectClockInAt2359JstOfPreviousDay', () => {
    expectAppError(
      () =>
        assertValidTimeRange({
          workDate: WORK_DATE,
          clockIn: new Date('2026-11-08T14:59:00Z'), // 2026-11-08 23:59 JST
          clockOut: null,
        }),
      'INVALID_TIME_RANGE',
      '出退勤時刻を確認してください。',
    );
  });
});
