// DB 統合テスト(workbridge_test)。docs/05_DATABASE_DESIGN.md の制約が実 DB で効くことを確認する。
import { afterAll, describe, expect, it } from 'vitest';
import type { Prisma } from '../../src/generated/prisma/client.js';
import {
  captureDbError,
  createTestPrisma,
  extractAdapterCause,
  fromDbDate,
  TestDataTracker,
  toDbDate,
  uniqueSuffix,
} from './db-helpers.js';

// 接続先の検証に失敗した場合はファイルの読み込み時点で失敗させる(afterAll が元のエラーを隠さないように)
const prisma = createTestPrisma();
const tracker = new TestDataTracker(prisma);

afterAll(async () => {
  try {
    await tracker.cleanup();
  } finally {
    await prisma.$disconnect();
  }
});

// Prisma エラーの種別。UNIQUE=P2002 / FK・RESTRICT=P2003 / CHECK=P2039(adapter-pg 経由)
async function expectUnique(run: () => Promise<unknown>, constraint: string): Promise<void> {
  const info = await captureDbError(run);
  expect(info.className).toBe('PrismaClientKnownRequestError');
  expect(info.code).toBe('P2002');
  expect(info.sqlState).toBe('23505');
  expect(info.message).toContain(constraint);
}

async function expectForeignKey(run: () => Promise<unknown>, constraint: string): Promise<void> {
  const info = await captureDbError(run);
  expect(info.className).toBe('PrismaClientKnownRequestError');
  expect(info.code).toBe('P2003');
  expect(info.message).toContain(constraint);
}

async function expectCheck(run: () => Promise<unknown>, constraint: string): Promise<void> {
  const info = await captureDbError(run);
  expect(info.className).toBe('PrismaClientKnownRequestError');
  expect(info.code).toBe('P2039');
  expect(info.sqlState).toBe('23514');
  // 違反した CHECK 名は message に含まれる
  expect(info.message).toContain(constraint);
}

function leaveData(userId: string, approverId: string): Prisma.LeaveUncheckedCreateInput {
  return {
    userId,
    approverId,
    leaveType: 'ANNUAL',
    startDate: toDbDate('2026-04-06'),
    endDate: toDbDate('2026-04-08'),
    days: 3,
    reason: '私用のため',
    status: 'PENDING',
  };
}

// Prisma は CHECK 制約の差分を検知しないため、マイグレーションで作った CHECK がそろっているかを直接確かめる
const EXPECTED_CHECK_CONSTRAINTS = [
  'attendance_clock_out_after_in_check',
  'attendance_clock_out_within_24h_check',
  'attendance_modified_pair_check',
  'attendance_work_date_matches_clock_in_check',
  'leave_grants_granted_days_check',
  'leaves_approver_not_self_check',
  'leaves_date_order_check',
  'leaves_days_check',
  'leaves_half_day_single_date_check',
  'leaves_pending_state_check',
  'leaves_processed_state_check',
  'leaves_rejected_approver_check',
  'leaves_rejected_reason_check',
  'leaves_same_year_check',
];

