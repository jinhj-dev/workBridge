import { describe, expect, it } from 'vitest';
import { workProgressPercent } from './work-progress';

const CLOCK_IN = '2026-11-09T09:00:00+09:00';

describe('workProgressPercent', () => {
  it('shouldReturnZeroWhenNotClockedIn', () => {
    expect(workProgressPercent(null, new Date())).toBe(0);
  });

  it('shouldFloorToInteger', () => {
    // 90 分 / 540 分 = 16.67%
    expect(workProgressPercent(CLOCK_IN, new Date('2026-11-09T10:30:00+09:00'))).toBe(16);
  });

  it('shouldReturnFiftyAtHalf', () => {
    expect(workProgressPercent(CLOCK_IN, new Date('2026-11-09T13:30:00+09:00'))).toBe(50);
  });

  it('shouldClampToZeroWhenUntilIsBeforeClockIn', () => {
    expect(workProgressPercent(CLOCK_IN, new Date('2026-11-09T08:00:00+09:00'))).toBe(0);
  });

  it('shouldClampTo100WhenOverNineHours', () => {
    expect(workProgressPercent(CLOCK_IN, new Date('2026-11-09T20:00:00+09:00'))).toBe(100);
  });
});
