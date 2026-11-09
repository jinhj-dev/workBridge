import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type { Page } from '../../common/pagination/pagination.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminOnly } from '../auth/decorators/admin-only.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AttendanceResponse } from './attendance.mapper.js';
import { AttendanceService } from './attendance.service.js';
import { adminAttendanceQuerySchema } from './dto/admin-attendance-query.dto.js';
import type { AdminAttendanceQueryDto } from './dto/admin-attendance-query.dto.js';
import { updateAttendanceSchema } from './dto/update-attendance.dto.js';
import type { UpdateAttendanceDto } from './dto/update-attendance.dto.js';

@AdminOnly()
@Controller('admin/attendance')
export class AdminAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  list(
    @Query({ schema: adminAttendanceQuerySchema }) query: AdminAttendanceQueryDto,
  ): Promise<Page<AttendanceResponse>> {
    return this.attendanceService.listAll(query);
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body({ schema: updateAttendanceSchema }) dto: UpdateAttendanceDto,
  ): Promise<AttendanceResponse> {
    return this.attendanceService.update(admin.id, id, dto);
  }
}
