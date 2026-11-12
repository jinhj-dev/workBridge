import { describe, expect, it } from 'vitest';
import { applyWorkday, attendanceRate, isWorkday, sumStatusCounts } from './today-status-rules.js';

describe('isWorkday', () => {
  it('shouldReturnTrueWhenWeekday', () => {
    expect(isWorkday('2026-11-09')).toBe(true);
  });

  it('shouldReturnFalseWhenWeekend', () => {
    expect(isWorkday('2026-11-07')).toBe(false);
    expect(isWorkday('2026-11-08')).toBe(false);
  });

  it('shouldReturnFalseWhenWeekdayHoliday', () => {
    expect(isWorkday('2026-11-03')).toBe(false);
  });

  it('shouldReturnFalseWhenSaturdayHoliday', () => {
    // 2028-01-01 は土曜日かつ元日
    expect(isWorkday('2028-01-01')).toBe(false);
  });
});

describe('applyWorkday', () => {
  const counts = { clockedInCount: 3, onLeaveCount: 2, notClockedInCount: 1 };

  it('shouldKeepCountsWhenWorkday', () => {
    expect(applyWorkday(counts, true)).toEqual(counts);
  });

  it('shouldKeepOnlyClockedInWhenNotWorkday', () => {
    expect(applyWorkday(counts, false)).toEqual({
      clockedInCount: 3,
      onLeaveCount: 0,
      notClockedInCount: 0,
    });
  });
});

describe('attendanceRate', () => {
  it('shouldRoundToOneDecimalPlace', () => {
    expect(attendanceRate({ clockedInCount: 20, onLeaveCount: 2, notClockedInCount: 2 })).toBe(
      83.3,
    );
    expect(attendanceRate({ clockedInCount: 96, onLeaveCount: 8, notClockedInCount: 16 })).toBe(80);
    expect(attendanceRate({ clockedInCount: 1, onLeaveCount: 0, notClockedInCount: 7 })).toBe(12.5);
  });

  it('shouldRoundOneThirdAndTwoThirdsToOneDecimalPlace', () => {
    expect(attendanceRate({ clockedInCount: 1, onLeaveCount: 1, notClockedInCount: 1 })).toBe(33.3);
    expect(attendanceRate({ clockedInCount: 2, onLeaveCount: 0, notClockedInCount: 1 })).toBe(66.7);
  });

  it('shouldReturnNullWhenNoTargets', () => {
    expect(attendanceRate({ clockedInCount: 0, onLeaveCount: 0, notClockedInCount: 0 })).toBeNull();
  });

  it('shouldReturnHundredWhenOnlyClockedIn', () => {
    expect(attendanceRate({ clockedInCount: 2, onLeaveCount: 0, notClockedInCount: 0 })).toBe(100);
  });
});

describe('sumStatusCounts', () => {
  it('shouldSumEachCount', () => {
    expect(
      sumStatusCounts([
        { clockedInCount: 1, onLeaveCount: 2, notClockedInCount: 3 },
        { clockedInCount: 4, onLeaveCount: 5, notClockedInCount: 6 },
      ]),
    ).toEqual({ clockedInCount: 5, onLeaveCount: 7, notClockedInCount: 9 });
  });

  it('shouldReturnZerosWhenEmpty', () => {
    expect(sumStatusCounts([])).toEqual({
      clockedInCount: 0,
      onLeaveCount: 0,
      notClockedInCount: 0,
    });
  });
});
