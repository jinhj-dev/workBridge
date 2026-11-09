// 部署一覧 API(DEPT-001)の e2e。実際のテスト用 DB(workbridge_test)を使う
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker } from './db/db-helpers.js';
import { createTestApp, createTokenSigner, DEFAULT_NOW, FixedClock } from './e2e-helpers.js';

interface DepartmentBody {
  id: string;
  name: string;
}

describe('部署 API(e2e)', () => {
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

  it('shouldReturnIdAndNameOnlyInNameAscOrderForUser', async () => {
    const user = await tracker.createUser({ mustChangePassword: false });
    const token = await sign(user.id);
    // 作成順と名前順を変えておく
    await tracker.createDepartment();
    await tracker.createDepartment();

    const res = await request(app.getHttpServer())
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = res.body as DepartmentBody[];
    expect(Array.isArray(body)).toBe(true);
    for (const item of body) {
      expect(Object.keys(item).sort()).toEqual(['id', 'name']);
    }

    // DB の name 昇順と同じ順序で返ること
    const expectedIds = (
      await prisma.department.findMany({ select: { id: true }, orderBy: { name: 'asc' } })
    ).map((department) => department.id);
    expect(body.map((item) => item.id)).toEqual(expectedIds);
  });

  it('shouldReturn401WithoutToken', async () => {
    await request(app.getHttpServer()).get('/api/v1/departments').expect(401);
  });
});
