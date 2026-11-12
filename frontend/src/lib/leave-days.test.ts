import { describe, expect, it } from 'vitest';
import { countLeaveDays, parseLeavesQuery } from './leave-days';

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

describe('parseLeavesQuery', () => {
  it('shouldUseDefaultsWhenEmpty', () => {
    expect(parseLeavesQuery(new URLSearchParams(''))).toEqual({
      appliedFrom: '',
      appliedTo: '',
      leaveType: '',
      status: '',
      page: 1,
    });
  });

  it('shouldParseValidValues', () => {
    expect(
      parseLeavesQuery(
        new URLSearchParams(
          'appliedFrom=2026-01-05&appliedTo=2026-03-31&status=PENDING&leaveType=HALF_AM&page=3',
        ),
      ),
    ).toEqual({
      appliedFrom: '2026-01-05',
      appliedTo: '2026-03-31',
      leaveType: 'HALF_AM',
      status: 'PENDING',
      page: 3,
    });
  });

  it('shouldUseFirstValueWhenCommaSeparatedAndIgnoreUnknown', () => {
    expect(parseLeavesQuery(new URLSearchParams('status=FOO,APPROVED&leaveType=OTHER,ANNUAL'))).toMatchObject({
      status: '',
      leaveType: 'OTHER',
    });
  });

  it('shouldIgnoreLegacyYearAndTabParams', () => {
    expect(parseLeavesQuery(new URLSearchParams('year=2025&tab=apply'))).toEqual({
      appliedFrom: '',
      appliedTo: '',
      leaveType: '',
      status: '',
      page: 1,
    });
  });

  it.each([
    ['appliedFrom=2026-02-30', 'appliedFrom'],
    ['appliedFrom=abc', 'appliedFrom'],
    ['appliedTo=2026-13-01', 'appliedTo'],
  ])('shouldClearWhenInvalidDate(%s)', (search, key) => {
    expect(parseLeavesQuery(new URLSearchParams(search))[key as 'appliedFrom' | 'appliedTo']).toBe(
      '',
    );
  });

  it.each([
    ['page=0', 1],
    ['page=1.5', 1],
    ['page=abc', 1],
  ])('shouldFallbackPageWhenInvalid(%s)', (search, expected) => {
    expect(parseLeavesQuery(new URLSearchParams(search)).page).toBe(expected);
  });

  it.each([['status=FOO'], ['leaveType=FOO'], ['status='], ['leaveType=']])(
    'shouldReturnEmptyWhenUnknown(%s)',
    (search) => {
      const query = parseLeavesQuery(new URLSearchParams(search));
      expect(query.status).toBe('');
      expect(query.leaveType).toBe('');
    },
  );
});
