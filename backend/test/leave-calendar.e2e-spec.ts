// 共有休暇カレンダー API(GET /leaves/calendar)と、承認一覧の status・履歴の申請日範囲の e2e。
// Clock を固定し、実際のテスト用 DB を使う。他テストのデータが混ざらないよう、このテストで作った部署で絞り込んで検証する
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker } from './db/db-helpers.js';
import { createTestApp, createTokenSigner, FixedClock, insertLeave } from './e2e-helpers.js';

interface CalendarBody {
  month: string;
  holidays: { date: string; name: string }[];
  items: Record<string, unknown>[];
}
interface PageBody {
  items: { id: string; status: string }[];
  totalCount: number;
}
interface ErrorBody {
  code?: string;
  details?: { field: string }[];
}

const CALENDAR = '/api/v1/leaves/calendar';
const PENDING_APPROVAL = '/api/v1/leaves/pending-approval';
const MY_LEAVES = '/api/v1/leaves/me';

describe('共有休暇カレンダー API(e2e)', () => {
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
    overrides: Parameters<TestDataTracker['createUser']>[0] = {},
  ): Promise<{ id: string; token: string; empId: string }> {
    const user = await tracker.createUser({ mustChangePassword: false, ...overrides });
    return { id: user.id, token: await sign(user.id), empId: user.empId };
  }

  function get(path: string, token: string, query: Record<string, string> = {}): request.Test {
    return request(app.getHttpServer())
      .get(path)
      .query(query)
      .set('Authorization', `Bearer ${token}`);
  }

  describe('GET /leaves/calendar', () => {
    it('shouldReturn401WithoutToken', async () => {
      await request(app.getHttpServer()).get(CALENDAR).expect(401);
    });

    it('shouldReturn403PasswordChangeRequiredWhenMustChangePassword', async () => {
      const user = await createUser({ mustChangePassword: true });
      const res = await get(CALENDAR, user.token).expect(403);
      expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
    });

    it.each([
      ['month', { month: '2026-13' }],
      ['month', { month: '1999-12' }],
      ['departmentId', { departmentId: 'not-a-uuid' }],
      ['name', { name: 'a'.repeat(101) }],
      ['empId', { empId: '1'.repeat(51) }],
    ])('shouldReturn400WhenInvalid_%s', async (field, query) => {
      const user = await createUser();
      const res = await get(CALENDAR, user.token, query).expect(400);
      const body = res.body as ErrorBody;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details?.[0]?.field).toBe(field);
    });

    it('shouldReturnOnlyPublicFieldsOfApprovedLeavesOfActiveUsersInMonth', async () => {
      clock.set('2026-11-09T09:00:00+09:00');
      const department = await tracker.createDepartment();
      const viewer = await createUser();
      const am = await createUser({ departmentId: department.id, name: '山田 AM' });
      const annual = await createUser({ departmentId: department.id, name: '山田 ANNUAL' });
      const pending = await createUser({ departmentId: department.id });
      const rejected = await createUser({ departmentId: department.id });
      const cancelled = await createUser({ departmentId: department.id });
      const inactive = await createUser({ departmentId: department.id, isActive: false });
      const otherMonth = await createUser({ departmentId: department.id });
      const straddle = await createUser({ departmentId: department.id, name: '山田 STRADDLE' });
      await insertLeave(prisma, {
        userId: am.id,
        approverId: null,
        status: 'APPROVED',
        leaveType: 'HALF_AM',
        days: 0.5,
        startDate: '2026-11-13',
      });
      await insertLeave(prisma, {
        userId: annual.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-11-13',
        endDate: '2026-11-15',
      });
      await insertLeave(prisma, {
        userId: straddle.id,
        approverId: null,
        status: 'APPROVED',
        leaveType: 'SPECIAL',
        startDate: '2026-10-30',
        endDate: '2026-11-02',
      });
      await insertLeave(prisma, { userId: pending.id, approverId: viewer.id, status: 'PENDING' });
      await insertLeave(prisma, { userId: rejected.id, approverId: viewer.id, status: 'REJECTED' });
      await insertLeave(prisma, { userId: cancelled.id, approverId: null, status: 'CANCELLED' });
      await insertLeave(prisma, { userId: inactive.id, approverId: null, status: 'APPROVED' });
      await insertLeave(prisma, {
        userId: otherMonth.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-12-01',
      });

      const res = await get(CALENDAR, viewer.token, {
        month: '2026-11',
        departmentId: department.id,
      }).expect(200);
      const body = res.body as CalendarBody;

      expect(body.month).toBe('2026-11');
      expect(body.holidays).toContainEqual({ date: '2026-11-03', name: '文化の日' });
      // 開始日の昇順(同日は社員番号順)なので、月またぎの休暇が先頭になる
      expect(body.items).toHaveLength(3);
      expect(body.items[0]?.name).toBe('山田 STRADDLE');
      for (const item of body.items) {
        expect(Object.keys(item).sort()).toEqual(
          ['category', 'departmentName', 'empId', 'endDate', 'halfDay', 'name', 'startDate'].sort(),
        );
      }
      const straddleItem = body.items[0];
      expect(straddleItem).toMatchObject({
        startDate: '2026-10-30',
        endDate: '2026-11-02',
        category: 'SPECIAL',
        halfDay: null,
        departmentName: department.name,
      });
      const amItem = body.items.find((item) => item.name === '山田 AM');
      expect(amItem).toMatchObject({ category: 'PAID', halfDay: 'AM' });
      const annualItem = body.items.find((item) => item.name === '山田 ANNUAL');
      expect(annualItem).toMatchObject({
        category: 'PAID',
        halfDay: null,
        startDate: '2026-11-13',
        endDate: '2026-11-15',
      });
    });

    it('shouldDefaultToCurrentTokyoMonthWhenMonthOmitted', async () => {
      clock.set('2026-11-30T20:00:00Z'); // 東京では 12/1
      const viewer = await createUser();
      const res = await get(CALENDAR, viewer.token).expect(200);
      expect((res.body as CalendarBody).month).toBe('2026-12');
    });

    it('shouldFilterByNameAndEmpIdWithAnd', async () => {
      clock.set('2026-11-09T09:00:00+09:00');
      const department = await tracker.createDepartment();
      const viewer = await createUser();
      const target = await createUser({ departmentId: department.id, name: 'Tanaka Hanako' });
      const other = await createUser({ departmentId: department.id, name: 'Suzuki Ichiro' });
      for (const user of [target, other]) {
        await insertLeave(prisma, {
          userId: user.id,
          approverId: null,
          status: 'APPROVED',
          startDate: '2026-11-20',
        });
      }

      const byName = await get(CALENDAR, viewer.token, {
        month: '2026-11',
        departmentId: department.id,
        name: '  tanaka ',
      }).expect(200);
      expect((byName.body as CalendarBody).items.map((item) => item.empId)).toEqual([target.empId]);

      const conflicting = await get(CALENDAR, viewer.token, {
        month: '2026-11',
        departmentId: department.id,
        name: 'tanaka',
        empId: other.empId,
      }).expect(200);
      expect((conflicting.body as CalendarBody).items).toEqual([]);
    });

    it('shouldSortByStartDateThenEmpIdThenEndDate', async () => {
      const department = await tracker.createDepartment();
      const viewer = await createUser();
      const first = await createUser({ departmentId: department.id });
      const second = await createUser({ departmentId: department.id });
      // 社員番号が小さい方を low とする(並び順の期待値を社員番号に依存させないため)
      const low = first.empId < second.empId ? first : second;
      const high = low === first ? second : first;
      // 期待順: 開始日が早い → 社員番号が小さい → 終了日が早い
      await insertLeave(prisma, { userId: high.id, approverId: null, status: 'APPROVED', startDate: '2026-11-17' });
      await insertLeave(prisma, { userId: high.id, approverId: null, status: 'APPROVED', startDate: '2026-11-18' });
      await insertLeave(prisma, { userId: low.id, approverId: null, status: 'APPROVED', startDate: '2026-11-18', endDate: '2026-11-20' });
      await insertLeave(prisma, { userId: low.id, approverId: null, status: 'APPROVED', startDate: '2026-11-18', endDate: '2026-11-18' });

      const res = await get(CALENDAR, viewer.token, {
        month: '2026-11',
        departmentId: department.id,
      }).expect(200);
      const keys = (res.body as CalendarBody).items.map(
        (item) => `${String(item.empId)}|${String(item.startDate)}|${String(item.endDate)}`,
      );
      expect(keys).toEqual([
        `${high.empId}|2026-11-17|2026-11-17`,
        `${low.empId}|2026-11-18|2026-11-18`,
        `${low.empId}|2026-11-18|2026-11-20`,
        `${high.empId}|2026-11-18|2026-11-18`,
      ]);
    });

    it('shouldReturnHolidaysInMonthEvenWhenNoItemMatches', async () => {
      const department = await tracker.createDepartment();
      const viewer = await createUser();
      const res = await get(CALENDAR, viewer.token, {
        month: '2026-11',
        departmentId: department.id,
      }).expect(200);
      const body = res.body as CalendarBody;
      expect(body.items).toEqual([]);
      expect(body.holidays).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ date: '2026-11-03' }),
          expect.objectContaining({ date: '2026-11-23' }),
        ]),
      );
    });

    it('shouldReturnSameResponseForEmployeeAndAdmin', async () => {
      const department = await tracker.createDepartment();
      const employee = await createUser();
      const admin = await createUser({ role: 'ADMIN' });
      const member = await createUser({ departmentId: department.id });
      await insertLeave(prisma, {
        userId: member.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-11-25',
      });
      const query = { month: '2026-11', departmentId: department.id };

      const asEmployee = (await get(CALENDAR, employee.token, query).expect(200)).body as CalendarBody;
      const asAdmin = (await get(CALENDAR, admin.token, query).expect(200)).body as CalendarBody;
      expect(asEmployee.items).toHaveLength(1);
      expect(asAdmin).toEqual(asEmployee);
    });

    it('shouldReturnEmptyItemsWhenDepartmentDoesNotExist', async () => {
      const viewer = await createUser();
      const res = await get(CALENDAR, viewer.token, {
        month: '2026-11',
        departmentId: '00000000-0000-4000-8000-000000000000',
      }).expect(200);
      const body = res.body as CalendarBody;
      expect(body.items).toEqual([]);
      expect(body.holidays.length).toBeGreaterThan(0);
    });
  });

  describe('GET /leaves/pending-approval の status', () => {
    it('shouldReturnOnlyPendingByDefaultAndFilterByStatus', async () => {
      const approver = await createUser();
      const applicant = await createUser();
      const pending = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'PENDING',
        startDate: '2026-12-01',
      });
      const approved = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'APPROVED',
        startDate: '2026-12-02',
      });
      const rejected = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'REJECTED',
        startDate: '2026-12-03',
      });
      await insertLeave(prisma, {
        userId: applicant.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-12-04',
      });

      const byDefault = (await get(PENDING_APPROVAL, approver.token).expect(200)).body as PageBody;
      expect(byDefault.items.map((item) => item.id)).toEqual([pending.id]);

      const all = (
        await get(PENDING_APPROVAL, approver.token, {
          status: 'PENDING,APPROVED,REJECTED',
        }).expect(200)
      ).body as PageBody;
      expect(all.totalCount).toBe(3);
      expect(all.items.map((item) => item.id).sort()).toEqual(
        [pending.id, approved.id, rejected.id].sort(),
      );
    });

    it('shouldReturn400WhenStatusIsCancelledOrUnknown', async () => {
      const user = await createUser();
      for (const status of ['CANCELLED', 'PENDING,FOO']) {
        const res = await get(PENDING_APPROVAL, user.token, { status }).expect(400);
        expect((res.body as ErrorBody).code).toBe('VALIDATION_ERROR');
      }
    });

    it('shouldReturn403WhenNonAdminRequestsScopeAllWithStatus', async () => {
      const user = await createUser();
      await get(PENDING_APPROVAL, user.token, { scope: 'all', status: 'APPROVED' }).expect(403);
    });

    it('shouldReturnOnlyOwnAssignedProcessedLeavesForScopeMine', async () => {
      const approverA = await createUser();
      const approverB = await createUser();
      const applicant = await createUser();
      const approvedA = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approverA.id,
        status: 'APPROVED',
        startDate: '2027-01-10',
      });
      const rejectedA = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approverA.id,
        status: 'REJECTED',
        startDate: '2027-01-11',
      });
      await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approverB.id,
        status: 'APPROVED',
        startDate: '2027-01-12',
      });
      await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approverA.id,
        status: 'PENDING',
        startDate: '2027-01-13',
      });

      const res = await get(PENDING_APPROVAL, approverA.token, {
        scope: 'mine',
        status: 'APPROVED,REJECTED',
      }).expect(200);
      const body = res.body as PageBody;
      expect(body.totalCount).toBe(2);
      expect(body.items.map((item) => item.id).sort()).toEqual(
        [approvedA.id, rejectedA.id].sort(),
      );
    });

    it('shouldExcludeImmediatelyApprovedLeavesFromScopeAll', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const approver = await createUser();
      const applicant = await createUser();
      const approved = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: approver.id,
        status: 'APPROVED',
        startDate: '2027-02-10',
      });
      const immediate = await insertLeave(prisma, {
        userId: applicant.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2027-02-11',
      });

      // 他の行が多くても確実に見えるよう、件数上限を広げて全件から探す
      const res = await get(PENDING_APPROVAL, admin.token, {
        scope: 'all',
        status: 'APPROVED',
        limit: '100',
      }).expect(200);
      const ids = (res.body as PageBody).items.map((item) => item.id);
      expect(ids).toContain(approved.id);
      expect(ids).not.toContain(immediate.id);
    });

    it('shouldReturn400WithStatusFieldWhenCancelledOrEmpty', async () => {
      const user = await createUser();
      for (const status of ['CANCELLED', '']) {
        const res = await get(PENDING_APPROVAL, user.token, { status }).expect(400);
        const body = res.body as ErrorBody;
        expect(body.code).toBe('VALIDATION_ERROR');
        expect(body.details?.[0]?.field).toBe('status.0');
      }
    });
  });

  describe('GET /leaves/me の申請日範囲', () => {
    it('shouldFilterByAppliedRangeInTokyoDateInclusive', async () => {
      const user = await createUser();
      const insideStart = await insertLeave(prisma, {
        userId: user.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-12-01',
        createdAt: new Date('2026-11-04T15:00:00Z'), // 東京 11/5 00:00
      });
      const insideEnd = await insertLeave(prisma, {
        userId: user.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-12-02',
        createdAt: new Date('2026-11-06T14:59:59Z'), // 東京 11/6 23:59:59
      });
      await insertLeave(prisma, {
        userId: user.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-12-03',
        createdAt: new Date('2026-11-04T14:59:59Z'), // 東京 11/4 23:59:59
      });
      await insertLeave(prisma, {
        userId: user.id,
        approverId: null,
        status: 'APPROVED',
        startDate: '2026-12-04',
        createdAt: new Date('2026-11-06T15:00:00Z'), // 東京 11/7 00:00
      });

      const res = await get(MY_LEAVES, user.token, {
        appliedFrom: '2026-11-05',
        appliedTo: '2026-11-06',
      }).expect(200);
      expect((res.body as PageBody).items.map((item) => item.id).sort()).toEqual(
        [insideStart.id, insideEnd.id].sort(),
      );

      const fromOnly = await get(MY_LEAVES, user.token, { appliedFrom: '2026-11-06' }).expect(200);
      expect((fromOnly.body as PageBody).totalCount).toBe(2);
    });

    it('shouldReturn400WhenAppliedFromIsAfterAppliedTo', async () => {
      const user = await createUser();
      const res = await get(MY_LEAVES, user.token, {
        appliedFrom: '2026-11-07',
        appliedTo: '2026-11-06',
      }).expect(400);
      const body = res.body as ErrorBody;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details?.[0]?.field).toBe('appliedTo');
    });

    it('shouldReturn400WhenAppliedFromIsNotRealDate', async () => {
      const user = await createUser();
      await get(MY_LEAVES, user.token, { appliedFrom: '2026-02-30' }).expect(400);
    });
  });
});
