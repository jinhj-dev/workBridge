// 社員サンプルデータの生成(buildSampleUsers)と登録(insertSampleUsers)の単体テスト。DB は使わない。
import bcrypt from 'bcrypt';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { SYSTEM_DEPARTMENT_CODE } from '../src/modules/departments/department.constants.js';
import { JOB_TITLES } from './initial-data.js';
import {
  buildSampleUsers,
  insertSampleUsers,
  parseSampleUserPassword,
  SAMPLE_USER_COUNT,
} from './sample-users-data.js';

describe('buildSampleUsers', () => {
  const users = buildSampleUsers();

  it('shouldBuild100UsersWithUniqueEmpIdsFrom10001To10100', () => {
    expect(users).toHaveLength(SAMPLE_USER_COUNT);
    expect(new Set(users.map((user) => user.empId)).size).toBe(100);
    expect(users[0]?.empId).toBe('10001');
    expect(users[99]?.empId).toBe('10100');
  });

  it('shouldBeDeterministic', () => {
    expect(buildSampleUsers()).toEqual(users);
  });

  it('shouldAssignFiveUnassignedAndSplitOthersEvenly', () => {
    const counts = new Map<string, number>();
    for (const user of users) {
      counts.set(user.departmentCode, (counts.get(user.departmentCode) ?? 0) + 1);
    }
    expect(counts.get(SYSTEM_DEPARTMENT_CODE)).toBe(5);
    for (const code of ['GA', 'DEV', 'SALES', 'HR']) {
      expect(counts.get(code)).toBeGreaterThanOrEqual(23);
      expect(counts.get(code)).toBeLessThanOrEqual(24);
    }
  });

  it('shouldMakeTenPercentInactive', () => {
    expect(users.filter((user) => !user.isActive)).toHaveLength(10);
  });

  it('shouldSpreadValidHireDatesFrom2015To2026NotInTheFuture', () => {
    const years = new Set<number>();
    for (const user of users) {
      expect(user.hireDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(`${user.hireDate}T00:00:00Z`).getTime())).toBe(false);
      expect(user.hireDate >= '2015-01-01' && user.hireDate <= '2026-10-31').toBe(true);
      years.add(Number(user.hireDate.slice(0, 4)));
    }
    expect(years.size).toBe(12);
  });

  it('shouldAssignJobTitlesInRotationWithTwentyNullAndExampleDotComEmails', () => {
    const jobTitleNames = JOB_TITLES.map((jobTitle) => jobTitle.name);
    expect(users.filter((user) => user.jobTitleName === null)).toHaveLength(20);
    for (const user of users) {
      if (user.jobTitleName !== null) {
        expect(jobTitleNames).toContain(user.jobTitleName);
      }
      expect(user.contactEmail).toBe(`user${user.empId}@example.com`);
    }
    expect(new Set(users.map((user) => user.jobTitleName)).size).toBe(JOB_TITLES.length + 1);
  });

  it('shouldHaveNonEmptyNamesWithinColumnLength', () => {
    for (const user of users) {
      expect(user.name.length).toBeGreaterThan(0);
      expect(user.name.length).toBeLessThanOrEqual(100);
    }
  });
});

describe('parseSampleUserPassword', () => {
  it('shouldReturnValidPassword', () => {
    expect(parseSampleUserPassword({ SEED_USER_PASSWORD: 'Sample1234' })).toBe('Sample1234');
  });

  it('shouldThrowWhenUnsetOrRuleViolation', () => {
    expect(() => parseSampleUserPassword({})).toThrow('SEED_USER_PASSWORD が設定されていません');
    expect(() => parseSampleUserPassword({ SEED_USER_PASSWORD: 'Ab1' })).toThrow('8 文字以上');
    expect(() => parseSampleUserPassword({ SEED_USER_PASSWORD: 'abcdefgh' })).toThrow('英字と数字');
    expect(() => parseSampleUserPassword({ SEED_USER_PASSWORD: '12345678' })).toThrow('英字と数字');
    expect(() => parseSampleUserPassword({ SEED_USER_PASSWORD: `a1${'x'.repeat(71)}` })).toThrow(
      '72 バイト以下',
    );
  });
});

