import { Controller, Get } from '@nestjs/common';
import { DepartmentsService } from './departments.service.js';

// 認証済みの全ユーザーが利用できる(部署名以外は返さない)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  list(): Promise<{ id: string; name: string }[]> {
    return this.departmentsService.list();
  }
}
