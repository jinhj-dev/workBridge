// E2E 管理者(900001)の勤怠を、状態の絞り込み確認用のデータに入れ替える入口。開発 DB 専用(本番では実行できない)。
// 勤怠の状態 E2E(frontend/e2e/attendance-status.spec.ts)が開始時に呼び出す。
// 実行: npm run db:e2e-attendance-fixture(DATABASE_URL が必要。パスワードは不要)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { toTokyoDate } from '../src/common/time/tokyo-date.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { assertLocalDatabaseUrl, seedE2eAdminAttendance } from './e2e-account-data.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      '環境変数 DATABASE_URL が設定されていません。backend/.env に設定してください。',
    );
  }
  assertLocalDatabaseUrl(databaseUrl);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('本番環境では E2E 勤怠を登録できません。');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const count = await seedE2eAdminAttendance(prisma, toTokyoDate(new Date()));
    console.log(`E2E 管理者(900001)の勤怠を入れ替え、${count} 件登録しました。`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    'E2E 勤怠データの登録に失敗しました:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
