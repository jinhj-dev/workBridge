// 月間休暇カレンダー API(GET /dashboard/leave-calendar・/leave-calendar/day)の e2e。
// 実際のテスト用 DB を使い、月集計の raw SQL(countApprovedLeavesByDay)を DB 上で検証する。
// 集計は DB 全体が対象のため、データは他と重ならない 2098 年に置き、実行前の基準値からの増減で確認する。
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { LeaveType, PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker } from './db/db-helpers.js';
import {
  createTestApp,
  createTokenSigner,
  DEFAULT_NOW,
  FixedClock,
  insertLeave,
} from './e2e-helpers.js';

interface DayCount {
  date: string;
  count: number;
}
interface MonthBody {
  month: string;
  days: DayCount[];
}
interface DayItem {
  userId: string;
  name: string;
  departmentName: string;
  halfDay: 'AM' | 'PM' | null;
}
interface DayBody {
  date: string;
  items: DayItem[];
}
interface ErrorBody {
  code?: string;
  details?: { field: string }[];
}
interface Actor {
  id: string;
  empId: string;
  token: string;
}

const MONTH_PATH = '/api/v1/dashboard/leave-calendar';
const DAY_PATH = '/api/v1/dashboard/leave-calendar/day';
// シナリオの対象月(2098 年は他のデータと重ならない)
const SCENARIO_MONTHS = ['2098-01', '2098-02', '2098-03'];

