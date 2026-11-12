import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { USER_SUMMARY_SELECT } from '../../common/mappers/user-summary.js';
import type { UserSummaryRow } from '../../common/mappers/user-summary.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SYSTEM_DEPARTMENT_CODE } from './department.constants.js';
import type { DepartmentMember, DepartmentRow, DepartmentSummary } from './department.mapper.js';
import type { DEPARTMENT_SORT_KEYS } from './dto/admin-department-query.dto.js';

// 責任者候補の上限(固定)
export const MANAGER_CANDIDATE_LIMIT = 100;

const DEPARTMENT_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  manager: { select: { id: true, empId: true, name: true } },
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: { where: { isActive: true } } } },
} as const satisfies Prisma.DepartmentSelect;

type DepartmentWithActiveCount = Prisma.DepartmentGetPayload<{ select: typeof DEPARTMENT_SELECT }>;

export interface DepartmentListFilter {
  code?: string;
  name?: string;
  sort: (typeof DEPARTMENT_SORT_KEYS)[number];
  order: 'asc' | 'desc';
  skip: number;
  take: number;
}

// 部署の書き込み内容(managerId は null で解除、undefined で変更なし)
export interface DepartmentWriteData {
  code?: string;
  name?: string;
  description?: string | null;
  managerId?: string | null;
}

// 重複した項目(UNIQUE 違反の対象)
export type DuplicateField = 'code' | 'name';

export type DepartmentWriteResult =
  | { status: 'ok'; department: DepartmentRow }
  | { status: 'duplicate'; field: DuplicateField }
  | { status: 'notFound' }
  | { status: 'protected' }
  | { status: 'invalidManager' };

export type DepartmentDeleteResult = 'deleted' | 'notFound' | 'protected' | 'hasMembers';

const UNIQUE_INDEX_FIELDS: Record<string, DuplicateField> = {
  departments_code_key: 'code',
  departments_name_key: 'name',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// driver adapter 経由の P2002 から、違反した UNIQUE インデックスの項目を取り出す(meta.target は入らない)
function duplicateFieldOf(error: unknown): DuplicateField | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return undefined;
  }
  const adapterError = error.meta?.driverAdapterError;
  const cause = isRecord(adapterError) ? adapterError.cause : undefined;
  const constraint = isRecord(cause) ? cause.constraint : undefined;
  const index = isRecord(constraint) ? constraint.index : undefined;
  return typeof index === 'string' ? UNIQUE_INDEX_FIELDS[index] : undefined;
}

// 削除トランザクションを取り消して hasMembers を返すための内部用シグナル
class DepartmentHasMembersSignal extends Error {}

@Injectable()
export class DepartmentsRepository {
  private readonly logger = new Logger(DepartmentsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<{ id: string; name: string }[]> {
    return this.prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  // 一覧。指定キー → 同順位は code 昇順。部署と件数・有効な社員数、無効な社員数の 3 クエリで N+1 を避ける
  async findPage(filter: DepartmentListFilter): Promise<{ items: DepartmentRow[]; total: number }> {
    const where: Prisma.DepartmentWhereInput = {
      ...(filter.code ? { code: { contains: filter.code, mode: 'insensitive' } } : {}),
      ...(filter.name ? { name: { contains: filter.name, mode: 'insensitive' } } : {}),
    };
    if (filter.sort === 'memberCount') {
      return this.findPageByMemberCount(filter, where);
    }
    const orderBy: Prisma.DepartmentOrderByWithRelationInput[] =
      filter.sort === 'code'
        ? [{ code: filter.order }]
        : [{ [filter.sort]: filter.order }, { code: 'asc' }];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        select: DEPARTMENT_SELECT,
        orderBy,
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.department.count({ where }),
    ]);
    return { items: await this.withInactiveCounts(rows), total };
  }

