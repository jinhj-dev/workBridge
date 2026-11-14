import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { Page } from '../../common/pagination/pagination.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminOnly } from '../auth/decorators/admin-only.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { adminUserQuerySchema } from './dto/admin-user-query.dto.js';
import type { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { createUserSchema } from './dto/create-user.dto.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import { updateUserSchema } from './dto/update-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { UserDetail, UserListItem, UserSummaryCounts } from './user.mapper.js';
import { UsersService } from './users.service.js';

// 形式が不正な :id は DB を引かずに 400 VALIDATION_ERROR とする
const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new AppException('VALIDATION_ERROR', HttpStatus.BAD_REQUEST, '入力内容に誤りがあります。', [
      { field: 'id', message: '社員 ID の形式が正しくありません。' },
    ]),
});

@AdminOnly()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(
    @Query({ schema: adminUserQuerySchema }) query: AdminUserQueryDto,
  ): Promise<Page<UserListItem>> {
    return this.usersService.list(query);
  }

  // summary・next-emp-id は :id より先に宣言する
  @Get('summary')
  summary(): Promise<UserSummaryCounts> {
    return this.usersService.getSummary();
  }

  @Get('next-emp-id')
  nextEmpId(): Promise<{ empId: string | null }> {
    return this.usersService.getNextEmpId();
  }

  @Get(':id')
  get(@Param('id', uuidPipe) id: string): Promise<UserDetail> {
    return this.usersService.getDetail(id);
  }

  @Post()
  create(@Body({ schema: createUserSchema }) dto: CreateUserDto): Promise<UserDetail> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', uuidPipe) id: string,
    @Body({ schema: updateUserSchema }) dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserDetail> {
    return this.usersService.update(id, dto, actor.id);
  }
}
