import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { CreateJobTitleDto, UpdateJobTitleDto } from './dto/job-title.dto.js';
import { toJobTitleDetail } from './job-title.mapper.js';
import type { JobTitleDetail } from './job-title.mapper.js';
import { JobTitlesRepository } from './job-titles.repository.js';
import type { JobTitleWriteResult } from './job-titles.repository.js';

function notFoundException(): AppException {
  return new AppException('NOT_FOUND', HttpStatus.NOT_FOUND, '役職が見つかりません。');
}

@Injectable()
export class JobTitlesService {
  constructor(private readonly jobTitlesRepository: JobTitlesRepository) {}

  async list(): Promise<JobTitleDetail[]> {
    return (await this.jobTitlesRepository.findAll()).map(toJobTitleDetail);
  }

  async create(dto: CreateJobTitleDto): Promise<JobTitleDetail> {
    return this.toDetail(await this.jobTitlesRepository.create(dto));
  }

  async update(id: string, dto: UpdateJobTitleDto): Promise<JobTitleDetail> {
    return this.toDetail(await this.jobTitlesRepository.update(id, dto));
  }

  async remove(id: string): Promise<void> {
    const result = await this.jobTitlesRepository.delete(id);
    if (result === 'notFound') {
      throw notFoundException();
    }
    if (result === 'inUse') {
      throw new AppException(
        'JOB_TITLE_IN_USE',
        HttpStatus.CONFLICT,
        'この役職を使用している社員が存在するため、削除できません。',
      );
    }
  }

  private toDetail(result: JobTitleWriteResult): JobTitleDetail {
    switch (result.status) {
      case 'ok':
        return toJobTitleDetail(result.jobTitle);
      case 'duplicate':
        throw new AppException(
          'DUPLICATE_JOB_TITLE_NAME',
          HttpStatus.CONFLICT,
          'この役職名は既に登録されています。',
        );
      case 'notFound':
        throw notFoundException();
    }
  }
}
