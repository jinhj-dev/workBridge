import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [AdminUsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
