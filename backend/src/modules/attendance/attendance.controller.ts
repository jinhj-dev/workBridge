import { Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Page } from '../../common/pagination/pagination.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AttendanceResponse } from './attendance.mapper.js';
import { AttendanceSheetService } from './attendance-sheet.service.js';
import type { AttendanceSheetResponse } from './attendance-sheet-rules.js';
import { AttendanceService } from './attendance.service.js';
import { attendanceMonthlyQuerySchema } from './dto/attendance-monthly-query.dto.js';
import type { AttendanceMonthlyQueryDto } from './dto/attendance-monthly-query.dto.js';
import { attendanceHistoryQuerySchema } from './dto/attendance-history-query.dto.js';
import type { AttendanceHistoryQueryDto } from './dto/attendance-history-query.dto.js';

// 本人の勤怠のみを扱う。対象ユーザーは常に認証済みユーザーで、リクエストから userId を受け取らない
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly attendanceSheetService: AttendanceSheetService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query({ schema: attendanceHistoryQuerySchema }) query: AttendanceHistoryQueryDto,
  ): Promise<Page<AttendanceResponse>> {
    return this.attendanceService.listMine(user.id, query);
  }

  // 出勤簿の月間表示(API-ATT-007)。'today' と同様に固定パスなので動的ルートより前に置く必要はない
  @Get('monthly')
  getMonthly(
    @CurrentUser() user: AuthUser,
    @Query({ schema: attendanceMonthlyQuerySchema }) query: AttendanceMonthlyQueryDto,
  ): Promise<AttendanceSheetResponse> {
    return this.attendanceSheetService.getMonthly(user.id, query.month);
  }

  @Post('clock-in')
  @HttpCode(201)
  clockIn(@CurrentUser() user: AuthUser): Promise<AttendanceResponse> {
    return this.attendanceService.clockIn(user.id);
  }

  @Post('clock-out')
  @HttpCode(200)
  clockOut(@CurrentUser() user: AuthUser): Promise<AttendanceResponse> {
    return this.attendanceService.clockOut(user.id);
  }

  // 未出勤のときは本文を JSON の null にする(Nest は null を返すと本文が空になるため、明示的に送る)
  @Get('today')
  async today(@CurrentUser() user: AuthUser, @Res() res: Response): Promise<void> {
    const attendance = await this.attendanceService.getToday(user.id);
    res.status(200).type('application/json').send(JSON.stringify(attendance));
  }
}
