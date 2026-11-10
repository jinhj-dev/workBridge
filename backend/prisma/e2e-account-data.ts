// Playwright 用 E2E アカウントの作成・初期化処理。実行の入口は e2e-accounts.ts。テストからも呼び出す。
// E2E アカウントは専用フラグ列を持たず、社員番号と氏名の組で識別する。
import bcrypt from 'bcrypt';
import { BCRYPT_COST } from '../src/common/security/credentials.js';
import { toDbDate } from '../src/common/time/tokyo-date.js';
import { Role, type PrismaClient } from '../src/generated/prisma/client.js';
import { assertValidPassword } from './initial-data.js';

export interface E2eAccountDefinition {
  empId: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  passwordEnvName: 'E2E_ADMIN_PASSWORD' | 'E2E_INITIAL_PASSWORD';
}

// 社員番号は E2E アカウント用に決めた値(システム全体の社員番号規則は変えない)
export const E2E_ACCOUNTS = {
  admin: {
    empId: '900001',
    name: 'E2E管理者',
    role: Role.ADMIN,
    mustChangePassword: false,
    passwordEnvName: 'E2E_ADMIN_PASSWORD',
  },
  initial: {
    empId: '900002',
    name: 'E2E初回ログイン',
    role: Role.EMPLOYEE,
    mustChangePassword: true,
    passwordEnvName: 'E2E_INITIAL_PASSWORD',
  },
} as const satisfies Record<string, E2eAccountDefinition>;

// E2E アカウントの入社日(再初期化のたびにこの日に戻す)
export const E2E_HIRE_DATE = '2026-01-01';

export interface E2eAccountSpec {
  empId: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  password: string;
}

export interface E2eAccountConfig {
  accounts: E2eAccountSpec[];
}

export interface E2eResetResult {
  // created: 新規作成した / updated: 既存の E2E アカウントを初期化した
  accounts: { empId: string; status: 'created' | 'updated' }[];
}

const E2E_DEPARTMENT_CODE = 'DEV';

const LOCAL_DATABASE_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// 接続先がローカルの DB であることを確認する。それ以外は何も変更せず例外にする。
// 接続文字列にはパスワードが含まれるため、メッセージには含めない
export function assertLocalDatabaseUrl(databaseUrl: string): void {
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('DATABASE_URL を解析できないため、E2E アカウントを作成できません。');
  }
  if (!LOCAL_DATABASE_HOSTS.includes(hostname)) {
    throw new Error(
      'DATABASE_URL の接続先がローカル(localhost / 127.0.0.1 / ::1)ではないため、E2E アカウントを作成できません。',
    );
  }
}

// 環境変数から設定を読み、検証する。不正な値は例外にする
export function parseE2eAccountConfig(env: NodeJS.ProcessEnv): E2eAccountConfig {
  if (env.NODE_ENV === 'production') {
    throw new Error('本番環境では E2E アカウントを作成できません。');
  }
  const accounts = Object.values(E2E_ACCOUNTS).map((definition): E2eAccountSpec => {
    const password = env[definition.passwordEnvName] ?? '';
    assertValidPassword(definition.passwordEnvName, password);
    return {
      empId: definition.empId,
      name: definition.name,
      role: definition.role,
      mustChangePassword: definition.mustChangePassword,
      password,
    };
  });
  return { accounts };
}

