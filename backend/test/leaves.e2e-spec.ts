// 休暇 API(残日数・承認待ち一覧・詳細・承認・却下)の e2e。Clock を固定し、実際のテスト用 DB を使う。
// 休暇申請 API は未実装のため、休暇・付与は Prisma で直接 INSERT する。作った ADMIN は afterAll で削除する
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker } from './db/db-helpers.js';
import {
  createTestApp,
  createTokenSigner,
  FixedClock,
  insertLeave,
  insertLeaveGrant,
} from './e2e-helpers.js';

interface UserSummaryBody {
  id: string;
  name: string;
  empId: string;
  departmentName: string | null;
}
interface LeaveBody {
  id: string;
  user: UserSummaryBody;
  approver: UserSummaryBody | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  autoApproved: boolean;
  processedBy: UserSummaryBody | null;
  processedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
}
interface PageBody {
  items: LeaveBody[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}
interface ErrorBody {
  code?: string;
  details?: { field: string }[];
}

const OFFSET_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;

interface TestUser {
  id: string;
  token: string;
}

describe('休暇 API(e2e)', () => {
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
    overrides: { role?: 'ADMIN' | 'EMPLOYEE'; mustChangePassword?: boolean } = {},
  ): Promise<TestUser> {
    const department = await tracker.createDepartment();
    const user = await tracker.createUser({
      departmentId: department.id,
      mustChangePassword: false,
      ...overrides,
    });
    return { id: user.id, token: await sign(user.id) };
  }

  function get(path: string, token: string): request.Test {
    return request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set('Authorization', `Bearer ${token}`);
  }
  function approve(id: string, token: string): request.Test {
    return request(app.getHttpServer())
      .patch(`/api/v1/leaves/${id}/approve`)
      .set('Authorization', `Bearer ${token}`);
  }
  function reject(id: string, token: string, body: unknown): request.Test {
    return request(app.getHttpServer())
      .patch(`/api/v1/leaves/${id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);
  }

  describe('GET /leaves/balance', () => {
    it('shouldCalculateBalanceFromGrantApprovedAndPending', async () => {
      const user = await createUser();
      const approver = await createUser();
      await insertLeaveGrant(prisma, { userId: user.id, year: 2026, grantedDays: 15 });
      await insertLeave(prisma, {
        userId: user.id,
        approverId: approver.id,
        status: 'APPROVED',
        startDate: '2026-03-02',
        endDate: '2026-03-03',
        days: 2,
      });
      await insertLeave(prisma, {
        userId: user.id,
        approverId: approver.id,
        status: 'APPROVED',
        leaveType: 'HALF_AM',
        startDate: '2026-04-01',
        days: 0.5,
      });
      await insertLeave(prisma, {
        userId: user.id,
        approverId: approver.id,
        status: 'PENDING',
        startDate: '2026-12-01',
        days: 1,
      });
      const res = await get('/leaves/balance', user.token).expect(200);
      expect(res.body).toEqual({
        year: 2026,
        grantedDays: 15,
        approvedDays: 2.5,
        pendingDays: 1,
        remainingDays: 11.5,
      });
    });

    it('shouldReturnZeroGrantedWhenGrantIsNotRegistered', async () => {
      const user = await createUser();
      const res = await get('/leaves/balance', user.token).expect(200);
      expect(res.body).toEqual({
        year: 2026,
        grantedDays: 0,
        approvedDays: 0,
        pendingDays: 0,
        remainingDays: 0,
      });
    });

    it('shouldExcludeNonDeductibleStatusesTypesAndOtherYears', async () => {
      const user = await createUser();
      const approver = await createUser();
      await insertLeaveGrant(prisma, { userId: user.id, year: 2026, grantedDays: 10 });
      await insertLeave(prisma, { userId: user.id, approverId: approver.id, status: 'REJECTED' });
      await insertLeave(prisma, { userId: user.id, approverId: approver.id, status: 'CANCELLED' });
      await insertLeave(prisma, {
        userId: user.id,
        approverId: approver.id,
        status: 'APPROVED',
        leaveType: 'SPECIAL',
      });
      await insertLeave(prisma, {
        userId: user.id,
        approverId: approver.id,
        status: 'PENDING',
        leaveType: 'OTHER',
      });
      await insertLeave(prisma, {
        userId: user.id,
        approverId: approver.id,
        status: 'APPROVED',
        startDate: '2025-12-30',
        endDate: '2025-12-31',
        days: 2,
      });
      const res = await get('/leaves/balance', user.token).expect(200);
      expect(res.body).toEqual({
        year: 2026,
        grantedDays: 10,
        approvedDays: 0,
        pendingDays: 0,
        remainingDays: 10,
      });

      const res2025 = await get('/leaves/balance?year=2025', user.token).expect(200);
      expect(res2025.body).toEqual({
        year: 2025,
        grantedDays: 0,
        approvedDays: 2,
        pendingDays: 0,
        remainingDays: -2,
      });
    });

    it.each(['abc', '1999', '2101', '2026.5'])(
      'shouldReturn400WhenYearIsInvalid(%s)',
      async (year) => {
        const user = await createUser();
        const res = await get(`/leaves/balance?year=${year}`, user.token).expect(400);
        expect((res.body as ErrorBody).code).toBe('VALIDATION_ERROR');
      },
    );
  });

  describe('GET /leaves/pending-approval', () => {
    it('shouldReturnOnlyPendingAssignedToMe', async () => {
      const me = await createUser();
      const other = await createUser();
      const applicant = await createUser();
      const mine = await Promise.all(
        [0, 1, 2].map(() =>
          insertLeave(prisma, { userId: applicant.id, approverId: me.id, status: 'PENDING' }),
        ),
      );
      await insertLeave(prisma, { userId: applicant.id, approverId: other.id, status: 'PENDING' });
      await insertLeave(prisma, { userId: applicant.id, approverId: me.id, status: 'APPROVED' });

      const res = await get('/leaves/pending-approval?scope=mine', me.token).expect(200);
      const body = res.body as PageBody;
      expect(body.totalCount).toBe(3);
      expect(body.items.map((i) => i.id).sort()).toEqual(mine.map((l) => l.id).sort());
      expect(body.items.every((i) => i.status === 'PENDING' && i.approver?.id === me.id)).toBe(
        true,
      );

      // scope 省略時は mine
      const defaultRes = await get('/leaves/pending-approval', me.token).expect(200);
      expect((defaultRes.body as PageBody).totalCount).toBe(3);
    });

    it('shouldSortByCreatedAtDescAndPaginate', async () => {
      const me = await createUser();
      const applicant = await createUser();
      const base = Date.parse('2026-11-01T00:00:00Z');
      const created = [];
      for (let i = 0; i < 6; i++) {
        created.push(
          await insertLeave(prisma, {
            userId: applicant.id,
            approverId: me.id,
            status: 'PENDING',
            createdAt: new Date(base + i * 60000),
          }),
        );
      }
      // 同時刻の 2 件(id DESC で並ぶ)
      const tieA = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: me.id,
        status: 'PENDING',
        createdAt: new Date(base + 10 * 60000),
      });
      const tieB = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: me.id,
        status: 'PENDING',
        createdAt: new Date(base + 10 * 60000),
      });
      const tieIds = [tieA.id, tieB.id].sort().reverse();

      const res = await get('/leaves/pending-approval?scope=mine&limit=5', me.token).expect(200);
      const body = res.body as PageBody;
      expect(Object.keys(body).sort()).toEqual(
        ['items', 'limit', 'page', 'totalCount', 'totalPages'].sort(),
      );
      expect(body).toMatchObject({ page: 1, limit: 5, totalCount: 8, totalPages: 2 });
      expect(body.items.map((i) => i.id)).toEqual([
        ...tieIds,
        created[5].id,
        created[4].id,
        created[3].id,
      ]);

      const page2 = await get(
        '/leaves/pending-approval?scope=mine&limit=5&page=2',
        me.token,
      ).expect(200);
      expect((page2.body as PageBody).items.map((i) => i.id)).toEqual([
        created[2].id,
        created[1].id,
        created[0].id,
      ]);
    });

    it('shouldReturn403WhenEmployeeRequestsScopeAll', async () => {
      const user = await createUser();
      const res = await get('/leaves/pending-approval?scope=all', user.token).expect(403);
      expect((res.body as ErrorBody).code).toBe('FORBIDDEN');
    });

    it('shouldReturnAllPendingExcludingAutoApprovedWhenAdminRequestsScopeAll', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const approverA = await createUser();
      const approverB = await createUser();
      const applicant = await createUser();
      const pendingA = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approverA.id,
        status: 'PENDING',
        createdAt: new Date('2099-01-01T00:00:00Z'),
      });
      const pendingB = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approverB.id,
        status: 'PENDING',
        createdAt: new Date('2099-01-01T00:00:01Z'),
      });
      const autoApproved = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: null,
        status: 'APPROVED',
        processedBy: applicant.id,
        createdAt: new Date('2099-01-01T00:00:02Z'),
      });

      const res = await get('/leaves/pending-approval?scope=all&limit=100', admin.token).expect(
        200,
      );
      const body = res.body as PageBody;
      const ids = body.items.map((i) => i.id);
      expect(ids).toContain(pendingA.id);
      expect(ids).toContain(pendingB.id);
      expect(ids).not.toContain(autoApproved.id);
      expect(body.items.every((i) => i.status === 'PENDING')).toBe(true);
      expect(body.totalCount).toBe(await prisma.leave.count({ where: { status: 'PENDING' } }));
    });

    it.each(['scope=invalid', 'limit=101', 'limit=0', 'page=0'])(
      'shouldReturn400WhenQueryIsInvalid(%s)',
      async (query) => {
        const user = await createUser();
        const res = await get(`/leaves/pending-approval?${query}`, user.token).expect(400);
        expect((res.body as ErrorBody).code).toBe('VALIDATION_ERROR');
      },
    );

    it('shouldReturnEmptyPageWhenNothingAssigned', async () => {
      const user = await createUser();
      const res = await get('/leaves/pending-approval?scope=mine', user.token).expect(200);
      expect(res.body).toEqual({ items: [], page: 1, limit: 20, totalCount: 0, totalPages: 0 });
    });
  });

  describe('GET /leaves/:id', () => {
    it('shouldReturnLeaveToApplicantApproverAndAdmin', async () => {
      const applicant = await createUser();
      const approver = await createUser();
      const admin = await createUser({ role: 'ADMIN' });
      const leave = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'PENDING',
        startDate: '2026-11-20',
        endDate: '2026-11-21',
        days: 2,
      });
      for (const viewer of [applicant, approver, admin]) {
        const res = await get(`/leaves/${leave.id}`, viewer.token).expect(200);
        const body = res.body as LeaveBody;
        expect(body).toMatchObject({
          id: leave.id,
          leaveType: 'ANNUAL',
          startDate: '2026-11-20',
          endDate: '2026-11-21',
          days: 2,
          status: 'PENDING',
          autoApproved: false,
          processedBy: null,
          processedAt: null,
          rejectReason: null,
        });
        expect(body.user.id).toBe(applicant.id);
        expect(Object.keys(body.user).sort()).toEqual(
          ['departmentName', 'empId', 'id', 'name'].sort(),
        );
        expect(body.approver?.id).toBe(approver.id);
        expect(body.createdAt).toMatch(OFFSET_PATTERN);
      }
    });

    it('shouldMarkAutoApprovedWhenApproverIsNull', async () => {
      const applicant = await createUser();
      const leave = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: null,
        status: 'APPROVED',
        processedBy: applicant.id,
      });
      const res = await get(`/leaves/${leave.id}`, applicant.token).expect(200);
      const body = res.body as LeaveBody;
      expect(body.autoApproved).toBe(true);
      expect(body.approver).toBeNull();
      expect(body.processedBy?.id).toBe(applicant.id);
      expect(body.processedAt).toMatch(OFFSET_PATTERN);
    });

    it('shouldReturn403ToUnrelatedUser', async () => {
      const applicant = await createUser();
      const approver = await createUser();
      const stranger = await createUser();
      const leave = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'PENDING',
      });
      await get(`/leaves/${leave.id}`, stranger.token).expect(403);
    });

    it.each([crypto.randomUUID(), 'not-a-uuid'])('shouldReturn404(%s)', async (id) => {
      const user = await createUser();
      const res = await get(`/leaves/${id}`, user.token).expect(404);
      expect((res.body as ErrorBody).code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /leaves/:id/approve', () => {
    async function setupPending(): Promise<{
      applicant: TestUser;
      approver: TestUser;
      leaveId: string;
    }> {
      const applicant = await createUser();
      const approver = await createUser();
      const leave = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'PENDING',
      });
      return { applicant, approver, leaveId: leave.id };
    }

    it('shouldApproveByAssignedApprover', async () => {
      const { approver, leaveId } = await setupPending();
      clock.set('2026-11-09T10:30:00+09:00');
      const res = await approve(leaveId, approver.token).expect(200);
      const body = res.body as LeaveBody;
      expect(body.status).toBe('APPROVED');
      expect(body.processedBy?.id).toBe(approver.id);
      expect(body.processedAt).toBe('2026-11-09T10:30:00+09:00');
      const row = await prisma.leave.findUniqueOrThrow({ where: { id: leaveId } });
      expect(row.status).toBe('APPROVED');
      expect(row.processedBy).toBe(approver.id);
      expect(row.processedAt?.toISOString()).toBe('2026-11-09T01:30:00.000Z');
    });

    it('shouldReturn403WhenUnrelatedUserApproves', async () => {
      const { leaveId } = await setupPending();
      const stranger = await createUser();
      await approve(leaveId, stranger.token).expect(403);
      const row = await prisma.leave.findUniqueOrThrow({ where: { id: leaveId } });
      expect(row.status).toBe('PENDING');
    });

    it('shouldReturn403WhenApplicantApprovesOwnLeaveEvenAsAdmin', async () => {
      const { applicant, leaveId } = await setupPending();
      await approve(leaveId, applicant.token).expect(403);

      const adminApplicant = await createUser({ role: 'ADMIN' });
      const approver = await createUser();
      const adminLeave = await insertLeave(prisma, {
        userId: adminApplicant.id,
        approverId: approver.id,
        status: 'PENDING',
      });
      await approve(adminLeave.id, adminApplicant.token).expect(403);
      const row = await prisma.leave.findUniqueOrThrow({ where: { id: adminLeave.id } });
      expect(row.status).toBe('PENDING');
    });

    it('shouldApproveByAdminAsProxy', async () => {
      const { approver, leaveId } = await setupPending();
      const admin = await createUser({ role: 'ADMIN' });
      const res = await approve(leaveId, admin.token).expect(200);
      const body = res.body as LeaveBody;
      expect(body.status).toBe('APPROVED');
      expect(body.processedBy?.id).toBe(admin.id);
      expect(body.approver?.id).toBe(approver.id);
    });

    it('shouldReturn409WhenAlreadyApproved', async () => {
      const { approver, leaveId } = await setupPending();
      await approve(leaveId, approver.token).expect(200);
      const res = await approve(leaveId, approver.token).expect(409);
      expect((res.body as ErrorBody).code).toBe('ALREADY_PROCESSED');
    });

    it('shouldReturn409WhenAdminApprovesAutoApprovedLeave', async () => {
      const applicant = await createUser();
      const admin = await createUser({ role: 'ADMIN' });
      const leave = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: null,
        status: 'APPROVED',
        processedBy: applicant.id,
      });
      const res = await approve(leave.id, admin.token).expect(409);
      expect((res.body as ErrorBody).code).toBe('ALREADY_PROCESSED');
    });

    it('shouldAllowOnlyOneOfConcurrentApprovals', async () => {
      const { approver, leaveId } = await setupPending();
      const admin = await createUser({ role: 'ADMIN' });
      const results = await Promise.all([
        approve(leaveId, approver.token),
        approve(leaveId, admin.token),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const conflict = results.find((r) => r.status === 409);
      expect((conflict?.body as ErrorBody).code).toBe('ALREADY_PROCESSED');
      const winner = results.find((r) => r.status === 200);
      const row = await prisma.leave.findUniqueOrThrow({ where: { id: leaveId } });
      expect(row.processedBy).toBe((winner?.body as LeaveBody).processedBy?.id);
    });

    it.each([crypto.randomUUID(), 'not-a-uuid'])(
      'shouldReturn404WhenLeaveIsMissing(%s)',
      async (id) => {
        const admin = await createUser({ role: 'ADMIN' });
        await approve(id, admin.token).expect(404);
      },
    );
  });

  describe('PATCH /leaves/:id/reject', () => {
    async function setupPending(): Promise<{ approver: TestUser; leaveId: string }> {
      const applicant = await createUser();
      const approver = await createUser();
      const leave = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'PENDING',
      });
      return { approver, leaveId: leave.id };
    }

    it.each([
      ['missing', {}],
      ['empty', { rejectReason: '' }],
      ['whitespace', { rejectReason: '   ' }],
      ['501 chars', { rejectReason: 'あ'.repeat(501) }],
    ])('shouldReturn400WhenRejectReasonIsInvalid(%s)', async (_label, body) => {
      const { approver, leaveId } = await setupPending();
      const res = await reject(leaveId, approver.token, body).expect(400);
      const error = res.body as ErrorBody;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details?.map((d) => d.field)).toContain('rejectReason');
      const row = await prisma.leave.findUniqueOrThrow({ where: { id: leaveId } });
      expect(row.status).toBe('PENDING');
    });

    it('shouldRejectWithTrimmedReasonAndThenBlockApproval', async () => {
      const { approver, leaveId } = await setupPending();
      const reason = 'あ'.repeat(500);
      const res = await reject(leaveId, approver.token, { rejectReason: `  ${reason}  ` }).expect(
        200,
      );
      const body = res.body as LeaveBody;
      expect(body.status).toBe('REJECTED');
      expect(body.rejectReason).toBe(reason);
      expect(body.processedBy?.id).toBe(approver.id);
      const row = await prisma.leave.findUniqueOrThrow({ where: { id: leaveId } });
      expect(row.rejectReason).toBe(reason);
      expect(row.processedAt).not.toBeNull();

      const again = await approve(leaveId, approver.token).expect(409);
      expect((again.body as ErrorBody).code).toBe('ALREADY_PROCESSED');
    });

    it('shouldReturn403WhenUnrelatedUserRejects', async () => {
      const { leaveId } = await setupPending();
      const stranger = await createUser();
      await reject(leaveId, stranger.token, { rejectReason: '理由' }).expect(403);
    });
  });

  describe('認証・パスワード変更', () => {
    const paths: [string, 'get' | 'patch', string][] = [
      ['balance', 'get', '/api/v1/leaves/balance'],
      ['pending-approval', 'get', '/api/v1/leaves/pending-approval'],
      ['detail', 'get', `/api/v1/leaves/${crypto.randomUUID()}`],
      ['approve', 'patch', `/api/v1/leaves/${crypto.randomUUID()}/approve`],
      ['reject', 'patch', `/api/v1/leaves/${crypto.randomUUID()}/reject`],
    ];

    it.each(paths)('shouldReturn401WithoutToken(%s)', async (_name, method, path) => {
      await request(app.getHttpServer())[method](path).expect(401);
    });

    it.each(paths)(
      'shouldReturn403PasswordChangeRequiredWhenMustChangePassword(%s)',
      async (_name, method, path) => {
        const user = await createUser({ mustChangePassword: true });
        const res = await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${user.token}`)
          .send({ rejectReason: '理由' })
          .expect(403);
        expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
      },
    );
  });
});
