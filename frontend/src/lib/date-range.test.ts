import { describe, expect, it } from 'vitest';
import { messages } from '@/messages/ja';
import {
  defaultDateRange,
  parseAdminQuery,
  parseHistoryQuery,
  toQueryString,
  tokyoToday,
  validateDateRange,
} from './date-range';

describe('date-range(東京基準の既定値)', () => {
  it('shouldReturnTokyoDateNearMidnight', () => {
    expect(tokyoToday(new Date('2026-11-08T14:59:59Z'))).toBe('2026-11-08');
    expect(tokyoToday(new Date('2026-11-08T15:00:00Z'))).toBe('2026-11-09');
  });

  it('shouldUseTokyoMonthWhenJustAfterJstMidnight', () => {
    // 2026-11-01 00:30 JST は UTC では 10-31。既定の開始日は東京の 11 月 1 日
    expect(defaultDateRange(new Date('2026-10-31T15:30:00Z'))).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-01',
    });
  });
});

describe('validateDateRange', () => {
  it('shouldRequireBothDates', () => {
    expect(validateDateRange('', '2026-11-09')).toBe(messages.dateRange.required);
    expect(validateDateRange('2026-11-01', '')).toBe(messages.dateRange.required);
  });

  it('shouldRejectStartAfterEnd', () => {
    expect(validateDateRange('2026-11-09', '2026-11-08')).toBe(messages.dateRange.order);
  });

  it('shouldAllowSameDay', () => {
    expect(validateDateRange('2026-11-09', '2026-11-09')).toBeNull();
  });

  it('shouldAllowExactly366InclusiveDays', () => {
    expect(validateDateRange('2024-01-01', '2024-12-31')).toBeNull();
  });

  it('shouldRejectWhen367InclusiveDays', () => {
    expect(validateDateRange('2024-01-01', '2025-01-01')).toBe(messages.dateRange.tooLong);
  });
});

describe('parseHistoryQuery', () => {
  const now = new Date('2026-11-09T00:00:00+09:00');

  it('shouldFallBackToDefaultsWhenQueryMissing', () => {
    expect(parseHistoryQuery(new URLSearchParams(''), now)).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-09',
      page: 1,
    });
  });

  it('shouldUseValidValuesFromQuery', () => {
    expect(
      parseHistoryQuery(
        new URLSearchParams('startDate=2026-10-01&endDate=2026-10-31&page=3'),
        now,
      ),
    ).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31', page: 3 });
  });

  it.each(['2026-13-01', '2026-02-30', 'abc', '2026/11/01'])(
    'shouldReplaceInvalidDate(%s)WithDefault',
    (value) => {
      expect(parseHistoryQuery(new URLSearchParams(`startDate=${value}`), now).startDate).toBe(
        '2026-11-01',
      );
    },
  );

  it.each(['0', '-1', 'abc', '1.5'])('shouldReplaceInvalidPage(%s)WithOne', (value) => {
    expect(parseHistoryQuery(new URLSearchParams(`page=${value}`), now).page).toBe(1);
  });
});

describe('parseAdminQuery', () => {
  const now = new Date('2026-11-09T00:00:00+09:00');

  it('shouldKeepValidFilters', () => {
    const params = new URLSearchParams(
      'name=%20山田%20&departmentId=3f2504e0-4f89-41d3-9a0c-0305e82c3301&status=DONE',
    );
    expect(parseAdminQuery(params, now)).toMatchObject({
      name: '山田',
      departmentId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      status: 'DONE',
    });
  });

  it('shouldDropNonUuidDepartmentAndUnknownStatus', () => {
    const params = new URLSearchParams('departmentId=not-a-uuid&status=ABSENT');
    expect(parseAdminQuery(params, now)).toMatchObject({ departmentId: '', status: '' });
  });

  it('shouldTruncateNameTo100Characters', () => {
    const params = new URLSearchParams({ name: 'a'.repeat(120) });
    expect(parseAdminQuery(params, now).name).toHaveLength(100);
  });
});

describe('toQueryString', () => {
  it('shouldOmitEmptyValues', () => {
    expect(toQueryString({ a: '', b: 'x', c: 1 })).toBe('b=x&c=1');
  });
});
