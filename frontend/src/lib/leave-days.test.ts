import { describe, expect, it } from 'vitest';
import { countLeaveDays, parseLeavesQuery, yearOptions } from './leave-days';

describe('countLeaveDays', () => {
  it.each([
    ['ANNUAL', '2026-11-09', '2026-11-13', 5],
    ['ANNUAL', '2026-11-13', '2026-11-16', 2],
    ['ANNUAL', '2026-11-14', '2026-11-15', 0],
    ['HALF_AM', '2026-11-10', '2026-11-10', 0.5],
    ['HALF_PM', '2026-11-14', '2026-11-14', 0],
    ['SPECIAL', '2026-11-10', '2026-11-10', 1],
  ] as const)('shouldCount(%s %s-%s)', (type, start, end, expected) => {
    expect(countLeaveDays(type, start, end)).toBe(expected);
  });

  it.each([
    ['', ''],
    ['2026-11-10', ''],
    ['2026-11-12', '2026-11-10'],
    ['2026-02-30', '2026-03-01'],
  ])('shouldReturnNullWhenInvalid(%s, %s)', (start, end) => {
    expect(countLeaveDays('ANNUAL', start, end)).toBeNull();
  });
});

describe('yearOptions', () => {
  it('shouldListNextYearDownToFourYearsAgo', () => {
    expect(yearOptions(2026)).toEqual([2027, 2026, 2025, 2024, 2023, 2022]);
  });
});

describe('parseLeavesQuery', () => {
  it('shouldUseDefaultsWhenEmpty', () => {
    expect(parseLeavesQuery(new URLSearchParams(''), 2026)).toEqual({
      year: 2026,
      statuses: [],
      leaveTypes: [],
      page: 1,
    });
  });

  it('shouldParseValidValues', () => {
    expect(
      parseLeavesQuery(
        new URLSearchParams('year=2025&status=PENDING&leaveType=HALF_AM&page=3'),
        2026,
      ),
    ).toEqual({ year: 2025, statuses: ['PENDING'], leaveTypes: ['HALF_AM'], page: 3 });
  });

  it('shouldParseCommaSeparatedListsInDisplayOrderWithoutDuplicatesOrUnknown', () => {
    expect(
      parseLeavesQuery(
        new URLSearchParams('status=CANCELLED,PENDING,FOO,PENDING&leaveType=OTHER,ANNUAL,'),
        2026,
      ),
    ).toMatchObject({ statuses: ['PENDING', 'CANCELLED'], leaveTypes: ['ANNUAL', 'OTHER'] });
  });

  it('shouldRestoreSingleLegacyStatusValue', () => {
    expect(parseLeavesQuery(new URLSearchParams('status=APPROVED'), 2026).statuses).toEqual([
      'APPROVED',
    ]);
  });

  it('shouldIgnoreTabParam', () => {
    expect(parseLeavesQuery(new URLSearchParams('tab=apply'), 2026)).toEqual({
      year: 2026,
      statuses: [],
      leaveTypes: [],
      page: 1,
    });
  });

  it.each([
    ['year=1999', 'year', 2026],
    ['year=2030', 'year', 2026],
    ['year=abc', 'year', 2026],
    ['page=0', 'page', 1],
    ['page=1.5', 'page', 1],
  ])('shouldFallbackWhenInvalid(%s)', (search, key, expected) => {
    expect(parseLeavesQuery(new URLSearchParams(search), 2026)[key as 'year' | 'page']).toBe(
      expected,
    );
  });

  it.each([['status=FOO'], ['leaveType=FOO'], ['status='], ['leaveType=']])(
    'shouldReturnEmptyListsWhenUnknown(%s)',
    (search) => {
      const query = parseLeavesQuery(new URLSearchParams(search), 2026);
      expect(query.statuses).toEqual([]);
      expect(query.leaveTypes).toEqual([]);
    },
  );
});
