// 共有休暇カレンダー(画面確認・E2E)用に、サンプル社員(10001〜10012)の指定月の休暇を入れ替える入口。開発 DB 専用(本番では実行できない)。
// 先に npm run db:sample-users と npm run db:e2e-accounts を実行しておく。
// 実行: npm run db:e2e-leave-calendar-fixture [-- --month=YYYY-MM](DATABASE_URL が必要。省略時は東京の今月)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { monthRange } from '../src/common/time/calendar-rules.js';
import { toDbDate, toTokyoDate } from '../src/common/time/tokyo-date.js';
import { LeaveStatus, LeaveType, PrismaClient } from '../src/generated/prisma/client.js';
import { E2E_ACCOUNTS, assertLocalDatabaseUrl } from './e2e-account-data.js';

const SAMPLE_EMP_IDS = Array.from({ length: 12 }, (_, index) => String(10001 + index));

interface FixtureLeave {
  userIndex: number; // SAMPLE_EMP_IDS の添字
  leaveType: LeaveType;
  // 月内の日(1 始まり)。負数・month 超過は前月末・翌月初にずらす(月をまたぐ休暇用)
  startDay: number;
  endDay: number;
  status: LeaveStatus;
  withAdminApprover: boolean;
}

// 同じ日に 5 人以上が重なるのは 12 日。月またぎは 1 月だけ翌月側にずらす(年またぎは DB 制約で禁止)
function buildFixtureLeaves(month: string): FixtureLeave[] {
  const crossesIntoPrevious = !month.endsWith('-01');
  const straddle = crossesIntoPrevious
    ? { startDay: 0, endDay: 2 } // 前月末日〜今月 2 日
    : { startDay: 30, endDay: 32 }; // 今月 30 日〜翌月 1 日
  return [
    {
      userIndex: 0,
      leaveType: 'ANNUAL',
      startDay: 12,
      endDay: 12,
      status: 'APPROVED',
      withAdminApprover: true,
    },
    {
      userIndex: 1,
      leaveType: 'ANNUAL',
      startDay: 12,
      endDay: 14,
      status: 'APPROVED',
      withAdminApprover: false,
    },
    {
      userIndex: 2,
      leaveType: 'HALF_AM',
      startDay: 12,
      endDay: 12,
      status: 'APPROVED',
      withAdminApprover: true,
    },
    {
      userIndex: 3,
      leaveType: 'HALF_PM',
      startDay: 12,
      endDay: 12,
      status: 'APPROVED',
      withAdminApprover: false,
    },
    {
      userIndex: 4,
      leaveType: 'SPECIAL',
      startDay: 12,
      endDay: 12,
      status: 'APPROVED',
      withAdminApprover: true,
    },
    {
      userIndex: 5,
      leaveType: 'OTHER',
      startDay: 12,
      endDay: 13,
      status: 'APPROVED',
      withAdminApprover: false,
    },
    {
      userIndex: 6,
      leaveType: 'ANNUAL',
      ...straddle,
      status: 'APPROVED',
      withAdminApprover: false,
    },
    {
      userIndex: 7,
      leaveType: 'ANNUAL',
      startDay: 20,
      endDay: 22,
      status: 'PENDING',
      withAdminApprover: true,
    },
    {
      userIndex: 8,
      leaveType: 'ANNUAL',
      startDay: 20,
      endDay: 20,
      status: 'REJECTED',
      withAdminApprover: true,
    },
    {
      userIndex: 9,
      leaveType: 'ANNUAL',
      startDay: 20,
      endDay: 20,
      status: 'CANCELLED',
      withAdminApprover: false,
    },
    {
      userIndex: 10,
      leaveType: 'HALF_AM',
      startDay: 5,
      endDay: 5,
      status: 'APPROVED',
      withAdminApprover: true,
    },
    {
      userIndex: 11,
      leaveType: 'SPECIAL',
      startDay: 8,
      endDay: 9,
      status: 'APPROVED',
      withAdminApprover: false,
    },
  ];
}

// 月初から day 日目(0 以下は前月、月末超過は翌月)の 'YYYY-MM-DD'
function dayOfMonth(month: string, day: number): string {
  const { start } = monthRange(month);
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(day);
  return date.toISOString().slice(0, 10);
}

function parseMonthArg(argv: string[]): string {
  const arg = argv.find((value) => value.startsWith('--month='));
  const month = arg ? arg.slice('--month='.length) : toTokyoDate(new Date()).slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('--month は YYYY-MM 形式で指定してください。');
  }
  return month;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      '環境変数 DATABASE_URL が設定されていません。backend/.env に設定してください。',
    );
  }
  assertLocalDatabaseUrl(databaseUrl);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('本番環境では休暇カレンダー用データを登録できません。');
  }
  const month = parseMonthArg(process.argv.slice(2));
  const { start, end } = monthRange(month);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const users = await prisma.user.findMany({
      where: { empId: { in: SAMPLE_EMP_IDS } },
      select: { id: true, empId: true },
    });
    if (users.length !== SAMPLE_EMP_IDS.length) {
      throw new Error(
        'サンプル社員(10001〜10012)が不足しています。先に npm run db:sample-users を実行してください。',
      );
    }
    const userIdByEmpId = new Map(users.map((user) => [user.empId, user.id]));
    const admin = await prisma.user.findUnique({
      where: { empId: E2E_ACCOUNTS.admin.empId },
      select: { id: true, name: true },
    });
    if (admin?.name !== E2E_ACCOUNTS.admin.name) {
      throw new Error(
        'E2E 管理者(900001)が存在しません。先に npm run db:e2e-accounts を実行してください。',
      );
    }

    const userIds = [...userIdByEmpId.values()];
    const processedAt = new Date();
    const data = buildFixtureLeaves(month).map((leave) => {
      const startDate = dayOfMonth(month, leave.startDay);
      const endDate = dayOfMonth(month, leave.endDay);
      const days =
        leave.leaveType === 'HALF_AM' || leave.leaveType === 'HALF_PM'
          ? 0.5
          : Math.round((toDbDate(endDate).getTime() - toDbDate(startDate).getTime()) / 86_400_000) +
            1;
      const userId = userIdByEmpId.get(SAMPLE_EMP_IDS[leave.userIndex]);
      if (!userId) {
        throw new Error('サンプル社員を特定できません。');
      }
      const processed = leave.status !== 'PENDING';
      return {
        userId,
        approverId: leave.withAdminApprover ? admin.id : null,
        leaveType: leave.leaveType,
        startDate: toDbDate(startDate),
        endDate: toDbDate(endDate),
        days,
        reason: 'カレンダー表示確認用のサンプル',
        status: leave.status,
        // 承認者なし(即時承認)は本人が処理者。承認者ありの処理済みは承認者(E2E 管理者)が処理者
        processedBy: processed ? (leave.withAdminApprover ? admin.id : userId) : null,
        processedAt: processed ? processedAt : null,
        rejectReason: leave.status === 'REJECTED' ? 'サンプルの却下理由' : null,
      };
    });

    const result = await prisma.$transaction(async (tx) => {
      // 指定月と重なるサンプル社員の休暇を入れ替える(他の社員・他の月は変更しない)
      await tx.leave.deleteMany({
        where: {
          userId: { in: userIds },
          startDate: { lte: toDbDate(end) },
          endDate: { gte: toDbDate(start) },
        },
      });
      return tx.leave.createMany({ data });
    });
    console.log(`${month} のサンプル休暇を入れ替え、${result.count} 件登録しました。`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    '休暇カレンダー用データの登録に失敗しました:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
