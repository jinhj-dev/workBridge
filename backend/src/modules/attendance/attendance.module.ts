import { Module } from '@nestjs/common';
import { AdminAttendanceController } from './admin-attendance.controller.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceSheetService } from './attendance-sheet.service.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  controllers: [AttendanceController, AdminAttendanceController],
  providers: [AttendanceService, AttendanceSheetService, AttendanceRepository],
})
export class AttendanceModule {}
