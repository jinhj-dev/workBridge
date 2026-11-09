// 勤怠 API(出勤・退勤・当日)の e2e。Clock を固定し、実際のテスト用 DB(workbridge_test)を使う
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, fromDbDate, TestDataTracker, toDbDate } from './db/db-helpers.js';
import {
  createTestApp,
  createTokenSigner,
  DEFAULT_NOW,
  FixedClock,
  insertAttendance,
} from './e2e-helpers.js';

interface AttendanceBody {
  id: string;
  user: { id: string };
  workDate: string;
  clockIn: string;
  clockOut: string | null;
  workMinutes: number | null;
  status: string;
}
interface ErrorBody {
  code?: string;
}

const OFFSET_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;

describe('勤怠 API(e2e)', () => {
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

  async function createUserWithToken(
    overrides: { mustChangePassword?: boolean } = {},
  ): Promise<{ id: string; token: string }> {
    const department = await tracker.createDepartment();
    const user = await tracker.createUser({
      departmentId: department.id,
      mustChangePassword: false,
      ...overrides,
    });
    return { id: user.id, token: await sign(user.id) };
  }

  function clockIn(token: string): request.Test {
    return request(app.getHttpServer())
      .post('/api/v1/attendance/clock-in')
      .set('Authorization', `Bearer ${token}`);
  }
  function clockOut(token: string): request.Test {
    return request(app.getHttpServer())
      .post('/api/v1/attendance/clock-out')
      .set('Authorization', `Bearer ${token}`);
  }
  function today(token: string): request.Test {
    return request(app.getHttpServer())
      .get('/api/v1/attendance/today')
      .set('Authorization', `Bearer ${token}`);
  }

  it('shouldReturnJsonNullWhenNotClockedInToday', async () => {
    const user = await createUserWithToken();
    const res = await today(user.token).expect(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.text).toBe('null');
  });

  it('shouldCreateWorkingAttendanceOnFirstClockIn', async () => {
    const user = await createUserWithToken();
    const res = await clockIn(user.token).expect(201);
    const body = res.body as AttendanceBody;
    expect(body.status).toBe('WORKING');
    expect(body.workDate).toBe('2026-11-09');
    expect(body.clockIn).toBe('2026-11-09T09:00:00+09:00');
    expect(body.clockIn).toMatch(OFFSET_PATTERN);
    expect(body.clockOut).toBeNull();
    expect(body.workMinutes).toBeNull();
    expect(body.user.id).toBe(user.id);

    const todayRes = await today(user.token).expect(200);
    expect(todayRes.body).toEqual(body);
  });

  it('shouldReturn409AlreadyClockedInOnDuplicateClockIn', async () => {
    const user = await createUserWithToken();
    await clockIn(user.token).expect(201);
    clock.advanceMinutes(10);
    const res = await clockIn(user.token).expect(409);
    expect((res.body as ErrorBody).code).toBe('ALREADY_CLOCKED_IN');
  });

  it('shouldCreateOnlyOneRowOnConcurrentClockIn', async () => {
    const user = await createUserWithToken();
    const results = await Promise.all([clockIn(user.token), clockIn(user.token)]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
    const conflict = results.find((r) => r.status === 409);
    expect((conflict?.body as ErrorBody).code).toBe('ALREADY_CLOCKED_IN');
    expect(await prisma.attendance.count({ where: { userId: user.id } })).toBe(1);
  });

  it('shouldReturn409NotClockedInWhenClockOutWithoutClockIn', async () => {
    const user = await createUserWithToken();
    const res = await clockOut(user.token).expect(409);
    expect((res.body as ErrorBody).code).toBe('NOT_CLOCKED_IN');
  });

  it('shouldCompleteAttendanceWithWorkMinutesOnClockOut', async () => {
    const user = await createUserWithToken();
    await clockIn(user.token).expect(201);
    clock.advanceMinutes(9 * 60);
    const res = await clockOut(user.token).expect(200);
    const body = res.body as AttendanceBody;
    expect(body.status).toBe('DONE');
    expect(body.workMinutes).toBe(540);
    expect(body.clockOut).toBe('2026-11-09T18:00:00+09:00');

    clock.advanceMinutes(5);
    const again = await clockOut(user.token).expect(409);
    expect((again.body as ErrorBody).code).toBe('ALREADY_CLOCKED_OUT');
    const row = await prisma.attendance.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.clockOut?.toISOString()).toBe('2026-11-09T09:00:00.000Z');
  });

  it('shouldAllowClockInTodayWhenPreviousDayHasNoClockOut', async () => {
    const user = await createUserWithToken();
    await insertAttendance(prisma, {
      userId: user.id,
      workDate: '2026-11-08',
      clockIn: '2026-11-08T09:00:00+09:00',
    });
    const res = await clockIn(user.token).expect(201);
    expect((res.body as AttendanceBody).workDate).toBe('2026-11-09');
  });

  it('shouldNotCloseYesterdayWhenClockOutWithoutTodayRecord', async () => {
    const user = await createUserWithToken();
    const yesterday = await insertAttendance(prisma, {
      userId: user.id,
      workDate: '2026-11-08',
      clockIn: '2026-11-08T09:00:00+09:00',
    });
    const res = await clockOut(user.token).expect(409);
    expect((res.body as ErrorBody).code).toBe('NOT_CLOCKED_IN');
    const row = await prisma.attendance.findUniqueOrThrow({ where: { id: yesterday.id } });
    expect(row.clockOut).toBeNull();
  });

  it('shouldSplitWorkDateAtTokyoMidnight', async () => {
    const user = await createUserWithToken();
    clock.set('2026-11-09T23:59:00+09:00');
    const first = await clockIn(user.token).expect(201);
    clock.set('2026-11-10T00:01:00+09:00');
    const second = await clockIn(user.token).expect(201);
    expect((first.body as AttendanceBody).workDate).toBe('2026-11-09');
    expect((second.body as AttendanceBody).workDate).toBe('2026-11-10');
    const rows = await prisma.attendance.findMany({
      where: { userId: user.id },
      orderBy: { workDate: 'asc' },
    });
    expect(rows.map((r) => fromDbDate(r.workDate))).toEqual(['2026-11-09', '2026-11-10']);
  });

  it('shouldReturnOnlyOwnRecordFromToday', async () => {
    const other = await createUserWithToken();
    const me = await createUserWithToken();
    await clockIn(other.token).expect(201);
    const meRes = await today(me.token).expect(200);
    expect(meRes.text).toBe('null');

    await clockIn(me.token).expect(201);
    const res = await today(me.token).expect(200);
    expect((res.body as AttendanceBody).user.id).toBe(me.id);
    const otherRow = await prisma.attendance.findUniqueOrThrow({
      where: { userId_workDate: { userId: other.id, workDate: toDbDate('2026-11-09') } },
    });
    expect((res.body as AttendanceBody).id).not.toBe(otherRow.id);
  });

  describe('認証・パスワード変更', () => {
    const endpoints: [string, 'get' | 'post', string][] = [
      ['clock-in', 'post', '/api/v1/attendance/clock-in'],
      ['clock-out', 'post', '/api/v1/attendance/clock-out'],
      ['today', 'get', '/api/v1/attendance/today'],
    ];

    it.each(endpoints)('shouldReturn401WithoutToken(%s)', async (_name, method, path) => {
      await request(app.getHttpServer())[method](path).expect(401);
    });

    it.each(endpoints)(
      'shouldReturn403PasswordChangeRequiredWhenMustChangePassword(%s)',
      async (_name, method, path) => {
        const user = await createUserWithToken({ mustChangePassword: true });
        const res = await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${user.token}`)
          .expect(403);
        expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
        expect(await prisma.attendance.count({ where: { userId: user.id } })).toBe(0);
      },
    );
  });
});
