import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { AdminOnly } from '../auth/decorators/admin-only.decorator.js';
import { createJobTitleSchema, updateJobTitleSchema } from './dto/job-title.dto.js';
import type { CreateJobTitleDto, UpdateJobTitleDto } from './dto/job-title.dto.js';
import type { JobTitleDetail } from './job-title.mapper.js';
import { JobTitlesService } from './job-titles.service.js';

// 形式が不正な :id は DB を引かずに 400 VALIDATION_ERROR とする
const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new AppException('VALIDATION_ERROR', HttpStatus.BAD_REQUEST, '入力内容に誤りがあります。', [
      { field: 'id', message: '役職 ID の形式が正しくありません。' },
    ]),
});

@AdminOnly()
@Controller('admin/job-titles')
export class AdminJobTitlesController {
  constructor(private readonly jobTitlesService: JobTitlesService) {}

  @Get()
  list(): Promise<JobTitleDetail[]> {
    return this.jobTitlesService.list();
  }

  @Post()
  create(@Body({ schema: createJobTitleSchema }) dto: CreateJobTitleDto): Promise<JobTitleDetail> {
    return this.jobTitlesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', uuidPipe) id: string,
    @Body({ schema: updateJobTitleSchema }) dto: UpdateJobTitleDto,
  ): Promise<JobTitleDetail> {
    return this.jobTitlesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', uuidPipe) id: string): Promise<void> {
    return this.jobTitlesService.remove(id);
  }
}