describe('insertSampleUsers', () => {
  const departments = [SYSTEM_DEPARTMENT_CODE, 'GA', 'DEV', 'SALES', 'HR'].map((code) => ({
    id: `id-${code}`,
    code,
  }));
  const PASSWORD = 'Sample1234';

  const jobTitleRows = JOB_TITLES.map((jobTitle) => ({
    id: `jt-${jobTitle.name}`,
    name: jobTitle.name,
  }));

  function createPrismaStub(
    existingEmpIds: string[] = [],
    rows = departments,
    jobTitles = jobTitleRows,
  ) {
    const findDepartments = vi.fn().mockResolvedValue(rows);
    const findUsers = vi.fn().mockResolvedValue(existingEmpIds.map((empId) => ({ empId })));
    const createMany = vi
      .fn()
      .mockImplementation(({ data }: { data: unknown[] }) =>
        Promise.resolve({ count: data.length }),
      );
    const updateMany = vi.fn().mockResolvedValue({ count: existingEmpIds.length });
    const updateRow = vi.fn().mockResolvedValue({});
    const tx = { user: { findMany: findUsers, createMany, updateMany, update: updateRow } };
    const transaction = vi.fn().mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx));
    const prisma = {
      department: { findMany: findDepartments },
      jobTitle: { findMany: vi.fn().mockResolvedValue(jobTitles) },
      $transaction: transaction,
    } as unknown as PrismaClient;
    return { prisma, createMany, updateMany, updateRow, transaction };
  }

  it('shouldCreateAllWithBcryptHashOfPasswordWhenNoneExist', async () => {
    const { prisma, createMany, updateMany, transaction } = createPrismaStub();

    await expect(insertSampleUsers(prisma, PASSWORD)).resolves.toEqual({
      createdCount: 100,
      updatedCount: 0,
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateMany).not.toHaveBeenCalled();
    const args = createMany.mock.calls[0]?.[0] as {
      data: {
        passwordHash: string;
        jobTitleId: string | null;
        contactEmail: string;
        role: string;
        mustChangePassword: boolean;
        departmentId: string;
      }[];
    };
    expect(args.data).toHaveLength(100);
    expect(args.data.every((row) => row.role === 'EMPLOYEE')).toBe(true);
    expect(args.data.every((row) => row.mustChangePassword)).toBe(true);
    expect(args.data.every((row) => row.departmentId.startsWith('id-'))).toBe(true);
    expect(args.data.filter((row) => row.jobTitleId === null)).toHaveLength(20);
    expect(args.data.every((row) => row.contactEmail.endsWith('@example.com'))).toBe(true);
    // ハッシュは 1 回だけ計算して共用し、入力のパスワードと一致する
    const hashes = new Set(args.data.map((row) => row.passwordHash));
    expect(hashes.size).toBe(1);
    expect(await bcrypt.compare(PASSWORD, [...hashes][0])).toBe(true);
  });

  it('shouldUpdatePasswordJobTitleAndContactForExistingAndCreateTheRest', async () => {
    const { prisma, createMany, updateMany, updateRow } = createPrismaStub(['10001', '10002']);

    await expect(insertSampleUsers(prisma, PASSWORD)).resolves.toEqual({
      createdCount: 98,
      updatedCount: 2,
    });

    const created = (createMany.mock.calls[0]?.[0] as { data: { empId: string }[] }).data;
    expect(created.map((row) => row.empId)).not.toContain('10001');
    const update = updateMany.mock.calls[0]?.[0] as {
      where: { empId: { in: string[] } };
      data: Record<string, unknown>;
    };
    expect(update.where.empId.in).toEqual(['10001', '10002']);
    expect(Object.keys(update.data)).toEqual(['passwordHash']);
    // 役職・連絡先は社員ごとに行単位で更新する(10001 = マネージャー、10002 = リーダー)
    expect(updateRow).toHaveBeenCalledTimes(2);
    expect(updateRow).toHaveBeenCalledWith({
      where: { empId: '10001' },
      data: { jobTitleId: 'jt-マネージャー', contactEmail: 'user10001@example.com' },
    });
  });

  it('shouldThrowWithoutWritingWhenJobTitleIsMissing', async () => {
    const { prisma, transaction } = createPrismaStub([], departments, []);

    await expect(insertSampleUsers(prisma, PASSWORD)).rejects.toThrow('npm run db:seed');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('shouldThrowWithoutWritingWhenDepartmentIsMissing', async () => {
    const { prisma, transaction } = createPrismaStub(
      [],
      departments.filter((row) => row.code !== 'HR'),
    );

    await expect(insertSampleUsers(prisma, PASSWORD)).rejects.toThrow('HR');
    expect(transaction).not.toHaveBeenCalled();
  });
});