describe('月間休暇カレンダー API(e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let tracker: TestDataTracker;
  let clock: FixedClock;
  let sign: (userId: string) => Promise<string>;
  let adminToken: string;
  let employeeToken: string;
  // 日付 → 実行前の件数(SCENARIO_MONTHS の範囲)
  let baseline: Map<string, number>;
  let departmentName: string;
  let approverId: string;
  const actors: Record<string, Actor> = {};
  const idOf = (key: string): string => actors[key]?.id ?? '';

  beforeAll(async () => {
    prisma = createTestPrisma();
    tracker = new TestDataTracker(prisma);
    clock = new FixedClock();
    sign = createTokenSigner();
    app = await createTestApp(clock);

    const approver = await tracker.createUser({ role: 'ADMIN', mustChangePassword: false });
    approverId = approver.id;
    adminToken = await sign(approver.id);
    const dept = await tracker.createDepartment();
    departmentName = dept.name;

    // 実行前の基準値(他テストの残骸があっても増減で判定できるように)
    baseline = await countsOf(adminToken, SCENARIO_MONTHS);

    const emp = async (key: string, overrides: Record<string, unknown> = {}): Promise<void> => {
      const user = await tracker.createUser({
        departmentId: dept.id,
        mustChangePassword: false,
        ...overrides,
      });
      actors[key] = { id: user.id, empId: user.empId, token: await sign(user.id) };
    };
    await emp('A', { name: '山田太郎' });
    await emp('B');
    await emp('C');
    await emp('D');
    await emp('E');
    await emp('Q1');
    await emp('Q2');
    await emp('Q3');
    await emp('F');
    await emp('G');
    await emp('H');
    await emp('R', { isActive: false });
    await emp('I');
    await emp('J');
    await emp('K');
    await emp('L');
    await emp('M');
    await emp('N');
    await emp('O');
    await emp('S');
    await emp('U1');
    await emp('P');
    await emp('X');
    // 同日の並び替え確認用(社員番号を作成順と逆にする)
    const suffix = Date.now().toString(36).toUpperCase();
    await emp('T1', { empId: `CAL${suffix}-03` });
    await emp('T2', { empId: `CAL${suffix}-01` });
    await emp('T3', { empId: `CAL${suffix}-02` });
    employeeToken = await sign(idOf('A'));

    const approved = (
      key: string,
      startDate: string,
      endDate: string,
      leaveType: LeaveType = 'ANNUAL',
      days = 1,
    ) =>
      insertLeave(prisma, {
        userId: idOf(key),
        approverId,
        status: 'APPROVED',
        leaveType,
        startDate,
        endDate,
        days,
      });
    const halfDays = (
      key: string,
      date: string,
      leaveType: 'HALF_AM' | 'HALF_PM',
      status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'CANCELLED' = 'APPROVED',
    ) =>
      insertLeave(prisma, {
        userId: idOf(key),
        approverId,
        status,
        leaveType,
        startDate: date,
        endDate: date,
        days: 0.5,
      });
    const withStatus = (key: string, date: string, status: 'PENDING' | 'REJECTED' | 'CANCELLED') =>
      insertLeave(prisma, {
        userId: idOf(key),
        approverId,
        status,
        startDate: date,
        endDate: date,
      });

    // 週の全日(月〜金)・週末またぎ(金〜翌週月)
    await approved('A', '2098-03-03', '2098-03-07', 'ANNUAL', 5);
    await approved('B', '2098-03-14', '2098-03-17', 'ANNUAL', 2);
    // 単日・月末
    await approved('U1', '2098-03-31', '2098-03-31');
    // 同一社員の午前+午後(件数1・半休判定は null)
    await halfDays('C', '2098-03-10', 'HALF_AM');
    await halfDays('C', '2098-03-10', 'HALF_PM');
    // 同日に別の社員2名(件数2)
    await approved('D', '2098-03-11', '2098-03-11');
    await approved('E', '2098-03-11', '2098-03-11');
    // 承認済み以外のみ(件数に入らない)
    await withStatus('Q1', '2098-03-12', 'PENDING');
    await withStatus('Q2', '2098-03-12', 'REJECTED');
    await withStatus('Q3', '2098-03-12', 'CANCELLED');
    // 承認済み1 + 承認待ち1 + 却下1(件数1)
    await approved('F', '2098-03-18', '2098-03-18');
    await withStatus('G', '2098-03-18', 'PENDING');
    await withStatus('H', '2098-03-18', 'REJECTED');
    // 非活性社員の承認済み(除外)
    await approved('R', '2098-03-19', '2098-03-19');
    // 同一社員に終日 + 午後半休(DISTINCT で1件、半休判定は null)
    await approved('I', '2098-03-20', '2098-03-20');
    await halfDays('I', '2098-03-20', 'HALF_PM');
    // 午前半休・午後半休(別社員)
    await halfDays('J', '2098-03-21', 'HALF_AM');
    await halfDays('K', '2098-03-21', 'HALF_PM');
    // 午前半休(承認済み)+ 午後半休(承認待ち):承認済みのみで判定 → AM
    await halfDays('L', '2098-03-24', 'HALF_AM');
    await halfDays('L', '2098-03-24', 'HALF_PM', 'PENDING');
    // 単日 ANNUAL と 複数日 SPECIAL(半休判定は null)
    await approved('M', '2098-03-25', '2098-03-25');
    await approved('N', '2098-03-25', '2098-03-27', 'SPECIAL', 3);
    // 単日 OTHER
    await approved('O', '2098-03-26', '2098-03-26', 'OTHER');
    // 土曜を含む期間(土曜は集計・一覧に出ない)
    await approved('S', '2098-03-28', '2098-03-30', 'ANNUAL', 3);
    // 同日に3名(並び順確認)
    await approved('T1', '2098-03-19', '2098-03-19');
    await approved('T2', '2098-03-19', '2098-03-19');
    await approved('T3', '2098-03-19', '2098-03-19');
    // 月またぎ(1/29〜2/3)
    await approved('X', '2098-01-29', '2098-02-03', 'ANNUAL', 6);
    // 過去日(2026 年 10 月)
    await approved('P', '2026-10-05', '2026-10-05');
  });

  afterAll(async () => {
    try {
      await tracker?.cleanup();
    } finally {
      await app?.close();
      await prisma?.$disconnect();
    }
  });

  // 認証トークンを付けて GET する(token なしは未認証の確認用)
  function get(path: string, token: string | undefined, query: Record<string, string> = {}) {
    const req = request(app.getHttpServer()).get(path).query(query);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  async function getMonth(month?: string, token = adminToken): Promise<MonthBody> {
    const res = await get(MONTH_PATH, token, month ? { month } : {}).expect(200);
    return res.body as MonthBody;
  }

  async function getDay(date: string, token = adminToken): Promise<DayBody> {
    const res = await get(DAY_PATH, token, { date }).expect(200);
    return res.body as DayBody;
  }

  // 指定月の日別件数(日付 → 件数)
  async function countsOf(token: string, months: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const month of months) {
      const body = await getMonth(month, token);
      for (const day of body.days) {
        counts.set(day.date, day.count);
      }
    }
    return counts;
  }

  // 実行前からの増減
  function deltaOf(counts: Map<string, number>, date: string): number {
    return (counts.get(date) ?? 0) - (baseline.get(date) ?? 0);
  }

  // 日付の項目から、今回作成した社員の行だけを取り出す
  function ours(items: DayItem[], keys: string[]): DayItem[] {
    const ids = new Set(keys.map(idOf));
    return items.filter((item) => ids.has(item.userId));
  }

  describe('月集計 GET /dashboard/leave-calendar', () => {
    let counts: Map<string, number>;

    beforeAll(async () => {
      counts = await countsOf(adminToken, SCENARIO_MONTHS);
    });

    it('shouldCountSingleDayLeaveOnlyOnThatDate', () => {
      expect(deltaOf(counts, '2098-03-31')).toBe(1);
      expect(deltaOf(counts, '2098-03-30')).toBe(0);
    });

    it('shouldCountEachWeekdayOfMultiDayLeave', () => {
      for (const date of ['2098-03-03', '2098-03-04', '2098-03-05', '2098-03-06', '2098-03-07']) {
        expect(deltaOf(counts, date)).toBe(1);
      }
    });

    it('shouldExcludeWeekendDaysInsideLeaveRange', () => {
      // B: 金(3/14)〜翌週月(3/17)。土日(3/15・3/16)は含まない
      expect(deltaOf(counts, '2098-03-14')).toBe(1);
      expect(deltaOf(counts, '2098-03-15')).toBe(0);
      expect(deltaOf(counts, '2098-03-16')).toBe(0);
      expect(deltaOf(counts, '2098-03-17')).toBe(1);
      // S: 金〜日(3/28〜3/30)。土日は 0
      expect(deltaOf(counts, '2098-03-28')).toBe(1);
      expect(deltaOf(counts, '2098-03-29')).toBe(0);
      expect(deltaOf(counts, '2098-03-30')).toBe(0);
    });

    it('shouldCountSameUserOnceWhenAmAndPmOnSameDay', () => {
      expect(deltaOf(counts, '2098-03-10')).toBe(1);
    });

    it('shouldCountDistinctUsersOnSameDay', () => {
      expect(deltaOf(counts, '2098-03-11')).toBe(2);
    });

    it('shouldIgnorePendingRejectedAndCancelledLeaves', () => {
      expect(deltaOf(counts, '2098-03-12')).toBe(0);
    });

    it('shouldCountApprovedOnlyWhenSameDayHasOtherStatuses', () => {
      expect(deltaOf(counts, '2098-03-18')).toBe(1);
    });

    it('shouldExcludeInactiveUsers', () => {
      expect(deltaOf(counts, '2098-03-19')).toBe(3); // T1〜T3 のみ。R(非活性)は含まない
    });

    it('shouldCountUserOnceWhenAnnualAndPmOverlap', () => {
      expect(deltaOf(counts, '2098-03-20')).toBe(1);
    });

    it('shouldCountEachHalfDayUserOnItsDate', () => {
      expect(deltaOf(counts, '2098-03-21')).toBe(2);
      expect(deltaOf(counts, '2098-03-24')).toBe(1);
    });

    it('shouldCountMultiDayOtherAndSpecialLeaveOnEachWeekday', () => {
      expect(deltaOf(counts, '2098-03-25')).toBe(2); // M + N
      expect(deltaOf(counts, '2098-03-26')).toBe(2); // N + O
      expect(deltaOf(counts, '2098-03-27')).toBe(1); // N
    });

    it('shouldListDatesInMonthOrderWithoutDuplicates', async () => {
      const body = await getMonth('2098-03');
      const dates = body.days.map((day) => day.date);
      expect(new Set(dates).size).toBe(dates.length);
      expect([...dates].sort()).toEqual(dates);
      expect(dates.every((date) => date.startsWith('2098-03-'))).toBe(true);
    });

    it('shouldReturnOnlyDatesInsideRequestedMonthAcrossMonthBoundary', async () => {
      // X: 2098-01-29(水)〜2098-02-03(月)。1 月・2 月の両方で、各月の日付だけが返る
      const jan = await getMonth('2098-01');
      const feb = await getMonth('2098-02');
      expect(jan.days.every((day) => day.date.startsWith('2098-01-'))).toBe(true);
      expect(feb.days.every((day) => day.date.startsWith('2098-02-'))).toBe(true);
      expect(deltaOf(counts, '2098-01-29')).toBe(1);
      expect(deltaOf(counts, '2098-01-30')).toBe(1);
      expect(deltaOf(counts, '2098-01-31')).toBe(1);
      expect(deltaOf(counts, '2098-02-01')).toBe(0);
      expect(deltaOf(counts, '2098-02-02')).toBe(0);
      expect(deltaOf(counts, '2098-02-03')).toBe(1);
    });

    it('shouldIncludePastMonthLeave', async () => {
      const body = await getMonth('2026-10');
      expect(body.days).toContainEqual({ date: '2026-10-05', count: 1 });
    });

    it('shouldReturnMonthAndDaysShapeWithExactKeys', async () => {
      const body = await getMonth('2098-03');
      expect(Object.keys(body).sort()).toEqual(['days', 'month']);
      expect(body.month).toBe('2098-03');
      for (const day of body.days) {
        expect(Object.keys(day).sort()).toEqual(['count', 'date']);
        expect(typeof day.count).toBe('number');
        expect(day.count).toBeGreaterThanOrEqual(1);
      }
    });

    it('shouldReturnSameBodyForEmployeeAndAdmin', async () => {
      const admin = await getMonth('2098-03', adminToken);
      const employee = await getMonth('2098-03', employeeToken);
      expect(employee).toEqual(admin);
    });

    it('shouldUseTokyoCurrentMonthWhenMonthOmitted', async () => {
      const defaultMonthOf = async (): Promise<string> => {
        const res = await get(MONTH_PATH, adminToken).expect(200);
        return (res.body as MonthBody).month;
      };
      try {
        // 2026-10-31 15:30Z は東京の 2026-11-01 00:30
        clock.set('2026-10-31T15:30:00Z');
        expect(await defaultMonthOf()).toBe('2026-11');
        // 2026-11-30 15:00Z は東京の 2026-12-01 00:00
        clock.set('2026-11-30T15:00:00Z');
        expect(await defaultMonthOf()).toBe('2026-12');
        // 2026-11-30 14:59:59Z は東京の 2026-11-30 23:59:59
        clock.set('2026-11-30T14:59:59Z');
        expect(await defaultMonthOf()).toBe('2026-11');
      } finally {
        clock.set(DEFAULT_NOW);
      }
    });

    it('shouldUseTokyoMonthForDefaultWhenClockIsDefault', async () => {
      const res = await get(MONTH_PATH, adminToken).expect(200);
      expect((res.body as MonthBody).month).toBe('2026-11');
    });

    it.each(['2026-13', '2026-1', 'abcd', '1999-12', '2101-01'])(
      'shouldReturn400WhenMonthIs%s',
      async (month) => {
        const res = await get(MONTH_PATH, adminToken, { month }).expect(400);
        const body = res.body as ErrorBody;
        expect(body.code).toBe('VALIDATION_ERROR');
        expect(body.details?.[0]?.field).toBe('month');
      },
    );
  });

  describe('日別一覧 GET /dashboard/leave-calendar/day', () => {
    it('shouldIncludeUserOnMiddleDayOfMultiDayLeaveWithNameAndDepartment', async () => {
      const body = await getDay('2098-03-04');
      const row = ours(body.items, ['A'])[0];
      expect(row).toEqual({
        userId: idOf('A'),
        empId: actors.A.empId,
        name: '山田太郎',
        departmentName,
        halfDay: null,
      });
    });

    it('shouldListUsersInEmployeeIdOrderOnSameDay', async () => {
      const body = await getDay('2098-03-19');
      // T2(-01)、T3(-02)、T1(-03) の順。非活性の R は含まない
      const keys = ['T1', 'T2', 'T3'];
      const list = ours(body.items, keys).map((item) => item.userId);
      expect(list).toEqual([idOf('T2'), idOf('T3'), idOf('T1')]);
      expect(body.items.map((item) => item.userId)).not.toContain(idOf('R'));
    });

    it('shouldShowSingleRowWhenAmAndPmBothApproved', async () => {
      const body = await getDay('2098-03-10');
      const rows = ours(body.items, ['C']);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.halfDay).toBeNull();
    });

    it('shouldShowAmWhenOnlyAmApproved', async () => {
      const body = await getDay('2098-03-21');
      expect(ours(body.items, ['J'])[0]?.halfDay).toBe('AM');
      expect(ours(body.items, ['K'])[0]?.halfDay).toBe('PM');
    });

    it('shouldShowAmIgnoringPendingPmHalf', async () => {
      const body = await getDay('2098-03-24');
      const rows = ours(body.items, ['L']);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.halfDay).toBe('AM');
    });

    it('shouldShowNullWhenFullDayAndPmOverlap', async () => {
      const body = await getDay('2098-03-20');
      const rows = ours(body.items, ['I']);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.halfDay).toBeNull();
    });

    it('shouldShowNullForSpecialAndOtherLeave', async () => {
      const day25 = await getDay('2098-03-25');
      expect(ours(day25.items, ['M'])[0]?.halfDay).toBeNull();
      expect(ours(day25.items, ['N'])[0]?.halfDay).toBeNull();
      const day26 = await getDay('2098-03-26');
      expect(ours(day26.items, ['O'])[0]?.halfDay).toBeNull();
    });

    it('shouldExcludeNonApprovedAndInactiveUsers', async () => {
      const day12 = await getDay('2098-03-12');
      expect(ours(day12.items, ['Q1', 'Q2', 'Q3'])).toEqual([]);
      const day19 = await getDay('2098-03-19');
      expect(day19.items.map((item) => item.userId)).not.toContain(idOf('R'));
    });

    it('shouldReturnEmptyItemsForWeekend', async () => {
      // 土曜(3/29)は休暇期間内でも DB を見ずに空
      const body = await getDay('2098-03-29');
      expect(body).toEqual({ date: '2098-03-29', items: [] });
      const sunday = await getDay('2098-03-08');
      expect(sunday).toEqual({ date: '2098-03-08', items: [] });
    });

    it('shouldReturnNoOurUsersOnWeekdayWithoutLeave', async () => {
      const body = await getDay('2098-03-23');
      expect(body.date).toBe('2098-03-23');
      expect(ours(body.items, ['A', 'B', 'C', 'S', 'U1'])).toEqual([]);
    });

    it('shouldReturnPastDateLeave', async () => {
      const body = await getDay('2026-10-05');
      expect(ours(body.items, ['P'])).toEqual([
        {
          userId: idOf('P'),
          empId: actors.P.empId,
          name: 'テスト太郎',
          departmentName,
          halfDay: null,
        },
      ]);
    });

    it('shouldRejectMissingOrInvalidDateWith400', async () => {
      // 連年範囲(2000〜2100)の外も 400
      for (const date of [undefined, '2026-02-30', '2026/11/10', '1999-12-31', '2101-01-01']) {
        const res = await get(DAY_PATH, adminToken, date === undefined ? {} : { date }).expect(400);
        const body = res.body as ErrorBody;
        expect(body.code).toBe('VALIDATION_ERROR');
        expect(body.details?.[0]?.field).toBe('date');
      }
    });

    it('shouldReturnOnlyPublicFieldsForEachItem', async () => {
      const body = await getDay('2098-03-04');
      expect(body.items.length).toBeGreaterThan(0);
      for (const item of body.items) {
        expect(Object.keys(item).sort()).toEqual([
          'departmentName',
          'empId',
          'halfDay',
          'name',
          'userId',
        ]);
        expect(['AM', 'PM', null]).toContain(item.halfDay);
      }
    });

    it('shouldMatchMonthCountWithDayItemCount', async () => {
      const dates = [
        '2098-03-03',
        '2098-03-10',
        '2098-03-11',
        '2098-03-18',
        '2098-03-20',
        '2098-03-21',
        '2098-03-25',
        '2098-03-27',
      ];
      const month = await getMonth('2098-03');
      for (const date of dates) {
        const count = month.days.find((day) => day.date === date)?.count ?? 0;
        const day = await getDay(date);
        expect(day.items.length).toBe(count);
      }
    });

    it('shouldAllowEmployeeAndAdminWithSameBody', async () => {
      const admin = await getDay('2098-03-11', adminToken);
      const employee = await getDay('2098-03-11', employeeToken);
      expect(employee).toEqual(admin);
    });
  });

  describe('認証・権限', () => {
    it('shouldReturn401WhenTokenMissingOnBothEndpoints', async () => {
      await get(MONTH_PATH, undefined).expect(401);
      await get(DAY_PATH, undefined, { date: '2098-03-04' }).expect(401);
    });

    it('shouldReturn403PasswordChangeRequiredOnBothEndpoints', async () => {
      const pending = await tracker.createUser({ mustChangePassword: true });
      const token = await sign(pending.id);
      const month = await get(MONTH_PATH, token, { month: '2098-03' }).expect(403);
      expect((month.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
      const day = await get(DAY_PATH, token, { date: '2098-03-04' }).expect(403);
      expect((day.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
    });
  });
});
