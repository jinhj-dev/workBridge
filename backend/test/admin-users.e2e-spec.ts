// 管理者の社員管理 API(API-USER-001〜007)の e2e。実際のテスト用 DB(workbridge_test)を使う
// 一覧・採番は DB 全体が対象になるため、各テストは自分で作ったデータ(一意の接尾辞)で絞り込んで検証する
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Logger, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { vi } from 'vitest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker, uniqueSuffix } from './db/db-helpers.js';
import {
  createTestApp,
  createTokenSigner,
  DEFAULT_NOW,
  FixedClock,
  insertLeave,
  insertLeaveGrant,
} from './e2e-helpers.js';

const PATH = '/api/v1/admin/users';
const PASSWORD = 'Temp1234';

interface UserBody {
  id: string;
  empId: string;
  name: string;
  hireDate: string;
  departmentId: string;
  departmentName: string;
  role: string;
  approvalRequired: boolean;
  isActive: boolean;
  employmentStatus: 'ACTIVE' | 'UPCOMING' | 'INACTIVE';
  jobTitle: { id: string; name: string; tone: string } | null;
  contactEmail: string | null;
  createdAt: string;
  mustChangePassword?: boolean;
  updatedAt?: string;
  pendingApprovalCount?: number;
  leaveGrants?: { year: number; grantedDays: number }[];
  initialPassword?: unknown;
  passwordHash?: unknown;
}
interface ListBody {
  items: UserBody[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}
interface ErrorBody {
  statusCode?: number;
  code?: string;
  message?: string;
  details?: { field: string; message: string }[];
}

// 5 桁の数字だけを対象にした次の社員番号(設計の採番規則と同じ)
async function expectedNextEmpId(prisma: PrismaClient): Promise<string> {
  const users = await prisma.user.findMany({ select: { empId: true } });
  const numbers = users
    .map((user) => user.empId)
    .filter((empId) => /^[0-9]{5}$/.test(empId))
    .map(Number);
  const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
  return String(next).padStart(5, '0');
}

// 6 桁の数字を一意に作る(MANUAL 登録用)
function uniqueNumericEmpId(): string {
  return String(100000 + Math.floor(Math.random() * 800000));
}

describe('管理者 社員 API(e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let tracker: TestDataTracker;
  let adminId: string;
  let adminToken: string;
  let employeeToken: string;
  let passwordChangeToken: string;
  let defaultDepartmentId: string;
  let defaultJobTitleId: string;
  const clock = new FixedClock();
  const sign = createTokenSigner();

  beforeAll(async () => {
    prisma = createTestPrisma();
    tracker = new TestDataTracker(prisma);
    app = await createTestApp(clock);
    const admin = await tracker.createUser({ role: 'ADMIN', mustChangePassword: false });
    adminId = admin.id;
    adminToken = await sign(admin.id);
    const employee = await tracker.createUser({ mustChangePassword: false });
    employeeToken = await sign(employee.id);
    const pending = await tracker.createUser({ mustChangePassword: true });
    passwordChangeToken = await sign(pending.id);
    defaultDepartmentId = (await tracker.createDepartment()).id;
    defaultJobTitleId = (await tracker.createJobTitle()).id;
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

  function authed(method: 'get' | 'post' | 'patch' | 'delete', path: string, token: string) {
    return request(app.getHttpServer())[method](`${PATH}${path}`).set(
      'Authorization',
      `Bearer ${token}`,
    );
  }

  // 有効な登録ボディ(テストごとに一意の名前・メール)
  function createBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const suffix = uniqueSuffix();
    return {
      empIdMode: 'AUTO',
      empId: null,
      name: `E2E社員${suffix}`,
      initialPassword: PASSWORD,
      jobTitleId: defaultJobTitleId,
      contactEmail: `e2e-${suffix.toLowerCase()}@example.com`,
      departmentId: defaultDepartmentId,
      hireDate: '2026-04-01',
      role: 'EMPLOYEE',
      approvalRequired: true,
      ...overrides,
    };
  }

  describe('権限', () => {
    const endpoints: { method: 'get' | 'post' | 'patch'; path: string }[] = [
      { method: 'get', path: '' },
      { method: 'get', path: '/summary' },
      { method: 'get', path: '/next-emp-id' },
      { method: 'post', path: '' },
      { method: 'get', path: `/${randomUUID()}` },
      { method: 'patch', path: `/${randomUUID()}` },
    ];

    it.each(endpoints)('shouldReject401WithoutToken($method $path)', async ({ method, path }) => {
      await request(app.getHttpServer())[method](`${PATH}${path}`).expect(401);
    });

    it.each(endpoints)('shouldReject403ForEmployee($method $path)', async ({ method, path }) => {
      await authed(method, path, employeeToken).expect(403);
    });

    it.each(endpoints)(
      'shouldReject403PasswordChangeRequired($method $path)',
      async ({ method, path }) => {
        const res = await authed(method, path, passwordChangeToken).expect(403);
        expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
      },
    );

    it.each(endpoints.filter((e) => e.method === 'get'))(
      'shouldAllowAdmin($method $path)',
      async ({ method, path }) => {
        const res = await authed(method, path, adminToken);
        expect([401, 403]).not.toContain(res.status);
      },
    );

    it('shouldReturn404ForPhysicalDeleteAndInitialPasswordReissue', async () => {
      await authed('delete', `/${randomUUID()}`, adminToken).expect(404);
      await request(app.getHttpServer())
        .post(`${PATH}/${randomUUID()}/initial-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /admin/users(一覧)', () => {
    it('shouldMatchKeywordPartiallyAcrossEmpIdNameAndEmail', async () => {
      const suffix = uniqueSuffix();
      const byName = await tracker.createUser({ name: `名前${suffix}` });
      const byEmail = await tracker.createUser({ contactEmail: `${suffix}@example.com` });
      const byEmpId = await tracker.createUser({ empId: `X${suffix}` });

      for (const user of [byName, byEmail, byEmpId]) {
        const res = await authed('get', `?keyword=${suffix}&limit=100`, adminToken).expect(200);
        const ids = (res.body as ListBody).items.map((item) => item.id);
        expect(ids).toContain(user.id);
      }
    });

    it('shouldTreatPercentAndUnderscoreLiterally', async () => {
      const suffix = uniqueSuffix();
      const literal = await tracker.createUser({ name: `${suffix}%_` });
      const res = await authed('get', `?keyword=${suffix}%25_&limit=100`, adminToken).expect(200);
      const items = (res.body as ListBody).items;
      expect(items.map((item) => item.id)).toEqual([literal.id]);

      // 単独の % は全件一致にならない(ワイルドカード扱いしない)
      const wildcard = await authed('get', `?keyword=%25&limit=100`, adminToken).expect(200);
      for (const item of (wildcard.body as ListBody).items) {
        const haystack = [item.empId, item.name, item.contactEmail ?? ''].join(' ');
        expect(haystack).toContain('%');
      }
    });

    it('shouldFilterByJobTitleAndDepartmentAndCombineWithAnd', async () => {
      const suffix = uniqueSuffix();
      const jobTitle = await tracker.createJobTitle();
      const department = await tracker.createDepartment();
      const match = await tracker.createUser({
        name: `絞込${suffix}`,
        jobTitleId: jobTitle.id,
        departmentId: department.id,
      });
      await tracker.createUser({ name: `絞込${suffix}`, jobTitleId: jobTitle.id });
      await tracker.createUser({ name: `絞込${suffix}`, departmentId: department.id });

      const res = await authed(
        'get',
        `?keyword=${suffix}&jobTitleId=${jobTitle.id}&departmentId=${department.id}`,
        adminToken,
      ).expect(200);
      expect((res.body as ListBody).items.map((item) => item.id)).toEqual([match.id]);
    });

    it('shouldFilterByEmploymentStatusUsingFixedClock', async () => {
      const suffix = uniqueSuffix();
      const active = await tracker.createUser({ name: `状態${suffix}`, hireDate: toDate('2026-11-01') });
      const upcoming = await tracker.createUser({ name: `状態${suffix}`, hireDate: toDate('2026-12-01') });
      const inactive = await tracker.createUser({
        name: `状態${suffix}`,
        hireDate: toDate('2026-11-01'),
        isActive: false,
      });

      const statusIds = async (status: string): Promise<string[]> => {
        const res = await authed(
          'get',
          `?keyword=${suffix}&status=${status}&limit=100`,
          adminToken,
        ).expect(200);
        return (res.body as ListBody).items.map((item) => item.id);
      };
      expect(await statusIds('ACTIVE')).toEqual([active.id]);
      expect(await statusIds('UPCOMING')).toEqual([upcoming.id]);
      expect(await statusIds('INACTIVE')).toEqual([inactive.id]);
    });

    it('shouldReturnPageMetaAndLimit10Pagination', async () => {
      const suffix = uniqueSuffix();
      for (let i = 0; i < 11; i += 1) {
        await tracker.createUser({ name: `頁${suffix}` });
      }
      const res = await authed('get', `?keyword=${suffix}&limit=10&page=2`, adminToken).expect(200);
      const body = res.body as ListBody;
      expect(body.page).toBe(2);
      expect(body.limit).toBe(10);
      expect(body.totalCount).toBe(11);
      expect(body.totalPages).toBe(2);
      expect(body.items).toHaveLength(1);
    });

    it('shouldExposeNullJobTitleKeyAndEmploymentStatusInItems', async () => {
      const suffix = uniqueSuffix();
      await tracker.createUser({ name: `項目${suffix}`, contactEmail: null });
      const res = await authed('get', `?keyword=${suffix}`, adminToken).expect(200);
      const item = (res.body as ListBody).items[0];
      expect(item).toHaveProperty('jobTitle', null);
      expect(item).toHaveProperty('contactEmail', null);
      expect(item.employmentStatus).toBe('ACTIVE');
      expect(item).not.toHaveProperty('passwordHash');
      expect(item).not.toHaveProperty('initialPassword');
    });

    it('shouldRejectKeywordOver100CharactersWith400', async () => {
      const res = await authed('get', `?keyword=${'a'.repeat(101)}`, adminToken).expect(400);
      const body = res.body as ErrorBody;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details?.[0]?.message).toBe('検索キーワードは 100 文字以内で入力してください。');
    });

    it('shouldRejectHireDateFromAfterHireDateTo', async () => {
      const res = await authed(
        'get',
        '?hireDateFrom=2026-12-01&hireDateTo=2026-11-01',
        adminToken,
      ).expect(400);
      const body = res.body as ErrorBody;
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'hireDateFrom',
            message: '開始日は終了日より後にできません。',
          }),
        ]),
      );
    });
  });

  describe('GET /admin/users/summary', () => {
    it('shouldCountActiveEmployeesAndAdminsByRole', async () => {
      const before = (await authed('get', '/summary', adminToken).expect(200)).body as {
        employeeCount: number;
        adminCount: number;
      };
      const activeCount = await prisma.user.count({ where: { isActive: true } });
      const adminCount = await prisma.user.count({ where: { isActive: true, role: 'ADMIN' } });
      expect(before.employeeCount).toBe(activeCount);
      expect(before.adminCount).toBe(adminCount);

      await tracker.createUser({ isActive: false });
      const after = (await authed('get', '/summary', adminToken).expect(200)).body as {
        employeeCount: number;
      };
      expect(after.employeeCount).toBe(before.employeeCount);
    });

    it('shouldCountOnlyActiveHiresInTokyoCalendarMonth', async () => {
      // 基準: 2026-11-09 JST。11 月は 11-01〜11-30
      const before = (await authed('get', '/summary', adminToken).expect(200)).body as {
        hiredThisMonthCount: number;
      };
      await tracker.createUser({ hireDate: toDate('2026-11-01') });
      await tracker.createUser({ hireDate: toDate('2026-11-30') });
      await tracker.createUser({ hireDate: toDate('2026-10-31') });
      await tracker.createUser({ hireDate: toDate('2026-12-01') });
      await tracker.createUser({ hireDate: toDate('2026-11-15'), isActive: false });

      const after = (await authed('get', '/summary', adminToken).expect(200)).body as {
        hiredThisMonthCount: number;
      };
      expect(after.hiredThisMonthCount - before.hiredThisMonthCount).toBe(2);
    });
  });

  describe('GET /admin/users/next-emp-id', () => {
    it('shouldReturnExpectedNextEmpIdWithoutReserving', async () => {
      const expected = await expectedNextEmpId(prisma);
      const first = (await authed('get', '/next-emp-id', adminToken).expect(200)).body as {
        empId: string | null;
      };
      expect(first.empId).toBe(expected);
      // 予約しないので、呼び出しを繰り返しても同じ値
      const second = (await authed('get', '/next-emp-id', adminToken).expect(200)).body as {
        empId: string | null;
      };
      expect(second.empId).toBe(expected);
    });

    it('shouldReturnNullEmpIdWhenNumberIsExhausted', async () => {
      const exhausted = await tracker.createUser({ empId: '99999' });
      try {
        const res = await authed('get', '/next-emp-id', adminToken).expect(200);
        expect(res.body).toEqual({ empId: null });
      } finally {
        await prisma.user.delete({ where: { id: exhausted.id } });
        tracker.userIds.splice(tracker.userIds.indexOf(exhausted.id), 1);
      }
    });
  });

  describe('POST /admin/users(登録)', () => {
    it('shouldCreateWithAutoEmpIdAndMustChangePasswordAndStoreBcryptHash', async () => {
      const expected = await expectedNextEmpId(prisma);
      const res = await authed('post', '', adminToken).send(createBody()).expect(201);
      const body = res.body as UserBody;
      tracker.userIds.push(body.id);

      expect(body.empId).toBe(expected);
      expect(body.isActive).toBe(true);
      expect(body.mustChangePassword).toBe(true);
      expect(body.employmentStatus).toBe('ACTIVE');
      expect(body).not.toHaveProperty('initialPassword');
      expect(body).not.toHaveProperty('passwordHash');

      const row = await prisma.user.findUniqueOrThrow({ where: { id: body.id } });
      expect(row.passwordHash).not.toBe(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, row.passwordHash)).toBe(true);
      expect(row.mustChangePassword).toBe(true);
    });

    it('shouldAllowLoginWithRegisteredEmpIdAndInitialPassword', async () => {
      const res = await authed('post', '', adminToken).send(createBody()).expect(201);
      const body = res.body as UserBody;
      tracker.userIds.push(body.id);

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ empId: body.empId, password: PASSWORD })
        .expect(200);
      expect((login.body as { user?: { mustChangePassword: boolean } }).user?.mustChangePassword).toBe(
        true,
      );
    });

    it('shouldNotLeakPlainPasswordInSuccessOrValidationResponses', async () => {
      const secret = 'Secret9x';
      const ok = await authed('post', '', adminToken)
        .send(createBody({ initialPassword: secret }))
        .expect(201);
      tracker.userIds.push((ok.body as UserBody).id);
      expect(JSON.stringify(ok.body)).not.toContain(secret);

      const ng = await authed('post', '', adminToken)
        .send(createBody({ initialPassword: 'abcdefgh', name: '' }))
        .expect(400);
      expect(JSON.stringify(ng.body)).not.toContain('abcdefgh');
    });

    it('shouldNotWritePlainPasswordToLogs', async () => {
      const secret = 'LogSecret9';
      const levels = ['log', 'error', 'warn', 'debug', 'verbose'] as const;
      const spies = levels.map((level) =>
        vi.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
      );
      try {
        const ok = await authed('post', '', adminToken)
          .send(createBody({ initialPassword: secret }))
          .expect(201);
        tracker.userIds.push((ok.body as UserBody).id);
        await authed('post', '', adminToken)
          .send(createBody({ initialPassword: 'abcdefgh' }))
          .expect(400);
        const printed = spies
          .flatMap((spy) => spy.mock.calls)
          .map((args) => JSON.stringify(args))
          .join(' ');
        expect(printed).not.toContain(secret);
        expect(printed).not.toContain('abcdefgh');
      } finally {
        vi.restoreAllMocks();
      }
    });

    it('shouldUseNextNumberAfterManualPreemption', async () => {
      const expected = await expectedNextEmpId(prisma);
      // 予定番号を直接入力で先に取られた状態でも、AUTO は次の空き番号で確定する
      const manual = await tracker.createUser({ empId: expected });
      const res = await authed('post', '', adminToken).send(createBody()).expect(201);
      const body = res.body as UserBody;
      tracker.userIds.push(body.id);
      expect(body.empId).not.toBe(manual.empId);
      expect(body.empId > expected).toBe(true);
    });

    it('shouldAssignDistinctEmpIdsForFiveParallelAutoRegistrations', async () => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, () => authed('post', '', adminToken).send(createBody())),
      );
      for (const res of responses) {
        expect(res.status).toBe(201);
        tracker.userIds.push((res.body as UserBody).id);
      }
      const empIds = responses.map((res) => (res.body as UserBody).empId);
      expect(new Set(empIds).size).toBe(5);
    });

    it('shouldReturn409EmpIdExhaustedWhenAutoNumberIsFull', async () => {
      const exhausted = await tracker.createUser({ empId: '99999' });
      try {
        const res = await authed('post', '', adminToken).send(createBody()).expect(409);
        expect((res.body as ErrorBody).code).toBe('EMP_ID_EXHAUSTED');
        expect((res.body as ErrorBody).message).toBe(
          '社員IDを自動で採番できません。直接入力してください。',
        );
      } finally {
        await prisma.user.delete({ where: { id: exhausted.id } });
        tracker.userIds.splice(tracker.userIds.indexOf(exhausted.id), 1);
      }
    });

    it('shouldRegisterManualEmpIdKeepingLeadingZerosAndTrimming', async () => {
      const zeroPadded = `0${uniqueNumericEmpId()}`;
      const res = await authed('post', '', adminToken)
        .send(createBody({ empIdMode: 'MANUAL', empId: `  ${zeroPadded}  ` }))
        .expect(201);
      tracker.userIds.push((res.body as UserBody).id);
      expect((res.body as UserBody).empId).toBe(zeroPadded);
    });

    it('shouldTreatLeadingZeroAndPlainNumberAsDifferentEmpIds', async () => {
      const number = uniqueNumericEmpId();
      const existing = await tracker.createUser({ empId: `00${number}` });
      const res = await authed('post', '', adminToken)
        .send(createBody({ empIdMode: 'MANUAL', empId: number }))
        .expect(201);
      tracker.userIds.push((res.body as UserBody).id);
      expect((res.body as UserBody).empId).not.toBe(existing.empId);
    });

    it('shouldReturn409DuplicateEmpIdForManualCollision', async () => {
      const existing = await tracker.createUser({ empId: uniqueNumericEmpId() });
      const res = await authed('post', '', adminToken)
        .send(createBody({ empIdMode: 'MANUAL', empId: existing.empId }))
        .expect(409);
      expect(res.body).toMatchObject({
        code: 'DUPLICATE_EMP_ID',
        message: 'この社員IDは既に使用されています。',
      });
    });

    it('shouldReturn400InvalidDepartmentForUnknownDepartment', async () => {
      const res = await authed('post', '', adminToken)
        .send(createBody({ departmentId: randomUUID() }))
        .expect(400);
      expect((res.body as ErrorBody).code).toBe('INVALID_DEPARTMENT');
      expect((res.body as ErrorBody).message).toBe('部署を選び直してください。');
    });

    it('shouldReturn400InvalidJobTitleForUnknownJobTitle', async () => {
      const department = await tracker.createDepartment();
      const res = await authed('post', '', adminToken)
        .send(createBody({ jobTitleId: randomUUID(), departmentId: department.id }))
        .expect(400);
      expect((res.body as ErrorBody).code).toBe('INVALID_JOB_TITLE');
      expect((res.body as ErrorBody).message).toBe('役職を選び直してください。');
    });

    it('shouldReturn400WithPasswordFieldDetailAndNotCreateUser', async () => {
      const name = `E2E社員${uniqueSuffix()}`;
      const res = await authed('post', '', adminToken)
        .send(createBody({ name, initialPassword: 'abcdefgh' }))
        .expect(400);
      const body = res.body as ErrorBody;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toEqual([
        {
          field: 'initialPassword',
          message: 'パスワードは8文字以上で、英字と数字を含めてください。',
        },
      ]);
      expect(await prisma.user.count({ where: { name } })).toBe(0);
    });

    it('shouldReturnValidationDetailWithFieldNameWhenNameMissing', async () => {
      const body = createBody();
      delete body.name;
      const res = await authed('post', '', adminToken).send(body).expect(400);
      expect((res.body as ErrorBody).details?.map((d) => d.field)).toContain('name');
    });

    it('shouldRejectUnknownFieldsInBody', async () => {
      await authed('post', '', adminToken)
        .send(createBody({ passwordHash: 'x', mustChangePassword: false }))
        .expect(400);
    });
  });

  describe('GET /admin/users/:id(詳細)', () => {
    it('shouldReturnLeaveGrantsDescendingAndPendingApprovalCount', async () => {
      const target = await tracker.createUser({});
      await insertLeaveGrant(prisma, { userId: target.id, year: 2025, grantedDays: 10 });
      await insertLeaveGrant(prisma, { userId: target.id, year: 2026, grantedDays: 15 });
      const requester = await tracker.createUser({});
      await insertLeave(prisma, {
        userId: requester.id,
        approverId: target.id,
        status: 'PENDING',
      });

      const res = await authed('get', `/${target.id}`, adminToken).expect(200);
      const body = res.body as UserBody;
      expect(body.leaveGrants).toEqual([
        { year: 2026, grantedDays: 15 },
        { year: 2025, grantedDays: 10 },
      ]);
      expect(body.pendingApprovalCount).toBe(1);
      expect(body).toHaveProperty('mustChangePassword');
      expect(body).toHaveProperty('updatedAt');
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('shouldReturn400ForNonUuidId', async () => {
      const res = await authed('get', '/not-a-uuid', adminToken).expect(400);
      expect((res.body as ErrorBody).details?.[0]?.field).toBe('id');
    });

    it('shouldReturn404ForUnknownUser', async () => {
      const res = await authed('get', `/${randomUUID()}`, adminToken).expect(404);
      expect(res.body).toMatchObject({ code: 'NOT_FOUND', message: '社員が見つかりません。' });
    });
  });

  describe('PATCH /admin/users/:id(修正)', () => {
    it('shouldUpdateEachProvidedField', async () => {
      const target = await tracker.createUser({});
      const jobTitle = await tracker.createJobTitle();
      const res = await authed('patch', `/${target.id}`, adminToken)
        .send({ name: '更新 太郎', jobTitleId: jobTitle.id, contactEmail: 'new@example.com' })
        .expect(200);
      expect(res.body).toMatchObject({
        name: '更新 太郎',
        contactEmail: 'new@example.com',
        jobTitle: { id: jobTitle.id, name: jobTitle.name },
      });
    });

    it('shouldReturn409DuplicateEmpIdWhenChangingToExistingEmpId', async () => {
      const other = await tracker.createUser({ empId: uniqueNumericEmpId() });
      const target = await tracker.createUser({});
      const res = await authed('patch', `/${target.id}`, adminToken)
        .send({ empId: other.empId })
        .expect(409);
      expect((res.body as ErrorBody).code).toBe('DUPLICATE_EMP_ID');
    });

    it('shouldClearJobTitleWhenNull', async () => {
      const jobTitle = await tracker.createJobTitle();
      const target = await tracker.createUser({ jobTitleId: jobTitle.id });
      const res = await authed('patch', `/${target.id}`, adminToken)
        .send({ jobTitleId: null })
        .expect(200);
      expect((res.body as UserBody).jobTitle).toBeNull();
    });

    it('shouldConvertEmptyContactEmailToNull', async () => {
      const target = await tracker.createUser({ contactEmail: 'a@example.com' });
      const res = await authed('patch', `/${target.id}`, adminToken)
        .send({ contactEmail: '' })
        .expect(200);
      expect((res.body as UserBody).contactEmail).toBeNull();
    });

    it('shouldNotChangeRoleWhenJobTitleChanges', async () => {
      const jobTitle = await tracker.createJobTitle({ name: `役職${uniqueSuffix()}` });
      const target = await tracker.createUser({ role: 'EMPLOYEE' });
      await authed('patch', `/${target.id}`, adminToken).send({ jobTitleId: jobTitle.id }).expect(200);
      const row = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
      expect(row.role).toBe('EMPLOYEE');
    });

    it('shouldRejectPasswordFieldsWith400', async () => {
      const target = await tracker.createUser({});
      await authed('patch', `/${target.id}`, adminToken)
        .send({ initialPassword: 'Temp5678' })
        .expect(400);
    });

    it('shouldRejectEmptyBodyWith400', async () => {
      const target = await tracker.createUser({});
      await authed('patch', `/${target.id}`, adminToken).send({}).expect(400);
    });

    it('shouldRejectNullDepartmentAndHireDateWith400', async () => {
      const target = await tracker.createUser({});
      await authed('patch', `/${target.id}`, adminToken).send({ departmentId: null }).expect(400);
      await authed('patch', `/${target.id}`, adminToken).send({ hireDate: null }).expect(400);
    });
  });

  describe('無効化(削除 = isActive:false)', () => {
    it('shouldCancelPendingLeavesOfTargetAndClearManagerAndRevokeTokens', async () => {
      const target = await tracker.createUser({});
      const pendingLeave = await insertLeave(prisma, {
        userId: target.id,
        approverId: adminId,
        status: 'PENDING',
      });
      const department = await tracker.createDepartment({ managerId: target.id });
      const secondDepartment = await tracker.createDepartment({ managerId: target.id });
      await prisma.refreshToken.create({
        data: {
          userId: target.id,
          tokenHash: `hash-${uniqueSuffix()}`,
          expiresAt: new Date('2099-01-01T00:00:00Z'),
        },
      });

      await authed('patch', `/${target.id}`, adminToken).send({ isActive: false }).expect(200);

      const leave = await prisma.leave.findUniqueOrThrow({ where: { id: pendingLeave.id } });
      expect(leave.status).toBe('CANCELLED');
      expect(leave.processedBy).toBe(adminId);
      const depts = await prisma.department.findMany({
        where: { id: { in: [department.id, secondDepartment.id] } },
      });
      expect(depts.every((dept) => dept.managerId === null)).toBe(true);
      const tokens = await prisma.refreshToken.findMany({ where: { userId: target.id } });
      expect(tokens.every((token) => token.revokedAt !== null)).toBe(true);
    });

    it('shouldKeepPendingLeavesAssignedToOthers', async () => {
      const target = await tracker.createUser({});
      const requester = await tracker.createUser({});
      const leave = await insertLeave(prisma, {
        userId: requester.id,
        approverId: target.id,
        status: 'PENDING',
      });
      await authed('patch', `/${target.id}`, adminToken).send({ isActive: false }).expect(200);
      const row = await prisma.leave.findUniqueOrThrow({ where: { id: leave.id } });
      expect(row.status).toBe('PENDING');
    });

    it('shouldRejectLoginAfterDeactivationAndAllowReactivation', async () => {
      const hash = await bcrypt.hash(PASSWORD, 4);
      const empId = uniqueNumericEmpId();
      const target = await tracker.createUser({ empId, passwordHash: hash, mustChangePassword: false });

      await authed('patch', `/${target.id}`, adminToken).send({ isActive: false }).expect(200);
      // 無効アカウントは正しいパスワードの後にだけ 403 ACCOUNT_DISABLED(06 API-AUTH-001)
      const disabled = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ empId, password: PASSWORD })
        .expect(403);
      expect((disabled.body as ErrorBody).code).toBe('ACCOUNT_DISABLED');

      await authed('patch', `/${target.id}`, adminToken).send({ isActive: true }).expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ empId, password: PASSWORD })
        .expect(200);
    });
  });

  describe('最後の管理者保護(LAST_ADMIN)', () => {
    // 共有のテスト DB で「唯一の有効な ADMIN」を作るため、他の有効な ADMIN を一時的に無効化して戻す
    let disabledAdminIds: string[] = [];

    beforeAll(async () => {
      const others = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true, id: { not: adminId } },
        select: { id: true },
      });
      disabledAdminIds = others.map((user) => user.id);
      await prisma.user.updateMany({
        where: { id: { in: disabledAdminIds } },
        data: { isActive: false },
      });
    });

    afterAll(async () => {
      await prisma.user.updateMany({
        where: { id: { in: disabledAdminIds } },
        data: { isActive: true },
      });
    });

    it('shouldReturn409LastAdminWhenDeactivatingOnlyActiveAdmin', async () => {
      const res = await authed('patch', `/${adminId}`, adminToken).send({ isActive: false }).expect(409);
      expect(res.body).toMatchObject({
        code: 'LAST_ADMIN',
        message: '最後の管理者は無効化・権限変更できません。',
      });
    });

    it('shouldReturn409LastAdminWhenDemotingOnlyActiveAdmin', async () => {
      await authed('patch', `/${adminId}`, adminToken).send({ role: 'EMPLOYEE' }).expect(409);
    });

    it('shouldAllowOnlyOneOfTwoAdminsDeactivatingEachOtherConcurrently', async () => {
      const second = await tracker.createUser({ role: 'ADMIN', mustChangePassword: false });
      const secondToken = await sign(second.id);
      const [a, b] = await Promise.all([
        authed('patch', `/${adminId}`, adminToken).send({ isActive: false }),
        authed('patch', `/${second.id}`, secondToken).send({ isActive: false }),
      ]);
      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });
});

function toDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}
