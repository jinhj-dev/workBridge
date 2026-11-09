import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDays,
  formatPeriod,
  formatTodayLabel,
  formatTokyoDate,
  formatTokyoDateTime,
  formatTokyoTime,
} from './format';

describe('format(東京基準)', () => {
  it('shouldKeepSameTokyoDateJustBeforeUtc15', () => {
    expect(formatTokyoDate('2026-11-08T14:59:59Z')).toBe('2026/11/08');
    expect(formatTokyoTime('2026-11-08T14:59:59Z')).toBe('23:59');
  });

  it('shouldMoveToNextTokyoDateAtUtc15', () => {
    expect(formatTokyoDate('2026-11-08T15:00:00Z')).toBe('2026/11/09');
    expect(formatTokyoTime('2026-11-08T15:00:00Z')).toBe('00:00');
  });

  it('shouldFormatOffsetDateTimeAsTokyo', () => {
    expect(formatTokyoDateTime('2026-11-09T09:01:30+09:00')).toBe('2026/11/09 09:01');
  });

  it('shouldFormatTodayLabelInTokyo', () => {
    expect(formatTodayLabel(new Date('2026-11-08T14:59:59Z'))).toBe('2026年11月8日(日)');
    expect(formatTodayLabel(new Date('2026-11-08T15:00:00Z'))).toBe('2026年11月9日(月)');
  });

  it('shouldFormatDateOnlyValuesAndPeriod', () => {
    expect(formatDate('2026-11-10')).toBe('2026/11/10');
    expect(formatPeriod('2026-11-10', '2026-11-10')).toBe('2026/11/10');
    expect(formatPeriod('2026-11-10', '2026-11-12')).toBe('2026/11/10 ~ 2026/11/12');
  });

  it('shouldFormatDaysWithHalfDays', () => {
    expect(formatDays(10)).toBe('10日');
    expect(formatDays(10.5)).toBe('10.5日');
    expect(formatDays(0)).toBe('0日');
  });
});
