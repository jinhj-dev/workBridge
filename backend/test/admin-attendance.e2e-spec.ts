// 管理者の勤怠 API(ATT-005 全体照会、ATT-006 修正)の e2e。Clock を固定し、実際のテスト用 DB(workbridge_test)を使う
// 一覧は DB 全体が対象になるため、各テストは自分で作った部署・氏名・日付で絞り込んで検証する
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker } from './db/db-helpers.js';
import {
  createTestApp,
  createTokenSigner,
  DEFAULT_NOW,
  FixedClock,
  insertAttendance,
} from './e2e-helpers.js';

interface AttendanceBody {
  id: string;
  user: { id: string; name: string };
  workDate: string;
  clockIn: string;
  clockOut: string | null;
  workMinutes: number | null;
  status: string;
  modifiedAt: string | null;
}
interface PageBody {
  items: AttendanceBody[];
  totalCount: number;
}
interface ErrorBody {
  code?: string;
}

const LIST_PATH = '/api/v1/admin/attendance';
const RANGE = { startDate: '2026-11-01', endDate: '2026-11-09' };

describe('管理者 勤怠 API(e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let tracker: TestDataTracker;
  let adminId: string;
  let adminToken: string;
  const clock = new FixedClock();
  const sign = createTokenSigner();

  beforeAll(async () => {
    prisma = createTestPrisma();
    tracker = new TestDataTracker(prisma);
    app = await createTestApp(clock);
    const admin = await tracker.createUser({ role: 'ADMIN', mustChangePassword: false });
    adminId = admin.id;
    adminToken = await sign(admin.id);
  });

  beforeEach(() => {
    clock.set(DEFAULT_NOW);
  });

  afterAll(async () => {
    try {
      await tracker?.cleanup();
    } finally {
      await app?.close();
      await prisma?.$disconnect();
    }
  });

  async function createEmployee(
    overrides: { name?: string; departmentId?: string; isActive?: boolean } = {},
  ): Promise<{ id: string; token: string }> {
    const user = await tracker.createUser({ mustChangePassword: false, ...overrides });
    return { id: user.id, token: await sign(user.id) };
  }

  function list(
    token: string,
    query: Record<string, string | number> = {},
  ): request.Test {
    return request(app.getHttpServer())
      .get(LIST_PATH)
      .query(query)
      .set('Authorization', `Bearer ${token}`);
  }

  function patch(token: string, id: string, body: unknown): request.Test {
    return request(app.getHttpServer())
      .patch(`${LIST_PATH}/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);
  }

  // ATT-005 全体の勤怠照会
  describe('ATT-005 全体勤怠照会', () => {
    it('shouldReturn403ForEmployeeAnd401WithoutToken', async () => {
      const employee = await createEmployee();
      const forbidden = await list(employee.token, RANGE).expect(403);
      expect((forbidden.body as ErrorBody).code).toBe('FORBIDDEN');
      await request(app.getHttpServer()).get(LIST_PATH).expect(401);
    });

    it('shouldReturn403PasswordChangeRequiredForAdminWithMustChangePassword', async () => {
      const pendingAdmin = await tracker.createUser({ role: 'ADMIN', mustChangePassword: true });
      const token = await sign(pendingAdmin.id);
      const res = await list(token, RANGE).expect(403);
      expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
    });

    it('shouldSortByWorkDateDescThenNameAscThenIdAsc', async () => {
      const department = await tracker.createDepartment();
      const suffix = randomUUID().slice(0, 8);
      // 挿入順はわざと逆にする
      const charlie = await createEmployee({ name: `Charlie-${suffix}`, departmentId: department.id });
      const bravo1 = await createEmployee({ name: `Bravo-${suffix}`, departmentId: department.id });
      const bravo2 = await createEmployee({ name: `Bravo-${suffix}`, departmentId: department.id });
      const alpha = await createEmployee({ name: `Alpha-${suffix}`, departmentId: department.id });
      // 同日の並びは勤怠 ID(attendance.id)の昇順で決まるため、勤怠 ID を控えて比較する
      const attendanceIdByUserId = new Map<string, string>();
      for (const user of [charlie, bravo1, bravo2, alpha]) {
        const record = await insertAttendance(prisma, {
          userId: user.id,
          workDate: '2026-11-09',
          clockIn: '2026-11-09T09:00:00+09:00',
        });
        attendanceIdByUserId.set(user.id, record.id);
      }
      await insertAttendance(prisma, {
        userId: alpha.id,
        workDate: '2026-11-08',
        clockIn: '2026-11-08T09:00:00+09:00',
        clockOut: '2026-11-08T18:00:00+09:00',
      });

      const res = await list(adminToken, { ...RANGE, departmentId: department.id }).expect(200);
      const items = (res.body as PageBody).items;
      const sameDayBravoIds = [
        attendanceIdByUserId.get(bravo1.id),
        attendanceIdByUserId.get(bravo2.id),
      ].sort();
      expect(items.map((item) => [item.workDate, item.user.name])).toEqual([
        ['2026-11-09', `Alpha-${suffix}`],
        ['2026-11-09', `Bravo-${suffix}`],
        ['2026-11-09', `Bravo-${suffix}`],
        ['2026-11-09', `Charlie-${suffix}`],
        ['2026-11-08', `Alpha-${suffix}`],
      ]);
      expect(items.slice(1, 3).map((item) => item.id)).toEqual(sameDayBravoIds);
    });

    it('shouldMatchNamePartiallyCaseInsensitivelyIgnoringSurroundingSpaces', async () => {
      const department = await tracker.createDepartment();
      const suffix = randomUUID().slice(0, 8).toUpperCase();
      const target = await createEmployee({ name: `Tanaka-${suffix}`, departmentId: department.id });
      const other = await createEmployee({ name: `Sato-${suffix}`, departmentId: department.id });
      await insertAttendance(prisma, {
        userId: target.id,
        workDate: '2026-11-09',
        clockIn: '2026-11-09T09:00:00+09:00',
      });
      await insertAttendance(prisma, {
        userId: other.id,
        workDate: '2026-11-09',
        clockIn: '2026-11-09T09:00:00+09:00',
      });

      const res = await list(adminToken, {
        ...RANGE,
        name: `  tanaka-${suffix.toLowerCase()}  `,
      }).expect(200);
      const items = (res.body as PageBody).items;
      expect(items).toHaveLength(1);
      expect(items[0]?.user.id).toBe(target.id);
    });

    it('shouldFilterByDepartmentIdAndReturnEmptyForUnknownOrNonUuid', async () => {
      const deptA = await tracker.createDepartment();
      const deptB = await tracker.createDepartment();
      const a1 = await createEmployee({ departmentId: deptA.id });
      const a2 = await createEmployee({ departmentId: deptA.id });
      const b1 = await createEmployee({ departmentId: deptB.id });
      for (const user of [a1, a2, b1]) {
        await insertAttendance(prisma, {
          userId: user.id,
          workDate: '2026-11-09',
          clockIn: '2026-11-09T09:00:00+09:00',
        });
      }

      const res = await list(adminToken, { ...RANGE, departmentId: deptA.id }).expect(200);
      const ids = (res.body as PageBody).items.map((item) => item.user.id).sort();
      expect(ids).toEqual([a1.id, a2.id].sort());

      const unknown = await list(adminToken, { ...RANGE, departmentId: randomUUID() }).expect(200);
      expect((unknown.body as PageBody).items).toEqual([]);

      const invalid = await list(adminToken, { ...RANGE, departmentId: 'not-a-uuid' }).expect(400);
      expect((invalid.body as ErrorBody).code).toBe('VALIDATION_ERROR');
    });

    it('shouldFilterByStatusMissingClockOutWorkingAndDone', async () => {
      const department = await tracker.createDepartment();
      const missing = await createEmployee({ departmentId: department.id });
      const working = await createEmployee({ departmentId: department.id });
      const done = await createEmployee({ departmentId: department.id });
      await insertAttendance(prisma, {
        userId: missing.id,
        workDate: '2026-11-08',
        clockIn: '2026-11-08T09:00:00+09:00',
      });
      await insertAttendance(prisma, {
        userId: working.id,
        workDate: '2026-11-09',
        clockIn: '2026-11-09T09:00:00+09:00',
      });
      await insertAttendance(prisma, {
        userId: done.id,
        workDate: '2026-11-09',
        clockIn: '2026-11-09T09:00:00+09:00',
        clockOut: '2026-11-09T18:00:00+09:00',
      });

      const byStatus = async (status: string): Promise<string[]> => {
        const res = await list(adminToken, { ...RANGE, departmentId: department.id, status }).expect(
          200,
        );
        return (res.body as PageBody).items.map((item) => item.user.id);
      };
      expect(await byStatus('MISSING_CLOCK_OUT')).toEqual([missing.id]);
      expect(await byStatus('WORKING')).toEqual([working.id]);
      expect(await byStatus('DONE')).toEqual([done.id]);
    });

    it('shouldReturn400ValidationErrorForUnknownStatusAbsent', async () => {
      const res = await list(adminToken, { ...RANGE, status: 'ABSENT' }).expect(400);
      expect((res.body as ErrorBody).code).toBe('VALIDATION_ERROR');
    });

    it('shouldIncludeRecordsOfInactiveUsers', async () => {
      const department = await tracker.createDepartment();
      const inactive = await createEmployee({ departmentId: department.id, isActive: false });
      await insertAttendance(prisma, {
        userId: inactive.id,
        workDate: '2026-11-09',
        clockIn: '2026-11-09T09:00:00+09:00',
      });

      const res = await list(adminToken, { ...RANGE, departmentId: department.id }).expect(200);
      const items = (res.body as PageBody).items;
      expect(items).toHaveLength(1);
      expect(items[0]?.user.id).toBe(inactive.id);
    });

    it('shouldReturn400InvalidDateRangeWhenRangeExceeds366Days', async () => {
      const res = await list(adminToken, {
        startDate: '2026-11-01',
        endDate: '2027-11-02',
      }).expect(400);
      expect((res.body as ErrorBody).code).toBe('INVALID_DATE_RANGE');
    });
  });

  // ATT-006 出退勤時刻の修正
  describe('ATT-006 勤怠修正', () => {
    async function seedRecord(
      userId: string,
      workDate: string,
      clockIn: string,
      clockOut: string | null = null,
    ): Promise<string> {
      const row = await insertAttendance(prisma, {
        userId,
        workDate,
        clockIn,
        clockOut,
      });
      return row.id;
    }

    it('shouldAddClockOutToYesterdayRecordAndRecordModifier', async () => {
      const employee = await createEmployee();
      const id = await seedRecord(employee.id, '2026-11-08', '2026-11-08T09:00:00+09:00');

      const res = await patch(adminToken, id, {
        clockIn: '2026-11-08T09:00:00+09:00',
        clockOut: '2026-11-08T18:00:00+09:00',
      }).expect(200);
      const body = res.body as AttendanceBody;
      expect(body.status).toBe('DONE');
      expect(body.workMinutes).toBe(540);
      expect(body.modifiedAt).toBe('2026-11-09T09:00:00+09:00');

      const row = await prisma.attendance.findUniqueOrThrow({ where: { id } });
      expect(row.modifiedBy).toBe(adminId);
      expect(row.modifiedAt?.toISOString()).toBe('2026-11-09T00:00:00.000Z');
      expect(row.clockOut?.toISOString()).toBe('2026-11-08T09:00:00.000Z');
    });

    it('shouldReturn400InvalidTimeRangeAndKeepRecordWhenClockOutNotAfterClockIn', async () => {
      const employee = await createEmployee();
      const id = await seedRecord(employee.id, '2026-11-08', '2026-11-08T09:00:00+09:00');

      const equal = await patch(adminToken, id, {
        clockIn: '2026-11-08T09:00:00+09:00',
        clockOut: '2026-11-08T09:00:00+09:00',
      }).expect(400);
      expect((equal.body as ErrorBody).code).toBe('INVALID_TIME_RANGE');

      const before = await patch(adminToken, id, {
        clockIn: '2026-11-08T09:00:00+09:00',
        clockOut: '2026-11-08T08:00:00+09:00',
      }).expect(400);
      expect((before.body as ErrorBody).code).toBe('INVALID_TIME_RANGE');

      const row = await prisma.attendance.findUniqueOrThrow({ where: { id } });
      expect(row.clockOut).toBeNull();
      expect(row.modifiedBy).toBeNull();
      expect(row.modifiedAt).toBeNull();
    });

    it('shouldReturn400InvalidTimeRangeWhenClockInOutsideWorkDateOrSpanOver24Hours', async () => {
      const employee = await createEmployee();
      const id = await seedRecord(employee.id, '2026-11-08', '2026-11-08T09:00:00+09:00');

      // 出勤が勤務日(2026-11-08)の外
      const outsideWorkDate = await patch(adminToken, id, {
        clockIn: '2026-11-09T09:00:00+09:00',
        clockOut: null,
      }).expect(400);
      expect((outsideWorkDate.body as ErrorBody).code).toBe('INVALID_TIME_RANGE');

      // 退勤が出勤から 24 時間 1 分後
      const tooLong = await patch(adminToken, id, {
        clockIn: '2026-11-08T09:00:00+09:00',
        clockOut: '2026-11-09T09:01:00+09:00',
      }).expect(400);
      expect((tooLong.body as ErrorBody).code).toBe('INVALID_TIME_RANGE');
    });

    it('shouldAcceptClockOutAfterMidnightWithinTwentyFourHours', async () => {
      const employee = await createEmployee();
      const id = await seedRecord(employee.id, '2026-11-08', '2026-11-08T22:00:00+09:00');

      const res = await patch(adminToken, id, {
        clockIn: '2026-11-08T22:00:00+09:00',
        clockOut: '2026-11-09T02:00:00+09:00',
      }).expect(200);
      const body = res.body as AttendanceBody;
      expect(body.status).toBe('DONE');
      expect(body.workMinutes).toBe(240);
    });

    it('shouldUpdateTodayWorkingRecordWithClockOutStillNull', async () => {
      const employee = await createEmployee();
      const id = await seedRecord(employee.id, '2026-11-09', '2026-11-09T09:00:00+09:00');

      const res = await patch(adminToken, id, {
        clockIn: '2026-11-09T08:30:00+09:00',
        clockOut: null,
      }).expect(200);
      const body = res.body as AttendanceBody;
      expect(body.status).toBe('WORKING');
      expect(body.clockIn).toBe('2026-11-09T08:30:00+09:00');
      expect(body.workMinutes).toBeNull();
    });

    it('shouldReturn404NotFoundForUnknownOrNonUuidId', async () => {
      const body = { clockIn: '2026-11-08T09:00:00+09:00', clockOut: null };
      const unknown = await patch(adminToken, randomUUID(), body).expect(404);
      expect((unknown.body as ErrorBody).code).toBe('NOT_FOUND');
      const nonUuid = await patch(adminToken, 'not-a-uuid', body).expect(404);
      expect((nonUuid.body as ErrorBody).code).toBe('NOT_FOUND');
    });

    it('shouldReturn400ValidationErrorWhenClockInMissingOrOffsetOmitted', async () => {
      const employee = await createEmployee();
      const id = await seedRecord(employee.id, '2026-11-08', '2026-11-08T09:00:00+09:00');

      const missing = await patch(adminToken, id, { clockOut: null }).expect(400);
      expect((missing.body as ErrorBody).code).toBe('VALIDATION_ERROR');

      const noOffset = await patch(adminToken, id, {
        clockIn: '2026-11-08T09:00:00',
        clockOut: null,
      }).expect(400);
      expect((noOffset.body as ErrorBody).code).toBe('VALIDATION_ERROR');
    });

    it('shouldReturn403ForEmployeeAndNotChangeRecord', async () => {
      const employee = await createEmployee();
      const id = await seedRecord(employee.id, '2026-11-08', '2026-11-08T09:00:00+09:00');

      const res = await patch(employee.token, id, {
        clockIn: '2026-11-08T09:00:00+09:00',
        clockOut: '2026-11-08T18:00:00+09:00',
      }).expect(403);
      expect((res.body as ErrorBody).code).toBe('FORBIDDEN');

      const row = await prisma.attendance.findUniqueOrThrow({ where: { id } });
      expect(row.clockOut).toBeNull();
      expect(row.modifiedBy).toBeNull();
    });

    it('shouldReturn403PasswordChangeRequiredAndNotChangeRecordForAdminWithMustChangePassword', async () => {
      const employee = await createEmployee();
      const id = await seedRecord(employee.id, '2026-11-08', '2026-11-08T09:00:00+09:00');
      const pendingAdmin = await tracker.createUser({ role: 'ADMIN', mustChangePassword: true });
      const token = await sign(pendingAdmin.id);

      const res = await patch(token, id, {
        clockIn: '2026-11-08T09:00:00+09:00',
        clockOut: '2026-11-08T18:00:00+09:00',
      }).expect(403);
      expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');

      const row = await prisma.attendance.findUniqueOrThrow({ where: { id } });
      expect(row.clockOut).toBeNull();
      expect(row.modifiedBy).toBeNull();
    });

    it('shouldReturn409AlreadyClockedOutWhenEmployeeClocksOutAfterAdminAddedClockOut', async () => {
      const employee = await createEmployee();
      const id = await seedRecord(employee.id, '2026-11-09', '2026-11-09T09:00:00+09:00');

      await patch(adminToken, id, {
        clockIn: '2026-11-09T09:00:00+09:00',
        clockOut: '2026-11-09T17:00:00+09:00',
      }).expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/clock-out')
        .set('Authorization', `Bearer ${employee.token}`)
        .expect(409);
      expect((res.body as ErrorBody).code).toBe('ALREADY_CLOCKED_OUT');
    });
  });
});
