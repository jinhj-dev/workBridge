import { Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AttendanceResponse } from './attendance.mapper.js';
import { AttendanceService } from './attendance.service.js';

// 本人の勤怠のみを扱う。対象ユーザーは常に認証済みユーザーで、リクエストから userId を受け取らない
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

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
