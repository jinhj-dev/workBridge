import { describe, expect, it } from 'vitest';
import { formatMonthLabel, shiftMonth } from './calendar';

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

describe('formatMonthLabel', () => {
  it('shouldFormatAsJapaneseYearMonth', () => {
    expect(formatMonthLabel('2026-11')).toBe('2026年11月');
  });
});
