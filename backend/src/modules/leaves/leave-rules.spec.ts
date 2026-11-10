import { describe, expect, it } from 'vitest';
import {
  calculateBalance,
  canProcessLeave,
  canViewLeave,
  countLeaveDays,
  isLeaveConflict,
  validateLeavePeriod,
} from './leave-rules.js';

const APPLICANT = { id: 'applicant', role: 'EMPLOYEE' as const };
const APPROVER = { id: 'approver', role: 'EMPLOYEE' as const };
const ADMIN = { id: 'admin', role: 'ADMIN' as const };
const OTHER = { id: 'other', role: 'EMPLOYEE' as const };
const LEAVE = { userId: APPLICANT.id, approverId: APPROVER.id };

describe('calculateBalance', () => {
  it('shouldSubtractApprovedAndPendingFromGranted', () => {
    expect(
      calculateBalance({ year: 2026, grantedDays: 15, approvedDays: 3, pendingDays: 2 }),
    ).toEqual({
      year: 2026,
      grantedDays: 15,
      approvedDays: 3,
      pendingDays: 2,
      remainingDays: 10,
    });
  });

  it('shouldHandleHalfDays', () => {
    expect(
      calculateBalance({ year: 2026, grantedDays: 15, approvedDays: 2.5, pendingDays: 1 })
        .remainingDays,
    ).toBe(11.5);
  });

  it('shouldReturnZeroGrantedWhenGrantIsNotRegistered', () => {
    const balance = calculateBalance({
      year: 2026,
      grantedDays: 0,
      approvedDays: 0,
      pendingDays: 0,
    });
    expect(balance.grantedDays).toBe(0);
    expect(balance.remainingDays).toBe(0);
  });
});

describe('canProcessLeave', () => {
  it('shouldAllowAssignedApprover', () => {
    expect(canProcessLeave(LEAVE, APPROVER)).toBe(true);
  });

  it('shouldAllowAdminAsProxy', () => {
    expect(canProcessLeave(LEAVE, ADMIN)).toBe(true);
    expect(canProcessLeave({ userId: APPLICANT.id, approverId: null }, ADMIN)).toBe(true);
  });

  it('shouldRejectApplicantEvenWhenAdmin', () => {
    expect(canProcessLeave(LEAVE, APPLICANT)).toBe(false);
    expect(canProcessLeave({ userId: ADMIN.id, approverId: APPROVER.id }, ADMIN)).toBe(false);
    expect(canProcessLeave({ userId: ADMIN.id, approverId: ADMIN.id }, ADMIN)).toBe(false);
  });

  it('shouldRejectUnrelatedUser', () => {
    expect(canProcessLeave(LEAVE, OTHER)).toBe(false);
    expect(canProcessLeave({ userId: APPLICANT.id, approverId: null }, OTHER)).toBe(false);
  });
});

describe('canViewLeave', () => {
  it('shouldAllowApplicantApproverAndAdmin', () => {
    expect(canViewLeave(LEAVE, APPLICANT)).toBe(true);
    expect(canViewLeave(LEAVE, APPROVER)).toBe(true);
    expect(canViewLeave(LEAVE, ADMIN)).toBe(true);
  });

  it('shouldRejectUnrelatedUser', () => {
    expect(canViewLeave(LEAVE, OTHER)).toBe(false);
  });
});

describe('countLeaveDays', () => {
  it('shouldExcludeWeekends', () => {
    expect(countLeaveDays('ANNUAL', '2026-11-09', '2026-11-16')).toBe(6);
  });

  it('shouldReturnZeroWhenOnlyWeekend', () => {
    expect(countLeaveDays('SPECIAL', '2026-11-14', '2026-11-15')).toBe(0);
    expect(countLeaveDays('HALF_AM', '2026-11-14', '2026-11-14')).toBe(0);
  });

  it('shouldReturnHalfDayForHalfLeave', () => {
    expect(countLeaveDays('HALF_PM', '2026-11-10', '2026-11-10')).toBe(0.5);
  });

  it('shouldCountWeekdaysAcrossWeekend', () => {
    // UT-LV-02: 金・月の 2 日(土日除外)
    expect(countLeaveDays('ANNUAL', '2026-11-13', '2026-11-16')).toBe(2);
  });
});

describe('validateLeavePeriod', () => {
  it('shouldReturnNullWhenValid', () => {
    expect(validateLeavePeriod('ANNUAL', '2026-11-10', '2026-11-11')).toBeNull();
  });

  it('shouldRejectReversedRange', () => {
    expect(validateLeavePeriod('ANNUAL', '2026-11-11', '2026-11-10')).not.toBeNull();
  });

  it('shouldRejectRangeAcrossYears', () => {
    expect(validateLeavePeriod('ANNUAL', '2026-12-31', '2027-01-01')).not.toBeNull();
  });

  it('shouldRejectMultiDayHalfLeave', () => {
    expect(validateLeavePeriod('HALF_AM', '2026-11-10', '2026-11-11')).not.toBeNull();
  });
});

describe('isLeaveConflict', () => {
  const day = (leaveType: 'ANNUAL' | 'HALF_AM' | 'HALF_PM', date: string) => ({
    leaveType,
    startDate: date,
    endDate: date,
  });

  it('shouldNotConflictWhenDatesDoNotOverlap', () => {
    expect(isLeaveConflict(day('ANNUAL', '2026-11-10'), day('ANNUAL', '2026-11-11'))).toBe(false);
  });

  it('shouldNotConflictForAmAndPmOnSameDay', () => {
    expect(isLeaveConflict(day('HALF_AM', '2026-11-10'), day('HALF_PM', '2026-11-10'))).toBe(false);
  });

  it('shouldConflictForSameHalfOrHalfWithFullDay', () => {
    expect(isLeaveConflict(day('HALF_AM', '2026-11-10'), day('HALF_AM', '2026-11-10'))).toBe(true);
    expect(isLeaveConflict(day('HALF_AM', '2026-11-10'), day('ANNUAL', '2026-11-10'))).toBe(true);
  });

  it('shouldNotConflictWhenAdjacentDaysOnly', () => {
    const range = { leaveType: 'ANNUAL' as const, startDate: '2026-11-10', endDate: '2026-11-11' };
    const next = { leaveType: 'ANNUAL' as const, startDate: '2026-11-12', endDate: '2026-11-13' };
    expect(isLeaveConflict(range, next)).toBe(false);
  });

  it('shouldConflictWhenPartiallyOverlapping', () => {
    const range = { leaveType: 'ANNUAL' as const, startDate: '2026-11-10', endDate: '2026-11-12' };
    const other = { leaveType: 'ANNUAL' as const, startDate: '2026-11-11', endDate: '2026-11-14' };
    expect(isLeaveConflict(range, other)).toBe(true);
  });

  it('shouldConflictWhenBoundaryDayOverlaps', () => {
    const range = { leaveType: 'ANNUAL' as const, startDate: '2026-11-10', endDate: '2026-11-10' };
    const wide = { leaveType: 'SPECIAL' as const, startDate: '2026-11-05', endDate: '2026-11-10' };
    expect(isLeaveConflict(range, wide)).toBe(true);
  });
});
