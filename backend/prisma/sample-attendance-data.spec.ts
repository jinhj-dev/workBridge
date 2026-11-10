// 勤怠サンプルデータの生成(buildSampleAttendance)と登録(insertSampleAttendance)の単体テスト。DB は使わない。
import { describe, expect, it, vi } from 'vitest';
import { toTokyoDate } from '../src/common/time/tokyo-date.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import {
  buildSampleAttendance,
  insertSampleAttendance,
  SAMPLE_EMP_ID,
} from './sample-attendance-data.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('buildSampleAttendance', () => {
  const rows = buildSampleAttendance();

  it('shouldCoverEveryWeekdayOfOctober2026Once', () => {
    expect(rows).toHaveLength(22);
    expect(new Set(rows.map((row) => row.workDate)).size).toBe(22);
    for (const row of rows) {
      expect(row.workDate).toMatch(/^2026-10-\d{2}$/);
      const weekday = new Date(`${row.workDate}T00:00:00Z`).getUTCDay();
      expect(weekday).toBeGreaterThanOrEqual(1);
      expect(weekday).toBeLessThanOrEqual(5);
    }
  });

  it('shouldMatchDbConstraintsOfAttendance', () => {
    for (const row of rows) {
      const clockIn = new Date(row.clockIn);
      // 勤務日は出勤時刻の東京の日付と一致する
      expect(toTokyoDate(clockIn)).toBe(row.workDate);
      if (row.clockOut !== null) {
        const diff = new Date(row.clockOut).getTime() - clockIn.getTime();
        expect(diff).toBeGreaterThan(0);
        expect(diff).toBeLessThanOrEqual(DAY_MS);
      }
    }
  });

  it('shouldIncludeBothDoneAndMissingClockOutRecords', () => {
    const missing = rows.filter((row) => row.clockOut === null);
    expect(missing.map((row) => row.workDate)).toEqual(['2026-10-07', '2026-10-15', '2026-10-22']);
    expect(rows.length - missing.length).toBe(19);
  });
});

describe('insertSampleAttendance', () => {
  function createPrismaStub(user: { id: string } | null, count = 22) {
    const findUnique = vi.fn().mockResolvedValue(user);
    const createMany = vi.fn().mockResolvedValue({ count });
    const prisma = { user: { findUnique }, attendance: { createMany } } as unknown as PrismaClient;
    return { prisma, findUnique, createMany };
  }

  it('shouldInsertAllRowsForEmpId00001SkippingExistingOnes', async () => {
    const { prisma, findUnique, createMany } = createPrismaStub({ id: 'user-1' }, 20);

    await expect(insertSampleAttendance(prisma)).resolves.toBe(20);

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { empId: SAMPLE_EMP_ID } }),
    );
    const args = createMany.mock.calls[0]?.[0] as {
      data: { userId: string }[];
      skipDuplicates: boolean;
    };
    expect(args.skipDuplicates).toBe(true);
    expect(args.data).toHaveLength(22);
    expect(args.data.every((row) => row.userId === 'user-1')).toBe(true);
  });

  it('shouldThrowWithoutInsertingWhenUserDoesNotExist', async () => {
    const { prisma, createMany } = createPrismaStub(null);

    await expect(insertSampleAttendance(prisma)).rejects.toThrow(SAMPLE_EMP_ID);
    expect(createMany).not.toHaveBeenCalled();
  });
});
