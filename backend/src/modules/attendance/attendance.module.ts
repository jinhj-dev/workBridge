import { Module } from '@nestjs/common';
import { AdminAttendanceController } from './admin-attendance.controller.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  controllers: [AttendanceController, AdminAttendanceController],
  providers: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
