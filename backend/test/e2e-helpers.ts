// 業務 API の e2e で共通に使う処理(時刻固定のアプリ起動、トークン発行、休暇・勤怠・付与の直接 INSERT)
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { Clock } from '../src/common/time/clock.js';
import { configureApp } from '../src/configure-app.js';
import type {
  LeaveStatus,
  LeaveType,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma/client.js';
import { toDbDate } from './db/db-helpers.js';

// 既定の固定時刻: 2026-11-09(月)09:00 JST
export const DEFAULT_NOW = '2026-11-09T09:00:00+09:00';

// テスト内で時刻を変えられる Clock
export class FixedClock extends Clock {
  private current = new Date(DEFAULT_NOW);

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(iso: string): void {
    this.current = new Date(iso);
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60000);
  }
}

// Clock を差し替えた AppModule を起動する
export async function createTestApp(clock: FixedClock): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

// 本物の鍵で Access Token を作る(ログイン API を経由しない)
export function createTokenSigner(): (userId: string) => Promise<string> {
  const signer = new JwtService({
    secret: process.env.JWT_ACCESS_SECRET ?? '',
    signOptions: { algorithm: 'HS256', expiresIn: 900 },
  });
  return (userId) => signer.signAsync({ sub: userId });
}

export interface InsertLeaveParams {
  userId: string;
  approverId: string | null;
  status: LeaveStatus;
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
  days?: number;
  processedBy?: string | null;
  rejectReason?: string | null;
  createdAt?: Date;
}

// 休暇を直接 INSERT する(申請 API は未実装)。PENDING 以外は CHECK 制約に合わせて処理者・処理時刻を入れる
export function insertLeave(
  prisma: PrismaClient,
  params: InsertLeaveParams,
): Promise<Prisma.LeaveGetPayload<object>> {
  const startDate = params.startDate ?? '2026-11-20';
  const endDate = params.endDate ?? startDate;
  const processed = params.status !== 'PENDING';
  return prisma.leave.create({
    data: {
      userId: params.userId,
      approverId: params.approverId,
      leaveType: params.leaveType ?? 'ANNUAL',
      startDate: toDbDate(startDate),
      endDate: toDbDate(endDate),
      days: params.days ?? 1,
      reason: 'テスト用の休暇',
      status: params.status,
      processedBy: processed ? (params.processedBy ?? params.approverId ?? params.userId) : null,
      processedAt: processed ? new Date('2026-11-01T00:00:00Z') : null,
      rejectReason: params.status === 'REJECTED' ? (params.rejectReason ?? 'テスト却下') : null,
      ...(params.createdAt ? { createdAt: params.createdAt } : {}),
    },
  });
}

// 勤怠を直接 INSERT する。clockIn は ISO 文字列(work_date は東京日付で一致させる)
export function insertAttendance(
  prisma: PrismaClient,
  params: { userId: string; workDate: string; clockIn: string; clockOut?: string | null },
): Promise<Prisma.AttendanceGetPayload<object>> {
  return prisma.attendance.create({
    data: {
      userId: params.userId,
      workDate: toDbDate(params.workDate),
      clockIn: new Date(params.clockIn),
      clockOut: params.clockOut ? new Date(params.clockOut) : null,
    },
  });
}

export function insertLeaveGrant(
  prisma: PrismaClient,
  params: { userId: string; year: number; grantedDays: number },
): Promise<Prisma.LeaveGrantGetPayload<object>> {
  return prisma.leaveGrant.create({ data: params });
}
