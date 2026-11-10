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
  Query,
} from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { Page } from '../../common/pagination/pagination.js';
import { AdminOnly } from '../auth/decorators/admin-only.decorator.js';
import type { DepartmentDetail } from './department.mapper.js';
import { DepartmentsService } from './departments.service.js';
import { adminDepartmentQuerySchema } from './dto/admin-department-query.dto.js';
import type { AdminDepartmentQueryDto } from './dto/admin-department-query.dto.js';
import { createDepartmentSchema } from './dto/create-department.dto.js';
import type { CreateDepartmentDto } from './dto/create-department.dto.js';
import { updateDepartmentSchema } from './dto/update-department.dto.js';
import type { UpdateDepartmentDto } from './dto/update-department.dto.js';

// 形式が不正な :id は DB を引かずに 400 VALIDATION_ERROR とする
const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new AppException('VALIDATION_ERROR', HttpStatus.BAD_REQUEST, '入力内容に誤りがあります。', [
      { field: 'id', message: '部署 ID の形式が正しくありません。' },
    ]),
});

@AdminOnly()
@Controller('admin/departments')
export class AdminDepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  list(
    @Query({ schema: adminDepartmentQuerySchema }) query: AdminDepartmentQueryDto,
  ): Promise<Page<DepartmentDetail>> {
    return this.departmentsService.listDetails(query);
  }

  @Get(':id')
  get(@Param('id', uuidPipe) id: string): Promise<DepartmentDetail> {
    return this.departmentsService.getDetail(id);
  }

  @Post()
  create(
    @Body({ schema: createDepartmentSchema }) dto: CreateDepartmentDto,
  ): Promise<DepartmentDetail> {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', uuidPipe) id: string,
    @Body({ schema: updateDepartmentSchema }) dto: UpdateDepartmentDto,
  ): Promise<DepartmentDetail> {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', uuidPipe) id: string): Promise<void> {
    return this.departmentsService.remove(id);
  }
}
