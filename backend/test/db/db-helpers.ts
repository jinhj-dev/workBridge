// DB 統合テスト用の共通処理。接続先はローカルの *_test DB のみ(setup-e2e.ts が .env.test を読み込む)。
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../src/generated/prisma/client.js';
import { assertTestDatabaseUrl } from '../test-database-url.js';

// 接続先がローカルの *_test DB であることを確かめてから PrismaClient を作る
export function createTestPrisma(): PrismaClient {
  const url = assertTestDatabaseUrl(process.env.DATABASE_URL);
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

// テストごとに衝突しない値を作る
export function uniqueSuffix(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
}

// 'YYYY-MM-DD' → DATE 列へ保存する Date(05 §9)
export function toDbDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

// DATE 列から読んだ Date → 'YYYY-MM-DD'(05 §9)
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// driver adapter 経由で届くエラーの形を取り出す
export interface DbErrorInfo {
  className: string;
  code: string;
  meta: Record<string, unknown>;
  message: string;
  // PostgreSQL の SQLSTATE(23505 など)
  sqlState: string | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// meta.driverAdapterError.cause を取り出す(Prisma 7.10.1 で確認した形)。なければ空オブジェクト
export function extractAdapterCause(meta: Record<string, unknown>): Record<string, unknown> {
  const adapterError = meta.driverAdapterError;
  if (!isRecord(adapterError) || !isRecord(adapterError.cause)) {
    return {};
  }
  return adapterError.cause;
}

// cause.originalCode から SQLSTATE を取り出す
function extractSqlState(meta: Record<string, unknown>): string | undefined {
  const { originalCode } = extractAdapterCause(meta);
  return typeof originalCode === 'string' ? originalCode : undefined;
}

export async function captureDbError(run: () => Promise<unknown>): Promise<DbErrorInfo> {
  try {
    await run();
  } catch (error) {
    // 想定外の種類のエラーはそのまま投げ直し、テストを失敗させる
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      throw error;
    }
    const meta = isRecord(error.meta) ? error.meta : {};
    return {
      className: error.name,
      code: error.code,
      meta,
      message: error.message,
      sqlState: extractSqlState(meta),
    };
  }
  throw new Error('DB エラーが発生するはずでしたが、成功しました');
}

// 作成した行を記録し、後でまとめて削除する
export class TestDataTracker {
  readonly userIds: string[] = [];
  readonly departmentIds: string[] = [];
  // 部署を指定しない社員の所属先(必要になったとき 1 回だけ作る)
  private defaultDepartmentId: string | undefined;

  constructor(private readonly prisma: PrismaClient) {}

  async createUser(
    overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
  ): Promise<Prisma.UserGetPayload<object>> {
    const departmentId = overrides.departmentId ?? (await this.getDefaultDepartmentId());
    const user = await this.prisma.user.create({
      data: {
        name: 'テスト太郎',
        empId: `T${uniqueSuffix()}`,
        passwordHash: 'dummy-hash',
        role: 'EMPLOYEE',
        hireDate: toDbDate('2026-01-01'),
        ...overrides,
        departmentId,
      },
    });
    this.userIds.push(user.id);
    return user;
  }

  // code は 20 文字以内の大文字(T + 12 文字)
  async createDepartment(
    overrides: Partial<Prisma.DepartmentUncheckedCreateInput> = {},
  ): Promise<Prisma.DepartmentGetPayload<object>> {
    const suffix = uniqueSuffix();
    const department = await this.prisma.department.create({
      data: { code: `T${suffix}`, name: `テスト部署${suffix}`, ...overrides },
    });
    this.departmentIds.push(department.id);
    return department;
  }

  private async getDefaultDepartmentId(): Promise<string> {
    this.defaultDepartmentId ??= (await this.createDepartment()).id;
    return this.defaultDepartmentId;
  }

  // 自分が作った行だけを、FK の依存順に 1 トランザクションで削除する(途中で止まって残骸が残らないように)
  async cleanup(): Promise<void> {
    const ids = this.userIds;
    await this.prisma.$transaction([
      this.prisma.leave.deleteMany({
        where: {
          OR: [{ userId: { in: ids } }, { approverId: { in: ids } }, { processedBy: { in: ids } }],
        },
      }),
      this.prisma.attendance.deleteMany({
        where: { OR: [{ userId: { in: ids } }, { modifiedBy: { in: ids } }] },
      }),
      this.prisma.leaveGrant.deleteMany({ where: { userId: { in: ids } } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } }),
      this.prisma.user.deleteMany({ where: { id: { in: ids } } }),
      this.prisma.department.deleteMany({ where: { id: { in: this.departmentIds } } }),
    ]);
  }
}
