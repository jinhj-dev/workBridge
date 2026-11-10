import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { toPage, toSkipTake } from '../../common/pagination/pagination.js';
import type { Page } from '../../common/pagination/pagination.js';
import type { DepartmentDetail } from './department.mapper.js';
import { toDepartmentDetail } from './department.mapper.js';
import type { AdminDepartmentQueryDto } from './dto/admin-department-query.dto.js';
import type { CreateDepartmentDto } from './dto/create-department.dto.js';
import type { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { DepartmentsRepository } from './departments.repository.js';
import type { DepartmentWriteResult, DuplicateField } from './departments.repository.js';

// LIKE のワイルドカード(%, _)とエスケープ文字(\)を文字そのものとして一致させる
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

const PROTECTED_MESSAGE = '未所属部署は変更・削除できません。';

function duplicateException(field: DuplicateField): AppException {
  return field === 'code'
    ? new AppException(
        'DUPLICATE_DEPARTMENT_CODE',
        HttpStatus.CONFLICT,
        'この部署コードは既に使用されています。',
      )
    : new AppException(
        'DUPLICATE_DEPARTMENT_NAME',
        HttpStatus.CONFLICT,
        'この部署名は既に使用されています。',
      );
}

function notFoundException(): AppException {
  return new AppException('NOT_FOUND', HttpStatus.NOT_FOUND, '部署が見つかりません。');
}

@Injectable()
export class DepartmentsService {
  constructor(private readonly departmentsRepository: DepartmentsRepository) {}

  list(): Promise<{ id: string; name: string }[]> {
    return this.departmentsRepository.findAll();
  }

  async listDetails(query: AdminDepartmentQueryDto): Promise<Page<DepartmentDetail>> {
    const { items, total } = await this.departmentsRepository.findPage({
      code: query.code && escapeLikePattern(query.code),
      name: query.name && escapeLikePattern(query.name),
      ...toSkipTake(query),
    });
    return toPage(items.map(toDepartmentDetail), total, query.page, query.limit);
  }

  async getDetail(id: string): Promise<DepartmentDetail> {
    const department = await this.departmentsRepository.findById(id);
    if (!department) {
      throw notFoundException();
    }
    return toDepartmentDetail(department);
  }

  async create(dto: CreateDepartmentDto): Promise<DepartmentDetail> {
    return this.toDetail(await this.departmentsRepository.create(dto));
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDetail> {
    return this.toDetail(await this.departmentsRepository.update(id, dto));
  }

  async remove(id: string): Promise<void> {
    const result = await this.departmentsRepository.delete(id);
    if (result === 'notFound') {
      throw notFoundException();
    }
    if (result === 'protected') {
      throw new AppException('PROTECTED_DEPARTMENT', HttpStatus.CONFLICT, PROTECTED_MESSAGE);
    }
    if (result === 'hasMembers') {
      throw new AppException(
        'DEPARTMENT_HAS_MEMBERS',
        HttpStatus.CONFLICT,
        '所属する社員が存在するため、部署を削除できません。',
      );
    }
  }

  private toDetail(result: DepartmentWriteResult): DepartmentDetail {
    switch (result.status) {
      case 'ok':
        return toDepartmentDetail(result.department);
      case 'duplicate':
        throw duplicateException(result.field);
      case 'protected':
        throw new AppException('PROTECTED_DEPARTMENT', HttpStatus.CONFLICT, PROTECTED_MESSAGE);
      case 'notFound':
        throw notFoundException();
    }
  }
}