// E2E アカウントを作成、または既知の状態に戻す。何度実行しても同じ状態になる。
// 1 トランザクションで処理し、途中で失敗した場合は何も変更しない。
export async function resetE2eAccounts(
  prisma: PrismaClient,
  config: E2eAccountConfig,
): Promise<E2eResetResult> {
  // bcrypt は遅いため、トランザクションを短く保つよう先に計算する
  const hashedAccounts = await Promise.all(
    config.accounts.map(async (account) => ({
      account,
      passwordHash: await bcrypt.hash(account.password, BCRYPT_COST),
    })),
  );
  const empIds = config.accounts.map((account) => account.empId);

  return prisma.$transaction(async (tx) => {
    // E2E アカウントではない既存ユーザー(氏名が異なる)は上書きしない
    const existingUsers = await tx.user.findMany({
      where: { empId: { in: empIds } },
      select: { empId: true, name: true },
    });
    const existingNameByEmpId = new Map(existingUsers.map((user) => [user.empId, user.name]));
    for (const account of config.accounts) {
      const existingName = existingNameByEmpId.get(account.empId);
      if (existingName !== undefined && existingName !== account.name) {
        throw new Error(
          `社員番号 ${account.empId} のユーザーは E2E アカウントではないため変更しません。`,
        );
      }
    }

    // seed は活性 ADMIN が 1 人もいないときだけ初期 ADMIN を作るため、
    // E2E ADMIN が先にできると初期 ADMIN が作られなくなる。それを防ぐ
    const otherActiveAdminCount = await tx.user.count({
      where: { role: Role.ADMIN, isActive: true, empId: { notIn: empIds } },
    });
    if (otherActiveAdminCount === 0) {
      throw new Error('先に npm run db:seed で初期 ADMIN を登録してください。');
    }

    // E2E アカウントの所属は seed の開発部とする
    const department = await tx.department.findUnique({
      where: { code: E2E_DEPARTMENT_CODE },
      select: { id: true },
    });
    if (!department) {
      throw new Error('先に npm run db:seed で初期データを登録してください。');
    }

    const results: E2eResetResult['accounts'] = [];
    const userIds: string[] = [];
    for (const { account, passwordHash } of hashedAccounts) {
      const data = {
        name: account.name,
        passwordHash,
        role: account.role,
        approvalRequired: false,
        isActive: true,
        mustChangePassword: account.mustChangePassword,
        departmentId: department.id,
        hireDate: toDbDate(E2E_HIRE_DATE),
      };
      const user = await tx.user.upsert({
        where: { empId: account.empId },
        create: { empId: account.empId, ...data },
        update: data,
        select: { id: true },
      });
      userIds.push(user.id);
      results.push({
        empId: account.empId,
        status: existingNameByEmpId.has(account.empId) ? 'updated' : 'created',
      });
    }

    // 前回のセッションを無効にし、繰り返し実行しても行が増え続けないようにする
    await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });

    return { accounts: results };
  });
}

// E2E 管理者(900001)本人の勤怠記録だけを削除する。他ユーザーの記録(modifiedBy で参照されるものを含む)は変更しない。
// 戻り値は削除した件数。E2E 管理者が存在しない場合は例外にする(先に db:e2e-accounts を実行させるため)。
export async function resetE2eAdminAttendance(prisma: PrismaClient): Promise<number> {
  const { empId, name } = E2E_ACCOUNTS.admin;
  const admin = await prisma.user.findUnique({
    where: { empId },
    select: { id: true, name: true },
  });
  if (admin?.name !== name) {
    throw new Error(
      'E2E 管理者(900001)が存在しないため勤怠を初期化できません。先に npm run db:e2e-accounts を実行してください。',
    );
  }
  const result = await prisma.attendance.deleteMany({ where: { userId: admin.id } });
  return result.count;
}

// 状態の絞り込みを E2E で確かめるための勤怠。daysAgo は東京の今日から何日前か。
// frontend/e2e/attendance-status.spec.ts も同じ並びを前提にする(パッケージが分かれているため import では共有しない)。
//   今日: 勤務中 / 1・3 日前: 退勤漏れ / 2・4 日前: 退勤済み / 40 日前: 退勤済み(照会期間の外)
export const E2E_ATTENDANCE_FIXTURE = [
  { daysAgo: 0, clockedOut: false },
  { daysAgo: 1, clockedOut: false },
  { daysAgo: 2, clockedOut: true },
  { daysAgo: 3, clockedOut: false },
  { daysAgo: 4, clockedOut: true },
  { daysAgo: 40, clockedOut: true },
] as const;

export interface E2eAttendanceFixtureRow {
  workDate: string; // YYYY-MM-DD(東京)
  clockIn: string; // +09:00 付きの ISO 8601
  clockOut: string | null;
}

// today(東京の YYYY-MM-DD)を基準に、E2E_ATTENDANCE_FIXTURE の勤怠を作る
export function buildE2eAttendanceFixture(today: string): E2eAttendanceFixtureRow[] {
  const base = new Date(`${today}T00:00:00Z`);
  return E2E_ATTENDANCE_FIXTURE.map(({ daysAgo, clockedOut }) => {
    const workDate = new Date(base.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return {
      workDate,
      clockIn: `${workDate}T09:00:00+09:00`,
      clockOut: clockedOut ? `${workDate}T18:00:00+09:00` : null,
    };
  });
}

// E2E 管理者(900001)の勤怠を削除してから、状態確認用の勤怠を登録する。戻り値は登録した件数
export async function seedE2eAdminAttendance(prisma: PrismaClient, today: string): Promise<number> {
  await resetE2eAdminAttendance(prisma);
  const admin = await prisma.user.findUniqueOrThrow({
    where: { empId: E2E_ACCOUNTS.admin.empId },
    select: { id: true },
  });
  const result = await prisma.attendance.createMany({
    data: buildE2eAttendanceFixture(today).map((row) => ({
      userId: admin.id,
      workDate: toDbDate(row.workDate),
      clockIn: new Date(row.clockIn),
      clockOut: row.clockOut === null ? null : new Date(row.clockOut),
    })),
  });
  return result.count;
}
