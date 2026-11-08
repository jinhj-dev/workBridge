import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { USER_SUMMARY_SELECT } from '../../common/mappers/user-summary.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const ATTENDANCE_SELECT = {
  id: true,
  workDate: true,
  clockIn: true,
  clockOut: true,
  user: { select: USER_SUMMARY_SELECT },
} as const satisfies Prisma.AttendanceSelect;

export type AttendanceRow = Prisma.AttendanceGetPayload<{ select: typeof ATTENDANCE_SELECT }>;

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndWorkDate(userId: string, workDate: Date): Promise<AttendanceRow | null> {
    return this.prisma.attendance.findUnique({
      where: { userId_workDate: { userId, workDate } },
      select: ATTENDANCE_SELECT,
    });
  }

  // 出勤を登録する。同じ勤務日の行がすでにある(UNIQUE 違反)場合は null を返す
  async createClockIn(params: {
    userId: string;
    workDate: Date;
    clockIn: Date;
  }): Promise<AttendanceRow | null> {
    try {
      return await this.prisma.attendance.create({ data: params, select: ATTENDANCE_SELECT });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  // 退勤を登録する。退勤が未登録の行だけを更新する条件付き UPDATE(docs/05 §8)。更新件数を返す
  async updateClockOut(params: {
    userId: string;
    workDate: Date;
    clockOut: Date;
  }): Promise<number> {
    const { userId, workDate, clockOut } = params;
    const result = await this.prisma.attendance.updateMany({
      where: { userId, workDate, clockOut: null },
      data: { clockOut },
    });
    return result.count;
  }
}
