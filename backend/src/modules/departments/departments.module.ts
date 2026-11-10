import { Module } from '@nestjs/common';
import { AdminDepartmentsController } from './admin-departments.controller.js';
import { DepartmentsController } from './departments.controller.js';
import { DepartmentsRepository } from './departments.repository.js';
import { DepartmentsService } from './departments.service.js';

@Module({
  controllers: [DepartmentsController, AdminDepartmentsController],
  providers: [DepartmentsService, DepartmentsRepository],
})
export class DepartmentsModule {}
