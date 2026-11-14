import { HttpStatus, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AppException } from '../../common/exceptions/app.exception.js';
import { toPage, toSkipTake } from '../../common/pagination/pagination.js';
import type { Page } from '../../common/pagination/pagination.js';
import { BCRYPT_COST } from '../../common/security/credentials.js';
import { Clock } from '../../common/time/clock.js';
import { escapeLikePattern } from '../../common/validation/like-pattern.js';
import type { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import { toUserDetail, toUserListItem } from './user.mapper.js';
import type { UserDetail, UserListItem, UserSummaryCounts } from './user.mapper.js';
import { UsersRepository } from './users.repository.js';

type FailureStatus =
  | 'duplicateEmpId'
  | 'exhausted'
  | 'invalidDepartment'
  | 'invalidJobTitle'
  | 'lastAdmin'
  | 'notFound';

function notFoundException(): AppException {
  return new AppException('NOT_FOUND', HttpStatus.NOT_FOUND, '社員が見つかりません。');
}

function failureException(status: FailureStatus): AppException {
  switch (status) {
    case 'duplicateEmpId':
      return new AppException(
        'DUPLICATE_EMP_ID',
        HttpStatus.CONFLICT,
        'この社員IDは既に使用されています。',
      );
    case 'exhausted':
      return new AppException(
        'EMP_ID_EXHAUSTED',
        HttpStatus.CONFLICT,
        '社員IDを自動で採番できません。直接入力してください。',
      );
    case 'invalidDepartment':
      return new AppException(
        'INVALID_DEPARTMENT',
        HttpStatus.BAD_REQUEST,
        '部署を選び直してください。',
      );
    case 'invalidJobTitle':
      return new AppException(
        'INVALID_JOB_TITLE',
        HttpStatus.BAD_REQUEST,
        '役職を選び直してください。',
      );
    case 'lastAdmin':
      return new AppException(
        'LAST_ADMIN',
        HttpStatus.CONFLICT,
        '最後の管理者は無効化・権限変更できません。',
      );
    case 'notFound':
      return notFoundException();
  }
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly clock: Clock,
  ) {}

  async list(query: AdminUserQueryDto): Promise<Page<UserListItem>> {
    const now = this.clock.now();
    const { items, total } = await this.usersRepository.findPage(
      {
        keyword: query.keyword ? escapeLikePattern(query.keyword) : undefined,
        name: query.name ? escapeLikePattern(query.name) : undefined,
        empId: query.empId ? escapeLikePattern(query.empId) : undefined,
        departmentId: query.departmentId,
        jobTitleId: query.jobTitleId,
        role: query.role,
        approvalRequired: query.approvalRequired,
        isActive: query.isActive,
        status: query.status,
        hireDateFrom: query.hireDateFrom,
        hireDateTo: query.hireDateTo,
        ...toSkipTake(query),
      },
      now,
    );
    return toPage(
      items.map((row) => toUserListItem(row, now)),
      total,
      query.page,
      query.limit,
    );
  }

  getSummary(): Promise<UserSummaryCounts> {
    return this.usersRepository.countSummary(this.clock.now());
  }

  async getNextEmpId(): Promise<{ empId: string | null }> {
    return { empId: await this.usersRepository.peekNextEmpId() };
  }

  async getDetail(id: string): Promise<UserDetail> {
    const row = await this.usersRepository.findById(id);
    if (!row) {
      throw notFoundException();
    }
    const extras = await this.usersRepository.findDetailExtras(id);
    return toUserDetail(row, extras, this.clock.now());
  }

  async create(dto: CreateUserDto): Promise<UserDetail> {
    // ハッシュ計算は時間がかかるためトランザクションの外で行う。平文は保持・出力しない
    const passwordHash = await bcrypt.hash(dto.initialPassword, BCRYPT_COST);
    const result = await this.usersRepository.create({
      empId: dto.empId,
      name: dto.name,
      passwordHash,
      jobTitleId: dto.jobTitleId,
      contactEmail: dto.contactEmail,
      departmentId: dto.departmentId,
      hireDate: dto.hireDate,
      role: dto.role,
      approvalRequired: dto.approvalRequired,
    });
    if (result.status !== 'ok') {
      throw failureException(result.status);
    }
    return this.getDetail(result.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string): Promise<UserDetail> {
    const result = await this.usersRepository.update(id, dto, actorId, this.clock.now());
    if (result.status !== 'ok') {
      throw failureException(result.status);
    }
    return this.getDetail(id);
  }
}
