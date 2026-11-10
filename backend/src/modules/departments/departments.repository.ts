import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SYSTEM_DEPARTMENT_CODE } from './department.constants.js';
import type { DepartmentRow } from './department.mapper.js';

const DEPARTMENT_SELECT = {
  id: true,
  code: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: { where: { isActive: true } } } },
} as const satisfies Prisma.DepartmentSelect;

type DepartmentWithActiveCount = Prisma.DepartmentGetPayload<{ select: typeof DEPARTMENT_SELECT }>;

export interface DepartmentListFilter {
  code?: string;
  name?: string;
  skip: number;
  take: number;
}

// 重複した項目(UNIQUE 違反の対象)
export type DuplicateField = 'code' | 'name';

export type DepartmentWriteResult =
  | { status: 'ok'; department: DepartmentRow }
  | { status: 'duplicate'; field: DuplicateField }
  | { status: 'notFound' }
  | { status: 'protected' };

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

  // 一覧(code 昇順)。部署と件数・有効な社員数、無効な社員数の 3 クエリで N+1 を避ける
  async findPage(filter: DepartmentListFilter): Promise<{ items: DepartmentRow[]; total: number }> {
    const where: Prisma.DepartmentWhereInput = {
      ...(filter.code ? { code: { contains: filter.code, mode: 'insensitive' } } : {}),
      ...(filter.name ? { name: { contains: filter.name, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        select: DEPARTMENT_SELECT,
        orderBy: { code: 'asc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.department.count({ where }),
    ]);
    return { items: await this.withInactiveCounts(rows), total };
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

  async create(data: { code: string; name: string }): Promise<DepartmentWriteResult> {
    try {
      const row = await this.prisma.department.create({ data, select: DEPARTMENT_SELECT });
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

  // 未所属部署は変更できない。対象がなければ notFound
  async update(id: string, data: { code?: string; name?: string }): Promise<DepartmentWriteResult> {
    const current = await this.prisma.department.findUnique({
      where: { id },
      select: { code: true },
    });
    if (!current) {
      return { status: 'notFound' };
    }
    if (current.code === SYSTEM_DEPARTMENT_CODE) {
      return { status: 'protected' };
    }
    try {
      const row = await this.prisma.department.update({
        where: { id },
        data,
        select: DEPARTMENT_SELECT,
      });
      const [department] = await this.withInactiveCounts([row]);
      return { status: 'ok', department };
    } catch (error) {
      const field = duplicateFieldOf(error);
      if (field) {
        return { status: 'duplicate', field };
      }
      // 確認後に別の操作で削除された
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return { status: 'notFound' };
      }
      throw error;
    }
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