describe('マイグレーションの適用状態', () => {
  it('設計書 05 の CHECK 制約 14 個がすべて存在する', async () => {
    const rows = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.contype = 'c'
    `;
    // 並び順は DB の照合順序に依存させず、JS 側でそろえる
    expect(rows.map((row) => row.conname).sort()).toEqual([...EXPECTED_CHECK_CONSTRAINTS].sort());
  });
});

describe('基本 CRUD', () => {
  it('departments / users / refresh_tokens を作成・取得・更新できる', async () => {
    const department = await tracker.createDepartment();
    const user = await tracker.createUser({ departmentId: department.id });
    expect(user.approvalRequired).toBe(true);
    expect(user.isActive).toBe(true);
    expect(user.mustChangePassword).toBe(true);
    expect(user.createdAt).toBeInstanceOf(Date);

    const found = await prisma.user.findUnique({
      where: { empId: user.empId },
      include: { department: true },
    });
    expect(found?.department?.name).toBe(department.name);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: '更新後', isActive: false },
    });
    expect(updated.name).toBe('更新後');
    expect(updated.isActive).toBe(false);

    const token = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: uniqueSuffix().padEnd(64, '0'),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    expect(token.revokedAt).toBeNull();
    const revoked = await prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date() },
    });
    expect(revoked.revokedAt).toBeInstanceOf(Date);
  });

  it('attendance を作成・取得・退勤更新できる', async () => {
    const user = await tracker.createUser();
    const clockIn = new Date('2026-04-01T00:30:00Z'); // 東京 09:30
    const created = await prisma.attendance.create({
      data: { userId: user.id, workDate: toDbDate('2026-04-01'), clockIn },
    });
    expect(created.clockOut).toBeNull();

    const updated = await prisma.attendance.update({
      where: { id: created.id },
      data: { clockOut: new Date('2026-04-01T09:30:00Z') },
    });
    expect(updated.clockOut?.toISOString()).toBe('2026-04-01T09:30:00.000Z');
  });

  it('leave_grants を作成・取得・更新できる', async () => {
    const user = await tracker.createUser();
    const created = await prisma.leaveGrant.create({
      data: { userId: user.id, year: 2026, grantedDays: 10 },
    });
    const updated = await prisma.leaveGrant.update({
      where: { userId_year: { userId: user.id, year: 2026 } },
      data: { grantedDays: 12.5 },
    });
    expect(updated.id).toBe(created.id);
    expect(updated.grantedDays.toNumber()).toBe(12.5);
  });

  it('leaves を作成・取得・状態更新できる', async () => {
    const user = await tracker.createUser();
    const approver = await tracker.createUser();
    const created = await prisma.leave.create({ data: leaveData(user.id, approver.id) });
    expect(created.status).toBe('PENDING');

    const approved = await prisma.leave.updateMany({
      where: { id: created.id, status: 'PENDING' },
      data: { status: 'APPROVED', processedBy: approver.id, processedAt: new Date() },
    });
    expect(approved.count).toBe(1);
    // 条件付き UPDATE は 2 回目に 0 件になる(05 §8)
    const again = await prisma.leave.updateMany({
      where: { id: created.id, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
    expect(again.count).toBe(0);
  });
});

describe('部署コードと所属の必須化', () => {
  it('users.department_id は NULL を拒否する', async () => {
    // Prisma のクライアントは department を必須として検証するため、DB の NOT NULL を直接確かめる(生 SQL)
    await expect(
      prisma.$executeRaw`
        INSERT INTO users (id, name, emp_id, password_hash, role, hire_date)
        VALUES (gen_random_uuid(), ${'テスト太郎'}, ${`T${uniqueSuffix()}`}, 'dummy-hash', 'EMPLOYEE', '2026-01-01')`,
    ).rejects.toThrow(/department_id/);
  });

  it('マイグレーション後、所属なしの社員がおらず、未所属部署が 1 件ある', async () => {
    const [nullable] = await prisma.$queryRaw<{ is_nullable: string }[]>`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'department_id'`;
    expect(nullable?.is_nullable).toBe('NO');
    const [orphans] = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM users WHERE department_id IS NULL`;
    expect(orphans?.n).toBe(0);
    expect(await prisma.department.count({ where: { code: 'UNASSIGNED' } })).toBe(1);
  });
});

