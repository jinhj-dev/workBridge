// E2E 管理者(900001)の勤怠記録を削除する入口。開発 DB 専用(本番では実行できない)。
// 勤怠 spec が開始時に呼び出し、前回実行の記録に依存しないようにする。
// 実行: npm run db:e2e-attendance-reset(DATABASE_URL が必要。パスワードは不要)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { assertLocalDatabaseUrl, resetE2eAdminAttendance } from './e2e-account-data.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      '環境変数 DATABASE_URL が設定されていません。backend/.env に設定してください。',
    );
  }
  assertLocalDatabaseUrl(databaseUrl);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('本番環境では E2E 勤怠を初期化できません。');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const deletedCount = await resetE2eAdminAttendance(prisma);
    console.log(`E2E 管理者(900001)の勤怠記録を ${deletedCount} 件削除しました。`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('E2E 勤怠の初期化に失敗しました:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
