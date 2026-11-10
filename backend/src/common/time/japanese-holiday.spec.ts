import { japaneseHolidaysInRange } from './japanese-holiday.js';

describe('japaneseHolidaysInRange', () => {
  it('shouldReturnHolidayNamesWhenRangeContainsHolidays', () => {
    const holidays = japaneseHolidaysInRange('2026-11-01', '2026-11-30');
    expect([...holidays.entries()]).toEqual([
      ['2026-11-03', '文化の日'],
      ['2026-11-23', '勤労感謝の日'],
    ]);
  });

  it('shouldIncludeBothEndsOfRange', () => {
    expect(japaneseHolidaysInRange('2027-01-01', '2027-01-01').get('2027-01-01')).toBe('元日');
    expect(japaneseHolidaysInRange('2026-11-03', '2026-11-03').size).toBe(1);
  });

  it('shouldReturnSubstituteHolidayAndNationalHoliday', () => {
    expect(japaneseHolidaysInRange('2026-05-01', '2026-05-31').get('2026-05-06')).toContain(
      '振替休日',
    );
    expect(japaneseHolidaysInRange('2026-09-01', '2026-09-30').get('2026-09-22')).toBe('休日');
  });

  it('shouldReturnEmptyWhenMonthHasNoHoliday', () => {
    expect(japaneseHolidaysInRange('2026-06-01', '2026-06-30').size).toBe(0);
  });

  it('shouldReturnEmptyWhenYearIsOutOfLibraryRange', () => {
    expect(japaneseHolidaysInRange('2100-01-01', '2100-12-31').size).toBe(0);
  });

  it('shouldNotDependOnServerTimezone', () => {
    const original = process.env.TZ;
    try {
      for (const tz of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
        process.env.TZ = tz;
        const keys = [...japaneseHolidaysInRange('2026-11-01', '2026-11-30').keys()];
        expect(keys).toEqual(['2026-11-03', '2026-11-23']);
      }
    } finally {
      if (original === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = original;
      }
    }
  });
});

describe('japaneseHolidaysInRange(収録範囲の境界)', () => {
  it('shouldReturnEmptyOneYearAfterLastSupportedYear', () => {
    expect(japaneseHolidaysInRange('2051-01-01', '2051-12-31').size).toBe(0);
  });
});
