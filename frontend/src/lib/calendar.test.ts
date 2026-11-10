import { describe, expect, it } from 'vitest';
import { buildMonthWeeks, formatMonthLabel, shiftMonth } from './calendar';

describe('shiftMonth', () => {
  it('shouldCrossYearBoundaryWhenShiftingFromDecemberAndJanuary', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('shouldShiftWithinYear', () => {
    expect(shiftMonth('2026-11', -1)).toBe('2026-10');
    expect(shiftMonth('2026-11', 1)).toBe('2026-12');
  });
});

describe('buildMonthWeeks', () => {
  it('shouldStartOnSundayAndPadWithNullWhenMonthStartsOnSunday', () => {
    // 2026-11-01 は日曜日
    const weeks = buildMonthWeeks('2026-11');
    expect(weeks[0][0]).toBe('2026-11-01');
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[4].slice(-5)).toEqual([null, null, null, null, null]);
    expect(weeks[4][1]).toBe('2026-11-30');
  });

  it('shouldPadLeadingCellsWhenMonthStartsMidWeek', () => {
    // 2026-10-01 は木曜日
    const weeks = buildMonthWeeks('2026-10');
    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('shouldHandleLeapYearFebruary', () => {
    const days = buildMonthWeeks('2028-02')
      .flat()
      .filter((d) => d !== null);
    expect(days).toHaveLength(29);
    expect(days.at(-1)).toBe('2028-02-29');
  });
});

describe('formatMonthLabel', () => {
  it('shouldFormatAsJapaneseYearMonth', () => {
    expect(formatMonthLabel('2026-11')).toBe('2026年11月');
  });
});
