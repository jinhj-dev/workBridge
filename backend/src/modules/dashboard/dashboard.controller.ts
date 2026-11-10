import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import type { LeaveCalendar, LeaveCalendarDay } from './dashboard.service.js';
import {
  leaveCalendarDayQuerySchema,
  leaveCalendarQuerySchema,
} from './dto/leave-calendar-query.dto.js';
import type {
  LeaveCalendarDayQueryDto,
  LeaveCalendarQueryDto,
} from './dto/leave-calendar-query.dto.js';

// ログイン済みの全ユーザーが利用できるダッシュボード API
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('leave-calendar')
  getLeaveCalendar(
    @Query({ schema: leaveCalendarQuerySchema }) query: LeaveCalendarQueryDto,
  ): Promise<LeaveCalendar> {
    return this.dashboardService.getLeaveCalendar(query.month);
  }

  @Get('leave-calendar/day')
  getLeaveCalendarDay(
    @Query({ schema: leaveCalendarDayQuerySchema }) query: LeaveCalendarDayQueryDto,
  ): Promise<LeaveCalendarDay> {
    return this.dashboardService.getLeaveCalendarDay(query.date);
  }
}
