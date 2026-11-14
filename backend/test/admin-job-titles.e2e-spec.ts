// 管理者の役職 API(API-JOB-001〜004)の e2e。実際のテスト用 DB(workbridge_test)を使う
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker, uniqueSuffix } from './db/db-helpers.js';
import { createTestApp, createTokenSigner, DEFAULT_NOW, FixedClock } from './e2e-helpers.js';

const PATH = '/api/v1/admin/job-titles';

interface JobTitleBody {
  id: string;
  name: string;
  tone: string;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}
interface ErrorBody {
  code?: string;
  message?: string;
  details?: { field: string; message: string }[];
}

describe('管理者 役職 API(e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let tracker: TestDataTracker;
  let adminToken: string;
  let employeeToken: string;
  let passwordChangeToken: string;
  const clock = new FixedClock();
  const sign = createTokenSigner();

  beforeAll(async () => {
    prisma = createTestPrisma();
    tracker = new TestDataTracker(prisma);
    app = await createTestApp(clock);
    const admin = await tracker.createUser({ role: 'ADMIN', mustChangePassword: false });
    adminToken = await sign(admin.id);
    const employee = await tracker.createUser({ mustChangePassword: false });
    employeeToken = await sign(employee.id);
    const pending = await tracker.createUser({ mustChangePassword: true });
    passwordChangeToken = await sign(pending.id);
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

  function http(method: 'get' | 'post' | 'patch' | 'delete', path: string, token: string) {
    return request(app.getHttpServer())[method](`${PATH}${path}`).set(
      'Authorization',
      `Bearer ${token}`,
    );
  }

  describe('権限', () => {
    const endpoints: { method: 'get' | 'post' | 'patch' | 'delete'; path: string }[] = [
      { method: 'get', path: '' },
      { method: 'post', path: '' },
      { method: 'patch', path: `/${randomUUID()}` },
      { method: 'delete', path: `/${randomUUID()}` },
    ];

    it.each(endpoints)('shouldReject401WithoutToken($method $path)', async ({ method, path }) => {
      await request(app.getHttpServer())[method](`${PATH}${path}`).expect(401);
    });

    it.each(endpoints)('shouldReject403ForEmployee($method $path)', async ({ method, path }) => {
      await http(method, path, employeeToken).expect(403);
    });

    it.each(endpoints)(
      'shouldReject403PasswordChangeRequired($method $path)',
      async ({ method, path }) => {
        const res = await http(method, path, passwordChangeToken).expect(403);
        expect((res.body as ErrorBody).code).toBe('PASSWORD_CHANGE_REQUIRED');
      },
    );
  });

  describe('GET /admin/job-titles', () => {
    it('shouldReturnArrayOrderedByCreatedAtAscWithUserCountIncludingInactive', async () => {
      const first = await tracker.createJobTitle({ name: `先${uniqueSuffix()}` });
      const second = await tracker.createJobTitle({ name: `後${uniqueSuffix()}` });
      await tracker.createUser({ jobTitleId: first.id, isActive: true });
      await tracker.createUser({ jobTitleId: first.id, isActive: false });

      const res = await http('get', '', adminToken).expect(200);
      const items = res.body as JobTitleBody[];
      expect(Array.isArray(items)).toBe(true);

      const ids = items.map((item) => item.id);
      expect(ids.indexOf(first.id)).toBeLessThan(ids.indexOf(second.id));
      const firstItem = items.find((item) => item.id === first.id);
      expect(firstItem?.userCount).toBe(2);
      expect(firstItem).toHaveProperty('createdAt');
      expect(firstItem).toHaveProperty('updatedAt');
    });
  });

  describe('POST /admin/job-titles', () => {
    it('shouldCreateWithTrimmedNameAndNewToneAndZeroUserCount', async () => {
      const name = `  新役職${uniqueSuffix()}  `;
      const res = await http('post', '', adminToken)
        .send({ name, tone: 'LAVENDER' })
        .expect(201);
      const body = res.body as JobTitleBody;
      tracker.jobTitleIds.push(body.id);
      expect(body.name).toBe(name.trim());
      expect(body.tone).toBe('LAVENDER');
      expect(body.userCount).toBe(0);
    });

    it.each(['GREEN', 'YELLOW', 'ORANGE', 'LAVENDER'])('shouldStoreNewTone(%s)', async (tone) => {
      const res = await http('post', '', adminToken)
        .send({ name: `色${tone}${uniqueSuffix()}`, tone })
        .expect(201);
      tracker.jobTitleIds.push((res.body as JobTitleBody).id);
      expect((res.body as JobTitleBody).tone).toBe(tone);
    });

    it('shouldReturn409DuplicateNameAfterTrim', async () => {
      const name = `重複${uniqueSuffix()}`;
      const first = await http('post', '', adminToken).send({ name, tone: 'GREEN' }).expect(201);
      tracker.jobTitleIds.push((first.body as JobTitleBody).id);

      const res = await http('post', '', adminToken)
        .send({ name: `  ${name}  `, tone: 'BLUE' })
        .expect(409);
      expect(res.body).toMatchObject({
        code: 'DUPLICATE_JOB_TITLE_NAME',
        message: 'この役職名は既に登録されています。',
      });
    });

    it('shouldReturn400ForToneOutsideEightValuesWithColorMessage', async () => {
      const res = await http('post', '', adminToken)
        .send({ name: `色なし${uniqueSuffix()}`, tone: 'RED' })
        .expect(400);
      const body = res.body as ErrorBody;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'tone', message: '色を選択してください。' }),
        ]),
      );
    });

    it('shouldReturn400ForNameOver50Characters', async () => {
      const res = await http('post', '', adminToken)
        .send({ name: 'あ'.repeat(51), tone: 'GREEN' })
        .expect(400);
      expect((res.body as ErrorBody).details?.[0]?.message).toBe(
        '役職名は 50 文字以内で入力してください。',
      );
    });
  });

  describe('PATCH /admin/job-titles/:id', () => {
    it('shouldUpdateNameAndToneAndReflectToneInUserListAndDetail', async () => {
      const jobTitle = await tracker.createJobTitle({ tone: 'GRAY' });
      const user = await tracker.createUser({ jobTitleId: jobTitle.id });

      const res = await http('patch', `/${jobTitle.id}`, adminToken)
        .send({ name: `変更${uniqueSuffix()}`, tone: 'PINK' })
        .expect(200);
      expect((res.body as JobTitleBody).tone).toBe('PINK');

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((detail.body as { jobTitle: { tone: string } }).jobTitle.tone).toBe('PINK');
    });

    it('shouldReturn409DuplicateWhenRenamingToExistingName', async () => {
      const taken = await tracker.createJobTitle({ name: `既存${uniqueSuffix()}` });
      const target = await tracker.createJobTitle();
      const res = await http('patch', `/${target.id}`, adminToken)
        .send({ name: taken.name })
        .expect(409);
      expect((res.body as ErrorBody).code).toBe('DUPLICATE_JOB_TITLE_NAME');
    });

    it('shouldReturn404WhenJobTitleMissing', async () => {
      const res = await http('patch', `/${randomUUID()}`, adminToken)
        .send({ tone: 'BLUE' })
        .expect(404);
      expect(res.body).toMatchObject({ code: 'NOT_FOUND', message: '役職が見つかりません。' });
    });

    it('shouldReturn400ForEmptyBodyAndNonUuidId', async () => {
      const jobTitle = await tracker.createJobTitle();
      await http('patch', `/${jobTitle.id}`, adminToken).send({}).expect(400);
      const res = await http('patch', '/not-a-uuid', adminToken).send({ tone: 'BLUE' }).expect(400);
      expect((res.body as ErrorBody).details?.[0]?.message).toBe(
        '役職 ID の形式が正しくありません。',
      );
    });
  });

  describe('DELETE /admin/job-titles/:id', () => {
    it('shouldReturn204WhenUnused', async () => {
      const jobTitle = await tracker.createJobTitle();
      await http('delete', `/${jobTitle.id}`, adminToken).expect(204);
      expect(await prisma.jobTitle.count({ where: { id: jobTitle.id } })).toBe(0);
      tracker.jobTitleIds.splice(tracker.jobTitleIds.indexOf(jobTitle.id), 1);
    });

    it('shouldReturn409JobTitleInUseForActiveOrInactiveUsers', async () => {
      const active = await tracker.createJobTitle();
      await tracker.createUser({ jobTitleId: active.id, isActive: true });
      const resActive = await http('delete', `/${active.id}`, adminToken).expect(409);
      expect(resActive.body).toMatchObject({
        code: 'JOB_TITLE_IN_USE',
        message:
          'この役職を使用している社員が存在するため、削除できません。',
      });

      const inactive = await tracker.createJobTitle();
      await tracker.createUser({ jobTitleId: inactive.id, isActive: false });
      await http('delete', `/${inactive.id}`, adminToken).expect(409);
    });

    it('shouldReturn404WhenJobTitleMissing', async () => {
      await http('delete', `/${randomUUID()}`, adminToken).expect(404);
    });
  });

  describe('マイグレーション(job_title_tone enum)', () => {
    it('shouldHaveEightToneValuesIncludingNewOnes', async () => {
      const rows = await prisma.$queryRaw<{ value: string }[]>`
        SELECT unnest(enum_range(NULL::job_title_tone))::text AS value
      `;
      expect(rows.map((row) => row.value).sort()).toEqual(
        ['BLUE', 'GRAY', 'GREEN', 'LAVENDER', 'ORANGE', 'PINK', 'VIOLET', 'YELLOW'].sort(),
      );
    });
  });
});
