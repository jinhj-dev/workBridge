import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { violatedConstraintOf } from '../../common/prisma/constraint-name.js';
import { monthRange } from '../../common/time/calendar-rules.js';
import { toDbDate, toTokyoDate } from '../../common/time/tokyo-date.js';
import type { Prisma, Role } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { nextEmpId } from './emp-id-generator.js';
import { employmentStatusWhere } from './employment-status.js';
import type { EmploymentStatus } from './employment-status.js';
import type { UserDetailExtras, UserRow, UserSummaryCounts } from './user.mapper.js';

// 社員番号の自動採番を直列化するアドバイザリーロックのキー(固定値)
const EMP_ID_LOCK_KEY = 7_001_001;
// 自動採番で他の登録と番号が衝突したときの再採番を含む試行回数
const AUTO_EMP_ID_MAX_ATTEMPTS = 3;

const USER_ROW_SELECT = {
  id: true,
  empId: true,
  name: true,
  hireDate: true,
  departmentId: true,
  department: { select: { name: true } },
  role: true,
  approvalRequired: true,
  isActive: true,
  mustChangePassword: true,
  jobTitle: { select: { id: true, name: true, tone: true } },
  contactEmail: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

// 検索条件(文字列は escapeLikePattern 済み)
export interface UserListFilter {
  keyword?: string;
  name?: string;
  empId?: string;
  departmentId?: string;
  jobTitleId?: string;
  role?: Role;
  approvalRequired?: boolean;
  isActive?: boolean;
  status?: EmploymentStatus;
  hireDateFrom?: string;
  hireDateTo?: string;
  skip: number;
  take: number;
}

export interface UserCreateData {
  // null は自動採番
  empId: string | null;
  name: string;
  passwordHash: string;
  jobTitleId: string;
  contactEmail: string;
  departmentId: string;
  hireDate: string;
  role: Role;
  approvalRequired: boolean;
}

export interface UserUpdateData {
  name?: string;
  empId?: string;
  jobTitleId?: string | null;
  contactEmail?: string | null;
  departmentId?: string;
  hireDate?: string;
  role?: Role;
  approvalRequired?: boolean;
  isActive?: boolean;
}

export type UserCreateResult =
  | { status: 'ok'; id: string }
  | { status: 'duplicateEmpId' }
  | { status: 'exhausted' }
  | { status: 'invalidDepartment' }
  | { status: 'invalidJobTitle' };

export type UserUpdateResult =
  | { status: 'ok' }
  | { status: 'notFound' }
  | { status: 'duplicateEmpId' }
  | { status: 'lastAdmin' }
  | { status: 'invalidDepartment' }
  | { status: 'invalidJobTitle' };

type ForeignKeyFailure = 'invalidDepartment' | 'invalidJobTitle';

function foreignKeyFailureOf(error: unknown): ForeignKeyFailure | undefined {
  switch (violatedConstraintOf(error, 'P2003')) {
    case 'users_department_id_fkey':
      return 'invalidDepartment';
    case 'users_job_title_id_fkey':
      return 'invalidJobTitle';
    default:
      return undefined;
  }
}

function isEmpIdConflict(error: unknown): boolean {
  return violatedConstraintOf(error, 'P2002') === 'users_emp_id_key';
}

// ログに残す想定外エラーの要約(エラー名とコードのみ)。Prisma のメッセージ・スタックにはクエリ引数(passwordHash 等)が入るため出さない
function summarizeUnexpectedError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? `${error.name} (${code})` : error.name;
  }
  return typeof error;
}

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // 想定外のエラーは要約だけログに残し、共通の 500 にする
  private failUnexpectedly(error: unknown): never {
    this.logger.error(`社員の保存で想定外のエラーが発生しました: ${summarizeUnexpectedError(error)}`);
    throw new AppException(
      'INTERNAL_SERVER_ERROR',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'サーバーでエラーが発生しました。',
    );
  }

  // 一覧。入社日昇順 → 社員番号昇順
  async findPage(filter: UserListFilter, now: Date): Promise<{ items: UserRow[]; total: number }> {
    const conditions: Prisma.UserWhereInput[] = [];
    if (filter.keyword) {
      conditions.push({
        OR: [
          { empId: { contains: filter.keyword, mode: 'insensitive' } },
          { name: { contains: filter.keyword, mode: 'insensitive' } },
          { contactEmail: { contains: filter.keyword, mode: 'insensitive' } },
        ],
      });
    }
    if (filter.name) {
      conditions.push({ name: { contains: filter.name, mode: 'insensitive' } });
    }
    if (filter.empId) {
      conditions.push({ empId: { contains: filter.empId, mode: 'insensitive' } });
    }
    if (filter.status) {
      conditions.push(employmentStatusWhere(filter.status, now));
    }
    if (filter.hireDateFrom || filter.hireDateTo) {
      conditions.push({
        hireDate: {
          ...(filter.hireDateFrom ? { gte: toDbDate(filter.hireDateFrom) } : {}),
          ...(filter.hireDateTo ? { lte: toDbDate(filter.hireDateTo) } : {}),
        },
      });
    }
    const where: Prisma.UserWhereInput = {
      AND: conditions,
      ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
      ...(filter.jobTitleId ? { jobTitleId: filter.jobTitleId } : {}),
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.approvalRequired !== undefined
        ? { approvalRequired: filter.approvalRequired }
        : {}),
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_ROW_SELECT,
        orderBy: [{ hireDate: 'asc' }, { empId: 'asc' }],
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<UserRow | null> {
    return this.prisma.user.findUnique({ where: { id }, select: USER_ROW_SELECT });
  }

  // 詳細にだけ含める情報: 承認待ち(この社員が承認者)の件数と付与年休
  async findDetailExtras(id: string): Promise<UserDetailExtras> {
    const [pendingApprovalCount, grants] = await Promise.all([
      this.prisma.leave.count({ where: { approverId: id, status: 'PENDING' } }),
      this.prisma.leaveGrant.findMany({
        where: { userId: id },
        select: { year: true, grantedDays: true },
        orderBy: { year: 'desc' },
      }),
    ]);
    return {
      pendingApprovalCount,
      leaveGrants: grants.map((grant) => ({
        year: grant.year,
        grantedDays: grant.grantedDays.toNumber(),
      })),
    };
  }

  // 有効な社員数・有効な ADMIN 数・今月(東京)入社の有効な社員数
  async countSummary(now: Date): Promise<UserSummaryCounts> {
    const { start, end } = monthRange(toTokyoDate(now).slice(0, 7));
    const [employeeCount, adminCount, hiredThisMonthCount] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true, role: 'ADMIN' } }),
      this.prisma.user.count({
        where: { isActive: true, hireDate: { gte: toDbDate(start), lte: toDbDate(end) } },
      }),
    ]);
    return { employeeCount, adminCount, hiredThisMonthCount };
  }

  // 次の自動採番の予定番号(予約はしない)。採番できなければ null
  async peekNextEmpId(): Promise<string | null> {
    return nextEmpId(await this.findMaxAutoEmpId(this.prisma));
  }

  // 5 桁の数字の社員番号の最大値(なければ空配列)。nextEmpId に渡す
  private async findMaxAutoEmpId(
    client: Prisma.TransactionClient | PrismaService,
  ): Promise<string[]> {
    const rows = await client.$queryRaw<
      { max: string | null }[]
    >`SELECT MAX(emp_id) AS max FROM users WHERE emp_id ~ '^[0-9]{5}$'`;
    const max = rows[0]?.max;
    return max ? [max] : [];
  }

  // 登録。自動採番はアドバイザリーロックで直列化し、直接入力の登録と衝突したときだけ再採番する
  async create(data: UserCreateData): Promise<UserCreateResult> {
    const attempts = data.empId === null ? AUTO_EMP_ID_MAX_ATTEMPTS : 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          let empId = data.empId;
          if (empId === null) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${EMP_ID_LOCK_KEY}::bigint)`;
            empId = nextEmpId(await this.findMaxAutoEmpId(tx));
            if (empId === null) {
              return { status: 'exhausted' } as const;
            }
          }
          const created = await tx.user.create({
            data: {
              empId,
              name: data.name,
              passwordHash: data.passwordHash,
              role: data.role,
              approvalRequired: data.approvalRequired,
              isActive: true,
              mustChangePassword: true,
              departmentId: data.departmentId,
              hireDate: toDbDate(data.hireDate),
              jobTitleId: data.jobTitleId,
              contactEmail: data.contactEmail,
            },
            select: { id: true },
          });
          return { status: 'ok', id: created.id } as const;
        });
      } catch (error) {
        const foreignKey = foreignKeyFailureOf(error);
        if (foreignKey) {
          return { status: foreignKey };
        }
        if (isEmpIdConflict(error)) {
          if (data.empId !== null) {
            return { status: 'duplicateEmpId' };
          }
          continue;
        }
        return this.failUnexpectedly(error);
      }
    }
    return { status: 'exhausted' };
  }

  // 修正(docs/05 §8)。ADMIN の無効化・EMPLOYEE 化は、有効な ADMIN 全員を id 昇順でロックして
  // 最後の 1 人でないか確認する(対象のロックより先に取り、同時実行のデッドロックを避ける)。
  // 有効 → 無効の場合は、申請中の休暇の取消・部署責任者の解除・Refresh Token の失効を同じトランザクションで行う
  async update(
    id: string,
    data: UserUpdateData,
    actorId: string,
    now: Date,
  ): Promise<UserUpdateResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const demotes = data.isActive === false || data.role === 'EMPLOYEE';
        let otherAdminCount: number | null = null;
        const lockAdmins = async (): Promise<void> => {
          const admins = await tx.$queryRaw<
            { id: string }[]
          >`SELECT id FROM users WHERE role = 'ADMIN' AND is_active = true ORDER BY id FOR NO KEY UPDATE`;
          otherAdminCount = admins.filter((admin) => admin.id !== id).length;
        };

        // ロック前の確認。有効な ADMIN を外す可能性があれば先に ADMIN 全員をロックする
        if (demotes) {
          const peek = await tx.user.findUnique({
            where: { id },
            select: { role: true, isActive: true },
          });
          if (peek?.role === 'ADMIN' && peek.isActive) {
            await lockAdmins();
          }
        }

        const rows = await tx.$queryRaw<
          { role: Role; is_active: boolean }[]
        >`SELECT role, is_active FROM users WHERE id = ${id}::uuid FOR NO KEY UPDATE`;
        const current = rows[0];
        if (!current) {
          return { status: 'notFound' } as const;
        }
        if (demotes && current.role === 'ADMIN' && current.is_active) {
          // 事前確認の後に ADMIN へ変更された場合は、ここで ADMIN 全員をロックして数え直す
          if (otherAdminCount === null) {
            await lockAdmins();
          }
          if (otherAdminCount === 0) {
            return { status: 'lastAdmin' } as const;
          }
        }

        await tx.user.update({
          where: { id },
          data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.empId !== undefined ? { empId: data.empId } : {}),
            ...(data.jobTitleId !== undefined ? { jobTitleId: data.jobTitleId } : {}),
            ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail } : {}),
            ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
            ...(data.hireDate !== undefined ? { hireDate: toDbDate(data.hireDate) } : {}),
            ...(data.role !== undefined ? { role: data.role } : {}),
            ...(data.approvalRequired !== undefined
              ? { approvalRequired: data.approvalRequired }
              : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          },
        });

        if (current.is_active && data.isActive === false) {
          await tx.leave.updateMany({
            where: { userId: id, status: 'PENDING' },
            data: { status: 'CANCELLED', processedBy: actorId, processedAt: now },
          });
          await tx.department.updateMany({ where: { managerId: id }, data: { managerId: null } });
          await tx.refreshToken.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: now },
          });
        }
        return { status: 'ok' } as const;
      });
    } catch (error) {
      const foreignKey = foreignKeyFailureOf(error);
      if (foreignKey) {
        return { status: foreignKey };
      }
      if (isEmpIdConflict(error)) {
        return { status: 'duplicateEmpId' };
      }
      return this.failUnexpectedly(error);
    }
  }
}
