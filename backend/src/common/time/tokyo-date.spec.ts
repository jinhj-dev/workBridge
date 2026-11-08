import { describe, expect, it } from 'vitest';
import { formatTokyoDateTime, fromDbDate, toDbDate, toTokyoDate, tokyoYear } from './tokyo-date.js';

describe('tokyo-date', () => {
  it('shouldReturnSameTokyoDateJustBeforeUtc15', () => {
    expect(toTokyoDate(new Date('2026-11-08T14:59:59Z'))).toBe('2026-11-08');
  });

  it('shouldReturnNextTokyoDateAtUtc15', () => {
    expect(toTokyoDate(new Date('2026-11-08T15:00:00Z'))).toBe('2026-11-09');
  });

  it('shouldReturnTokyoYearAtNewYearBoundary', () => {
    expect(tokyoYear(new Date('2026-12-31T14:59:59Z'))).toBe(2026);
    expect(tokyoYear(new Date('2026-12-31T15:00:00Z'))).toBe(2027);
  });

  it('shouldFormatDateTimeWithTokyoOffsetInSeconds', () => {
    expect(formatTokyoDateTime(new Date('2026-11-09T00:01:02.789Z'))).toBe(
      '2026-11-09T09:01:02+09:00',
    );
    expect(formatTokyoDateTime(new Date('2026-11-08T15:00:00Z'))).toBe('2026-11-09T00:00:00+09:00');
  });

  it.each(['2026-11-09', '2026-01-01', '2024-02-29'])('shouldRoundTripDbDate(%s)', (ymd) => {
    const db = toDbDate(ymd);
    expect(db.toISOString()).toBe(`${ymd}T00:00:00.000Z`);
    expect(fromDbDate(db)).toBe(ymd);
  });
});
