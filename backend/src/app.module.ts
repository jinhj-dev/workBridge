import { Module } from '@nestjs/common';
import { TimeModule } from './common/time/time.module.js';
import { ConfigModule } from './config/config.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { LeavesModule } from './modules/leaves/leaves.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    TimeModule,
    AuthModule,
    HealthModule,
    AttendanceModule,
    LeavesModule,
    DashboardModule,
  ],
})
export class AppModule {}
