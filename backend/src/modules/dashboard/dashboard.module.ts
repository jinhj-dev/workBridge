import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller.js';
import { DashboardRepository } from './dashboard.repository.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  controllers: [AdminDashboardController],
  providers: [DashboardService, DashboardRepository],
})
export class DashboardModule {}
