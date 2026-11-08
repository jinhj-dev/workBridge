import { Controller, Get } from '@nestjs/common';
import { AdminOnly } from '../auth/decorators/admin-only.decorator.js';
import { DashboardService } from './dashboard.service.js';
import type { DashboardSummary } from './dashboard.service.js';

@AdminOnly()
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(): Promise<DashboardSummary> {
    return this.dashboardService.getSummary();
  }
}
