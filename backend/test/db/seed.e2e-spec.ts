// seed(初期データ投入)の統合テスト(workbridge_test)。冪等性と初期 ADMIN の登録条件を確認する。
// 設定読み込み(parseSeedConfig)の単体テストは prisma/initial-data.spec.ts。
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DEPARTMENTS,
  seedInitialData,
  type SeedConfig,
  type SeedResult,
} from '../../prisma/initial-data.js';
import { Role } from '../../src/generated/prisma/client.js';
import { createTestPrisma, uniqueSuffix } from './db-helpers.js';

const VALID_PASSWORD = 'Seed1234pass';

const DEPARTMENT_NAMES = DEPARTMENTS.map((department) => department.name);

describe('seedInitialData', () => {
  const prisma = createTestPrisma();
  const createdUserIds: string[] = [];
  let preexistingDepartmentNames: string[] = [];

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
  });

  afterAll(async () => {
    try {
      // 自分が作った行だけを削除する(元からあった部署は残す)
      await prisma.$transaction([
        prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }),
        prisma.department.deleteMany({
          where: { name: { in: DEPARTMENT_NAMES, notIn: preexistingDepartmentNames } },
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
    expect(second).toEqual({ createdDepartmentCount: 0, admin: 'skipped' });
    expect(await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } })).toBe(1);
    expect(await prisma.department.count({ where: { name: { in: DEPARTMENT_NAMES } } })).toBe(
      DEPARTMENT_NAMES.length,
    );
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { empId } });
    expect(unchanged.passwordHash).toBe(admin.passwordHash);
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
