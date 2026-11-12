// seed(初期データ投入)の統合テスト(workbridge_test)。冪等性と初期 ADMIN の登録条件を確認する。
// 設定読み込み(parseSeedConfig)の単体テストは prisma/initial-data.spec.ts。
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DEPARTMENTS,
  JOB_TITLES,
  seedInitialData,
  type SeedConfig,
  type SeedResult,
} from '../../prisma/initial-data.js';
import { JobTitleTone, Role } from '../../src/generated/prisma/client.js';
import { createTestPrisma, fromDbDate, uniqueSuffix } from './db-helpers.js';

const VALID_PASSWORD = 'Seed1234pass';

const DEPARTMENT_NAMES = DEPARTMENTS.map((department) => department.name);
const JOB_TITLE_NAMES = JOB_TITLES.map((jobTitle) => jobTitle.name);

describe('seedInitialData', () => {
  const prisma = createTestPrisma();
  const createdUserIds: string[] = [];
  let preexistingDepartmentNames: string[] = [];
  let preexistingJobTitleNames: string[] = [];

  beforeAll(async () => {
    // このテストは「活性 ADMIN がいない」状態から始める必要がある。
    // 他のデータを消さないよう、条件を満たさなければ失敗させる
    const activeAdmins = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } });
    if (activeAdmins > 0) {
      throw new Error(
        `テスト用 DB に活性 ADMIN が ${activeAdmins} 件残っています。前回のテストの残骸を確認してください。`,
      );
    }
    const existing = await prisma.department.findMany({
      where: { name: { in: DEPARTMENT_NAMES } },
      select: { name: true },
    });
    preexistingDepartmentNames = existing.map((department) => department.name);
    const existingJobTitles = await prisma.jobTitle.findMany({
      where: { name: { in: JOB_TITLE_NAMES } },
      select: { name: true },
    });
    preexistingJobTitleNames = existingJobTitles.map((jobTitle) => jobTitle.name);
  });

  afterAll(async () => {
    try {
      // 自分が作った行だけを削除する(元からあった部署は残す)
      await prisma.$transaction([
        prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }),
        prisma.department.deleteMany({
          where: { name: { in: DEPARTMENT_NAMES, notIn: preexistingDepartmentNames } },
        }),
        prisma.jobTitle.deleteMany({
          where: { name: { in: JOB_TITLE_NAMES, notIn: preexistingJobTitleNames } },
        }),
      ]);
    } finally {
      await prisma.$disconnect();
    }
  });

  function configFor(empId: string): SeedConfig {
    return { adminEmpId: empId, adminName: '管理者', adminPassword: VALID_PASSWORD };
  }

  // seed を実行し、作られたユーザーを expect より先に記録する。
  // 検証が途中で失敗しても afterAll で削除され、活性 ADMIN が残って次回の実行を止めないようにする
  async function seedAndTrack(config: SeedConfig): Promise<SeedResult> {
    const result = await seedInitialData(prisma, config);
    const user = await prisma.user.findUnique({
      where: { empId: config.adminEmpId },
      select: { id: true },
    });
    if (user && !createdUserIds.includes(user.id)) {
      createdUserIds.push(user.id);
    }
    return result;
  }

  it('初回は部署と初期 ADMIN を登録し、再実行しても重複せず既存 ADMIN も変更しない', async () => {
    const empId = `SEED${uniqueSuffix()}`;
    const first = await seedAndTrack(configFor(empId));
    expect(first.admin).toBe('created');
    expect(first.createdJobTitleCount).toBe(
      JOB_TITLE_NAMES.length - preexistingJobTitleNames.length,
    );
    expect(first.createdDepartmentCount).toBe(
      DEPARTMENT_NAMES.length - preexistingDepartmentNames.length,
    );

    const admin = await prisma.user.findUniqueOrThrow({ where: { empId } });
    expect(admin).toMatchObject({
      role: Role.ADMIN,
      isActive: true,
      approvalRequired: false,
      mustChangePassword: true,
    });
    // 初期 ADMIN の入社日は固定日
    expect(fromDbDate(admin.hireDate)).toBe('2026-01-01');
    expect(await bcrypt.compare(VALID_PASSWORD, admin.passwordHash)).toBe(true);
    const ga = await prisma.department.findUniqueOrThrow({ where: { code: 'GA' } });
    expect(admin.departmentId).toBe(ga.id);
    // 未所属を含む 5 部署がすべてコード付きで登録される
    const codes = DEPARTMENTS.map((department) => department.code);
    expect(codes).toHaveLength(5);
    expect(await prisma.department.count({ where: { code: { in: codes } } })).toBe(5);

    // 別の社員番号で再実行しても、活性 ADMIN がいるので何もしない
    const second = await seedAndTrack({
      ...configFor(`SEED${uniqueSuffix()}`),
      adminPassword: 'Other5678pass',
    });
    expect(second).toEqual({
      createdDepartmentCount: 0,
      createdJobTitleCount: 0,
      admin: 'skipped',
    });
    expect(await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } })).toBe(1);
    expect(await prisma.department.count({ where: { name: { in: DEPARTMENT_NAMES } } })).toBe(
      DEPARTMENT_NAMES.length,
    );
    // 役職は 4 件が登録され、色味は seed の指定どおり
    const jobTitles = await prisma.jobTitle.findMany({ where: { name: { in: JOB_TITLE_NAMES } } });
    expect(jobTitles).toHaveLength(JOB_TITLES.length);
    for (const jobTitle of JOB_TITLES) {
      expect(jobTitles.find((row) => row.name === jobTitle.name)?.tone).toBe(jobTitle.tone);
    }
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { empId } });
    expect(unchanged.passwordHash).toBe(admin.passwordHash);
  });

  it('既に登録済みの役職は、色味を変えた状態で再実行しても色味を上書きしない', async () => {
    // マネージャーの色味を seed の指定(VIOLET)以外に変えてから再実行する
    const target = JOB_TITLES[0];
    const original = await prisma.jobTitle.findUniqueOrThrow({ where: { name: target.name } });
    await prisma.jobTitle.update({
      where: { id: original.id },
      data: { tone: JobTitleTone.PINK },
    });
    try {
      const result = await seedInitialData(prisma, configFor(`SEED${uniqueSuffix()}`));
      expect(result.createdJobTitleCount).toBe(0);
      const afterSeed = await prisma.jobTitle.findUniqueOrThrow({ where: { name: target.name } });
      expect(afterSeed.tone).toBe(JobTitleTone.PINK);
      expect(afterSeed.id).toBe(original.id);
    } finally {
      // 他のテストの前提(seed の指定どおりの色味)に戻す
      await prisma.jobTitle.update({
        where: { id: original.id },
        data: { tone: original.tone },
      });
    }
  });

  it('活性 ADMIN がおらず、同じ社員番号のユーザーがいる場合は上書きせずに失敗する', async () => {
    // 前のテストの ADMIN を無効化して「活性 ADMIN がいない」状態にする
    await prisma.user.updateMany({
      where: { id: { in: createdUserIds } },
      data: { isActive: false },
    });
    const inactive = await prisma.user.findFirstOrThrow({ where: { id: { in: createdUserIds } } });

    await expect(seedInitialData(prisma, configFor(inactive.empId))).rejects.toThrow(
      `社員番号 ${inactive.empId} のユーザーが既に存在します`,
    );
    const after = await prisma.user.findUniqueOrThrow({ where: { id: inactive.id } });
    expect(after).toMatchObject({ isActive: false, passwordHash: inactive.passwordHash });

    // 別の社員番号なら、新しい初期 ADMIN を登録する
    const empId = `SEED${uniqueSuffix()}`;
    const result = await seedAndTrack(configFor(empId));
    expect(result.admin).toBe('created');
    expect(await prisma.user.count({ where: { empId, role: Role.ADMIN, isActive: true } })).toBe(1);
  });
});
