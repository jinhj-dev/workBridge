// 社員サンプルデータの生成(buildSampleUsers)と登録(insertSampleUsers)の単体テスト。DB は使わない。
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { SYSTEM_DEPARTMENT_CODE } from '../src/modules/departments/department.constants.js';
import { buildSampleUsers, insertSampleUsers, SAMPLE_USER_COUNT } from './sample-users-data.js';

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

  it('shouldHaveNonEmptyNamesWithinColumnLength', () => {
    for (const user of users) {
      expect(user.name.length).toBeGreaterThan(0);
      expect(user.name.length).toBeLessThanOrEqual(100);
    }
  });
});

describe('insertSampleUsers', () => {
  const departments = [SYSTEM_DEPARTMENT_CODE, 'GA', 'DEV', 'SALES', 'HR'].map((code) => ({
    id: `id-${code}`,
    code,
  }));

  function createPrismaStub(rows = departments, count = 100) {
    const findMany = vi.fn().mockResolvedValue(rows);
    const createMany = vi.fn().mockResolvedValue({ count });
    const prisma = {
      department: { findMany },
      user: { createMany },
    } as unknown as PrismaClient;
    return { prisma, createMany };
  }

  it('shouldCreateManySkippingDuplicatesWithUnguessablePasswordHash', async () => {
    const { prisma, createMany } = createPrismaStub(departments, 7);

    await expect(insertSampleUsers(prisma)).resolves.toBe(7);

    const args = createMany.mock.calls[0]?.[0] as {
      data: {
        passwordHash: string;
        role: string;
        mustChangePassword: boolean;
        departmentId: string;
      }[];
      skipDuplicates: boolean;
    };
    expect(args.skipDuplicates).toBe(true);
    expect(args.data).toHaveLength(100);
    expect(args.data.every((row) => row.role === 'EMPLOYEE')).toBe(true);
    expect(args.data.every((row) => row.passwordHash.startsWith('$2'))).toBe(true);
    expect(args.data.every((row) => row.departmentId.startsWith('id-'))).toBe(true);
  });

  it('shouldThrowWithoutInsertingWhenDepartmentIsMissing', async () => {
    const { prisma, createMany } = createPrismaStub(departments.filter((row) => row.code !== 'HR'));

    await expect(insertSampleUsers(prisma)).rejects.toThrow('HR');
    expect(createMany).not.toHaveBeenCalled();
  });
});