  // 有効な社員数での並び替え。_count の orderBy は無効な社員も数えるため、順序だけ生 SQL で決める
  private async findPageByMemberCount(
    filter: DepartmentListFilter,
    where: Prisma.DepartmentWhereInput,
  ): Promise<{ items: DepartmentRow[]; total: number }> {
    // SQL に入るのは固定の断片と、パラメーターとして渡す値だけ(filter の文字列は escapeLikePattern 済み)
    const conditions: Prisma.Sql[] = [];
    if (filter.code) {
      conditions.push(Prisma.sql`d.code ILIKE ${`%${filter.code}%`}`);
    }
    if (filter.name) {
      conditions.push(Prisma.sql`d.name ILIKE ${`%${filter.name}%`}`);
    }
    const whereSql =
      conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
    const direction = filter.order === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const [idRows, total] = await this.prisma.$transaction([
      this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT d.id
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = true
        ${whereSql}
        GROUP BY d.id, d.code
        ORDER BY COUNT(u.id) ${direction}, d.code ASC
        LIMIT ${filter.take} OFFSET ${filter.skip}
      `),
      this.prisma.department.count({ where }),
    ]);
    const ids = idRows.map((row) => row.id);
    const rows = await this.prisma.department.findMany({
      where: { id: { in: ids } },
      select: DEPARTMENT_SELECT,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = ids.flatMap((id) => byId.get(id) ?? []);
    return { items: await this.withInactiveCounts(ordered), total };
  }

  async findById(id: string): Promise<DepartmentRow | null> {
    const row = await this.prisma.department.findUnique({
      where: { id },
      select: DEPARTMENT_SELECT,
    });
    if (!row) {
      return null;
    }
    const [department] = await this.withInactiveCounts([row]);
    return department;
  }

  // 部署数(未所属を除く)と有効な社員の総数
  async countSummary(): Promise<DepartmentSummary> {
    const [departmentCount, memberCount] = await this.prisma.$transaction([
      this.prisma.department.count({ where: { code: { not: SYSTEM_DEPARTMENT_CODE } } }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);
    return { departmentCount, memberCount };
  }

  // 所属する有効な社員(empId 昇順)。部署がなければ null
  async findMembersPage(
    departmentId: string,
    paging: { skip: number; take: number },
  ): Promise<{ items: DepartmentMember[]; total: number } | null> {
    const exists = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });
    if (!exists) {
      return null;
    }
    const where = { departmentId, isActive: true };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: { id: true, empId: true, name: true },
        orderBy: { empId: 'asc' },
        skip: paging.skip,
        take: paging.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  // 責任者候補: 有効な社員全員(本人・ADMIN を含む)。empId 昇順、上限固定
  findManagerCandidates(keyword?: string): Promise<UserSummaryRow[]> {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword, mode: 'insensitive' } },
                { empId: { contains: keyword } },
              ],
            }
          : {}),
      },
      select: USER_SUMMARY_SELECT,
      orderBy: { empId: 'asc' },
      take: MANAGER_CANDIDATE_LIMIT,
    });
  }

  async create(
    data: DepartmentWriteData & { code: string; name: string },
  ): Promise<DepartmentWriteResult> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        if (
          typeof data.managerId === 'string' &&
          !(await this.lockActiveUser(tx, data.managerId))
        ) {
          return null;
        }
        return tx.department.create({ data, select: DEPARTMENT_SELECT });
      });
      if (!row) {
        return { status: 'invalidManager' };
      }
      const [department] = await this.withInactiveCounts([row]);
      return { status: 'ok', department };
    } catch (error) {
      const field = duplicateFieldOf(error);
      if (field) {
        return { status: 'duplicate', field };
      }
      throw error;
    }
  }

  // 未所属部署は変更できない。対象がなければ notFound。責任者の指定時は 部署 → 社員 の順にロックする(docs/05 §8)
  async update(id: string, data: DepartmentWriteData): Promise<DepartmentWriteResult> {
    try {
      const outcome = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
          { code: string }[]
        >`SELECT code FROM departments WHERE id = ${id}::uuid FOR UPDATE`;
        const current = rows[0];
        if (!current) {
          return 'notFound' as const;
        }
        if (current.code === SYSTEM_DEPARTMENT_CODE) {
          return 'protected' as const;
        }
        if (
          typeof data.managerId === 'string' &&
          !(await this.lockActiveUser(tx, data.managerId))
        ) {
          return 'invalidManager' as const;
        }
        return tx.department.update({ where: { id }, data, select: DEPARTMENT_SELECT });
      });
      if (typeof outcome === 'string') {
        return { status: outcome };
      }
      const [department] = await this.withInactiveCounts([outcome]);
      return { status: 'ok', department };
    } catch (error) {
      const field = duplicateFieldOf(error);
      if (field) {
        return { status: 'duplicate', field };
      }
      throw error;
    }
  }

  // 社員行を FOR NO KEY UPDATE でロックし(同時の無効化と直列化)、有効な社員か返す
  private async lockActiveUser(tx: Prisma.TransactionClient, userId: string): Promise<boolean> {
    const rows = await tx.$queryRaw<
      { is_active: boolean }[]
    >`SELECT is_active FROM users WHERE id = ${userId}::uuid FOR NO KEY UPDATE`;
    return rows[0]?.is_active === true;
  }

  // 削除(docs/05 §8)。部署行を FOR UPDATE でロックして新規所属(FK 検査の FOR KEY SHARE)を止めてから、
  // 有効な社員の有無を確認する。無効な社員は未所属部署へ移してから部署を削除する
  async delete(id: string): Promise<DepartmentDeleteResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
          { code: string }[]
        >`SELECT code FROM departments WHERE id = ${id}::uuid FOR UPDATE`;
        const target = rows[0];
        if (!target) {
          return 'notFound';
        }
        if (target.code === SYSTEM_DEPARTMENT_CODE) {
          return 'protected';
        }
        const activeCount = await tx.user.count({ where: { departmentId: id, isActive: true } });
        if (activeCount > 0) {
          return 'hasMembers';
        }
        const unassigned = await tx.department.findUnique({
          where: { code: SYSTEM_DEPARTMENT_CODE },
          select: { id: true },
        });
        if (!unassigned) {
          // 内部の原因はログにだけ残し、応答は共通の 500 にする
          this.logger.error(
            '未所属部署が存在しません。マイグレーションまたは seed を確認してください。',
          );
          throw new AppException(
            'INTERNAL_SERVER_ERROR',
            HttpStatus.INTERNAL_SERVER_ERROR,
            'サーバーでエラーが発生しました。',
          );
        }
        await tx.user.updateMany({
          where: { departmentId: id, isActive: false },
          data: { departmentId: unassigned.id },
        });
        try {
          await tx.department.delete({ where: { id } });
        } catch (error) {
          // 移動後に社員が有効化された(FK 違反)。トランザクションごと取り消す
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            throw new DepartmentHasMembersSignal();
          }
          throw error;
        }
        return 'deleted';
      });
    } catch (error) {
      if (error instanceof DepartmentHasMembersSignal) {
        return 'hasMembers';
      }
      throw error;
    }
  }

  // 同じページの部署について、無効な社員数を 1 クエリでまとめて数える
  private async withInactiveCounts(rows: DepartmentWithActiveCount[]): Promise<DepartmentRow[]> {
    const grouped =
      rows.length > 0
        ? await this.prisma.user.groupBy({
            by: ['departmentId'],
            where: { departmentId: { in: rows.map((row) => row.id) }, isActive: false },
            _count: { _all: true },
          })
        : [];
    const inactiveById = new Map(grouped.map((group) => [group.departmentId, group._count._all]));
    return rows.map(({ _count, ...row }) => ({
      ...row,
      memberCount: _count.users,
      inactiveMemberCount: inactiveById.get(row.id) ?? 0,
    }));
  }
}
