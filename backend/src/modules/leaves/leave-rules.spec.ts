import { describe, expect, it } from 'vitest';
import { calculateBalance, canProcessLeave, canViewLeave } from './leave-rules.js';

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
