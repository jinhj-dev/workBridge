// 出勤簿の月間表示 API(GET /attendance/monthly、API-ATT-007)の e2e。実際のテスト用 DB を使う。
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker } from './db/db-helpers.js';
import {
  createTestApp,
  createTokenSigner,
  FixedClock,
  insertAttendance,
  insertLeave,
} from './e2e-helpers.js';

interface SheetDayBody {
  date: string;
  dayType: string;
  holidayName: string | null;
  attendance: { id: string; status: string; clockOut: string | null } | null;
  breakTime: { minutes: number; source: string; start: string | null } | null;
  actualWorkMinutes: number | null;
  overtimeMinutes: number;
  nightMinutes: number;
  leaves: { id: string; leaveType: string; status: string }[];
}
interface SheetBody {
  month: string;
  days: SheetDayBody[];
  summary: Record<string, number>;
}
interface ErrorBody {
  code?: string;
  details?: { field: string }[];
}

const PATH = '/api/v1/attendance/monthly';

describe('出勤簿 月間表示 API(e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let tracker: TestDataTracker;
  let clock: FixedClock;
  let userId: string;
  let token: string;
  let otherToken: string;

  const get = (query: string, bearer = token): request.Test =>
    request(app.getHttpServer()).get(`${PATH}${query}`).set('Authorization', `Bearer ${bearer}`);
  const dayOf = (body: SheetBody, date: string): SheetDayBody => {
    const found = body.days.find((day) => day.date === date);
    if (!found) {
      throw new Error(`day not found: ${date}`);
    }
    return found;
  };

  beforeAll(async () => {
    prisma = createTestPrisma();
    tracker = new TestDataTracker(prisma);
    clock = new FixedClock();
    const sign = createTokenSigner();
    app = await createTestApp(clock);

    const user = await tracker.createUser({ mustChangePassword: false });
    const other = await tracker.createUser({ mustChangePassword: false });
    userId = user.id;
    token = await sign(user.id);
    otherToken = await sign(other.id);

    // 2026-11 のデータ(固定時刻は 11-09 09:00 JST)
    await insertAttendance(prisma, {
      userId,
      workDate: '2026-11-02',
      clockIn: '2026-11-02T09:00:00+09:00',
      clockOut: '2026-11-02T18:30:00+09:00',
    });
    await insertAttendance(prisma, {
      userId,
      workDate: '2026-11-04',
      clockIn: '2026-11-04T13:00:00+09:00',
      clockOut: '2026-11-04T23:30:00+09:00',
    });
    await insertAttendance(prisma, {
      userId,
      workDate: '2026-11-07',
      clockIn: '2026-11-07T10:00:00+09:00',
      clockOut: '2026-11-07T14:00:00+09:00',
    });
    await insertAttendance(prisma, {
      userId,
      workDate: '2026-11-09',
      clockIn: '2026-11-09T09:00:00+09:00',
    });
    // 他人の勤怠(混ざらないこと)
    await insertAttendance(prisma, {
      userId: other.id,
      workDate: '2026-11-05',
      clockIn: '2026-11-05T09:00:00+09:00',
      clockOut: '2026-11-05T18:00:00+09:00',
    });
    const approverId = other.id;
    // 午後半休(申請中)・文化の日(平日の祝日)の年休・却下・週末をまたぐ年休
    await insertLeave(prisma, {
      userId,
      approverId,
      status: 'PENDING',
      leaveType: 'HALF_PM',
      days: 0.5,
      startDate: '2026-11-02',
    });
    await insertLeave(prisma, {
      userId,
      approverId,
      status: 'APPROVED',
      startDate: '2026-11-03',
    });
    await insertLeave(prisma, {
      userId,
      approverId,
      status: 'REJECTED',
      startDate: '2026-11-05',
    });
    await insertLeave(prisma, {
      userId,
      approverId,
      status: 'APPROVED',
      startDate: '2026-11-12',
      endDate: '2026-11-16',
      days: 3,
    });
  });

  afterAll(async () => {
    await tracker.cleanup();
    await app.close();
    await prisma.$disconnect();
  });

  it('shouldReturn401WhenNotAuthenticated', async () => {
    await request(app.getHttpServer()).get(PATH).expect(401);
  });

  it.each(['2026-13', '2026-1', '1999-12', '2101-01', '2026-11-01', 'abc'])(
    'shouldReturn400WhenMonthIsInvalid %s',
    async (month) => {
      const res = await get(`?month=${month}`).expect(400);
      const body = res.body as ErrorBody;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details?.[0]?.field).toBe('month');
    },
  );

  it('shouldReturnCurrentTokyoMonthWhenMonthIsOmitted', async () => {
    const body = (await get('').expect(200)).body as SheetBody;
    expect(body.month).toBe('2026-11');
    expect(body.days).toHaveLength(30);
    expect(body.days[0]?.date).toBe('2026-11-01');
    expect(body.days[29]?.date).toBe('2026-11-30');
  });

  it('shouldReturnDayTypeAndHolidayName', async () => {
    const body = (await get('?month=2026-11').expect(200)).body as SheetBody;
    expect(dayOf(body, '2026-11-02').dayType).toBe('WEEKDAY');
    expect(dayOf(body, '2026-11-03')).toMatchObject({
      dayType: 'HOLIDAY',
      holidayName: '文化の日',
    });
    expect(dayOf(body, '2026-11-07').dayType).toBe('WEEKEND');
    expect(dayOf(body, '2026-11-23').holidayName).toBe('勤労感謝の日');
  });

  it('shouldCalculateBreakOvertimeAndNight', async () => {
    const body = (await get('?month=2026-11').expect(200)).body as SheetBody;
    const monday = dayOf(body, '2026-11-02');
    expect(monday.attendance?.status).toBe('DONE');
    expect(monday.breakTime).toMatchObject({
      minutes: 60,
      source: 'LEGAL_MINIMUM',
      start: '2026-11-02T13:15:00+09:00',
    });
    expect(monday.actualWorkMinutes).toBe(510);
    expect(monday.overtimeMinutes).toBe(30);
    const wednesday = dayOf(body, '2026-11-04');
    expect(wednesday.overtimeMinutes).toBe(90);
    expect(wednesday.nightMinutes).toBe(90);
    const today = dayOf(body, '2026-11-09');
    expect(today.attendance?.status).toBe('WORKING');
    expect(today.breakTime).toBeNull();
    expect(today.actualWorkMinutes).toBeNull();
  });

  it('shouldIncludePendingAndApprovedLeavesOnlyOnWeekdays', async () => {
    const body = (await get('?month=2026-11').expect(200)).body as SheetBody;
    expect(dayOf(body, '2026-11-02').leaves).toMatchObject([
      { leaveType: 'HALF_PM', status: 'PENDING' },
    ]);
    expect(dayOf(body, '2026-11-03').leaves).toMatchObject([
      { leaveType: 'ANNUAL', status: 'APPROVED' },
    ]);
    expect(dayOf(body, '2026-11-05').leaves).toEqual([]);
    expect(dayOf(body, '2026-11-12').leaves).toHaveLength(1);
    expect(dayOf(body, '2026-11-14').leaves).toEqual([]);
    expect(dayOf(body, '2026-11-15').leaves).toEqual([]);
    expect(dayOf(body, '2026-11-16').leaves).toHaveLength(1);
  });

  it('shouldSummarizeMonth', async () => {
    const body = (await get('?month=2026-11').expect(200)).body as SheetBody;
    expect(body.summary).toEqual({
      scheduledWorkDays: 19,
      actualWorkDays: 3,
      actualWorkMinutes: 510 + 570 + 240,
      overtimeMinutes: 120,
      nightMinutes: 90,
      holidayWorkMinutes: 240,
      // 11-03 の年休 1 + 11-12〜16 の平日 3 日(12・13・16)
      paidLeaveDays: 4,
    });
  });

  it('shouldNotMixOtherUsersData', async () => {
    const body = (await get('?month=2026-11', otherToken).expect(200)).body as SheetBody;
    expect(dayOf(body, '2026-11-02').attendance).toBeNull();
    expect(dayOf(body, '2026-11-05').attendance).not.toBeNull();
    expect(body.days.flatMap((day) => day.leaves)).toEqual([]);
  });

  it('shouldReturnAllDaysWithoutHolidaysWhenYearIsOutOfLibraryRange', async () => {
    const body = (await get('?month=2100-01').expect(200)).body as SheetBody;
    expect(body.days).toHaveLength(31);
    expect(body.days.every((day) => day.dayType !== 'HOLIDAY')).toBe(true);
  });

  it.each([
    ['2026-02', 28],
    ['2028-02', 29],
  ])('shouldReturnDaysOfMonthWhenMonthIs %s', async (month, count) => {
    const body = (await get(`?month=${month}`).expect(200)).body as SheetBody;
    expect(body.days).toHaveLength(count);
    expect(body.days.at(-1)?.date).toBe(`${month}-${count}`);
  });

  it('shouldReturn403PasswordChangeRequiredWhenMustChangePassword', async () => {
    const mustChange = await tracker.createUser({ mustChangePassword: true });
    const mustChangeToken = await createTokenSigner()(mustChange.id);
    const res = await get('?month=2026-11', mustChangeToken).expect(403);
    expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  describe('月境界・取消・不変性・既存 API の回帰', () => {
    let boundaryUserId: string;
    let boundaryToken: string;

    beforeAll(async () => {
      const sign = createTokenSigner();
      const boundary = await tracker.createUser({ mustChangePassword: false });
      const approver = await tracker.createUser({ mustChangePassword: false });
      boundaryUserId = boundary.id;
      boundaryToken = await sign(boundary.id);

      // 10/31(土) 23:00 出勤 → 11/1 02:00 退勤。勤務日は出勤日(10/31)の行になる
      await insertAttendance(prisma, {
        userId: boundaryUserId,
        workDate: '2026-10-31',
        clockIn: '2026-10-31T23:00:00+09:00',
        clockOut: '2026-11-01T02:00:00+09:00',
      });
      // 10/30(金)〜11/2(月)の年休。月ごとに、その月の日付の行にだけ出る
      await insertLeave(prisma, {
        userId: boundaryUserId,
        approverId: approver.id,
        status: 'APPROVED',
        startDate: '2026-10-30',
        endDate: '2026-11-02',
        days: 2,
      });
      // 取消済み(CANCELLED)は出勤簿に出さない
      await insertLeave(prisma, {
        userId: boundaryUserId,
        approverId: approver.id,
        status: 'CANCELLED',
        startDate: '2026-11-20',
      });
    });

    it('shouldIncludeOvernightWorkOnlyInStartMonth', async () => {
      const oct = (await get('?month=2026-10', boundaryToken).expect(200)).body as SheetBody;
      const nov = (await get('?month=2026-11', boundaryToken).expect(200)).body as SheetBody;
      const overnight = dayOf(oct, '2026-10-31');
      expect(overnight.attendance).toMatchObject({
        status: 'DONE',
        clockOut: '2026-11-01T02:00:00+09:00',
      });
      expect(overnight.actualWorkMinutes).toBe(180);
      expect(overnight.breakTime?.minutes).toBe(0);
      expect(overnight.nightMinutes).toBe(180);
      expect(dayOf(nov, '2026-11-01').attendance).toBeNull();
      expect(nov.days.flatMap((day) => (day.attendance ? [day.attendance.id] : []))).not.toContain(
        overnight.attendance?.id,
      );
    });

    it('shouldShowMonthBoundaryLeaveOnlyOnDaysInsideEachMonth', async () => {
      const oct = (await get('?month=2026-10', boundaryToken).expect(200)).body as SheetBody;
      const nov = (await get('?month=2026-11', boundaryToken).expect(200)).body as SheetBody;
      expect(dayOf(oct, '2026-10-30').leaves).toMatchObject([
        { leaveType: 'ANNUAL', status: 'APPROVED' },
      ]);
      expect(dayOf(oct, '2026-10-31').leaves).toEqual([]);
      expect(dayOf(nov, '2026-11-01').leaves).toEqual([]);
      expect(dayOf(nov, '2026-11-02').leaves).toMatchObject([
        { leaveType: 'ANNUAL', status: 'APPROVED' },
      ]);
      expect(nov.days.filter((day) => day.leaves.length > 0).map((day) => day.date)).toEqual([
        '2026-11-02',
      ]);
    });

    it('shouldExcludeCancelledLeaveFromSheet', async () => {
      const nov = (await get('?month=2026-11', boundaryToken).expect(200)).body as SheetBody;
      expect(dayOf(nov, '2026-11-20').leaves).toEqual([]);
      expect(nov.days.flatMap((day) => day.leaves.map((leave) => leave.status))).not.toContain(
        'CANCELLED',
      );
    });

    it('shouldNotChangeAttendanceOrLeaveRowsWhenViewing', async () => {
      const snapshot = async (): Promise<{
        attendance: unknown[];
        leaves: unknown[];
      }> => ({
        attendance: await prisma.attendance.findMany({
          where: { userId: boundaryUserId },
          orderBy: { workDate: 'asc' },
        }),
        leaves: await prisma.leave.findMany({
          where: { userId: boundaryUserId },
          orderBy: { startDate: 'asc' },
        }),
      });
      const before = await snapshot();
      expect(before.attendance.length).toBeGreaterThan(0);
      expect(before.leaves.length).toBeGreaterThan(0);
      await get('?month=2026-10', boundaryToken).expect(200);
      await get('?month=2026-11', boundaryToken).expect(200);
      expect(await snapshot()).toEqual(before);
    });

    it('shouldKeepBoundWorkMinutesInHistoryApi', async () => {
      // 既存 API-ATT-004: workMinutes は拘束時間(休憩を引かない)のまま
      const res = await request(app.getHttpServer())
        .get('/api/v1/attendance')
        .query({ startDate: '2026-10-31', endDate: '2026-10-31' })
        .set('Authorization', `Bearer ${boundaryToken}`)
        .expect(200);
      const items = (res.body as { items: { workMinutes: number | null }[] }).items;
      expect(items[0]?.workMinutes).toBe(180);
    });

    it('shouldKeepWeekdayHolidayLeaveDeductedInBalanceApi', async () => {
      // 既存 API-LEAVE(残日数): 公休ではなく平日扱い。11/3(文化の日)の年休も差し引く
      const res = await request(app.getHttpServer())
        .get('/api/v1/leaves/balance?year=2026')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toMatchObject({ approvedDays: 4, pendingDays: 0.5 });
    });
  });
});
