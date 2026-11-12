import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import type { DepartmentStatus } from './dashboard.service.js';

// ログイン済みの全ユーザーが利用できるダッシュボード API
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('department-status')
  getDepartmentStatus(): Promise<DepartmentStatus> {
    return this.dashboardService.getDepartmentStatus();
  }
}
