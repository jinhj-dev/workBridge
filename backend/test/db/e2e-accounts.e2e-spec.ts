// E2E アカウントの作成・初期化(resetE2eAccounts)の統合テスト(workbridge_test)。
// 設定読み込み(parseE2eAccountConfig)の単体テストは prisma/e2e-account-data.spec.ts。
// 社員番号は衝突しない値を設定に入れ、作った行は afterAll ですべて削除する
// (seed.e2e-spec が前提とする「活性 ADMIN がいない」状態を残すため)。
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  E2E_ACCOUNTS,
  E2E_HIRE_DATE,
  resetE2eAccounts,
  type E2eAccountConfig,
  type E2eResetResult,
} from '../../prisma/e2e-account-data.js';
import { Role } from '../../src/generated/prisma/client.js';
import {
  createTestPrisma,
  fromDbDate,
  TestDataTracker,
  toDbDate,
  uniqueSuffix,
} from './db-helpers.js';

const ADMIN_PASSWORD = 'E2eAdmin1234';
const INITIAL_PASSWORD = 'E2eInitial5678';
// bcrypt(cost 12)を何度も計算するため既定より長くする
const TIMEOUT_MS = 30_000;

describe('resetE2eAccounts', () => {
  const prisma = createTestPrisma();
  const tracker = new TestDataTracker(prisma);
  let devDepartmentId = '';

  beforeAll(async () => {
    // 「他の活性 ADMIN がいない」ケースを確認するため、他のデータを消さずに前提を確かめる
    const activeAdmins = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } });
    if (activeAdmins > 0) {
      throw new Error(
        `テスト用 DB に活性 ADMIN が ${activeAdmins} 件残っています。前回のテストの残骸を確認してください。`,
      );
    }
    // E2E アカウントの所属先(開発部)。なければ作り、afterAll で削除する
    const dev = await prisma.department.findUnique({ where: { code: 'DEV' } });
    if (dev) {
      devDepartmentId = dev.id;
    } else {
      const created = await tracker.createDepartment({ code: 'DEV', name: '開発部' });
      devDepartmentId = created.id;
    }
  });

  afterAll(async () => {
    try {
      await tracker.cleanup();
    } finally {
      await prisma.$disconnect();
    }
  });

  function configFor(adminEmpId: string, initialEmpId: string): E2eAccountConfig {
    return {
      accounts: [
        { ...E2E_ACCOUNTS.admin, empId: adminEmpId, password: ADMIN_PASSWORD },
        { ...E2E_ACCOUNTS.initial, empId: initialEmpId, password: INITIAL_PASSWORD },
      ],
    };
  }

  // 実行後、作られたユーザーを expect より先に記録する(検証失敗時も afterAll で削除されるように)
  async function resetAndTrack(config: E2eAccountConfig): Promise<E2eResetResult> {
    try {
      return await resetE2eAccounts(prisma, config);
    } finally {
      const users = await prisma.user.findMany({
        where: { empId: { in: config.accounts.map((account) => account.empId) } },
        select: { id: true },
      });
      for (const user of users) {
        if (!tracker.userIds.includes(user.id)) tracker.userIds.push(user.id);
      }
    }
  }

  async function createRefreshToken(userId: string, revoked: boolean): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: `e2e-${uniqueSuffix()}${uniqueSuffix()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        revokedAt: revoked ? new Date() : null,
      },
    });
  }

  const adminEmpId = `E2EA${uniqueSuffix()}`;
  const initialEmpId = `E2EI${uniqueSuffix()}`;
  const config = configFor(adminEmpId, initialEmpId);

  it(
    'shouldThrowWithoutCreatingUsersWhenNoOtherActiveAdminExists',
    async () => {
      await expect(resetAndTrack(config)).rejects.toThrow(
        '先に npm run db:seed で初期 ADMIN を登録してください。',
      );
      expect(
        await prisma.user.count({ where: { empId: { in: [adminEmpId, initialEmpId] } } }),
      ).toBe(0);
    },
    TIMEOUT_MS,
  );

  it(
    'shouldCreateBothAccountsWithExpectedStateOnFirstRun',
    async () => {
      // 初期 ADMIN の代わり(他の活性 ADMIN)
      await tracker.createUser({ role: Role.ADMIN, isActive: true });

      const result = await resetAndTrack(config);
      expect(result).toEqual({
        accounts: [
          { empId: adminEmpId, status: 'created' },
          { empId: initialEmpId, status: 'created' },
        ],
      });

      const admin = await prisma.user.findUniqueOrThrow({ where: { empId: adminEmpId } });
      expect(admin).toMatchObject({
        name: 'E2E管理者',
        role: Role.ADMIN,
        mustChangePassword: false,
        isActive: true,
        approvalRequired: false,
        departmentId: devDepartmentId,
      });
      expect(fromDbDate(admin.hireDate)).toBe(E2E_HIRE_DATE);
      expect(await bcrypt.compare(ADMIN_PASSWORD, admin.passwordHash)).toBe(true);

      const initial = await prisma.user.findUniqueOrThrow({ where: { empId: initialEmpId } });
      expect(initial).toMatchObject({
        name: 'E2E初回ログイン',
        role: Role.EMPLOYEE,
        mustChangePassword: true,
        isActive: true,
        approvalRequired: false,
        departmentId: devDepartmentId,
      });
      expect(fromDbDate(initial.hireDate)).toBe(E2E_HIRE_DATE);
      expect(await bcrypt.compare(INITIAL_PASSWORD, initial.passwordHash)).toBe(true);
    },
    TIMEOUT_MS,
  );

  it(
    'shouldUpdateWithoutAddingUsersWhenRunAgain',
    async () => {
      const before = await prisma.user.findMany({
        where: { empId: { in: [adminEmpId, initialEmpId] } },
        select: { id: true, empId: true },
        orderBy: { empId: 'asc' },
      });
      const totalBefore = await prisma.user.count();

      const result = await resetAndTrack(config);
      expect(result).toEqual({
        accounts: [
          { empId: adminEmpId, status: 'updated' },
          { empId: initialEmpId, status: 'updated' },
        ],
      });
      expect(await prisma.user.count()).toBe(totalBefore);
      const after = await prisma.user.findMany({
        where: { empId: { in: [adminEmpId, initialEmpId] } },
        select: { id: true, empId: true },
        orderBy: { empId: 'asc' },
      });
      expect(after).toEqual(before);
    },
    TIMEOUT_MS,
  );

  it(
    'shouldRestoreExpectedStateWhenAccountsWereChanged',
    async () => {
      const department = await tracker.createDepartment();
      // 初回ログイン用はパスワード変更済み、管理者は無効化・権限変更された状態にする
      await prisma.user.update({
        where: { empId: initialEmpId },
        data: {
          passwordHash: await bcrypt.hash('Changed9999pass', 4),
          mustChangePassword: false,
          departmentId: department.id,
          // 別の日付に変更
          hireDate: toDbDate('2025-04-01'),
        },
      });
      await prisma.user.update({
        where: { empId: adminEmpId },
        data: { isActive: false, role: Role.EMPLOYEE, approvalRequired: true },
      });

      await resetAndTrack(config);

      const admin = await prisma.user.findUniqueOrThrow({ where: { empId: adminEmpId } });
      expect(admin).toMatchObject({
        role: Role.ADMIN,
        isActive: true,
        approvalRequired: false,
        mustChangePassword: false,
      });
      expect(await bcrypt.compare(ADMIN_PASSWORD, admin.passwordHash)).toBe(true);

      const initial = await prisma.user.findUniqueOrThrow({ where: { empId: initialEmpId } });
      expect(initial).toMatchObject({
        role: Role.EMPLOYEE,
        isActive: true,
        mustChangePassword: true,
        departmentId: devDepartmentId,
      });
      expect(fromDbDate(initial.hireDate)).toBe(E2E_HIRE_DATE);
      expect(await bcrypt.compare(INITIAL_PASSWORD, initial.passwordHash)).toBe(true);
    },
    TIMEOUT_MS,
  );

  it(
    'shouldDeleteOnlyE2eAccountRefreshTokens',
    async () => {
      const users = await prisma.user.findMany({
        where: { empId: { in: [adminEmpId, initialEmpId] } },
        select: { id: true },
      });
      const e2eUserIds = users.map((user) => user.id);
      for (const userId of e2eUserIds) {
        await createRefreshToken(userId, false);
        await createRefreshToken(userId, true);
      }
      const other = await tracker.createUser();
      await createRefreshToken(other.id, false);

      await resetAndTrack(config);

      expect(await prisma.refreshToken.count({ where: { userId: { in: e2eUserIds } } })).toBe(0);
      expect(await prisma.refreshToken.count({ where: { userId: other.id } })).toBe(1);
    },
    TIMEOUT_MS,
  );

  it(
    'shouldThrowAndChangeNothingWhenNonE2eUserHasSameEmpId',
    async () => {
      // 同じ社員番号で氏名の異なる一般ユーザー
      const conflictEmpId = `E2EC${uniqueSuffix()}`;
      const ordinary = await tracker.createUser({ empId: conflictEmpId, name: '一般 太郎' });
      // 既存の E2E 管理者は、トークンが残っていることでロールバックを確認する
      const adminBefore = await prisma.user.findUniqueOrThrow({ where: { empId: adminEmpId } });
      await createRefreshToken(adminBefore.id, false);

      await expect(resetAndTrack(configFor(adminEmpId, conflictEmpId))).rejects.toThrow(
        `社員番号 ${conflictEmpId} のユーザーは E2E アカウントではないため変更しません。`,
      );

      expect(await prisma.user.findUniqueOrThrow({ where: { id: ordinary.id } })).toEqual(ordinary);
      expect(await prisma.user.findUniqueOrThrow({ where: { id: adminBefore.id } })).toEqual(
        adminBefore,
      );
      expect(await prisma.refreshToken.count({ where: { userId: adminBefore.id } })).toBe(1);
    },
    TIMEOUT_MS,
  );
});