describe('UNIQUE 制約', () => {
  it('departments.code の重複を拒否する(大文字に正規化された値で比較)', async () => {
    const department = await tracker.createDepartment();
    await expectUnique(
      () =>
        prisma.department.create({
          data: { code: department.code, name: `別名${uniqueSuffix()}` },
        }),
      'departments_code_key',
    );
  });

  it('departments.name の重複を拒否する', async () => {
    const department = await tracker.createDepartment();
    await expectUnique(
      () =>
        prisma.department.create({ data: { code: `T${uniqueSuffix()}`, name: department.name } }),
      'departments_name_key',
    );
  });

  it('users.emp_id の重複を拒否する', async () => {
    const user = await tracker.createUser();
    await expectUnique(() => tracker.createUser({ empId: user.empId }), 'users_emp_id_key');
  });

  it('attendance の user_id + work_date の重複を拒否する', async () => {
    const user = await tracker.createUser();
    const data = {
      userId: user.id,
      workDate: toDbDate('2026-04-01'),
      clockIn: new Date('2026-04-01T00:30:00Z'),
    };
    await prisma.attendance.create({ data });
    await expectUnique(
      () => prisma.attendance.create({ data }),
      'attendance_user_id_work_date_key',
    );
  });

  it('leave_grants の user_id + year の重複を拒否する', async () => {
    const user = await tracker.createUser();
    await prisma.leaveGrant.create({ data: { userId: user.id, year: 2026, grantedDays: 10 } });
    await expectUnique(
      () => prisma.leaveGrant.create({ data: { userId: user.id, year: 2026, grantedDays: 5 } }),
      'leave_grants_user_id_year_key',
    );
  });

  it('refresh_tokens.token_hash の重複を拒否する', async () => {
    const user = await tracker.createUser();
    const data = {
      userId: user.id,
      tokenHash: `hash-${uniqueSuffix()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
    await prisma.refreshToken.create({ data });
    await expectUnique(() => prisma.refreshToken.create({ data }), 'refresh_tokens_token_hash_key');
  });
});

describe('役職と連絡先', () => {
  it('job_titles.name の重複を拒否し、tone の既定値は GRAY', async () => {
    const jobTitle = await tracker.createJobTitle();
    expect(jobTitle.tone).toBe('GRAY');
    await expectUnique(
      () => prisma.jobTitle.create({ data: { name: jobTitle.name } }),
      'job_titles_name_key',
    );
  });

  it('既存の users 行と同じく、役職・連絡先は未指定なら NULL になる', async () => {
    const user = await tracker.createUser();
    expect(user.jobTitleId).toBeNull();
    expect(user.contactEmail).toBeNull();
  });

  it('役職を参照する user がいる間は役職を削除できず、存在しない役職の参照も拒否する', async () => {
    const jobTitle = await tracker.createJobTitle();
    await tracker.createUser({ jobTitleId: jobTitle.id });
    await expectForeignKey(
      () => prisma.jobTitle.delete({ where: { id: jobTitle.id } }),
      'users_job_title_id_fkey',
    );
    await expectForeignKey(
      () => tracker.createUser({ jobTitleId: crypto.randomUUID() }),
      'users_job_title_id_fkey',
    );
  });

  it('information_schema で users.job_title_id(uuid)・contact_email(varchar 254)が NULL 許可・既定値なし', async () => {
    const columns = await prisma.$queryRaw<
      {
        column_name: string;
        data_type: string;
        character_maximum_length: number | null;
        is_nullable: string;
        column_default: string | null;
      }[]
    >`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
        AND column_name IN ('job_title_id', 'contact_email')
      ORDER BY column_name`;
    expect(columns).toEqual([
      {
        column_name: 'contact_email',
        data_type: 'character varying',
        character_maximum_length: 254,
        is_nullable: 'YES',
        column_default: null,
      },
      {
        column_name: 'job_title_id',
        data_type: 'uuid',
        character_maximum_length: null,
        is_nullable: 'YES',
        column_default: null,
      },
    ]);
  });

  it('job_titles の列構成と job_title_tone の ENUM 値(8種)を確認する', async () => {
    const columns = await prisma.$queryRaw<
      {
        column_name: string;
        data_type: string;
        character_maximum_length: number | null;
        is_nullable: string;
        column_default: string | null;
      }[]
    >`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'job_titles'
      ORDER BY ordinal_position`;
    const byName = Object.fromEntries(columns.map((c) => [c.column_name, c]));
    expect(byName.name).toMatchObject({
      data_type: 'character varying',
      character_maximum_length: 50,
      is_nullable: 'NO',
    });
    expect(byName.tone).toMatchObject({ data_type: 'USER-DEFINED', is_nullable: 'NO' });
    expect(byName.tone.column_default).toContain("'GRAY'");
    expect(byName.created_at).toBeDefined();
    expect(byName.updated_at).toBeDefined();

    const values = await prisma.$queryRaw<{ enumlabel: string }[]>`
      SELECT e.enumlabel FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'job_title_tone'
      ORDER BY e.enumsortorder`;
    expect(values.map((v) => v.enumlabel)).toEqual([
      'GRAY',
      'BLUE',
      'VIOLET',
      'PINK',
      'LAVENDER',
      'GREEN',
      'YELLOW',
      'ORANGE',
    ]);
  });

  it('job_titles は参照のない役職を削除でき、tone に ENUM 外の値・長すぎる name を拒否する', async () => {
    const unused = await tracker.createJobTitle();
    await prisma.jobTitle.delete({ where: { id: unused.id } });
    tracker.jobTitleIds.splice(tracker.jobTitleIds.indexOf(unused.id), 1);
    expect(await prisma.jobTitle.findUnique({ where: { id: unused.id } })).toBeNull();

    const badTone = await captureDbError(
      () => prisma.$executeRaw`
        INSERT INTO job_titles (id, name, tone) VALUES (gen_random_uuid(), ${`R${uniqueSuffix()}`}, 'RED'::job_title_tone)`,
    );
    expect(badTone.message).toContain('job_title_tone');
    const oldInfoTone = await captureDbError(
      () => prisma.$executeRaw`
        INSERT INTO job_titles (id, name, tone) VALUES (gen_random_uuid(), ${`I${uniqueSuffix()}`}, 'INFO'::job_title_tone)`,
    );
    expect(oldInfoTone.message).toContain('job_title_tone');

    const longName = await captureDbError(
      () => prisma.$executeRaw`
        INSERT INTO job_titles (id, name) VALUES (gen_random_uuid(), ${'あ'.repeat(51)})`,
    );
    expect(longName.sqlState).toBe('22001');
  });

  it('users.contact_email は 255 文字を拒否し、同じメールアドレスを複数人に保存できる(UNIQUE なし)', async () => {
    const longEmail = await captureDbError(
      () => tracker.createUser({ contactEmail: `${'a'.repeat(246)}@example.com` }),
    );
    expect(longEmail.sqlState).toBe('22001');

    const shared = `shared-${uniqueSuffix()}@example.com`;
    const first = await tracker.createUser({ contactEmail: shared });
    const second = await tracker.createUser({ contactEmail: shared });
    expect(first.contactEmail).toBe(shared);
    expect(second.contactEmail).toBe(shared);
  });
});

describe('FK ON DELETE RESTRICT', () => {
  it('存在しない user_id の参照を拒否する', async () => {
    await expectForeignKey(
      () =>
        prisma.leaveGrant.create({
          data: { userId: crypto.randomUUID(), year: 2026, grantedDays: 1 },
        }),
      'leave_grants_user_id_fkey',
    );
  });

  it('部署を参照する user がいる間は部署を削除できない', async () => {
    const department = await tracker.createDepartment();
    await tracker.createUser({ departmentId: department.id });
    await expectForeignKey(
      () => prisma.department.delete({ where: { id: department.id } }),
      'users_department_id_fkey',
    );
  });

  it('refresh_tokens / attendance / leave_grants から参照される user は削除できない', async () => {
    const user = await tracker.createUser();
    const admin = await tracker.createUser({ role: 'ADMIN' });
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: `hash-${uniqueSuffix()}`, expiresAt: new Date() },
    });
    await expectForeignKey(
      () => prisma.user.delete({ where: { id: user.id } }),
      'refresh_tokens_user_id_fkey',
    );

    const user2 = await tracker.createUser();
    await prisma.attendance.create({
      data: {
        userId: user2.id,
        workDate: toDbDate('2026-04-01'),
        clockIn: new Date('2026-04-01T00:30:00Z'),
        modifiedBy: admin.id,
        modifiedAt: new Date(),
      },
    });
    await expectForeignKey(
      () => prisma.user.delete({ where: { id: user2.id } }),
      'attendance_user_id_fkey',
    );
    // 修正者(modified_by)として参照されている ADMIN も削除できない
    await expectForeignKey(
      () => prisma.user.delete({ where: { id: admin.id } }),
      'attendance_modified_by_fkey',
    );

    const user3 = await tracker.createUser();
    await prisma.leaveGrant.create({ data: { userId: user3.id, year: 2026, grantedDays: 1 } });
    await expectForeignKey(
      () => prisma.user.delete({ where: { id: user3.id } }),
      'leave_grants_user_id_fkey',
    );
  });

  it('leaves から参照される user は削除できない', async () => {
    const applicant = await tracker.createUser();
    const approver = await tracker.createUser();
    await prisma.leave.create({
      data: {
        ...leaveData(applicant.id, approver.id),
        status: 'APPROVED',
        processedBy: approver.id,
        processedAt: new Date(),
      },
    });
    await expectForeignKey(
      () => prisma.user.delete({ where: { id: applicant.id } }),
      'leaves_user_id_fkey',
    );
    // approver は approver_id と processed_by の両方から参照される。どちらの FK でも拒否される
    const info = await captureDbError(() => prisma.user.delete({ where: { id: approver.id } }));
    expect(info.code).toBe('P2003');
    expect(info.message).toMatch(/leaves_(approver_id|processed_by)_fkey/);
  });
});

describe('attendance の CHECK 制約', () => {
  const clockIn = new Date('2026-04-01T00:30:00Z'); // 東京 2026-04-01 09:30

  function base(userId: string): Prisma.AttendanceUncheckedCreateInput {
    return { userId, workDate: toDbDate('2026-04-01'), clockIn };
  }

  it('退勤が出勤より後なら通り、同時刻・前は拒否する', async () => {
    const user = await tracker.createUser();
    await expectCheck(
      () => prisma.attendance.create({ data: { ...base(user.id), clockOut: clockIn } }),
      'attendance_clock_out_after_in_check',
    );
    await expectCheck(
      () =>
        prisma.attendance.create({
          data: { ...base(user.id), clockOut: new Date(clockIn.getTime() - 1000) },
        }),
      'attendance_clock_out_after_in_check',
    );
    const ok = await prisma.attendance.create({
      data: { ...base(user.id), clockOut: new Date(clockIn.getTime() + 1000) },
    });
    expect(ok.id).toBeTruthy();
  });

  it('退勤が出勤から 24 時間ちょうどは通り、超えると拒否する', async () => {
    const user = await tracker.createUser();
    const day = 24 * 3600 * 1000;
    await expectCheck(
      () =>
        prisma.attendance.create({
          data: { ...base(user.id), clockOut: new Date(clockIn.getTime() + day + 1000) },
        }),
      'attendance_clock_out_within_24h_check',
    );
    const ok = await prisma.attendance.create({
      data: { ...base(user.id), clockOut: new Date(clockIn.getTime() + day) },
    });
    expect(ok.id).toBeTruthy();
  });

  it('work_date は出勤時刻の東京日付と一致しなければ拒否する', async () => {
    const user = await tracker.createUser();
    await expectCheck(
      () =>
        prisma.attendance.create({ data: { ...base(user.id), workDate: toDbDate('2026-04-02') } }),
      'attendance_work_date_matches_clock_in_check',
    );
    // UTC では 3/31 だが東京では 4/1 01:00。UTC 日付で保存すると拒否され、東京日付なら通る
    const lateUtc = new Date('2026-03-31T16:00:00Z');
    await expectCheck(
      () =>
        prisma.attendance.create({
          data: { userId: user.id, workDate: toDbDate('2026-03-31'), clockIn: lateUtc },
        }),
      'attendance_work_date_matches_clock_in_check',
    );
    const ok = await prisma.attendance.create({
      data: { userId: user.id, workDate: toDbDate('2026-04-01'), clockIn: lateUtc },
    });
    expect(ok.id).toBeTruthy();
  });

  it('modified_by と modified_at は両方 NULL か両方 NOT NULL でなければ拒否する', async () => {
    const user = await tracker.createUser();
    const admin = await tracker.createUser({ role: 'ADMIN' });
    await expectCheck(
      () => prisma.attendance.create({ data: { ...base(user.id), modifiedBy: admin.id } }),
      'attendance_modified_pair_check',
    );
    await expectCheck(
      () => prisma.attendance.create({ data: { ...base(user.id), modifiedAt: new Date() } }),
      'attendance_modified_pair_check',
    );
    const ok = await prisma.attendance.create({
      data: { ...base(user.id), modifiedBy: admin.id, modifiedAt: new Date() },
    });
    expect(ok.id).toBeTruthy();
  });
});

describe('leave_grants の CHECK 制約', () => {
  it('0 以上の 0.5 単位は通り、負数・0.5 単位でない値は拒否する', async () => {
    const user = await tracker.createUser();
    for (const [year, days] of [
      [2020, 0],
      [2021, 0.5],
      [2022, 20],
    ] as const) {
      await prisma.leaveGrant.create({ data: { userId: user.id, year, grantedDays: days } });
    }
    for (const [year, days] of [
      [2023, -0.5],
      [2024, 0.3],
      [2025, 10.7],
    ] as const) {
      await expectCheck(
        () => prisma.leaveGrant.create({ data: { userId: user.id, year, grantedDays: days } }),
        'leave_grants_granted_days_check',
      );
    }
  });
});

describe('leaves の CHECK 制約', () => {
  let userId: string;
  let approverId: string;

  beforeAll(async () => {
    userId = (await tracker.createUser()).id;
    approverId = (await tracker.createUser()).id;
  });

  const create = (overrides: Partial<Prisma.LeaveUncheckedCreateInput>) =>
    prisma.leave.create({ data: { ...leaveData(userId, approverId), ...overrides } });

  it('start_date <= end_date', async () => {
    await expectCheck(
      () => create({ startDate: toDbDate('2026-04-10'), endDate: toDbDate('2026-04-09'), days: 1 }),
      'leaves_date_order_check',
    );
    await create({ startDate: toDbDate('2026-04-09'), endDate: toDbDate('2026-04-09'), days: 1 });
  });

  it('年をまたぐ申請を拒否する', async () => {
    await expectCheck(
      () => create({ startDate: toDbDate('2026-12-31'), endDate: toDbDate('2027-01-01'), days: 2 }),
      'leaves_same_year_check',
    );
    await create({ startDate: toDbDate('2026-12-30'), endDate: toDbDate('2026-12-31'), days: 2 });
  });

  it('半休は開始日 = 終了日', async () => {
    await expectCheck(
      () =>
        create({
          leaveType: 'HALF_AM',
          startDate: toDbDate('2026-04-06'),
          endDate: toDbDate('2026-04-07'),
          days: 0.5,
        }),
      'leaves_half_day_single_date_check',
    );
    const ok = await create({
      leaveType: 'HALF_PM',
      startDate: toDbDate('2026-04-06'),
      endDate: toDbDate('2026-04-06'),
      days: 0.5,
    });
    expect(ok.days.toNumber()).toBe(0.5);
  });

  it('days: 半休は 0.5、それ以外は 1 以上の整数', async () => {
    const single = { startDate: toDbDate('2026-05-06'), endDate: toDbDate('2026-05-06') };
    await expectCheck(() => create({ ...single, days: 1.5 }), 'leaves_days_check');
    await expectCheck(() => create({ ...single, days: 0.5 }), 'leaves_days_check');
    await expectCheck(() => create({ ...single, days: 0 }), 'leaves_days_check');
    await expectCheck(
      () => create({ ...single, leaveType: 'HALF_AM', days: 1 }),
      'leaves_days_check',
    );
    await create({ ...single, leaveType: 'SPECIAL', days: 1 });
  });

  it('承認者は申請者本人にできない', async () => {
    await expectCheck(() => create({ approverId: userId }), 'leaves_approver_not_self_check');
  });

  it('PENDING は承認者あり、処理者・処理時刻なし', async () => {
    await expectCheck(() => create({ approverId: null }), 'leaves_pending_state_check');
    await expectCheck(() => create({ processedBy: approverId }), 'leaves_pending_state_check');
    await expectCheck(() => create({ processedAt: new Date() }), 'leaves_pending_state_check');
  });

  it('APPROVED / REJECTED / CANCELLED は処理者・処理時刻が必須', async () => {
    for (const status of ['APPROVED', 'CANCELLED'] as const) {
      await expectCheck(() => create({ status }), 'leaves_processed_state_check');
      await expectCheck(
        () => create({ status, processedBy: approverId }),
        'leaves_processed_state_check',
      );
      await expectCheck(
        () => create({ status, processedAt: new Date() }),
        'leaves_processed_state_check',
      );
    }
    // 却下理由・承認者は設定済みなので、処理者なしの REJECTED が違反するのは processed_state だけ
    await expectCheck(
      () =>
        create({ status: 'REJECTED', rejectReason: '理由', processedBy: null, processedAt: null }),
      'leaves_processed_state_check',
    );

    // 承認・取消(本人)・即時承認(承認者 NULL, 処理者 = 申請者)は通る
    await create({ status: 'APPROVED', processedBy: approverId, processedAt: new Date() });
    await create({ status: 'CANCELLED', processedBy: userId, processedAt: new Date() });
    const auto = await create({
      status: 'APPROVED',
      approverId: null,
      processedBy: userId,
      processedAt: new Date(),
    });
    expect(auto.approverId).toBeNull();
  });

  it('REJECTED は却下理由と承認者が必須', async () => {
    const rejected = {
      status: 'REJECTED' as const,
      processedBy: approverId,
      processedAt: new Date(),
    };
    await expectCheck(() => create({ ...rejected }), 'leaves_rejected_reason_check');
    await expectCheck(
      () => create({ ...rejected, approverId: null, rejectReason: '人員不足のため' }),
      'leaves_rejected_approver_check',
    );
    const ok = await create({ ...rejected, rejectReason: '人員不足のため' });
    expect(ok.rejectReason).toBe('人員不足のため');
  });
});

describe('Prisma 経由の値の扱い', () => {
  it('@updatedAt が更新時に進む', async () => {
    const user = await tracker.createUser();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const updated = await prisma.user.update({ where: { id: user.id }, data: { name: '更新' } });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    expect(updated.createdAt.getTime()).toBe(user.createdAt.getTime());
  });

  it('DATE 列が YYYY-MM-DD のまま往復する(年始・月末・年末)', async () => {
    const user = await tracker.createUser();
    const approver = await tracker.createUser();
    for (const ymd of ['2026-01-01', '2026-03-31', '2026-12-31']) {
      const leave = await prisma.leave.create({
        data: {
          ...leaveData(user.id, approver.id),
          startDate: toDbDate(ymd),
          endDate: toDbDate(ymd),
          days: 1,
        },
      });
      const read = await prisma.leave.findUniqueOrThrow({ where: { id: leave.id } });
      expect(fromDbDate(read.startDate)).toBe(ymd);
      expect(fromDbDate(read.endDate)).toBe(ymd);
      // DB 側の実値も同じ日付になっている
      const raw = await prisma.$queryRaw<{ s: string }[]>`
        SELECT start_date::text AS s FROM leaves WHERE id = ${leave.id}::uuid`;
      expect(raw[0]?.s).toBe(ymd);
    }
  });

  it('NUMERIC(4,1) が Decimal で返り、0.5 が往復する', async () => {
    const user = await tracker.createUser();
    const grant = await prisma.leaveGrant.create({
      data: { userId: user.id, year: 2026, grantedDays: 10.5 },
    });
    const read = await prisma.leaveGrant.findUniqueOrThrow({ where: { id: grant.id } });
    expect(read.grantedDays.toNumber()).toBe(10.5);
    expect(read.grantedDays.toString()).toBe('10.5');

    const approver = await tracker.createUser();
    const half = await prisma.leave.create({
      data: {
        ...leaveData(user.id, approver.id),
        leaveType: 'HALF_AM',
        startDate: toDbDate('2026-04-06'),
        endDate: toDbDate('2026-04-06'),
        days: 0.5,
      },
    });
    const readHalf = await prisma.leave.findUniqueOrThrow({ where: { id: half.id } });
    expect(readHalf.days.toNumber()).toBe(0.5);

    const sum = await prisma.leave.aggregate({ where: { userId: user.id }, _sum: { days: true } });
    expect(sum._sum.days?.toNumber()).toBe(0.5);
  });
});

describe('エラー形式(API のエラーマッピング用の記録)', () => {
  it('UNIQUE 違反は P2002、meta に制約名・SQLSTATE 23505 が入る', async () => {
    const user = await tracker.createUser();
    const info = await captureDbError(() => tracker.createUser({ empId: user.empId }));
    expect(info.code).toBe('P2002');
    expect(info.sqlState).toBe('23505');
    expect(info.meta.modelName).toBe('User');
    const cause = extractAdapterCause(info.meta);
    expect(cause.kind).toBe('UniqueConstraintViolation');
    expect(cause.constraint).toEqual({ index: 'users_emp_id_key' });
  });

  it('CHECK 違反は P2039、制約名は message にのみ含まれる', async () => {
    const user = await tracker.createUser();
    const info = await captureDbError(() =>
      prisma.leaveGrant.create({ data: { userId: user.id, year: 2026, grantedDays: 0.3 } }),
    );
    expect(info.code).toBe('P2039');
    expect(info.sqlState).toBe('23514');
    const cause = extractAdapterCause(info.meta);
    expect(cause.kind).toBe('postgres');
    expect(cause.constraint).toBeUndefined();
    expect(String(cause.message)).toContain('leave_grants_granted_days_check');
  });

  it('$executeRaw 経由の CHECK 違反は P2010 になる', async () => {
    const user = await tracker.createUser();
    const info = await captureDbError(
      () => prisma.$executeRaw`
        INSERT INTO leave_grants (id, user_id, year, granted_days)
        VALUES (${crypto.randomUUID()}::uuid, ${user.id}::uuid, 2026, -1)`,
    );
    expect(info.code).toBe('P2010');
    expect(info.sqlState).toBe('23514');
  });

  it('FK 違反・RESTRICT 違反は P2003(kind で区別できる)', async () => {
    const department = await tracker.createDepartment();
    await tracker.createUser({ departmentId: department.id });
    const restrict = await captureDbError(() =>
      prisma.department.delete({ where: { id: department.id } }),
    );
    expect(restrict.code).toBe('P2003');
    expect(extractAdapterCause(restrict.meta).kind).toBe('RestrictViolation');
    expect(extractAdapterCause(restrict.meta).originalCode).toBe('23001');

    const fk = await captureDbError(() =>
      prisma.leaveGrant.create({
        data: { userId: crypto.randomUUID(), year: 2026, grantedDays: 1 },
      }),
    );
    expect(fk.code).toBe('P2003');
    expect(extractAdapterCause(fk.meta).kind).toBe('ForeignKeyConstraintViolation');
    expect(extractAdapterCause(fk.meta).originalCode).toBe('23503');
  });
});

describe('users.hire_date', () => {
  it('DATE 型・NOT NULL・既定値なしで定義されている', async () => {
    const rows = await prisma.$queryRaw<
      { data_type: string; is_nullable: string; column_default: string | null }[]
    >`
      SELECT data_type::text, is_nullable::text, column_default::text
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'hire_date'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.data_type).toBe('date');
    expect(rows[0]?.is_nullable).toBe('NO');
    expect(rows[0]?.column_default).toBeNull();
  });

  it('入社日を保存し、YYYY-MM-DD のまま読み出せる', async () => {
    const user = await tracker.createUser({ hireDate: toDbDate('2026-04-01') });
    const read = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fromDbDate(read.hireDate)).toBe('2026-04-01');
  });

  it('入社日なしの INSERT を拒否する', async () => {
    // hire_date 以外の必須列は埋めておき、NOT NULL 違反だけが起きる状態にする
    const info = await captureDbError(
      () => prisma.$executeRaw`
        INSERT INTO users (id, name, emp_id, password_hash, role)
        VALUES (${crypto.randomUUID()}::uuid, 'テスト太郎', ${`T${uniqueSuffix()}`}, 'dummy-hash', 'EMPLOYEE'::user_role)`,
    );
    expect(info.code).toBe('P2010');
    expect(info.sqlState).toBe('23502');
  });

  it('閏年・月末・未来の日付がずれずに往復する', async () => {
    for (const ymd of ['2028-02-29', '2026-12-31', '2030-04-01']) {
      const user = await tracker.createUser({ hireDate: toDbDate(ymd) });
      const read = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(fromDbDate(read.hireDate)).toBe(ymd);
      // DB 側の実値も同じ日付になっている
      const raw = await prisma.$queryRaw<{ s: string }[]>`
        SELECT hire_date::text AS s FROM users WHERE id = ${user.id}::uuid`;
      expect(raw[0]?.s).toBe(ymd);
    }
  });
});
