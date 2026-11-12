import { describe, expect, it } from 'vitest';
import { isWeekend, monthRange } from './calendar-rules.js';

describe('monthRange', () => {
  it('shouldReturnFirstAndLastDayWhenMonthGiven', () => {
    expect(monthRange('2026-11')).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('shouldReturnTwentyEighthAsFebruaryEndWhenNonLeapYear', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('shouldHandleLeapYearFebruary', () => {
    expect(monthRange('2028-02').end).toBe('2028-02-29');
    expect(monthRange('2026-02').end).toBe('2026-02-28');
  });
});

describe('isWeekend', () => {
  it('shouldReturnTrueWhenSaturdayOrSunday', () => {
    expect(isWeekend('2026-11-07')).toBe(true);
    expect(isWeekend('2026-11-08')).toBe(true);
  });

  it('shouldReturnFalseWhenWeekday', () => {
    expect(isWeekend('2026-11-09')).toBe(false);
    expect(isWeekend('2026-11-13')).toBe(false);
  });
});
