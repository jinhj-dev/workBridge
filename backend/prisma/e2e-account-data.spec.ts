// E2E アカウントの設定読み込み(parseE2eAccountConfig)の単体テスト。DB は使わない。
// 作成・初期化処理(resetE2eAccounts)の統合テストは test/db/e2e-accounts.e2e-spec.ts。
import { describe, expect, it, vi } from 'vitest';
import { Role } from '../src/generated/prisma/client.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import {
  assertLocalDatabaseUrl,
  buildE2eAttendanceFixture,
  parseE2eAccountConfig,
  resetE2eAdminAttendance,
  seedE2eAdminAttendance,
} from './e2e-account-data.js';

const ADMIN_PASSWORD = 'Admin1234pass';
const INITIAL_PASSWORD = 'Initial5678pass';
const VALID_ENV = { E2E_ADMIN_PASSWORD: ADMIN_PASSWORD, E2E_INITIAL_PASSWORD: INITIAL_PASSWORD };

describe('parseE2eAccountConfig', () => {
  it('両方のパスワードが有効なとき、900001(ADMIN)と 900002(初回ログイン)の設定を返す', () => {
    expect(parseE2eAccountConfig(VALID_ENV)).toEqual({
      accounts: [
        {
          empId: '900001',
          name: 'E2E管理者',
          role: Role.ADMIN,
          mustChangePassword: false,
          password: ADMIN_PASSWORD,
        },
        {
          empId: '900002',
          name: 'E2E初回ログイン',
          role: Role.EMPLOYEE,
          mustChangePassword: true,
          password: INITIAL_PASSWORD,
        },
      ],
    });
  });

  it('どちらかのパスワードが未設定・空のときは、その環境変数名を含めて失敗する', () => {
    expect(() => parseE2eAccountConfig({ E2E_INITIAL_PASSWORD: INITIAL_PASSWORD })).toThrow(
      '環境変数 E2E_ADMIN_PASSWORD が設定されていません',
    );
    expect(() => parseE2eAccountConfig({ E2E_ADMIN_PASSWORD: ADMIN_PASSWORD })).toThrow(
      '環境変数 E2E_INITIAL_PASSWORD が設定されていません',
    );
    expect(() => parseE2eAccountConfig({ ...VALID_ENV, E2E_INITIAL_PASSWORD: '' })).toThrow(
      'E2E_INITIAL_PASSWORD',
    );
  });

  it('規則違反(7 文字・英字なし・数字なし・73 バイト)のときは失敗する', () => {
    const cases: [string, string][] = [
      ['Abc1234', '8 文字以上'],
      ['12345678', '英字と数字'],
      ['abcdefgh', '英字と数字'],
      [`a1${'x'.repeat(71)}`, '72 バイト以下'],
      // 'a1' + マルチバイト 23 文字(各 3 バイト)+ 'xx' = 73 バイト
      [`a1${'あ'.repeat(23)}xx`, '72 バイト以下'],
    ];
    for (const [password, message] of cases) {
      expect(
        () => parseE2eAccountConfig({ ...VALID_ENV, E2E_ADMIN_PASSWORD: password }),
        password,
      ).toThrow(`E2E_ADMIN_PASSWORD は`);
      expect(
        () => parseE2eAccountConfig({ ...VALID_ENV, E2E_ADMIN_PASSWORD: password }),
        password,
      ).toThrow(message);
      expect(
        () => parseE2eAccountConfig({ ...VALID_ENV, E2E_INITIAL_PASSWORD: password }),
        password,
      ).toThrow(`E2E_INITIAL_PASSWORD は`);
    }
  });

  it('境界値: 8 文字の英数字と、ちょうど 72 バイトのパスワードは通る', () => {
    const eightChars = 'abcd1234';
    const exactly72Bytes = `a1${'x'.repeat(70)}`;
    expect(Buffer.byteLength(exactly72Bytes)).toBe(72);
    const config = parseE2eAccountConfig({
      E2E_ADMIN_PASSWORD: eightChars,
      E2E_INITIAL_PASSWORD: exactly72Bytes,
    });
    expect(config.accounts.map((account) => account.password)).toEqual([
      eightChars,
      exactly72Bytes,
    ]);
    // マルチバイトでもちょうど 72 バイトなら通る('a1' + 'あ' × 22 + 'xxxx' = 72 バイト)
    const multiByte72 = `a1${'あ'.repeat(22)}xxxx`;
    expect(Buffer.byteLength(multiByte72)).toBe(72);
    expect(
      parseE2eAccountConfig({ ...VALID_ENV, E2E_ADMIN_PASSWORD: multiByte72 }).accounts[0].password,
    ).toBe(multiByte72);
  });

  it('NODE_ENV=production のときは、パスワードが有効でも失敗する', () => {
    expect(() => parseE2eAccountConfig({ ...VALID_ENV, NODE_ENV: 'production' })).toThrow(
      '本番環境では E2E アカウントを作成できません。',
    );
  });
});

