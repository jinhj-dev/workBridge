import { describe, expect, it } from 'vitest';
import {
  calculateAttendanceStatus,
  calculateWorkMinutes,
  toAttendanceResponse,
} from './attendance.mapper.js';
import type { AttendanceRow } from './attendance.repository.js';

const TODAY = '2026-11-09';

function makeRow(overrides: Partial<AttendanceRow> = {}): AttendanceRow {
  return {
    id: 'att-1',
    workDate: new Date('2026-11-09T00:00:00Z'),
    clockIn: new Date('2026-11-09T00:00:00Z'),
    clockOut: null,
    modifiedAt: null,
    user: { id: 'user-1', name: 'テスト太郎', empId: '00001', department: { name: '開発部' } },
    ...overrides,
  };
}

describe('calculateAttendanceStatus', () => {
  it('shouldReturnDoneWhenClockOutExists', () => {
    expect(calculateAttendanceStatus(TODAY, new Date(), TODAY)).toBe('DONE');
    expect(calculateAttendanceStatus('2026-11-08', new Date(), TODAY)).toBe('DONE');
  });

  it('shouldReturnWorkingWhenTodayAndNoClockOut', () => {
    expect(calculateAttendanceStatus(TODAY, null, TODAY)).toBe('WORKING');
  });

  it('shouldReturnMissingClockOutWhenPastDayAndNoClockOut', () => {
    expect(calculateAttendanceStatus('2026-11-08', null, TODAY)).toBe('MISSING_CLOCK_OUT');
  });
});

describe('calculateWorkMinutes', () => {
  it('shouldReturnFlooredMinutesWhenClockOutExists', () => {
    const clockIn = new Date('2026-11-09T00:00:00Z');
    expect(calculateWorkMinutes(clockIn, new Date('2026-11-09T09:00:00Z'))).toBe(540);
    expect(calculateWorkMinutes(clockIn, new Date('2026-11-09T00:01:59Z'))).toBe(1);
  });

  it('shouldReturnNullWhenNoClockOut', () => {
    expect(calculateWorkMinutes(new Date(), null)).toBeNull();
  });
});

describe('toAttendanceResponse', () => {
  it('shouldMapDoneRowWithTokyoTimes', () => {
    const res = toAttendanceResponse(
      makeRow({ clockOut: new Date('2026-11-09T09:30:00Z') }),
      TODAY,
    );
    expect(res).toEqual({
      id: 'att-1',
      user: { id: 'user-1', name: 'テスト太郎', empId: '00001', departmentName: '開発部' },
      workDate: '2026-11-09',
      clockIn: '2026-11-09T09:00:00+09:00',
      clockOut: '2026-11-09T18:30:00+09:00',
      workMinutes: 570,
      status: 'DONE',
      modifiedAt: null,
    });
  });

  it('shouldMapModifiedAtToTokyoTimeWhenModifiedByAdmin', () => {
    const res = toAttendanceResponse(
      makeRow({ modifiedAt: new Date('2026-11-09T01:12:00Z') }),
      TODAY,
    );
    expect(res.modifiedAt).toBe('2026-11-09T10:12:00+09:00');
  });

  it('shouldMapWorkingRowWithNullWorkMinutes', () => {
    const res = toAttendanceResponse(makeRow(), TODAY);
    expect(res.status).toBe('WORKING');
    expect(res.clockOut).toBeNull();
    expect(res.workMinutes).toBeNull();
  });

  it('shouldMapPastRowWithoutClockOutAsMissingClockOut', () => {
    const res = toAttendanceResponse(
      makeRow({ workDate: new Date('2026-11-08T00:00:00Z') }),
      TODAY,
    );
    expect(res.status).toBe('MISSING_CLOCK_OUT');
    expect(res.workMinutes).toBeNull();
  });
});
