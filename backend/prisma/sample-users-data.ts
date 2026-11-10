// 画面確認用の社員サンプルデータ(社員番号 10001〜10100 の 100 名)。実行の入口は sample-users.ts。
import bcrypt from 'bcrypt';
import { BCRYPT_COST } from '../src/common/security/credentials.js';
import { toDbDate } from '../src/common/time/tokyo-date.js';
import { Role, type PrismaClient } from '../src/generated/prisma/client.js';
import { SYSTEM_DEPARTMENT_CODE } from '../src/modules/departments/department.constants.js';
import { assertValidPassword } from './initial-data.js';

export const SAMPLE_USER_COUNT = 100;
const FIRST_EMP_NUMBER = 10001;

// 均等に割り振る所属部署(code)
const DEPARTMENT_CODES = ['GA', 'DEV', 'SALES', 'HR'];
// 20 人に 1 人(計 5 名)を未所属にする
const UNASSIGNED_INTERVAL = 20;
// 10 人に 1 人(計 10 名)を無効にする
const INACTIVE_INTERVAL = 10;

const HIRE_START_YEAR = 2015;
const HIRE_YEAR_SPAN = 12; // 2015〜2026
const HIRE_LAST_MONTH_IN_LAST_YEAR = 10; // 将来日付にならないよう 2026 年は 10 月まで

// 架空の姓・名(実在の人物とは無関係の仮名)
const FAMILY_NAMES = [
  '青山',
  '石原',
  '上野',
  '遠藤',
  '大塚',
  '加藤',
  '木村',
  '工藤',
  '小林',
  '佐野',
  '島田',
  '杉山',
  '高橋',
  '千葉',
  '土屋',
  '中村',
  '西田',
  '浜口',
  '藤井',
  '松本',
];
const GIVEN_NAMES = [
  '葵',
  '一郎',
  '恵',
  '健太',
  '幸子',
  '翔',
  '誠',
  '大輔',
  '千尋',
  '直樹',
  '花',
  '光',
  '美咲',
  '悠斗',
  '陽子',
  '亮',
  '凛',
  '蓮',
  '和也',
  '彩',
];

export interface SampleUser {
  empId: string; // 5 桁の社員番号
  name: string;
  departmentCode: string;
  isActive: boolean;
  hireDate: string; // YYYY-MM-DD
}

const pad = (value: number): string => String(value).padStart(2, '0');

// 乱数を使わず番号から決まる値だけで作るため、何度実行しても同じ内容になる
export function buildSampleUsers(): SampleUser[] {
  return Array.from({ length: SAMPLE_USER_COUNT }, (_, index) => {
    const year = HIRE_START_YEAR + ((index * 5) % HIRE_YEAR_SPAN);
    const monthCount =
      year === HIRE_START_YEAR + HIRE_YEAR_SPAN - 1 ? HIRE_LAST_MONTH_IN_LAST_YEAR : 12;
    const month = 1 + ((index * 7) % monthCount);
    const day = 1 + ((index * 11) % 28);
    const isUnassigned = index % UNASSIGNED_INTERVAL === UNASSIGNED_INTERVAL - 1;
    // 未所属を除いた通し番号で割り振ると、4 部署が偏らない
    const assignedOrdinal = index - Math.floor(index / UNASSIGNED_INTERVAL);
    return {
      empId: String(FIRST_EMP_NUMBER + index),
      name: `${FAMILY_NAMES[(index * 7) % FAMILY_NAMES.length]} ${GIVEN_NAMES[(index * 3 + Math.floor(index / 20)) % GIVEN_NAMES.length]}`,
      departmentCode: isUnassigned
        ? SYSTEM_DEPARTMENT_CODE
        : DEPARTMENT_CODES[assignedOrdinal % DEPARTMENT_CODES.length],
      isActive: index % INACTIVE_INTERVAL !== INACTIVE_INTERVAL - 1,
      hireDate: `${year}-${pad(month)}-${pad(day)}`,
    };
  });
}

export interface InsertSampleUsersResult {
  createdCount: number; // 新規に登録した件数
  updatedCount: number; // 登録済みでパスワードを更新した件数
}

// 環境変数 SEED_USER_PASSWORD を検証して返す(規則は SEED_ADMIN_PASSWORD と同じ)。不正な値は例外にする
export function parseSampleUserPassword(env: NodeJS.ProcessEnv): string {
  const password = env.SEED_USER_PASSWORD ?? '';
  assertValidPassword('SEED_USER_PASSWORD', password);
  return password;
}

// サンプル社員を 1 トランザクションで登録する。
// 未登録の社員番号は新規登録、登録済みの社員番号はパスワードのハッシュだけを更新する(他の列は変更しない)。
// ハッシュは 1 回だけ計算して全員で共用する。平文は保存・出力しない
export async function insertSampleUsers(
  prisma: PrismaClient,
  password: string,
): Promise<InsertSampleUsersResult> {
  const departments = await prisma.department.findMany({ select: { id: true, code: true } });
  const departmentIdByCode = new Map(departments.map((row) => [row.code, row.id]));
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const samples = buildSampleUsers().map((user) => {
    const departmentId = departmentIdByCode.get(user.departmentCode);
    if (!departmentId) {
      throw new Error(`部署 ${user.departmentCode} が存在しないため、登録できません。`);
    }
    return {
      empId: user.empId,
      name: user.name,
      passwordHash,
      role: Role.EMPLOYEE,
      approvalRequired: true,
      isActive: user.isActive,
      mustChangePassword: true,
      departmentId,
      hireDate: toDbDate(user.hireDate),
    };
  });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findMany({
      where: { empId: { in: samples.map((row) => row.empId) } },
      select: { empId: true },
    });
    const existingEmpIds = new Set(existing.map((row) => row.empId));
    const toCreate = samples.filter((row) => !existingEmpIds.has(row.empId));

    const created = await tx.user.createMany({ data: toCreate });
    const updated =
      existingEmpIds.size > 0
        ? await tx.user.updateMany({
            where: { empId: { in: [...existingEmpIds] } },
            data: { passwordHash },
          })
        : { count: 0 };
    return { createdCount: created.count, updatedCount: updated.count };
  });
}