describe('assertLocalDatabaseUrl', () => {
  it.each([
    'postgresql://user:pass@localhost:5432/workbridge',
    'postgresql://user:pass@127.0.0.1:5432/workbridge',
    'postgresql://user:pass@[::1]:5432/workbridge',
  ])('ローカルのホスト %s は許可する', (databaseUrl) => {
    expect(() => assertLocalDatabaseUrl(databaseUrl)).not.toThrow();
  });

  it.each([
    'postgresql://user:pass@db.example.com:5432/workbridge',
    'postgresql://user:pass@192.168.0.10:5432/workbridge',
    'postgresql://user:pass@localhost.evil.com:5432/workbridge',
    'postgresql://user:pass@127.0.0.1.evil.com:5432/workbridge',
    'not a url',
    '',
  ])('ローカル以外または解析できない %s は拒否する', (databaseUrl) => {
    expect(() => assertLocalDatabaseUrl(databaseUrl)).toThrow();
  });

  it('拒否時のエラーメッセージに接続文字列のパスワードを含めない', () => {
    const secret = 'SuperSecretPw987';
    let message = '';
    try {
      assertLocalDatabaseUrl(`postgresql://user:${secret}@db.example.com:5432/workbridge`);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toBe('');
    expect(message).not.toContain(secret);
  });

  it('解析できない文字列を渡しても接続文字列のパスワードを含めない', () => {
    const secret = 'SuperSecretPw987';
    expect(() => assertLocalDatabaseUrl(`postgresql//user:${secret}@`)).toThrow();
    let message = '';
    try {
      assertLocalDatabaseUrl(`postgresql//user:${secret}@`);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toContain(secret);
  });
});

describe('resetE2eAdminAttendance', () => {
  // 必要な prisma のメソッドだけを持つ偽物。DB には接続しない
  function fakePrisma(admin: { id: string; name: string } | null, deletedCount = 0) {
    const findUnique = vi.fn().mockResolvedValue(admin);
    const deleteMany = vi.fn().mockResolvedValue({ count: deletedCount });
    const prisma = { user: { findUnique }, attendance: { deleteMany } };
    return { prisma: prisma as unknown as PrismaClient, findUnique, deleteMany };
  }

  it('shouldDeleteOnlyAdminAttendanceAndReturnCount', async () => {
    const { prisma, findUnique, deleteMany } = fakePrisma({ id: 'admin-id', name: 'E2E管理者' }, 2);

    await expect(resetE2eAdminAttendance(prisma)).resolves.toBe(2);
    expect(findUnique).toHaveBeenCalledWith({
      where: { empId: '900001' },
      select: { id: true, name: true },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'admin-id' } });
  });

  it('shouldThrowWithoutDeletingWhenAdminDoesNotExist', async () => {
    const { prisma, deleteMany } = fakePrisma(null);

    await expect(resetE2eAdminAttendance(prisma)).rejects.toThrow('npm run db:e2e-accounts');
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('shouldThrowWithoutDeletingWhenUserAtEmpIdIsNotE2eAdmin', async () => {
    const { prisma, deleteMany } = fakePrisma({ id: 'other-id', name: '別の社員' });

    await expect(resetE2eAdminAttendance(prisma)).rejects.toThrow('npm run db:e2e-accounts');
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe('buildE2eAttendanceFixture', () => {
  it('shouldBuildOneRowPerStatusCaseRelativeToToday', () => {
    const rows = buildE2eAttendanceFixture('2026-11-10');

    expect(rows.map((row) => [row.workDate, row.clockOut === null])).toEqual([
      ['2026-11-10', true], // 勤務中(今日・退勤なし)
      ['2026-11-09', true], // 退勤漏れ
      ['2026-11-08', false], // 退勤済み
      ['2026-11-07', true], // 退勤漏れ
      ['2026-11-06', false], // 退勤済み
      ['2026-10-01', false], // 退勤済み(照会期間の外)
    ]);
  });

  it('shouldClockInOnTheWorkDateInTokyoAndClockOutLater', () => {
    for (const row of buildE2eAttendanceFixture('2026-03-01')) {
      expect(row.clockIn).toBe(`${row.workDate}T09:00:00+09:00`);
      if (row.clockOut !== null) {
        expect(new Date(row.clockOut).getTime()).toBeGreaterThan(new Date(row.clockIn).getTime());
      }
    }
  });
});

describe('seedE2eAdminAttendance', () => {
  it('shouldResetThenInsertFixtureForAdminOnly', async () => {
    const calls: string[] = [];
    const admin = { id: 'admin-id', name: 'E2E管理者' };
    const createMany = vi.fn().mockImplementation(() => {
      calls.push('create');
      return Promise.resolve({ count: 6 });
    });
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(admin),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: admin.id }),
      },
      attendance: {
        deleteMany: vi.fn().mockImplementation(() => {
          calls.push('delete');
          return Promise.resolve({ count: 3 });
        }),
        createMany,
      },
    } as unknown as PrismaClient;

    await expect(seedE2eAdminAttendance(prisma, '2026-11-10')).resolves.toBe(6);

    expect(calls).toEqual(['delete', 'create']);
    const args = createMany.mock.calls[0]?.[0] as {
      data: { userId: string }[];
    };
    expect(args.data).toHaveLength(6);
    expect(args.data.every((row) => row.userId === 'admin-id')).toBe(true);
  });

  it('shouldNotInsertWhenAdminDoesNotExist', async () => {
    const createMany = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      attendance: { deleteMany: vi.fn(), createMany },
    } as unknown as PrismaClient;

    await expect(seedE2eAdminAttendance(prisma, '2026-11-10')).rejects.toThrow(
      'npm run db:e2e-accounts',
    );
    expect(createMany).not.toHaveBeenCalled();
  });
});
