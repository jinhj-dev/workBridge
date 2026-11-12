// 部署別の当日勤務状況 API(GET /dashboard/department-status)の e2e。Clock を固定し、実際のテスト用 DB を使う。
// 他テストのデータが混ざらないよう、このテストで作った部署だけを取り出して検証する
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { toDbDate } from '../src/common/time/tokyo-date.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker, uniqueSuffix } from './db/db-helpers.js';
import {
  createTestApp,
  createTokenSigner,
  FixedClock,
  insertAttendance,
  insertLeave,
} from './e2e-helpers.js';

interface DepartmentItem {
  departmentId: string | null;
  departmentName: string;
  memberCount: number;
  clockedInCount: number;
  onLeaveCount: number;
  notClockedInCount: number;
  attendanceRate: number | null;
}
interface StatusBody {
  date: string;
  isWorkday: boolean;
  departments: DepartmentItem[];
}
interface ErrorBody {
  code?: string;
}

const PATH = '/api/v1/dashboard/department-status';
const TODAY = '2026-11-09';
const TODAY_CLOCK_IN = '2026-11-09T08:55:00+09:00';
const WORKDAY_NOW = '2026-11-09T09:00:00+09:00';

describe('部署別の当日勤務状況 API(e2e)', () => {
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

  beforeEach(() => {
    clock.set(WORKDAY_NOW);
  });

  async function createUser(
    overrides: Parameters<TestDataTracker['createUser']>[0] = {},
  ): Promise<{ id: string; token: string }> {
    const user = await tracker.createUser({ mustChangePassword: false, ...overrides });
    return { id: user.id, token: await sign(user.id) };
  }

  async function fetchStatus(token: string): Promise<StatusBody> {
    const res = await request(app.getHttpServer())
      .get(PATH)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body as StatusBody;
  }

  function findDepartment(body: StatusBody, id: string): DepartmentItem | undefined {
    return body.departments.find((item) => item.departmentId === id);
  }

  it('shouldReturn401WithoutToken', async () => {
    await request(app.getHttpServer()).get(PATH).expect(401);
  });

  it('shouldReturn403PasswordChangeRequiredWhenMustChangePassword', async () => {
    const user = await createUser({ mustChangePassword: true });
    const res = await request(app.getHttpServer())
      .get(PATH)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(403);
    expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('shouldReturnSameCountsToEmployeeAndAdminWithoutPersonalInfo', async () => {
    const dept = await tracker.createDepartment();
    const approver = await createUser({ departmentId: dept.id, role: 'ADMIN' });
    const a = await createUser({ departmentId: dept.id });
    const b = await createUser({ departmentId: dept.id });
    const c = await createUser({ departmentId: dept.id });
    await createUser({ departmentId: dept.id, isActive: false });
    await createUser({ departmentId: dept.id, hireDate: toDbDate('2026-11-10') });
    await insertAttendance(prisma, { userId: a.id, workDate: TODAY, clockIn: TODAY_CLOCK_IN });
    // 出勤した半休は出勤のみ(排他)
    await insertLeave(prisma, {
      userId: a.id,
      approverId: approver.id,
      status: 'APPROVED',
      leaveType: 'HALF_AM',
      startDate: TODAY,
      days: 0.5,
    });
    await insertLeave(prisma, {
      userId: b.id,
      approverId: approver.id,
      status: 'APPROVED',
      startDate: TODAY,
      days: 1,
    });
    await insertLeave(prisma, {
      userId: c.id,
      approverId: approver.id,
      status: 'PENDING',
      startDate: TODAY,
    });

    const asEmployee = await fetchStatus(c.token);
    const asAdmin = await fetchStatus(approver.token);
    expect(asEmployee.date).toBe(TODAY);
    expect(asEmployee.isWorkday).toBe(true);
    const item = findDepartment(asEmployee, dept.id);
    // approver・a・b・c の 4 名(無効・未入社は対象外)。承認待ちは未出勤扱い
    expect(item).toEqual({
      departmentId: dept.id,
      departmentName: dept.name,
      memberCount: 4,
      clockedInCount: 1,
      onLeaveCount: 1,
      notClockedInCount: 2,
      attendanceRate: 25,
    });
    expect(findDepartment(asAdmin, dept.id)).toEqual(item);
  });

  it('shouldOmitDepartmentsWithoutTargetUsers', async () => {
    const empty = await tracker.createDepartment();
    const onlyInactive = await tracker.createDepartment();
    await createUser({ departmentId: onlyInactive.id, isActive: false });
    const viewer = await createUser();
    const body = await fetchStatus(viewer.token);
    expect(findDepartment(body, empty.id)).toBeUndefined();
    expect(findDepartment(body, onlyInactive.id)).toBeUndefined();
  });

  it('shouldReturnOnlyClockedInCountsWhenNotWorkday', async () => {
    const dept = await tracker.createDepartment();
    const a = await createUser({ departmentId: dept.id });
    await createUser({ departmentId: dept.id });
    clock.set('2026-11-08T10:00:00+09:00');
    await insertAttendance(prisma, {
      userId: a.id,
      workDate: '2026-11-08',
      clockIn: '2026-11-08T09:00:00+09:00',
    });
    const body = await fetchStatus(a.token);
    expect(body.isWorkday).toBe(false);
    expect(findDepartment(body, dept.id)).toMatchObject({
      memberCount: 2,
      clockedInCount: 1,
      onLeaveCount: 0,
      notClockedInCount: 0,
      attendanceRate: 100,
    });
  });

  it('shouldReturnNullAttendanceRateWhenNobodyClockedInOnNotWorkday', async () => {
    const dept = await tracker.createDepartment();
    const a = await createUser({ departmentId: dept.id });
    clock.set('2026-11-08T10:00:00+09:00');
    const body = await fetchStatus(a.token);
    expect(findDepartment(body, dept.id)).toMatchObject({
      memberCount: 1,
      clockedInCount: 0,
      attendanceRate: null,
    });
  });

  it('shouldSortDepartmentsByCodeAscending', async () => {
    const suffix = uniqueSuffix();
    // 作成順と逆の順(B を先に作る)で、コード順に並ぶことを確かめる
    const deptB = await tracker.createDepartment({
      code: `TDEPTB${suffix}`,
      name: `部署B${suffix}`,
    });
    const deptA = await tracker.createDepartment({
      code: `TDEPTA${suffix}`,
      name: `部署A${suffix}`,
    });
    const viewer = await createUser({ departmentId: deptB.id });
    await createUser({ departmentId: deptA.id });
    const body = await fetchStatus(viewer.token);
    const indexA = body.departments.findIndex((item) => item.departmentId === deptA.id);
    const indexB = body.departments.findIndex((item) => item.departmentId === deptB.id);
    expect(indexA).toBeGreaterThanOrEqual(0);
    expect(indexB).toBeGreaterThanOrEqual(0);
    expect(indexA).toBeLessThan(indexB);
  });

  it('shouldMatchSummaryTotalsWhenSummedOverDepartments', async () => {
    const dept = await tracker.createDepartment();
    const approver = await createUser({ departmentId: dept.id, role: 'ADMIN' });
    const a = await createUser({ departmentId: dept.id });
    await insertAttendance(prisma, { userId: a.id, workDate: TODAY, clockIn: TODAY_CLOCK_IN });
    await insertLeave(prisma, {
      userId: a.id,
      approverId: approver.id,
      status: 'APPROVED',
      startDate: TODAY,
      days: 1,
    });
    // 同じ Clock・同じ DB 状態で 2 つの API を呼び、部署合計が全社の値と一致することを確かめる
    const status = await fetchStatus(approver.token);
    const summary = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/summary')
      .set('Authorization', `Bearer ${approver.token}`)
      .expect(200);
    const sum = status.departments.reduce(
      (acc, item) => ({
        memberCount: acc.memberCount + item.memberCount,
        clockedInCount: acc.clockedInCount + item.clockedInCount,
        onLeaveCount: acc.onLeaveCount + item.onLeaveCount,
        notClockedInCount: acc.notClockedInCount + item.notClockedInCount,
      }),
      { memberCount: 0, clockedInCount: 0, onLeaveCount: 0, notClockedInCount: 0 },
    );
    const body = summary.body as {
      totalEmployeeCount: number;
      clockedInCount: number;
      onLeaveCount: number;
      notClockedInCount: number;
    };
    expect(sum).toEqual({
      memberCount: body.totalEmployeeCount,
      clockedInCount: body.clockedInCount,
      onLeaveCount: body.onLeaveCount,
      notClockedInCount: body.notClockedInCount,
    });
  });

  it('shouldPlaceUnassignedDepartmentLastWithNullId', async () => {
    const unassigned = await prisma.department.findUniqueOrThrow({ where: { code: 'UNASSIGNED' } });
    const viewer = await createUser({ departmentId: unassigned.id });
    const body = await fetchStatus(viewer.token);
    const last = body.departments[body.departments.length - 1];
    expect(last?.departmentId).toBeNull();
    expect(last?.departmentName).toBe(unassigned.name);
    expect(last?.memberCount).toBeGreaterThanOrEqual(1);
  });

  it('shouldNotExposePersonalFields', async () => {
    const dept = await tracker.createDepartment();
    const viewer = await createUser({ departmentId: dept.id });
    const body = await fetchStatus(viewer.token);
    expect(Object.keys(findDepartment(body, dept.id) ?? {}).sort()).toEqual([
      'attendanceRate',
      'clockedInCount',
      'departmentId',
      'departmentName',
      'memberCount',
      'notClockedInCount',
      'onLeaveCount',
    ]);
  });

  it('shouldReturn404ForRemovedLeaveCalendarApis', async () => {
    const employee = await createUser();
    const admin = await createUser({ role: 'ADMIN' });
    for (const path of [
      '/api/v1/dashboard/leave-calendar?month=2026-11',
      '/api/v1/dashboard/leave-calendar/day?date=2026-11-09',
    ]) {
      for (const user of [employee, admin]) {
        await request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${user.token}`)
          .expect(404);
      }
    }
  });
});
