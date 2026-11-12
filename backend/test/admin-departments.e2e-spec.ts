// 管理者の部署管理 API(DEPT-002〜006)の e2e。実際のテスト用 DB(workbridge_test)を使う
// 一覧は DB 全体が対象になるため、各テストは自分で作った部署コードで絞り込んで検証する
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { Prisma, type PrismaClient } from '../src/generated/prisma/client.js';
import {
  captureDbError,
  createTestPrisma,
  TestDataTracker,
  uniqueSuffix,
} from './db/db-helpers.js';
import { createTestApp, createTokenSigner, DEFAULT_NOW, FixedClock } from './e2e-helpers.js';

interface DepartmentBody {
  id: string;
  code: string;
  name: string;
  memberCount: number;
  inactiveMemberCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
interface PageBody {
  items: DepartmentBody[];
  totalCount: number;
}
interface ErrorBody {
  code?: string;
  message?: string;
}

const PATH = '/api/v1/admin/departments';

describe('管理者 部署 API(e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let tracker: TestDataTracker;
  let adminId: string;
  let adminToken: string;
  let employeeToken: string;
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

  function api(method: 'get' | 'post' | 'patch' | 'delete', path = '', token = adminToken) {
    return request(app.getHttpServer())
      [method](`${PATH}${path}`)
      .set('Authorization', `Bearer ${token}`);
  }

  // API で部署を登録し、後片付けの対象に加える
  async function createViaApi(
    code = `E${uniqueSuffix()}`,
    name = `部署${uniqueSuffix()}`,
  ): Promise<DepartmentBody> {
    const res = await api('post').send({ code, name }).expect(201);
    const body = res.body as DepartmentBody;
    tracker.departmentIds.push(body.id);
    return body;
  }

  // 形式が不正な :id は 400 VALIDATION_ERROR で、details[0].field が id になる
  function expectMalformedIdError(body: unknown): void {
    expect(body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect((body as { details: { field: string }[] }).details[0]?.field).toBe('id');
  }

  async function unassignedId(): Promise<string> {
    const row = await prisma.department.findUniqueOrThrow({ where: { code: 'UNASSIGNED' } });
    return row.id;
  }

  function newUserData(departmentId: string): Prisma.UserUncheckedCreateInput {
    return {
      name: 'テスト太郎',
      empId: `T${uniqueSuffix()}`,
      passwordHash: 'dummy-hash',
      role: 'EMPLOYEE',
      departmentId,
      hireDate: new Date('2026-01-01T00:00:00.000Z'),
    };
  }

  // 指定した SQL を実行中のセッションがロック待ちに入るまで待つ(競合を確実に発生させるため)
  // queryPattern は pg_stat_activity.query に対する ILIKE パターン(例: '%departments%')
  async function waitUntilSessionBlocked(queryPattern: string): Promise<void> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const rows = await prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE datname = current_database()
          AND wait_event_type = 'Lock'
          AND query ILIKE ${queryPattern}`;
      if ((rows[0]?.n ?? 0) > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('ロック待ちのセッションが現れませんでした');
  }

  describe('権限', () => {
    it('shouldReturn403ForEmployee', async () => {
      const res = await api('get', '', employeeToken).expect(403);
      expect((res.body as ErrorBody).code).toBe('FORBIDDEN');
      await api('post', '', employeeToken).send({ code: 'X', name: 'x' }).expect(403);
      await api('delete', `/${randomUUID()}`, employeeToken).expect(403);
    });

    it('shouldReturn403ForEmployeeOnPatch', async () => {
      const department = await createViaApi();
      await api('patch', `/${department.id}`, employeeToken).send({ name: 'x' }).expect(403);
    });

    it('shouldReturn403WhenPasswordChangeRequired', async () => {
      const pending = await tracker.createUser({ role: 'ADMIN', mustChangePassword: true });
      const token = await sign(pending.id);
      const res = await api('get', '', token).expect(403);
      expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
    });

    it('shouldReturn401WithoutToken', async () => {
      await request(app.getHttpServer()).get(PATH).expect(401);
    });
  });

  describe('登録(DEPT-004)', () => {
    it('shouldCreateWithUpperCasedCodeAndZeroCounts', async () => {
      const suffix = uniqueSuffix();
      const res = await api('post')
        .send({ code: ` e${suffix.toLowerCase()} `, name: ` 新部署${suffix} ` })
        .expect(201);
      const body = res.body as DepartmentBody;
      tracker.departmentIds.push(body.id);
      expect(body).toMatchObject({
        code: `E${suffix}`,
        name: `新部署${suffix}`,
        memberCount: 0,
        inactiveMemberCount: 0,
        isSystem: false,
      });
      expect(body.createdAt).toMatch(/\+09:00$/);
    });

    it('shouldReturn400ForInvalidInput', async () => {
      const cases: Record<string, unknown>[] = [
        {},
        { code: 'DEV' },
        { name: '名前のみ' },
        { code: '', name: 'a' },
        { code: 'A'.repeat(21), name: 'a' },
        { code: 'あ', name: 'a' },
        { code: 'A_B', name: 'a' },
        { code: 'OK', name: '   ' },
        { code: 'OK', name: 'a'.repeat(101) },
      ];
      for (const body of cases) {
        const res = await api('post').send(body).expect(400);
        expect((res.body as ErrorBody).code).toBe('VALIDATION_ERROR');
      }
    });

    it('shouldReportFieldNameInDetailsWhenRequiredMissing', async () => {
      const res = await api('post').send({ code: 'DEV' }).expect(400);
      const details = (res.body as { details: { field: string }[] }).details;
      expect(details.map((detail) => detail.field)).toContain('name');
    });

    it('shouldReturn409WhenCodeDuplicatedIgnoringCase', async () => {
      const existing = await createViaApi();
      const res = await api('post')
        .send({ code: existing.code.toLowerCase(), name: `別名${uniqueSuffix()}` })
        .expect(409);
      expect((res.body as ErrorBody).code).toBe('DUPLICATE_DEPARTMENT_CODE');
    });

    it('shouldReturn409WhenNameDuplicated', async () => {
      const existing = await createViaApi();
      const res = await api('post')
        .send({ code: `E${uniqueSuffix()}`, name: existing.name })
        .expect(409);
      expect((res.body as ErrorBody).code).toBe('DUPLICATE_DEPARTMENT_NAME');
    });

    it('shouldReturn409WhenUsingSystemCode', async () => {
      const res = await api('post')
        .send({ code: 'unassigned', name: `名前${uniqueSuffix()}` })
        .expect(409);
      expect((res.body as ErrorBody).code).toBe('DUPLICATE_DEPARTMENT_CODE');
    });
  });

  describe('一覧・詳細(DEPT-002・003)', () => {
    it('shouldCountActiveAndInactiveMembersSeparately', async () => {
      const department = await createViaApi();
      await tracker.createUser({ departmentId: department.id });
      await tracker.createUser({ departmentId: department.id });
      await tracker.createUser({ departmentId: department.id, isActive: false });

      const res = await api('get').query({ code: department.code }).expect(200);
      const body = res.body as PageBody;
      expect(body.totalCount).toBe(1);
      expect(body.items[0]).toMatchObject({ memberCount: 2, inactiveMemberCount: 1 });

      const detail = await api('get', `/${department.id}`).expect(200);
      expect(detail.body).toMatchObject({
        id: department.id,
        memberCount: 2,
        inactiveMemberCount: 1,
      });
    });

    it('shouldFilterByPartialCodeAndNameCaseInsensitively', async () => {
      const suffix = uniqueSuffix();
      const a = await createViaApi(`F${suffix}A`, `検索対象${suffix}A`);
      const b = await createViaApi(`F${suffix}B`, `検索対象${suffix}B`);
      await createViaApi();

      const byCode = await api('get')
        .query({ code: `f${suffix.toLowerCase()}` })
        .expect(200);
      expect((byCode.body as PageBody).items.map((item) => item.id)).toEqual([a.id, b.id]);

      const byName = await api('get')
        .query({ name: `検索対象${suffix}B` })
        .expect(200);
      expect((byName.body as PageBody).items.map((item) => item.id)).toEqual([b.id]);
    });

    it('shouldPaginateOrderedByCodeAscending', async () => {
      const suffix = uniqueSuffix();
      await createViaApi(`G${suffix}2`);
      await createViaApi(`G${suffix}1`);
      await createViaApi(`G${suffix}3`);

      const res = await api('get')
        .query({ code: `G${suffix}`, page: 2, limit: 2 })
        .expect(200);
      const body = res.body as PageBody & { page: number; totalPages: number };
      expect(body.items.map((item) => item.code)).toEqual([`G${suffix}3`]);
      expect(body).toMatchObject({ page: 2, totalCount: 3, totalPages: 2 });
    });

    it('shouldMarkUnassignedAsSystem', async () => {
      const res = await api('get').query({ code: 'UNASSIGNED' }).expect(200);
      const items = (res.body as PageBody).items;
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ code: 'UNASSIGNED', name: '未所属', isSystem: true });
    });

    it('shouldReturn400ForInvalidQuery', async () => {
      await api('get').query({ limit: 101 }).expect(400);
      await api('get')
        .query({ code: 'A'.repeat(21) })
        .expect(400);
    });

    it('shouldReturn404ForUnknownId', async () => {
      const unknown = await api('get', `/${randomUUID()}`).expect(404);
      expect(unknown.body as ErrorBody).toMatchObject({
        code: 'NOT_FOUND',
        message: '部署が見つかりません。',
      });
    });

    it('shouldReturn400ForMalformedId', async () => {
      const malformed = await api('get', '/not-a-uuid').expect(400);
      expectMalformedIdError(malformed.body);
    });

    it('shouldMatchWildcardCharactersLiterallyInSearch', async () => {
      // 各検索語は、ワイルドカードとして解釈されると一致してしまう「おとり」の部署を持つ
      const suffix = uniqueSuffix();
      const underscore = await createViaApi(undefined, `${suffix}_A部`);
      await createViaApi(undefined, `${suffix}xA部`);
      const percent = await createViaApi(undefined, `${suffix}%B部`);
      await createViaApi(undefined, `${suffix}zzB部`);
      const backslash = await createViaApi(undefined, `${suffix}\\D部`);
      await createViaApi(undefined, `${suffix}D部`);

      const byUnderscore = await api('get')
        .query({ name: `${suffix}_A` })
        .expect(200);
      expect((byUnderscore.body as PageBody).items.map((item) => item.id)).toEqual([underscore.id]);

      const byPercent = await api('get')
        .query({ name: `${suffix}%B` })
        .expect(200);
      expect((byPercent.body as PageBody).items.map((item) => item.id)).toEqual([percent.id]);

      const byBackslash = await api('get')
        .query({ name: `${suffix}\\D` })
        .expect(200);
      expect((byBackslash.body as PageBody).items.map((item) => item.id)).toEqual([backslash.id]);

      // 部署コードに % _ \ は使えないため、コードの前方一致おとりに対して % を含む検索は 0 件になる
      const coded = await createViaApi(`E${suffix}`, `${suffix}コード部`);
      const byCodeWildcard = await api('get')
        .query({ code: `E${suffix}%` })
        .expect(200);
      expect((byCodeWildcard.body as PageBody).totalCount).toBe(0);
      const byCodeExact = await api('get')
        .query({ code: `E${suffix}` })
        .expect(200);
      expect((byCodeExact.body as PageBody).items.map((item) => item.id)).toEqual([coded.id]);
    });
  });

  describe('修正(DEPT-005)', () => {
    it('shouldUpdateOnlyGivenFields', async () => {
      const department = await createViaApi();
      const newName = `改名${uniqueSuffix()}`;
      const res = await api('patch', `/${department.id}`).send({ name: newName }).expect(200);
      expect(res.body).toMatchObject({ id: department.id, code: department.code, name: newName });

      const newCode = `E${uniqueSuffix()}`;
      const res2 = await api('patch', `/${department.id}`)
        .send({ code: newCode.toLowerCase() })
        .expect(200);
      expect(res2.body).toMatchObject({ code: newCode, name: newName });
    });

    it('shouldRefreshUpdatedAtOnUpdate', async () => {
      const department = await createViaApi();
      const before = await prisma.department.findUniqueOrThrow({ where: { id: department.id } });
      await api('patch', `/${department.id}`)
        .send({ name: `改名${uniqueSuffix()}` })
        .expect(200);
      const after = await prisma.department.findUniqueOrThrow({ where: { id: department.id } });
      expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    });

    it('shouldReturn400ForEmptyBody', async () => {
      const department = await createViaApi();
      const res = await api('patch', `/${department.id}`).send({}).expect(400);
      expect((res.body as ErrorBody).code).toBe('VALIDATION_ERROR');
    });

    it('shouldReturn409WhenDuplicated', async () => {
      const a = await createViaApi();
      const b = await createViaApi();
      const codeRes = await api('patch', `/${b.id}`).send({ code: a.code }).expect(409);
      expect((codeRes.body as ErrorBody).code).toBe('DUPLICATE_DEPARTMENT_CODE');
      const nameRes = await api('patch', `/${b.id}`).send({ name: a.name }).expect(409);
      expect((nameRes.body as ErrorBody).code).toBe('DUPLICATE_DEPARTMENT_NAME');
    });

    it('shouldReturn404ForUnknownId', async () => {
      await api('patch', `/${randomUUID()}`).send({ name: 'x' }).expect(404);
    });

    it('shouldReturn400ForMalformedId', async () => {
      const res = await api('patch', '/not-a-uuid').send({ name: 'x' }).expect(400);
      expectMalformedIdError(res.body);
    });

    it('shouldReturn409AndKeepValuesForSystemDepartment', async () => {
      const id = await unassignedId();
      const byName = await api('patch', `/${id}`).send({ name: '変更' }).expect(409);
      expect((byName.body as ErrorBody).code).toBe('PROTECTED_DEPARTMENT');
      const byCode = await api('patch', `/${id}`).send({ code: 'NEWCODE' }).expect(409);
      expect((byCode.body as ErrorBody).code).toBe('PROTECTED_DEPARTMENT');
      expect(await prisma.department.findUniqueOrThrow({ where: { id } })).toMatchObject({
        code: 'UNASSIGNED',
        name: '未所属',
      });
    });
  });

  describe('削除(DEPT-006)', () => {
    it('shouldDeleteDepartmentWithoutMembers', async () => {
      const department = await createViaApi();
      const res = await api('delete', `/${department.id}`).expect(204);
      expect(res.text).toBe('');
      expect(await prisma.department.count({ where: { id: department.id } })).toBe(0);
    });

    it('shouldReturn409WhenActiveMembersExist', async () => {
      const department = await createViaApi();
      await tracker.createUser({ departmentId: department.id });
      const res = await api('delete', `/${department.id}`).expect(409);
      expect((res.body as ErrorBody).code).toBe('DEPARTMENT_HAS_MEMBERS');
      expect(await prisma.department.count({ where: { id: department.id } })).toBe(1);
    });

    it('shouldMoveInactiveMembersToUnassignedAndDelete', async () => {
      const department = await createViaApi();
      const inactive = await tracker.createUser({ departmentId: department.id, isActive: false });
      await api('delete', `/${department.id}`).expect(204);
      const moved = await prisma.user.findUniqueOrThrow({ where: { id: inactive.id } });
      expect(moved.departmentId).toBe(await unassignedId());
    });

    it('shouldReturn404ForUnknownId', async () => {
      await api('delete', `/${randomUUID()}`).expect(404);
    });

    it('shouldReturn400ForMalformedId', async () => {
      const res = await api('delete', '/not-a-uuid').expect(400);
      expectMalformedIdError(res.body);
    });

    it('shouldReturn409ForSystemDepartment', async () => {
      const res = await api('delete', `/${await unassignedId()}`).expect(409);
      expect((res.body as ErrorBody).code).toBe('PROTECTED_DEPARTMENT');
      expect(await prisma.department.count({ where: { code: 'UNASSIGNED' } })).toBe(1);
    });

    it('shouldReturn409AndKeepInactiveMembersWhenActiveMemberAlsoExists', async () => {
      const department = await createViaApi();
      await tracker.createUser({ departmentId: department.id });
      const inactive = await tracker.createUser({ departmentId: department.id, isActive: false });
      await api('delete', `/${department.id}`).expect(409);
      // 途中で移動した無効な社員が残らない(ロールバック確認)
      const after = await prisma.user.findUniqueOrThrow({ where: { id: inactive.id } });
      expect(after.departmentId).toBe(department.id);
    });

    it('shouldMoveAllInactiveMembersAndLeaveOtherDepartmentsUntouched', async () => {
      const department = await createViaApi();
      const other = await createViaApi();
      const inactiveA = await tracker.createUser({ departmentId: department.id, isActive: false });
      const inactiveB = await tracker.createUser({ departmentId: department.id, isActive: false });
      const bystander = await tracker.createUser({ departmentId: other.id });
      const before = await prisma.user.findUniqueOrThrow({ where: { id: bystander.id } });
      const beforeA = await prisma.user.findUniqueOrThrow({ where: { id: inactiveA.id } });

      await api('delete', `/${department.id}`).expect(204);

      const unassigned = await unassignedId();
      const movedA = await prisma.user.findUniqueOrThrow({ where: { id: inactiveA.id } });
      const movedB = await prisma.user.findUniqueOrThrow({ where: { id: inactiveB.id } });
      expect(movedA.departmentId).toBe(unassigned);
      expect(movedB.departmentId).toBe(unassigned);
      expect(movedA.updatedAt.getTime()).toBeGreaterThan(beforeA.updatedAt.getTime());
      const afterBystander = await prisma.user.findUniqueOrThrow({ where: { id: bystander.id } });
      expect(afterBystander.departmentId).toBe(other.id);
      expect(afterBystander.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    });

    it('shouldReturn404WhenDeletingAlreadyDeletedDepartment', async () => {
      const department = await createViaApi();
      await api('delete', `/${department.id}`).expect(204);
      const res = await api('delete', `/${department.id}`).expect(404);
      expect((res.body as ErrorBody).code).toBe('NOT_FOUND');
    });

    it('shouldWaitForUncommittedMemberAndReturn409WhenDeleteRunsConcurrently', async () => {
      // 対象部署への社員追加が未コミットの間に削除要求を送る。追加がコミットされてから 409 になること
      const department = await createViaApi();
      let deletion: Promise<request.Response> | undefined;
      const member = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({ data: newUserData(department.id) });
        deletion = api('delete', `/${department.id}`).then((res) => res);
        await waitUntilSessionBlocked('%departments%');
        return created;
      });
      tracker.userIds.push(member.id);
      const res = await deletion;
      expect(res?.status).toBe(409);
      expect((res?.body as ErrorBody).code).toBe('DEPARTMENT_HAS_MEMBERS');
      expect(await prisma.department.count({ where: { id: department.id } })).toBe(1);
      const after = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
      expect(after.departmentId).toBe(department.id);
    });

    it('shouldFailInsertWithForeignKeyErrorWhenDepartmentDeletedFirst', async () => {
      // 部署の行ロックを削除側が持っている間に社員追加を始め、削除がコミットされた後に追加が FK で失敗すること
      const department = await createViaApi();
      let insertion: Promise<unknown> | undefined;
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM departments WHERE id = ${department.id}::uuid FOR UPDATE`;
        insertion = prisma.user.create({ data: newUserData(department.id) }).then(
          () => undefined,
          (error: unknown) => error,
        );
        await waitUntilSessionBlocked('%users%');
        await tx.department.delete({ where: { id: department.id } });
      });
      const error = await insertion;
      expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2003');
      expect(await prisma.department.count({ where: { id: department.id } })).toBe(0);
    });

    it('shouldReturn409WhenMemberIsActivatedWhileDeleting', async () => {
      // 部署行をロックしている間に社員を有効化し、削除要求を待たせる。コミット後は有効な社員が見つかり 409 になる
      const department = await createViaApi();
      const member = await tracker.createUser({ departmentId: department.id, isActive: false });
      let deletion: Promise<request.Response> | undefined;
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM departments WHERE id = ${department.id}::uuid FOR UPDATE`;
        await tx.user.update({ where: { id: member.id }, data: { isActive: true } });
        deletion = api('delete', `/${department.id}`).then((res) => res);
        // 削除要求が部署行のロック待ちに入ったことを確認してからコミットする
        await waitUntilSessionBlocked('%departments%');
      });
      const res = await deletion;
      expect(res?.status).toBe(409);
      expect((res?.body as ErrorBody).code).toBe('DEPARTMENT_HAS_MEMBERS');
      const after = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
      expect(after.departmentId).toBe(department.id);
    });
  });

  describe('説明・責任者・並び替え・要約(DEPT-002・004・005・007〜009)', () => {
    it('shouldCreateWithDescriptionAndManagerAndNormalizeBlankDescription', async () => {
      const manager = await tracker.createUser({ name: '責任者A' });
      const res = await api('post')
        .send({
          code: `M${uniqueSuffix()}`,
          name: `部署${uniqueSuffix()}`,
          description: ' 説明 ',
          managerId: manager.id,
        })
        .expect(201);
      const body = res.body as DepartmentBody & { description: string | null; manager: unknown };
      tracker.departmentIds.push(body.id);
      expect(body.description).toBe('説明');
      expect(body.manager).toEqual({ id: manager.id, empId: manager.empId, name: '責任者A' });
      const blank = await api('patch', `/${body.id}`).send({ description: '  ' }).expect(200);
      expect((blank.body as { description: unknown }).description).toBeNull();
    });

    it('shouldReturn400InvalidManagerWithoutSideEffectsForUnknownOrInactiveUser', async () => {
      const inactive = await tracker.createUser({ isActive: false });
      const dept = await createViaApi();
      for (const managerId of [randomUUID(), inactive.id]) {
        const patched = await api('patch', `/${dept.id}`).send({ managerId }).expect(400);
        expect((patched.body as ErrorBody).code).toBe('INVALID_MANAGER');
        const code = `X${uniqueSuffix()}`;
        const created = await api('post')
          .send({ code, name: `部署${uniqueSuffix()}`, managerId })
          .expect(400);
        expect((created.body as ErrorBody).code).toBe('INVALID_MANAGER');
        // 失敗した登録では部署が作られない
        expect(await prisma.department.count({ where: { code } })).toBe(0);
      }
      // 失敗した修正では既存の責任者(未設定)が変わらない
      const after = await api('get', `/${dept.id}`).expect(200);
      expect((after.body as { manager: unknown }).manager).toBeNull();
    });

    it('shouldKeepExistingManagerWhenPatchWithInvalidManagerFails', async () => {
      const manager = await tracker.createUser();
      const inactive = await tracker.createUser({ isActive: false });
      const dept = await createViaApi();
      await api('patch', `/${dept.id}`).send({ managerId: manager.id }).expect(200);
      for (const managerId of [inactive.id, randomUUID()]) {
        await api('patch', `/${dept.id}`).send({ managerId }).expect(400);
      }
      const after = await api('get', `/${dept.id}`).expect(200);
      expect((after.body as { manager: { id: string } }).manager.id).toBe(manager.id);
    });

    it('shouldReturn400ValidationErrorForMalformedManagerIdOnCreate', async () => {
      const code = `X${uniqueSuffix()}`;
      const res = await api('post')
        .send({ code, name: `部署${uniqueSuffix()}`, managerId: 'abc' })
        .expect(400);
      expect((res.body as ErrorBody).code).toBe('VALIDATION_ERROR');
      expect((res.body as { details: { field: string }[] }).details[0].field).toBe('managerId');
      expect(await prisma.department.count({ where: { code } })).toBe(0);
    });

    it('shouldAcceptManagerFromSameDeptOtherDeptOrRequesterItself', async () => {
      const dept = await createViaApi();
      const other = await createViaApi();
      const sameDeptMember = await tracker.createUser({ departmentId: dept.id });
      const otherDeptMember = await tracker.createUser({ departmentId: other.id });
      for (const managerId of [sameDeptMember.id, otherDeptMember.id, adminId]) {
        const res = await api('patch', `/${dept.id}`).send({ managerId }).expect(200);
        const manager = (res.body as { manager: Record<string, unknown> }).manager;
        expect(manager.id).toBe(managerId);
        expect(Object.keys(manager).sort()).toEqual(['empId', 'id', 'name']);
      }
    });

    it('shouldAllowSameManagerOnMultipleDepartmentsAndReleaseWithNull', async () => {
      const manager = await tracker.createUser();
      const a = await createViaApi();
      const b = await createViaApi();
      await api('patch', `/${a.id}`).send({ managerId: manager.id }).expect(200);
      await api('patch', `/${b.id}`).send({ managerId: manager.id }).expect(200);
      // 別の部署の責任者を兼ねても、もう一方の責任者は維持される
      const keptA = await api('get', `/${a.id}`).expect(200);
      expect((keptA.body as { manager: { id: string } }).manager.id).toBe(manager.id);
      const released = await api('patch', `/${a.id}`).send({ managerId: null }).expect(200);
      expect((released.body as { manager: unknown }).manager).toBeNull();
      const keptB = await api('get', `/${b.id}`).expect(200);
      expect((keptB.body as { manager: { id: string } }).manager.id).toBe(manager.id);
    });

    it('shouldRecordManagerOnSameUserForDepartmentsAndBlockDeletingManagerAtDb', async () => {
      const manager = await tracker.createUser();
      const a = await createViaApi();
      const b = await createViaApi();
      // 同じ社員を 2 部署の責任者に直接設定する(UNIQUE 制約なし)
      await prisma.$executeRaw`UPDATE departments SET manager_id = ${manager.id}::uuid WHERE id IN (${a.id}::uuid, ${b.id}::uuid)`;
      expect(await prisma.department.count({ where: { managerId: manager.id } })).toBe(2);
      // 責任者に指定された部署の削除は成功する
      await api('delete', `/${a.id}`).expect(204);
      // 責任者に指定された社員の物理削除は FK RESTRICT で失敗する
      const info = await captureDbError(() => prisma.user.delete({ where: { id: manager.id } }));
      expect(info.code).toBe('P2003');
      // ON DELETE RESTRICT の違反は SQLSTATE 23001(restrict_violation)
      expect(info.sqlState).toBe('23001');
      expect(await prisma.user.count({ where: { id: manager.id } })).toBe(1);
      const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'departments' AND indexname = 'departments_manager_id_idx'`;
      expect(indexes).toHaveLength(1);
    });

    it('shouldReturn400ForMalformedManagerId', async () => {
      const dept = await createViaApi();
      const res = await api('patch', `/${dept.id}`).send({ managerId: 'abc' }).expect(400);
      expect((res.body as { details: { field: string }[] }).details[0].field).toBe('managerId');
    });

    it('shouldReturn409ProtectedBeforeManagerCheckForUnassigned', async () => {
      const unassigned = await prisma.department.findUniqueOrThrow({
        where: { code: 'UNASSIGNED' },
      });
      const res = await api('patch', `/${unassigned.id}`)
        .send({ managerId: randomUUID() })
        .expect(409);
      expect((res.body as ErrorBody).code).toBe('PROTECTED_DEPARTMENT');
    });

    it('shouldSortByMemberCountUsingActiveMembersOnly', async () => {
      const prefix = `S${uniqueSuffix().slice(0, 6)}`;
      const none = await createViaApi(`${prefix}A`);
      const one = await createViaApi(`${prefix}B`);
      const two = await createViaApi(`${prefix}C`);
      await tracker.createUser({ departmentId: one.id });
      await tracker.createUser({ departmentId: two.id });
      await tracker.createUser({ departmentId: two.id });
      // 無効な社員は数えない(none は 0 のまま)
      await tracker.createUser({ departmentId: none.id, isActive: false });
      const desc = await api('get', `?code=${prefix}&sort=memberCount&order=desc`).expect(200);
      expect((desc.body as PageBody).items.map((d) => d.code)).toEqual([
        `${prefix}C`,
        `${prefix}B`,
        `${prefix}A`,
      ]);
      const asc = await api('get', `?code=${prefix}&sort=memberCount&order=asc`).expect(200);
      expect((asc.body as PageBody).items.map((d) => d.code)).toEqual([
        `${prefix}A`,
        `${prefix}B`,
        `${prefix}C`,
      ]);
    });

    it('shouldOrderTiedMemberCountByCodeAscInBothDirections', async () => {
      const prefix = `U${uniqueSuffix().slice(0, 6)}`;
      const tieB = await createViaApi(`${prefix}B`);
      const tieA = await createViaApi(`${prefix}A`);
      await createViaApi(`${prefix}C`);
      await tracker.createUser({ departmentId: tieB.id });
      await tracker.createUser({ departmentId: tieA.id });
      // 件数が同じ部署は code 昇順(並び順の方向に関係なく)
      const desc = await api('get', `?code=${prefix}&sort=memberCount&order=desc`).expect(200);
      expect((desc.body as PageBody).items.map((d) => d.code)).toEqual([
        `${prefix}A`,
        `${prefix}B`,
        `${prefix}C`,
      ]);
      const asc = await api('get', `?code=${prefix}&sort=memberCount&order=asc`).expect(200);
      expect((asc.body as PageBody).items.map((d) => d.code)).toEqual([
        `${prefix}C`,
        `${prefix}A`,
        `${prefix}B`,
      ]);
      // 2 ページ目も同じ並びの続きになる
      const page2 = await api(
        'get',
        `?code=${prefix}&sort=memberCount&order=desc&limit=1&page=2`,
      ).expect(200);
      expect(page2.body).toMatchObject({ totalCount: 3, page: 2 });
      expect((page2.body as PageBody).items.map((d) => d.id)).toEqual([tieB.id]);
    });

    it('shouldSortByUpdatedAtDescendingSoRecentlyUpdatedComesFirst', async () => {
      const prefix = `P${uniqueSuffix().slice(0, 6)}`;
      const first = await createViaApi(`${prefix}A`);
      const second = await createViaApi(`${prefix}B`);
      const third = await createViaApi(`${prefix}C`);
      // 最後に作成した third より後に first を修正する
      await api('patch', `/${first.id}`)
        .send({ name: `改名${uniqueSuffix()}` })
        .expect(200);
      const res = await api('get', `?code=${prefix}&sort=updatedAt&order=desc`).expect(200);
      const ids = (res.body as PageBody).items.map((d) => d.id);
      expect(ids[0]).toBe(first.id);
      expect(ids).toHaveLength(3);
      expect(ids.indexOf(third.id)).toBeLessThan(ids.indexOf(second.id));
    });

    it('shouldPaginateMemberCountSortWithNameSearchAndIncludeDescriptionAndManager', async () => {
      const suffix = uniqueSuffix();
      const manager = await tracker.createUser({ name: '責任者B', empId: `MG${suffix}` });
      const two = await createViaApi(undefined, `${suffix}二人部署`);
      const one = await createViaApi(undefined, `${suffix}一人部署`);
      const zero = await createViaApi(undefined, `${suffix}ゼロ部署`);
      await tracker.createUser({ departmentId: two.id });
      await tracker.createUser({ departmentId: two.id });
      await tracker.createUser({ departmentId: one.id });
      await api('patch', `/${zero.id}`)
        .send({ description: '説明あり', managerId: manager.id })
        .expect(200);
      // 検索対象外の部署(名前が一致しない)は件数に含まれない
      await createViaApi();

      const res = await api('get', '').query({
        name: suffix,
        sort: 'memberCount',
        order: 'desc',
        page: 2,
        limit: 2,
      });
      expect(res.status).toBe(200);
      const body = res.body as PageBody & {
        items: (DepartmentBody & { description: string | null; manager: unknown })[];
      };
      expect(body.totalCount).toBe(3);
      expect(body.items.map((d) => d.id)).toEqual([zero.id]);
      expect(body.items[0]).toMatchObject({
        description: '説明あり',
        manager: { id: manager.id, empId: manager.empId, name: '責任者B' },
        memberCount: 0,
      });
    });

    it('shouldSortByNameDescAndReturn400ForInvalidSortOrOrder', async () => {
      const prefix = `N${uniqueSuffix().slice(0, 6)}`;
      await createViaApi(`${prefix}1`, `${prefix}あ`);
      await createViaApi(`${prefix}2`, `${prefix}い`);
      const res = await api('get', `?code=${prefix}&sort=name&order=desc`).expect(200);
      expect((res.body as PageBody).items.map((d) => d.code)).toEqual([`${prefix}2`, `${prefix}1`]);
      const bad = await api('get', '?sort=id').expect(400);
      expect((bad.body as { details: { field: string }[] }).details[0].field).toBe('sort');
      await api('get', '?order=up').expect(400);
    });

    it('shouldReturnSummaryExcludingUnassignedFromDepartmentCount', async () => {
      const res = await api('get', '/summary').expect(200);
      const body = res.body as { departmentCount: number; memberCount: number };
      expect(body.departmentCount).toBe(
        await prisma.department.count({ where: { code: { not: 'UNASSIGNED' } } }),
      );
      expect(body.memberCount).toBe(await prisma.user.count({ where: { isActive: true } }));
    });

    it('shouldListOnlyActiveMembersOrderedByEmpId', async () => {
      const dept = await createViaApi();
      const suffix = uniqueSuffix();
      const jobTitle = await tracker.createJobTitle({ tone: 'VIOLET' });
      const second = await tracker.createUser({ departmentId: dept.id, empId: `Z${suffix}B` });
      const first = await tracker.createUser({
        departmentId: dept.id,
        empId: `Z${suffix}A`,
        jobTitleId: jobTitle.id,
        contactEmail: `member-${suffix}@example.com`,
        hireDate: new Date('2024-04-01T00:00:00Z'),
      });
      await tracker.createUser({ departmentId: dept.id, isActive: false });
      const res = await api('get', `/${dept.id}/members`).expect(200);
      const body = res.body as {
        items: {
          id: string;
          empId: string;
          name: string;
          jobTitle: { id: string; name: string; tone: string } | null;
          contactEmail: string | null;
          hireDate: string;
        }[];
        totalCount: number;
      };
      expect(body.totalCount).toBe(2);
      expect(body.items.map((m) => m.empId)).toEqual([first.empId, second.empId]);
      expect(Object.keys(body.items[0]).sort()).toEqual([
        'contactEmail',
        'empId',
        'hireDate',
        'id',
        'jobTitle',
        'name',
      ]);
      expect(body.items[0].jobTitle).toEqual({
        id: jobTitle.id,
        name: jobTitle.name,
        tone: 'VIOLET',
      });
      expect(body.items[0].contactEmail).toBe(`member-${suffix}@example.com`);
      expect(body.items[0].hireDate).toBe('2024-04-01');
      expect(body.items[1].hireDate).toBe('2026-01-01');
      // 役職・連絡先がない社員は null(キーは省略しない)
      expect(body.items[1].jobTitle).toBeNull();
      expect(body.items[1].contactEmail).toBeNull();
      await api('get', `/${randomUUID()}/members`).expect(404);
      await api('get', '/not-a-uuid/members').expect(400);
    });

    it('shouldReturnActiveCandidatesIncludingAdminWithoutExtraFields', async () => {
      const keyword = `KW${uniqueSuffix()}`;
      const admin = await tracker.createUser({
        role: 'ADMIN',
        name: `${keyword}管理`,
        mustChangePassword: false,
      });
      await tracker.createUser({ name: `${keyword}退職`, isActive: false });
      const res = await api(
        'get',
        `/manager-candidates?keyword=${encodeURIComponent(keyword.toLowerCase())}`,
      ).expect(200);
      const body = res.body as Record<string, unknown>[];
      expect(body).toHaveLength(1);
      expect(Object.keys(body[0]).sort()).toEqual(['departmentName', 'empId', 'id', 'name']);
      expect(body[0].id).toBe(admin.id);
      const tooLong = await api('get', `/manager-candidates?keyword=${'a'.repeat(101)}`).expect(
        400,
      );
      expect((tooLong.body as { details: { field: string }[] }).details[0].field).toBe('keyword');
    });

    it('shouldMatchCandidatesByEmpIdPartialAndTreatBlankKeywordAsNoCondition', async () => {
      const empKey = `Q${uniqueSuffix()}`;
      const target = await tracker.createUser({ empId: `${empKey}X1` });
      // 部分一致(社員番号の途中)
      const byEmpId = await api(
        'get',
        `/manager-candidates?keyword=${encodeURIComponent(empKey.slice(3))}`,
      ).expect(200);
      expect((byEmpId.body as { id: string }[]).map((c) => c.id)).toEqual([target.id]);
      // 空白だけの検索語は条件なし(有効な社員の全件。上限 100)
      const blank = await api('get', '/manager-candidates?keyword=%20%20').expect(200);
      const activeCount = await prisma.user.count({ where: { isActive: true } });
      expect((blank.body as unknown[]).length).toBe(Math.min(100, activeCount));
    });

    it('shouldReturn403ForEmployeeOnNewEndpoints', async () => {
      for (const path of ['/summary', '/manager-candidates', `/${randomUUID()}/members`]) {
        await api('get', path, employeeToken).expect(403);
      }
    });

    it('shouldReturn403ForEmployeeWhenSettingManagerOnCreateOrUpdate', async () => {
      const manager = await tracker.createUser();
      const code = `X${uniqueSuffix()}`;
      await api('post', '', employeeToken)
        .send({ code, name: `部署${uniqueSuffix()}`, managerId: manager.id })
        .expect(403);
      expect(await prisma.department.count({ where: { code } })).toBe(0);
      const dept = await createViaApi();
      await api('patch', `/${dept.id}`, employeeToken).send({ managerId: manager.id }).expect(403);
      const after = await api('get', `/${dept.id}`).expect(200);
      expect((after.body as { manager: unknown }).manager).toBeNull();
    });

    it('shouldReturn401WithoutTokenOnNewEndpoints', async () => {
      const server = app.getHttpServer();
      await request(server).get(`${PATH}/summary`).expect(401);
      await request(server).get(`${PATH}/manager-candidates`).expect(401);
      await request(server).get(`${PATH}/${randomUUID()}/members`).expect(401);
      await request(server)
        .post(PATH)
        .send({ code: 'X', name: 'x', managerId: randomUUID() })
        .expect(401);
      await request(server)
        .patch(`${PATH}/${randomUUID()}`)
        .send({ managerId: randomUUID() })
        .expect(401);
    });

    it('shouldReturnSummaryWithSameBodyWhenNameQueryIsGiven', async () => {
      const plain = await api('get', '/summary').expect(200);
      const withQuery = await api('get', '/summary?name=存在しない部署名').expect(200);
      expect(withQuery.body).toEqual(plain.body);
    });

    it('shouldDeleteDepartmentEvenWhenItHasManager', async () => {
      const manager = await tracker.createUser();
      const dept = await createViaApi();
      await api('patch', `/${dept.id}`).send({ managerId: manager.id }).expect(200);
      await api('delete', `/${dept.id}`).expect(204);
    });
  });

  describe('役職・連絡先の公開範囲(IT-DEPT-37)', () => {
    it('shouldNotExposeJobTitleOrContactInGeneralUserResponses', async () => {
      const suffix = uniqueSuffix();
      const jobTitle = await tracker.createJobTitle({ tone: 'BLUE' });
      const contactEmail = `scope-${suffix}@example.com`;
      const holder = await tracker.createUser({
        name: `公開範囲${suffix}`,
        jobTitleId: jobTitle.id,
        contactEmail,
        mustChangePassword: false,
      });
      const holderToken = await sign(holder.id);

      // 管理者向け API-DEPT-009 は候補の基本項目だけを返す
      const candidates = await api('get', `/manager-candidates?keyword=${suffix}`).expect(200);
      const candidateBody = candidates.body as Record<string, unknown>[];
      expect(candidateBody.map((c) => c.id)).toContain(holder.id);
      for (const item of candidateBody) {
        expect(item).not.toHaveProperty('jobTitle');
        expect(item).not.toHaveProperty('jobTitleId');
        expect(item).not.toHaveProperty('contactEmail');
        expect(item).not.toHaveProperty('hireDate');
      }

      // 一般社員が受け取る応答(部署一覧・自分の情報)に役職・連絡先を含めない
      const departments = await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
      expect(JSON.stringify(departments.body)).not.toContain(contactEmail);
      expect(JSON.stringify(departments.body)).not.toContain('jobTitle');

      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${holderToken}`)
        .expect(200);
      expect(me.body).not.toHaveProperty('jobTitle');
      expect(me.body).not.toHaveProperty('jobTitleId');
      expect(me.body).not.toHaveProperty('contactEmail');
      expect(me.body).not.toHaveProperty('hireDate');
      expect(JSON.stringify(departments.body)).not.toContain('hireDate');
      expect(JSON.stringify(me.body)).not.toContain(contactEmail);
    });
  });
});
