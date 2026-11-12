// 管理者ダッシュボード API(GET /admin/dashboard/summary)の e2e。Clock を固定し、実際のテスト用 DB を使う。
// 集計は DB 全体が対象なので、事前に取得した基準値からの増減で検証する(e2e はファイル単位で順次実行)
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { toDbDate } from '../src/common/time/tokyo-date.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker } from './db/db-helpers.js';
import {
  createTestApp,
  createTokenSigner,
  FixedClock,
  insertAttendance,
  insertLeave,
} from './e2e-helpers.js';

interface SummaryBody {
  date: string;
  isWorkday: boolean;
  totalEmployeeCount: number;
  attendanceRate: number | null;
  clockedInCount: number;
  notClockedInCount: number;
  onLeaveCount: number;
  pendingLeaveCount: number;
}
interface ErrorBody {
  code?: string;
}

const SUMMARY_PATH = '/api/v1/admin/dashboard/summary';
const TODAY = '2026-11-09';
const TODAY_CLOCK_IN = '2026-11-09T08:55:00+09:00';

describe('管理者ダッシュボード API(e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let tracker: TestDataTracker;
  let adminToken: string;
  const clock = new FixedClock();
  const sign = createTokenSigner();

  beforeAll(async () => {
    prisma = createTestPrisma();
    tracker = new TestDataTracker(prisma);
    app = await createTestApp(clock);
    const admin = await tracker.createUser({ role: 'ADMIN', mustChangePassword: false });
    adminToken = await sign(admin.id);
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
    overrides: {
      role?: 'ADMIN' | 'EMPLOYEE';
      mustChangePassword?: boolean;
      isActive?: boolean;
      hireDate?: Date;
    } = {},
  ): Promise<{ id: string; token: string }> {
    const user = await tracker.createUser({ mustChangePassword: false, ...overrides });
    return { id: user.id, token: await sign(user.id) };
  }

  async function fetchSummary(): Promise<SummaryBody> {
    const res = await request(app.getHttpServer())
      .get(SUMMARY_PATH)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    return res.body as SummaryBody;
  }

  function diff(
    after: SummaryBody,
    before: SummaryBody,
  ): Pick<
    SummaryBody,
    | 'totalEmployeeCount'
    | 'clockedInCount'
    | 'notClockedInCount'
    | 'onLeaveCount'
    | 'pendingLeaveCount'
  > {
    return {
      totalEmployeeCount: after.totalEmployeeCount - before.totalEmployeeCount,
      clockedInCount: after.clockedInCount - before.clockedInCount,
      notClockedInCount: after.notClockedInCount - before.notClockedInCount,
      onLeaveCount: after.onLeaveCount - before.onLeaveCount,
      pendingLeaveCount: after.pendingLeaveCount - before.pendingLeaveCount,
    };
  }

  it('shouldReturn403ForbiddenToEmployee', async () => {
    const employee = await createUser();
    const res = await request(app.getHttpServer())
      .get(SUMMARY_PATH)
      .set('Authorization', `Bearer ${employee.token}`)
      .expect(403);
    expect((res.body as ErrorBody).code).toBe('FORBIDDEN');
  });

  it('shouldReturn401WithoutToken', async () => {
    await request(app.getHttpServer()).get(SUMMARY_PATH).expect(401);
  });

  it('shouldReturn403PasswordChangeRequiredToAdminWhoMustChangePassword', async () => {
    const admin = await createUser({ role: 'ADMIN', mustChangePassword: true });
    const res = await request(app.getHttpServer())
      .get(SUMMARY_PATH)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(403);
    expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('shouldNotReturn200ToEmployeeOnCaseVariantPath', async () => {
    const employee = await createUser();
    const res = await request(app.getHttpServer())
      .get('/api/v1/ADMIN/dashboard/summary')
      .set('Authorization', `Bearer ${employee.token}`);
    expect([403, 404]).toContain(res.status);
  });

  it('shouldReturnTokyoDateOfFixedClock', async () => {
    try {
      clock.set('2026-11-09T23:59:59+09:00');
      expect((await fetchSummary()).date).toBe('2026-11-09');
      clock.set('2026-11-10T00:00:00+09:00');
      expect((await fetchSummary()).date).toBe('2026-11-10');
    } finally {
      clock.set('2026-11-09T09:00:00+09:00');
    }
  });

  it('shouldCountActiveUsersByTodayStatusAndAllPendingLeaves', async () => {
    const before = await fetchSummary();
    expect(before.date).toBe(TODAY);

    const approver = await createUser();
    const a = await createUser();
    const b = await createUser();
    const c = await createUser();
    const d = await createUser();
    const e = await createUser({ isActive: false });

    await insertAttendance(prisma, { userId: a.id, workDate: TODAY, clockIn: TODAY_CLOCK_IN });
    await insertLeave(prisma, {
      userId: c.id,
      approverId: approver.id,
      status: 'APPROVED',
      startDate: '2026-11-08',
      endDate: '2026-11-10',
      days: 3,
    });
    await insertLeave(prisma, {
      userId: d.id,
      approverId: approver.id,
      status: 'APPROVED',
      leaveType: 'HALF_AM',
      startDate: TODAY,
      days: 0.5,
    });
    await insertAttendance(prisma, {
      userId: d.id,
      workDate: TODAY,
      clockIn: '2026-11-09T13:00:00+09:00',
    });
    await insertAttendance(prisma, { userId: e.id, workDate: TODAY, clockIn: TODAY_CLOCK_IN });
    await insertLeave(prisma, {
      userId: e.id,
      approverId: approver.id,
      status: 'APPROVED',
      startDate: TODAY,
      days: 1,
    });
    await insertLeave(prisma, { userId: b.id, approverId: approver.id, status: 'PENDING' });
    await insertLeave(prisma, {
      userId: a.id,
      approverId: approver.id,
      status: 'PENDING',
      startDate: TODAY,
    });

    const after = await fetchSummary();
    // approver(活性・出勤なし・休暇なし)も未出勤に数えられる。出勤した半休の d は出勤のみ(排他)、無効な e は対象外
    expect(after.isWorkday).toBe(true);
    expect(diff(after, before)).toEqual({
      totalEmployeeCount: 5,
      clockedInCount: 2,
      onLeaveCount: 1,
      notClockedInCount: 2,
      pendingLeaveCount: 2,
    });
  });

  it('shouldNotCountLeavesThatAreNotApprovedOrNotCoveringToday', async () => {
    const approver = await createUser();
    const before = await fetchSummary();

    const users = await Promise.all([createUser(), createUser(), createUser(), createUser()]);
    await insertLeave(prisma, {
      userId: users[0].id,
      approverId: approver.id,
      status: 'APPROVED',
      startDate: '2026-11-10',
      endDate: '2026-11-11',
      days: 2,
    });
    await insertLeave(prisma, {
      userId: users[1].id,
      approverId: approver.id,
      status: 'PENDING',
      startDate: TODAY,
    });
    await insertLeave(prisma, {
      userId: users[2].id,
      approverId: approver.id,
      status: 'REJECTED',
      startDate: TODAY,
    });
    await insertLeave(prisma, {
      userId: users[3].id,
      approverId: approver.id,
      status: 'CANCELLED',
      startDate: TODAY,
    });

    const after = await fetchSummary();
    expect(diff(after, before)).toEqual({
      totalEmployeeCount: 4,
      clockedInCount: 0,
      onLeaveCount: 0,
      notClockedInCount: 4,
      pendingLeaveCount: 1,
    });
  });

  it('shouldExcludeUsersWhoseHireDateIsAfterToday', async () => {
    const before = await fetchSummary();
    await tracker.createUser({ hireDate: toDbDate('2026-11-10') });
    await tracker.createUser({ hireDate: toDbDate('2026-11-09') });
    const after = await fetchSummary();
    expect(diff(after, before)).toMatchObject({ totalEmployeeCount: 1, notClockedInCount: 1 });
  });

  it('shouldReturnAttendanceRateWithOneDecimalPlaceFromFixedData', async () => {
    // 2025-06-02(月)は他テストのデータが無い日付。2026-01-01 入社の既存ユーザーは対象外になる
    const day = '2025-06-02';
    clock.set(`${day}T10:00:00+09:00`);
    try {
      // 対象者が 0 人の状態から始める(2026-01-01 入社の承認者は 2025-06-02 時点では対象外)
      const before = await fetchSummary();
      expect(before.totalEmployeeCount).toBe(0);

      const approver = await createUser();
      const a = await createUser({ hireDate: toDbDate('2025-01-01') });
      const b = await createUser({ hireDate: toDbDate('2025-01-01') });
      await createUser({ hireDate: toDbDate('2025-01-01') });

      await insertAttendance(prisma, {
        userId: a.id,
        workDate: day,
        clockIn: `${day}T09:00:00+09:00`,
      });
      await insertLeave(prisma, {
        userId: b.id,
        approverId: approver.id,
        status: 'APPROVED',
        startDate: day,
        days: 1,
      });
      // 3 人目は出勤・休暇なし(未出勤)
      const res = await fetchSummary();
      expect(res.date).toBe(day);
      expect(res.isWorkday).toBe(true);
      expect(res.totalEmployeeCount).toBe(3);
      expect(res.clockedInCount).toBe(1);
      expect(res.onLeaveCount).toBe(1);
      expect(res.notClockedInCount).toBe(1);
      expect(res.attendanceRate).toBe(33.3);
    } finally {
      clock.set('2026-11-09T09:00:00+09:00');
    }
  });

  it('shouldReturnExactlyEightResponseKeys', async () => {
    const res = await request(app.getHttpServer())
      .get(SUMMARY_PATH)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Object.keys(res.body as object).sort()).toEqual(
      [
        'attendanceRate',
        'clockedInCount',
        'date',
        'isWorkday',
        'notClockedInCount',
        'onLeaveCount',
        'pendingLeaveCount',
        'totalEmployeeCount',
      ].sort(),
    );
  });

  it('shouldKeepTotalEmployeeCountOnNotWorkday', async () => {
    // 2026-11-16(月)と 2026-11-14(土)の間で入社日の境界を跨がないよう、両日とも全テストユーザーの入社日後
    let workday: SummaryBody;
    let notWorkday: SummaryBody;
    try {
      clock.set('2026-11-16T10:00:00+09:00');
      workday = await fetchSummary();
      clock.set('2026-11-14T10:00:00+09:00');
      notWorkday = await fetchSummary();
    } finally {
      clock.set('2026-11-09T09:00:00+09:00');
    }
    expect(workday.isWorkday).toBe(true);
    expect(notWorkday.isWorkday).toBe(false);
    expect(notWorkday.totalEmployeeCount).toBe(workday.totalEmployeeCount);
    expect(notWorkday.onLeaveCount).toBe(0);
    expect(notWorkday.notClockedInCount).toBe(0);
  });

  it.each([
    ['日曜日', '2026-11-08T10:00:00+09:00', '2026-11-08'],
    ['平日の祝日(文化の日)', '2026-11-03T10:00:00+09:00', '2026-11-03'],
  ])('shouldCountOnlyClockedInUsersWhenNotWorkday(%s)', async (_label, now, day) => {
    const approver = await createUser();
    const a = await createUser();
    const b = await createUser();
    await insertAttendance(prisma, { userId: a.id, workDate: day, clockIn: now });
    await insertLeave(prisma, {
      userId: b.id,
      approverId: approver.id,
      status: 'APPROVED',
      startDate: day,
      days: 1,
    });
    clock.set(now);
    try {
      const res = await fetchSummary();
      expect(res.date).toBe(day);
      expect(res.isWorkday).toBe(false);
      expect(res.onLeaveCount).toBe(0);
      expect(res.notClockedInCount).toBe(0);
      expect(res.clockedInCount).toBeGreaterThanOrEqual(1);
      expect(res.attendanceRate).toBe(100);
    } finally {
      clock.set('2026-11-09T09:00:00+09:00');
    }
  });

  it('shouldReturnNullAttendanceRateWhenNoOneClockedInOnNotWorkday', async () => {
    // 他テストのデータと重ならない遠い土曜日(2098-01-04)
    clock.set('2098-01-04T10:00:00+09:00');
    try {
      const res = await fetchSummary();
      expect(res.isWorkday).toBe(false);
      expect(res.clockedInCount).toBe(0);
      expect(res.attendanceRate).toBeNull();
    } finally {
      clock.set('2026-11-09T09:00:00+09:00');
    }
  });
});
