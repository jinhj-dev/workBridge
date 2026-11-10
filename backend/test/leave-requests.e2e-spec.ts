// 休暇申請・承認者候補・履歴・取消 API の e2e。Clock を固定し、実際のテスト用 DB を使う
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker, uniqueSuffix } from './db/db-helpers.js';
import {
  createTestApp,
  createTokenSigner,
  FixedClock,
  insertLeave,
  insertLeaveGrant,
} from './e2e-helpers.js';

interface LeaveBody {
  id: string;
  approver: { id: string } | null;
  days: number;
  reason: string;
  status: string;
  autoApproved: boolean;
  processedBy: { id: string } | null;
}
interface PageBody {
  items: { id: string }[];
  totalCount: number;
}
interface ErrorBody {
  code?: string;
  message?: string;
}

interface TestUser {
  id: string;
  empId: string;
  token: string;
}

// FixedClock は 2026-11-09(月)。11-10(火)・11-11(水)は勤務日、11-14(土)・11-15(日)は休日
describe('休暇申請 API(e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let tracker: TestDataTracker;
  const clock = new FixedClock();
  const sign = createTokenSigner();

  beforeAll(async () => {
    prisma = createTestPrisma();
    tracker = new TestDataTracker(prisma);
    app = await createTestApp(clock);
  });

  afterAll(async () => {
    try {
      await tracker?.cleanup();
    } finally {
      await app?.close();
      await prisma?.$disconnect();
    }
  });

  async function createUser(
    overrides: { approvalRequired?: boolean; isActive?: boolean; name?: string } = {},
  ): Promise<TestUser> {
    const department = await tracker.createDepartment();
    const user = await tracker.createUser({
      departmentId: department.id,
      mustChangePassword: false,
      ...overrides,
    });
    return { id: user.id, empId: user.empId, token: await sign(user.id) };
  }

  function post(user: TestUser, body: object): request.Test {
    return request(app.getHttpServer())
      .post('/api/v1/leaves')
      .set('Authorization', `Bearer ${user.token}`)
      .send(body);
  }

  const period = { startDate: '2026-11-10', endDate: '2026-11-11' };

  async function getBalance(user: TestUser): Promise<Record<string, unknown>> {
    const response = await request(app.getHttpServer())
      .get('/api/v1/leaves/balance')
      .query({ year: 2026 })
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    return response.body as Record<string, unknown>;
  }

  it('shouldCreatePendingLeaveWhenApprovalRequired', async () => {
    const applicant = await createUser();
    const approver = await createUser();
    await insertLeaveGrant(prisma, { userId: applicant.id, year: 2026, grantedDays: 10 });

    const response = await post(applicant, {
      leaveType: 'ANNUAL',
      ...period,
      reason: '  私用  ',
      approverId: approver.id,
    }).expect(201);

    const body = response.body as LeaveBody;
    expect(body).toMatchObject({
      status: 'PENDING',
      days: 2,
      reason: '私用',
      autoApproved: false,
      processedBy: null,
    });
    expect(body.approver?.id).toBe(approver.id);
  });

  it('shouldAutoApproveWhenApprovalNotRequiredAndIgnoreApprover', async () => {
    const applicant = await createUser({ approvalRequired: false });
    const other = await createUser();
    await insertLeaveGrant(prisma, { userId: applicant.id, year: 2026, grantedDays: 10 });

    const response = await post(applicant, {
      leaveType: 'ANNUAL',
      ...period,
      reason: '私用',
      approverId: other.id,
    }).expect(201);

    const body = response.body as LeaveBody;
    expect(body).toMatchObject({ status: 'APPROVED', autoApproved: true, approver: null });
    expect(body.processedBy?.id).toBe(applicant.id);
  });

  it('shouldReturn400WhenApproverMissingOrInvalid', async () => {
    const applicant = await createUser();
    const inactive = await createUser({ isActive: false });
    const base = { leaveType: 'SPECIAL', ...period, reason: '私用' };

    const missing = await post(applicant, base).expect(400);
    expect((missing.body as ErrorBody).code).toBe('APPROVER_REQUIRED');
    for (const approverId of ['not-a-uuid', applicant.id, inactive.id]) {
      const response = await post(applicant, { ...base, approverId }).expect(400);
      expect((response.body as ErrorBody).code).toBe('INVALID_APPROVER');
    }
  });

  it('shouldReturn400WhenPeriodInvalid', async () => {
    const applicant = await createUser({ approvalRequired: false });
    const cases: [object, string][] = [
      [
        { leaveType: 'SPECIAL', startDate: '2026-11-11', endDate: '2026-11-10' },
        'INVALID_DATE_RANGE',
      ],
      [
        { leaveType: 'SPECIAL', startDate: '2026-12-31', endDate: '2027-01-01' },
        'INVALID_DATE_RANGE',
      ],
      [{ leaveType: 'HALF_AM', ...period }, 'INVALID_DATE_RANGE'],
      [{ leaveType: 'UNKNOWN', ...period }, 'VALIDATION_ERROR'],
      [{ leaveType: 'SPECIAL', startDate: '2026-11-14', endDate: '2026-11-15' }, 'NO_WORKING_DAYS'],
      [
        { leaveType: 'SPECIAL', startDate: '2026-02-30', endDate: '2026-02-30' },
        'VALIDATION_ERROR',
      ],
    ];
    for (const [body, code] of cases) {
      const response = await post(applicant, { ...body, reason: '私用' }).expect(400);
      expect((response.body as ErrorBody).code).toBe(code);
    }
  });

  it('shouldReturn400WhenReasonBlank', async () => {
    const applicant = await createUser({ approvalRequired: false });
    const response = await post(applicant, {
      leaveType: 'SPECIAL',
      ...period,
      reason: '   ',
    }).expect(400);
    expect((response.body as ErrorBody).code).toBe('VALIDATION_ERROR');
  });

  it('shouldReturn409WhenDatesConflictButAllowAmPmPair', async () => {
    const applicant = await createUser({ approvalRequired: false });
    await insertLeaveGrant(prisma, { userId: applicant.id, year: 2026, grantedDays: 10 });
    await post(applicant, {
      leaveType: 'HALF_AM',
      startDate: '2026-11-10',
      endDate: '2026-11-10',
      reason: '私用',
    }).expect(201);

    await post(applicant, {
      leaveType: 'HALF_PM',
      startDate: '2026-11-10',
      endDate: '2026-11-10',
      reason: '私用',
    }).expect(201);
    const sameHalf = await post(applicant, {
      leaveType: 'HALF_AM',
      startDate: '2026-11-10',
      endDate: '2026-11-10',
      reason: '私用',
    }).expect(409);
    expect((sameHalf.body as ErrorBody).code).toBe('LEAVE_CONFLICT');
    const full = await post(applicant, { leaveType: 'SPECIAL', ...period, reason: '私用' }).expect(
      409,
    );
    expect((full.body as ErrorBody).code).toBe('LEAVE_CONFLICT');
  });

  it('shouldReturn422WhenBalanceInsufficientAndNotCountOtherTypes', async () => {
    const applicant = await createUser({ approvalRequired: false });
    await insertLeaveGrant(prisma, { userId: applicant.id, year: 2026, grantedDays: 1.5 });

    const response = await post(applicant, {
      leaveType: 'ANNUAL',
      ...period,
      reason: '私用',
    }).expect(422);
    expect(response.body as ErrorBody).toMatchObject({
      code: 'INSUFFICIENT_LEAVE_BALANCE',
      message: '年次休暇の残日数が不足しています。(残り 1.5 日)',
    });
    await post(applicant, { leaveType: 'SPECIAL', ...period, reason: '私用' }).expect(201);
  });

  it('shouldReturn401WhenUserDeactivated', async () => {
    const applicant = await createUser({ approvalRequired: false, isActive: false });
    await post(applicant, { leaveType: 'SPECIAL', ...period, reason: '私用' }).expect(401);
  });

  it('shouldListApproversExcludingSelfAndInactive', async () => {
    const me = await createUser();
    const active = await createUser({ name: '承認者候補テスト' });
    const inactive = await createUser({ isActive: false, name: '承認者候補テスト' });

    const response = await request(app.getHttpServer())
      .get('/api/v1/leaves/approvers')
      .query({ keyword: active.empId.slice(1) })
      .set('Authorization', `Bearer ${me.token}`)
      .expect(200);
    const ids = (response.body as { id: string }[]).map((item) => item.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
    expect(ids).not.toContain(me.id);

    await request(app.getHttpServer())
      .get('/api/v1/leaves/approvers')
      .query({ keyword: 'x'.repeat(101) })
      .set('Authorization', `Bearer ${me.token}`)
      .expect(400);
  });

  it('shouldSortApproversByEmpIdAndMatchNameIgnoringCase', async () => {
    const me = await createUser();
    const token = uniqueSuffix();
    const first = await createUser({ name: `Ref${token}Taro` });
    const second = await createUser({ name: `ref${token}Jiro` });

    const response = await request(app.getHttpServer())
      .get('/api/v1/leaves/approvers')
      .query({ keyword: `REF${token.toLowerCase()}` })
      .set('Authorization', `Bearer ${me.token}`)
      .expect(200);
    const rows = response.body as { id: string; empId: string }[];
    const expected = [first, second].sort((a, b) => (a.empId < b.empId ? -1 : 1)).map((u) => u.id);
    expect(rows.map((row) => row.id)).toEqual(expected);
  });

  it('shouldOrderOwnHistoryByCreatedAtDescThenIdDescAndPaginate', async () => {
    const me = await createUser();
    const other = await createUser();
    const older = await insertLeave(prisma, {
      userId: me.id,
      approverId: other.id,
      status: 'PENDING',
      startDate: '2026-11-20',
      createdAt: new Date('2026-10-01T00:00:00Z'),
    });
    const sameCreatedAt = new Date('2026-11-01T00:00:00Z');
    const tieA = await insertLeave(prisma, {
      userId: me.id,
      approverId: other.id,
      status: 'PENDING',
      startDate: '2026-11-21',
      createdAt: sameCreatedAt,
    });
    const tieB = await insertLeave(prisma, {
      userId: me.id,
      approverId: other.id,
      status: 'PENDING',
      startDate: '2026-11-22',
      createdAt: sameCreatedAt,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/leaves/me')
      .set('Authorization', `Bearer ${me.token}`)
      .expect(200);
    const ids = (response.body as PageBody).items.map((item) => item.id);
    expect(ids).toEqual([...[tieA.id, tieB.id].sort().reverse(), older.id]);

    const paged = await request(app.getHttpServer())
      .get('/api/v1/leaves/me')
      .query({ limit: 1 })
      .set('Authorization', `Bearer ${me.token}`)
      .expect(200);
    expect(paged.body).toMatchObject({ totalCount: 3, totalPages: 3 });
    expect((paged.body as PageBody).items).toHaveLength(1);

    await request(app.getHttpServer())
      .get('/api/v1/leaves/me')
      .query({ year: 'abc' })
      .set('Authorization', `Bearer ${me.token}`)
      .expect(400);
  });

  it('shouldListOwnLeavesOnlyWithYearAndStatusFilter', async () => {
    const me = await createUser();
    const other = await createUser();
    const mine2026 = await insertLeave(prisma, {
      userId: me.id,
      approverId: other.id,
      status: 'PENDING',
      startDate: '2026-11-20',
    });
    await insertLeave(prisma, {
      userId: me.id,
      approverId: other.id,
      status: 'APPROVED',
      startDate: '2025-03-03',
    });
    await insertLeave(prisma, {
      userId: other.id,
      approverId: me.id,
      status: 'PENDING',
      startDate: '2026-11-20',
    });

    const all = await request(app.getHttpServer())
      .get('/api/v1/leaves/me')
      .set('Authorization', `Bearer ${me.token}`)
      .expect(200);
    expect((all.body as PageBody).totalCount).toBe(2);

    const filtered = await request(app.getHttpServer())
      .get('/api/v1/leaves/me')
      .query({ year: 2026, status: 'PENDING' })
      .set('Authorization', `Bearer ${me.token}`)
      .expect(200);
    expect((filtered.body as PageBody).items.map((item) => item.id)).toEqual([mine2026.id]);

    await request(app.getHttpServer())
      .get('/api/v1/leaves/me')
      .query({ year: 1999 })
      .set('Authorization', `Bearer ${me.token}`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/leaves/me')
      .query({ status: 'X' })
      .set('Authorization', `Bearer ${me.token}`)
      .expect(400);
  });

  it('shouldFilterOwnLeavesByMultipleStatusesAndLeaveTypes', async () => {
    const me = await createUser();
    const other = await createUser();
    const base = { userId: me.id, approverId: other.id, startDate: '2026-11-20' };
    const pendingAnnual = await insertLeave(prisma, { ...base, status: 'PENDING' });
    const approvedHalfAm = await insertLeave(prisma, {
      ...base,
      status: 'APPROVED',
      leaveType: 'HALF_AM',
      days: 0.5,
    });
    const approvedHalfPm = await insertLeave(prisma, {
      ...base,
      status: 'APPROVED',
      leaveType: 'HALF_PM',
      days: 0.5,
    });
    const rejectedHalfAm = await insertLeave(prisma, {
      ...base,
      status: 'REJECTED',
      leaveType: 'HALF_AM',
      days: 0.5,
    });
    await insertLeave(prisma, { ...base, status: 'CANCELLED', leaveType: 'SPECIAL' });

    const idsOf = async (query: Record<string, string>): Promise<string[]> => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leaves/me')
        .query(query)
        .set('Authorization', `Bearer ${me.token}`)
        .expect(200);
      return (response.body as PageBody).items.map((item) => item.id).sort();
    };

    // status 複数(OR)・重複は 1 つとして扱う
    expect(await idsOf({ status: 'PENDING,APPROVED,PENDING' })).toEqual(
      [pendingAnnual.id, approvedHalfAm.id, approvedHalfPm.id].sort(),
    );
    // leaveType 単一値(status 指定なしなので REJECTED 含む全状態)
    expect(await idsOf({ leaveType: 'HALF_AM' })).toEqual(
      [approvedHalfAm.id, rejectedHalfAm.id].sort(),
    );
    // leaveType 複数(OR)
    expect(await idsOf({ leaveType: 'HALF_AM,HALF_PM', status: 'APPROVED' })).toEqual(
      [approvedHalfAm.id, approvedHalfPm.id].sort(),
    );
    // status と leaveType は AND、year とも結合
    expect(
      await idsOf({ year: '2026', status: 'PENDING,APPROVED', leaveType: 'ANNUAL,HALF_PM' }),
    ).toEqual([pendingAnnual.id, approvedHalfPm.id].sort());
    // 単一値(後方互換)
    expect(await idsOf({ status: 'PENDING' })).toEqual([pendingAnnual.id]);
    // 指定なしは全件
    expect(await idsOf({})).toHaveLength(5);
  });

  it('shouldTreatDuplicateStatusAsSingleAndExcludeOtherUsersLeaves', async () => {
    const me = await createUser();
    const other = await createUser();
    const mine = await insertLeave(prisma, {
      userId: me.id,
      approverId: other.id,
      startDate: '2026-11-21',
      status: 'APPROVED',
      leaveType: 'HALF_AM',
      days: 0.5,
    });
    await insertLeave(prisma, {
      userId: other.id,
      approverId: me.id,
      startDate: '2026-11-21',
      status: 'APPROVED',
      leaveType: 'HALF_AM',
      days: 0.5,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/leaves/me')
      .query({ status: 'APPROVED,APPROVED', leaveType: 'HALF_AM' })
      .set('Authorization', `Bearer ${me.token}`)
      .expect(200);
    const body = response.body as PageBody;
    expect(body.totalCount).toBe(1);
    expect(body.items.map((item) => item.id)).toEqual([mine.id]);
  });

  it('shouldRejectInvalidStatusOrLeaveTypeListForOwnLeaves', async () => {
    const me = await createUser();
    for (const query of [
      { status: '' },
      { status: 'PENDING,' },
      { status: 'PENDING,X' },
      { leaveType: '' },
      { leaveType: 'ANNUAL,' },
      { leaveType: 'ANNUAL,UNKNOWN' },
    ]) {
      const response = await request(app.getHttpServer())
        .get('/api/v1/leaves/me')
        .query(query)
        .set('Authorization', `Bearer ${me.token}`)
        .expect(400);
      expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
      const fields = (response.body as { details: { field: string }[] }).details.map(
        (d) => d.field,
      );
      // 配列要素の位置が付く(例: status.1)。他の項目名は含まれない
      expect(fields).toHaveLength(1);
      expect(fields[0]?.split('.')[0]).toBe(Object.keys(query)[0]);
    }
  });

  describe('取消', () => {
    function cancel(user: TestUser, id: string): request.Test {
      return request(app.getHttpServer())
        .patch(`/api/v1/leaves/${id}/cancel`)
        .set('Authorization', `Bearer ${user.token}`);
    }

    it('shouldCancelPendingLeaveWhenApplicant', async () => {
      const me = await createUser();
      const approver = await createUser();
      const leave = await insertLeave(prisma, {
        userId: me.id,
        approverId: approver.id,
        status: 'PENDING',
      });
      const response = await cancel(me, leave.id).expect(200);
      const body = response.body as LeaveBody;
      expect(body.status).toBe('CANCELLED');
      expect(body.processedBy?.id).toBe(me.id);
    });

    it('shouldCancelAutoApprovedFutureLeaveButNotStartedOne', async () => {
      const me = await createUser({ approvalRequired: false });
      const future = await insertLeave(prisma, {
        userId: me.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-11-10',
      });
      const today = await insertLeave(prisma, {
        userId: me.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-11-09',
      });
      await cancel(me, future.id).expect(200);
      const response = await cancel(me, today.id).expect(409);
      expect((response.body as ErrorBody).code).toBe('NOT_CANCELLABLE');
    });

    it('shouldReturn409WhenApprovedByApproverOrAlreadyCancelled', async () => {
      const me = await createUser();
      const approver = await createUser();
      const approved = await insertLeave(prisma, {
        userId: me.id,
        approverId: approver.id,
        status: 'APPROVED',
        startDate: '2026-11-20',
      });
      const cancelled = await insertLeave(prisma, {
        userId: me.id,
        approverId: approver.id,
        status: 'CANCELLED',
      });
      const rejected = await insertLeave(prisma, {
        userId: me.id,
        approverId: approver.id,
        status: 'REJECTED',
        startDate: '2026-11-21',
      });
      await cancel(me, approved.id).expect(409);
      await cancel(me, cancelled.id).expect(409);
      await cancel(me, rejected.id).expect(409);
    });

    it('shouldDecreasePendingDaysOnCancel', async () => {
      const me = await createUser();
      const approver = await createUser();
      await insertLeaveGrant(prisma, { userId: me.id, year: 2026, grantedDays: 10 });
      const leave = await insertLeave(prisma, {
        userId: me.id,
        approverId: approver.id,
        status: 'PENDING',
        startDate: '2026-11-20',
        days: 2,
      });
      const before = await getBalance(me);
      expect(before).toMatchObject({ pendingDays: 2, remainingDays: 8 });

      await cancel(me, leave.id).expect(200);
      const after = await getBalance(me);
      expect(after).toMatchObject({ pendingDays: 0, remainingDays: 10 });
    });

    it('shouldReturn403WhenNotApplicantAndAdminToo', async () => {
      const me = await createUser();
      const admin = await tracker.createUser({ role: 'ADMIN', mustChangePassword: false });
      const adminUser: TestUser = { id: admin.id, empId: admin.empId, token: await sign(admin.id) };
      const leave = await insertLeave(prisma, {
        userId: me.id,
        approverId: admin.id,
        status: 'PENDING',
      });
      await cancel(adminUser, leave.id).expect(403);
    });

    it('shouldReturn404WhenLeaveMissingOrIdInvalid', async () => {
      const me = await createUser();
      await cancel(me, '00000000-0000-4000-8000-000000000000').expect(404);
      await cancel(me, 'not-a-uuid').expect(404);
    });
  });

  describe('追加ケース(計画 IT-LV / IT-CAN)', () => {
    function cancel(user: TestUser, id: string): request.Test {
      return request(app.getHttpServer())
        .patch(`/api/v1/leaves/${id}/cancel`)
        .set('Authorization', `Bearer ${user.token}`);
    }

    it('shouldSetProcessedAtToCreatedAtWhenAutoApproved', async () => {
      const applicant = await createUser({ approvalRequired: false });
      const response = await post(applicant, {
        leaveType: 'SPECIAL',
        ...period,
        reason: '私用',
      }).expect(201);
      const body = response.body as LeaveBody & { createdAt: string; processedAt: string };
      expect(body.processedAt).toBe(body.createdAt);
    });

    it('shouldReturn400WhenApproverDoesNotExist', async () => {
      const applicant = await createUser();
      const response = await post(applicant, {
        leaveType: 'SPECIAL',
        ...period,
        reason: '私用',
        approverId: '00000000-0000-4000-8000-000000000000',
      }).expect(400);
      expect((response.body as ErrorBody).code).toBe('INVALID_APPROVER');
    });

    it('shouldValidateReasonLengthAndAcceptTrimmed500Chars', async () => {
      const applicant = await createUser({ approvalRequired: false });
      const tooLong = await post(applicant, {
        leaveType: 'SPECIAL',
        ...period,
        reason: 'あ'.repeat(501),
      }).expect(400);
      expect((tooLong.body as ErrorBody).code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(tooLong.body)).toContain('reason');

      const reason = `  ${'あ'.repeat(500)}  `;
      const ok = await post(applicant, { leaveType: 'SPECIAL', ...period, reason }).expect(201);
      expect((ok.body as LeaveBody).reason).toBe('あ'.repeat(500));
    });

    it('shouldReturn422WhenBalanceExceededByOneDayOrAllowExactBalance', async () => {
      const applicant = await createUser();
      const approver = await createUser();
      await insertLeaveGrant(prisma, { userId: applicant.id, year: 2026, grantedDays: 2 });
      // 11-10〜11-12 は平日 3 日
      const over = await post(applicant, {
        leaveType: 'ANNUAL',
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        reason: '私用',
        approverId: approver.id,
      }).expect(422);
      expect((over.body as ErrorBody).code).toBe('INSUFFICIENT_LEAVE_BALANCE');

      await post(applicant, {
        leaveType: 'ANNUAL',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
        reason: '私用',
        approverId: approver.id,
      }).expect(201);
    });

    it('shouldAllowSpecialTwentyDaysWithoutGrantAndRejectAnnualWithoutGrant', async () => {
      const applicant = await createUser();
      const approver = await createUser();
      // 2026-11-09〜12-04 の平日は 20 日
      const special = await post(applicant, {
        leaveType: 'SPECIAL',
        startDate: '2026-11-09',
        endDate: '2026-12-04',
        reason: '私用',
        approverId: approver.id,
      }).expect(201);
      expect((special.body as LeaveBody).days).toBe(20);

      const annual = await post(applicant, {
        leaveType: 'ANNUAL',
        startDate: '2026-12-07',
        endDate: '2026-12-08',
        reason: '私用',
        approverId: approver.id,
      }).expect(422);
      expect((annual.body as ErrorBody).code).toBe('INSUFFICIENT_LEAVE_BALANCE');

      await post(applicant, {
        leaveType: 'OTHER',
        startDate: '2026-12-09',
        endDate: '2026-12-10',
        reason: '私用',
        approverId: approver.id,
      }).expect(201);
    });

    it('shouldUseStartDateYearForBalance', async () => {
      const applicant = await createUser();
      const approver = await createUser();
      await insertLeaveGrant(prisma, { userId: applicant.id, year: 2027, grantedDays: 5 });
      await post(applicant, {
        leaveType: 'ANNUAL',
        ...period,
        reason: '私用',
        approverId: approver.id,
      }).expect(422);
      await post(applicant, {
        leaveType: 'ANNUAL',
        startDate: '2027-01-04',
        endDate: '2027-01-04',
        reason: '私用',
        approverId: approver.id,
      }).expect(201);
    });

    it('shouldReturn409WhenOverlappingPendingOrApproved', async () => {
      const applicant = await createUser();
      const approver = await createUser();
      await insertLeaveGrant(prisma, { userId: applicant.id, year: 2026, grantedDays: 10 });
      await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'PENDING',
        startDate: '2026-11-20',
      });
      await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'APPROVED',
        startDate: '2026-11-25',
      });
      const pending = await post(applicant, {
        leaveType: 'ANNUAL',
        startDate: '2026-11-20',
        endDate: '2026-11-20',
        reason: '私用',
        approverId: approver.id,
      }).expect(409);
      expect((pending.body as ErrorBody).code).toBe('LEAVE_CONFLICT');
      await post(applicant, {
        leaveType: 'ANNUAL',
        startDate: '2026-11-25',
        endDate: '2026-11-25',
        reason: '私用',
        approverId: approver.id,
      }).expect(409);
    });

    it('shouldAllowOverlapWhenExistingRejectedOrCancelled', async () => {
      const applicant = await createUser({ approvalRequired: false });
      const approver = await createUser();
      await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'REJECTED',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
      });
      await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'CANCELLED',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
      });
      await post(applicant, { leaveType: 'SPECIAL', ...period, reason: '私用' }).expect(201);
    });

    it('shouldReturn409WhenHalfDayAfterFullDayOnSameDate', async () => {
      const applicant = await createUser({ approvalRequired: false });
      await insertLeaveGrant(prisma, { userId: applicant.id, year: 2026, grantedDays: 10 });
      await post(applicant, {
        leaveType: 'ANNUAL',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        reason: '私用',
      }).expect(201);
      const response = await post(applicant, {
        leaveType: 'HALF_PM',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        reason: '私用',
      }).expect(409);
      expect((response.body as ErrorBody).code).toBe('LEAVE_CONFLICT');
    });

    it('shouldAllowSameDateWhenAnotherUserHasLeave', async () => {
      const applicant = await createUser({ approvalRequired: false });
      const other = await createUser();
      await insertLeave(prisma, {
        userId: other.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-11-10',
      });
      await post(applicant, { leaveType: 'SPECIAL', ...period, reason: '私用' }).expect(201);
    });

    it('shouldAllowOnlyOneWhenSameUserSubmitsConcurrentlyOverBalance', async () => {
      const applicant = await createUser({ approvalRequired: false });
      await insertLeaveGrant(prisma, { userId: applicant.id, year: 2026, grantedDays: 1 });
      const statuses = await Promise.all([
        post(applicant, {
          leaveType: 'ANNUAL',
          startDate: '2026-11-10',
          endDate: '2026-11-10',
          reason: '私用',
        }).then((response) => response.status),
        post(applicant, {
          leaveType: 'ANNUAL',
          startDate: '2026-11-11',
          endDate: '2026-11-11',
          reason: '私用',
        }).then((response) => response.status),
      ]);
      expect(statuses.sort()).toEqual([201, 422]);
    });

    it('shouldAllowOnlyOneWhenSameDateSubmittedConcurrently', async () => {
      const applicant = await createUser({ approvalRequired: false });
      const statuses = await Promise.all([
        post(applicant, {
          leaveType: 'SPECIAL',
          startDate: '2026-11-10',
          endDate: '2026-11-10',
          reason: '私用',
        }).then((response) => response.status),
        post(applicant, {
          leaveType: 'SPECIAL',
          startDate: '2026-11-10',
          endDate: '2026-11-10',
          reason: '私用',
        }).then((response) => response.status),
      ]);
      expect(statuses.sort()).toEqual([201, 409]);
    });

    it('shouldAllowAdminToApply', async () => {
      const admin = await tracker.createUser({
        role: 'ADMIN',
        mustChangePassword: false,
        approvalRequired: false,
      });
      const adminUser: TestUser = { id: admin.id, empId: admin.empId, token: await sign(admin.id) };
      await post(adminUser, { leaveType: 'SPECIAL', ...period, reason: '私用' }).expect(201);
    });

    it('shouldAllowPastStartDate', async () => {
      const applicant = await createUser({ approvalRequired: false });
      await post(applicant, {
        leaveType: 'SPECIAL',
        startDate: '2026-11-02',
        endDate: '2026-11-03',
        reason: '私用',
      }).expect(201);
    });

    it('shouldReturnApproverSummaryFieldsOnly', async () => {
      const me = await createUser();
      const candidate = await createUser({ name: '候補フィールド確認' });
      const response = await request(app.getHttpServer())
        .get('/api/v1/leaves/approvers')
        .query({ keyword: candidate.empId })
        .set('Authorization', `Bearer ${me.token}`)
        .expect(200);
      const item = (response.body as Record<string, unknown>[]).find(
        (row) => row.id === candidate.id,
      );
      expect(item).toBeDefined();
      expect(Object.keys(item ?? {}).sort()).toEqual(['departmentName', 'empId', 'id', 'name']);
    });

    it('shouldKeepApproverOnCancelAndReturn403ForNonApplicant', async () => {
      const me = await createUser();
      const approver = await createUser();
      const other = await createUser();
      const leave = await insertLeave(prisma, {
        userId: me.id,
        approverId: approver.id,
        status: 'PENDING',
      });
      await cancel(other, leave.id).expect(403);
      const response = await cancel(me, leave.id).expect(200);
      expect((response.body as LeaveBody).approver?.id).toBe(approver.id);
    });

    it('shouldAllowOnlyOneWhenCancelledConcurrently', async () => {
      const me = await createUser();
      const approver = await createUser();
      const leave = await insertLeave(prisma, {
        userId: me.id,
        approverId: approver.id,
        status: 'PENDING',
      });
      const statuses = await Promise.all([
        cancel(me, leave.id).then((response) => response.status),
        cancel(me, leave.id).then((response) => response.status),
      ]);
      expect(statuses.sort()).toEqual([200, 409]);
    });

    it('shouldAllowOnlyOneWhenCancelledAndApprovedConcurrently', async () => {
      const me = await createUser();
      const approver = await createUser();
      const leave = await insertLeave(prisma, {
        userId: me.id,
        approverId: approver.id,
        status: 'PENDING',
      });
      const approveResponses = await Promise.all([
        cancel(me, leave.id).then((response) => response.status),
        request(app.getHttpServer())
          .patch(`/api/v1/leaves/${leave.id}/approve`)
          .set('Authorization', `Bearer ${approver.token}`)
          .then((response) => response.status),
      ]);
      const successCount = approveResponses.filter((status) => status === 200).length;
      expect(successCount).toBe(1);
      const after = await prisma.leave.findUniqueOrThrow({ where: { id: leave.id } });
      expect(['CANCELLED', 'APPROVED']).toContain(after.status);
    });

    it('shouldFreeBalanceAndAllowReapplyAfterCancel', async () => {
      const applicant = await createUser();
      const approver = await createUser();
      await insertLeaveGrant(prisma, { userId: applicant.id, year: 2026, grantedDays: 1 });
      const first = await post(applicant, {
        leaveType: 'ANNUAL',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        reason: '私用',
        approverId: approver.id,
      }).expect(201);
      await cancel(applicant, (first.body as LeaveBody).id).expect(200);
      await post(applicant, {
        leaveType: 'ANNUAL',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        reason: '私用',
        approverId: approver.id,
      }).expect(201);
    });

    it('shouldReturn403WhenPasswordChangeRequired', async () => {
      const user = await tracker.createUser({ mustChangePassword: true });
      const token = await sign(user.id);
      const leave = await insertLeave(prisma, {
        userId: user.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-11-20',
      });
      const auth = { Authorization: `Bearer ${token}` };
      const base = request(app.getHttpServer());
      for (const response of [
        await base.post('/api/v1/leaves').set(auth).send({}),
        await base.get('/api/v1/leaves/approvers').set(auth),
        await base.get('/api/v1/leaves/me').set(auth),
        await base.patch(`/api/v1/leaves/${leave.id}/cancel`).set(auth),
      ]) {
        expect(response.status).toBe(403);
        expect((response.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
      }
    });

    it('shouldReturn401ForApproversCancelAndMineWithoutToken', async () => {
      const base = request(app.getHttpServer());
      await base.get('/api/v1/leaves/approvers').expect(401);
      await base.get('/api/v1/leaves/me').expect(401);
      await base.patch('/api/v1/leaves/00000000-0000-4000-8000-000000000000/cancel').expect(401);
    });
  });

  it('shouldReturn401WhenNoToken', async () => {
    await request(app.getHttpServer()).post('/api/v1/leaves').send({}).expect(401);
    await request(app.getHttpServer()).get('/api/v1/leaves/me').expect(401);
  });
});
