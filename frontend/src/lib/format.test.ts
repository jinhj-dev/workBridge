import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDays,
  formatPeriod,
  formatTodayLabel,
  formatTokyoDate,
  formatTokyoDateTime,
  formatTokyoTime,
  formatClockOut,
  formatWorkDate,
  formatWorkMinutes,
  toTokyoDateTimeInput,
} from './format';
import { messages } from '@/messages/ja';

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
    expect(formatPeriod('2026-11-10', '2026-11-12')).toBe('2026/11/10 ～ 2026/11/12');
  });

  it('shouldFormatDaysWithHalfDays', () => {
    expect(formatDays(10)).toBe('10日');
    expect(formatDays(10.5)).toBe('10.5日');
    expect(formatDays(0)).toBe('0日');
  });
});

describe('format(勤怠表示)', () => {
  it('shouldFormatWorkMinutesAsHoursAndPaddedMinutes', () => {
    expect(formatWorkMinutes(0)).toBe('0:00');
    expect(formatWorkMinutes(65)).toBe('1:05');
    expect(formatWorkMinutes(545)).toBe('9:05');
  });

  it('shouldShowNoValueWhenNoWorkMinutes', () => {
    expect(formatWorkMinutes(null)).toBe(messages.common.noValue);
  });

  it('shouldShowWeekdayInWorkDate', () => {
    // 2026-11-07 は土曜日
    expect(formatWorkDate('2026-11-07')).toBe('2026/11/07(土)');
  });

  it('shouldShowTimeOnlyWhenClockOutOnSameWorkDate', () => {
    expect(formatClockOut('2026-11-09', '2026-11-09T18:00:00+09:00')).toBe('18:00');
  });

  it('shouldShowDateTimeWhenClockOutCrossesMidnight', () => {
    expect(formatClockOut('2026-11-09', '2026-11-10T02:00:00+09:00')).toBe('2026/11/10 02:00');
  });

  it('shouldShowNoValueWhenNotClockedOut', () => {
    expect(formatClockOut('2026-11-09', null)).toBe(messages.common.noValue);
  });

  it('shouldFormatDateTimeInputInTokyoWallClock', () => {
    expect(toTokyoDateTimeInput('2026-11-09T09:01:00+09:00')).toBe('2026-11-09T09:01');
    expect(toTokyoDateTimeInput('2026-11-08T15:30:00Z')).toBe('2026-11-09T00:30');
  });
});
