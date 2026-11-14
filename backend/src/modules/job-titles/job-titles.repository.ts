import { Injectable } from '@nestjs/common';
import { violatedConstraintOf } from '../../common/prisma/constraint-name.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateJobTitleDto, UpdateJobTitleDto } from './dto/job-title.dto.js';
import type { JobTitleRow } from './job-title.mapper.js';

// userCount は参照する社員の数(有効・無効の両方。FK RESTRICT の基準と同じ)
const JOB_TITLE_SELECT = {
  id: true,
  name: true,
  tone: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true } },
} as const satisfies Prisma.JobTitleSelect;

type JobTitleWithCount = Prisma.JobTitleGetPayload<{ select: typeof JOB_TITLE_SELECT }>;

export type JobTitleWriteResult =
  { status: 'ok'; jobTitle: JobTitleRow } | { status: 'duplicate' } | { status: 'notFound' };

export type JobTitleDeleteResult = 'deleted' | 'notFound' | 'inUse';

const NAME_UNIQUE_INDEX = 'job_titles_name_key';
const USER_FK_CONSTRAINT = 'users_job_title_id_fkey';

function toRow({ _count, ...row }: JobTitleWithCount): JobTitleRow {
  return { ...row, userCount: _count.users };
}

// 更新・削除対象が存在しない(P2025)か
function isRecordNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
}

@Injectable()
export class JobTitlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 作成日時昇順 → 名前昇順
  async findAll(): Promise<JobTitleRow[]> {
    const rows = await this.prisma.jobTitle.findMany({
      select: JOB_TITLE_SELECT,
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toRow);
  }

  async create(data: CreateJobTitleDto): Promise<JobTitleWriteResult> {
    try {
      const row = await this.prisma.jobTitle.create({ data, select: JOB_TITLE_SELECT });
      return { status: 'ok', jobTitle: toRow(row) };
    } catch (error) {
      if (violatedConstraintOf(error, 'P2002') === NAME_UNIQUE_INDEX) {
        return { status: 'duplicate' };
      }
      throw error;
    }
  }

  // users 行には触れない(名前・色の変更は社員の権限・認証に影響しない)
  async update(id: string, data: UpdateJobTitleDto): Promise<JobTitleWriteResult> {
    try {
      const row = await this.prisma.jobTitle.update({
        where: { id },
        data,
        select: JOB_TITLE_SELECT,
      });
      return { status: 'ok', jobTitle: toRow(row) };
    } catch (error) {
      if (violatedConstraintOf(error, 'P2002') === NAME_UNIQUE_INDEX) {
        return { status: 'duplicate' };
      }
      if (isRecordNotFound(error)) {
        return { status: 'notFound' };
      }
      throw error;
    }
  }

  // 使用中なら削除しない。事前の件数確認に加え、同時の配属による FK 違反(P2003)も使用中として扱う
  async delete(id: string): Promise<JobTitleDeleteResult> {
    const target = await this.prisma.jobTitle.findUnique({
      where: { id },
      select: { _count: { select: { users: true } } },
    });
    if (!target) {
      return 'notFound';
    }
    if (target._count.users > 0) {
      return 'inUse';
    }
    try {
      await this.prisma.jobTitle.delete({ where: { id } });
      return 'deleted';
    } catch (error) {
      if (violatedConstraintOf(error, 'P2003') === USER_FK_CONSTRAINT) {
        return 'inUse';
      }
      if (isRecordNotFound(error)) {
        return 'notFound';
      }
      throw error;
    }
  }
}
