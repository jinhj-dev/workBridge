// 初期データ(部署・役職・初期 ADMIN)の投入処理。実行の入口は seed.ts。テストからも呼び出す。
import bcrypt from 'bcrypt';
import { BCRYPT_COST, EMP_ID_PATTERN } from '../src/common/security/credentials.js';
import { toDbDate } from '../src/common/time/tokyo-date.js';
import { JobTitleTone, Role, type PrismaClient } from '../src/generated/prisma/client.js';
import {
  SYSTEM_DEPARTMENT_CODE,
  SYSTEM_DEPARTMENT_NAME,
} from '../src/modules/departments/department.constants.js';

// 初期部署。「未所属」は無効な社員の移動先になるシステム部署
export const DEPARTMENTS = [
  { code: SYSTEM_DEPARTMENT_CODE, name: SYSTEM_DEPARTMENT_NAME },
  { code: 'GA', name: '総務部' },
  { code: 'DEV', name: '開発部' },
  { code: 'SALES', name: '営業部' },
  { code: 'HR', name: '人事部' },
];

// 初期役職(色味は役職ごとに指定する)。現在は seed でのみ登録・管理する
export const JOB_TITLES = [
  { name: 'マネージャー', tone: JobTitleTone.VIOLET },
  { name: 'リーダー', tone: JobTitleTone.BLUE },
  { name: 'エンジニア', tone: JobTitleTone.GRAY },
  { name: 'デザイナー', tone: JobTitleTone.PINK },
];

// 初期 ADMIN の所属部署
const ADMIN_DEPARTMENT_CODE = 'GA';

// bcrypt は先頭 72 バイトまでしか見ないため、それを超える入力は受け付けない
const PASSWORD_MAX_BYTES = 72;
const PASSWORD_MIN_LENGTH = 8;
// 05 §2 の列長
const NAME_MAX_LENGTH = 100;

const DEFAULT_ADMIN_EMP_ID = '00001';
const DEFAULT_ADMIN_NAME = '管理者';
// 初期 ADMIN の入社日(既存ユーザーの移行値と同じ固定日)
const INITIAL_ADMIN_HIRE_DATE = '2026-01-01';

export interface SeedConfig {
  adminEmpId: string;
  adminName: string;
  adminPassword: string;
}

export interface SeedResult {
  createdDepartmentCount: number;
  createdJobTitleCount: number;
  // created: 初期 ADMIN を登録した / skipped: 活性 ADMIN が既にいるため何もしなかった
  admin: 'created' | 'skipped';
}

// 環境変数で受け取ったパスワードを検証する。不正な値は例外にする(e2e-account-data.ts からも使う)
export function assertValidPassword(envName: string, value: string): void {
  if (!value) {
    throw new Error(`環境変数 ${envName} が設定されていません。backend/.env に設定してください。`);
  }
  // パスワード規則は FR-AUTH-003(8 文字以上、英字と数字を含む)に合わせる
  if (value.length < PASSWORD_MIN_LENGTH || !/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new Error(
      `${envName} は ${PASSWORD_MIN_LENGTH} 文字以上で、英字と数字を含めてください。`,
    );
  }
  if (Buffer.byteLength(value) > PASSWORD_MAX_BYTES) {
    throw new Error(`${envName} は ${PASSWORD_MAX_BYTES} バイト以下にしてください。`);
  }
}

// 環境変数から設定を読み、検証する。不正な値は例外にする
export function parseSeedConfig(env: NodeJS.ProcessEnv): SeedConfig {
  const adminPassword = env.SEED_ADMIN_PASSWORD ?? '';
  assertValidPassword('SEED_ADMIN_PASSWORD', adminPassword);

  // 社員番号は前後の空白を除いたうえで、数字のみ(最大 50 桁、先頭の 0 は保持)であること(FR-USER-001)
  const adminEmpId = (env.SEED_ADMIN_EMP_ID || DEFAULT_ADMIN_EMP_ID).trim();
  const adminName = (env.SEED_ADMIN_NAME || DEFAULT_ADMIN_NAME).trim();
  if (!EMP_ID_PATTERN.test(adminEmpId)) {
    throw new Error('SEED_ADMIN_EMP_ID は数字のみ、最大 50 桁にしてください。');
  }
  if (!adminName || adminName.length > NAME_MAX_LENGTH) {
    throw new Error(`SEED_ADMIN_NAME は 1〜${NAME_MAX_LENGTH} 文字にしてください。`);
  }

  return { adminEmpId, adminName, adminPassword };
}

// 部署・役職・初期 ADMIN を投入する。何度実行しても重複しない。
// 初期 ADMIN は「活性 ADMIN が 1 人もいない」ときだけ登録する(FR-USER-002 の前提を満たすため)。
// 手動で 1 回ずつ実行する前提で、同時実行は想定しない(別の社員番号で同時に実行すると ADMIN が 2 人できうる)。
export async function seedInitialData(
  prisma: PrismaClient,
  config: SeedConfig,
): Promise<SeedResult> {
  const { count: createdDepartmentCount } = await prisma.department.createMany({
    data: DEPARTMENTS,
    skipDuplicates: true,
  });
  // 既にある役職(name 重複)は変更しない
  const { count: createdJobTitleCount } = await prisma.jobTitle.createMany({
    data: JOB_TITLES,
    skipDuplicates: true,
  });

  const activeAdminCount = await prisma.user.count({
    where: { role: Role.ADMIN, isActive: true },
  });
  if (activeAdminCount > 0) {
    return { createdDepartmentCount, createdJobTitleCount, admin: 'skipped' };
  }

  // 同じ社員番号のユーザー(EMPLOYEE や無効化済み)がいる場合は、上書きせずに止める
  const sameEmpIdUser = await prisma.user.findUnique({
    where: { empId: config.adminEmpId },
    select: { id: true },
  });
  if (sameEmpIdUser) {
    throw new Error(
      `活性 ADMIN がいませんが、社員番号 ${config.adminEmpId} のユーザーが既に存在します。` +
        '既存ユーザーは変更しないため、SEED_ADMIN_EMP_ID に別の社員番号を指定してください。',
    );
  }

  await prisma.user.create({
    data: {
      empId: config.adminEmpId,
      name: config.adminName,
      passwordHash: await bcrypt.hash(config.adminPassword, BCRYPT_COST),
      role: Role.ADMIN,
      approvalRequired: false,
      isActive: true,
      mustChangePassword: true,
      department: { connect: { code: ADMIN_DEPARTMENT_CODE } },
      hireDate: toDbDate(INITIAL_ADMIN_HIRE_DATE),
    },
  });
  return { createdDepartmentCount, createdJobTitleCount, admin: 'created' };
}
