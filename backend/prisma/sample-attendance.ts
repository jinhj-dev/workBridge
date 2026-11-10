// 社員番号 00001 の 2026 年 10 月(平日)の勤怠サンプルを登録する入口。開発 DB 専用(本番では実行できない)。
// ページネーションや状態の絞り込みを画面で確認するために使う。再実行しても重複しない。
// 実行: npm run db:sample-attendance(DATABASE_URL が必要。パスワードは不要)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { assertLocalDatabaseUrl } from './e2e-account-data.js';
import { insertSampleAttendance, SAMPLE_EMP_ID } from './sample-attendance-data.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      '環境変数 DATABASE_URL が設定されていません。backend/.env に設定してください。',
    );
  }
  assertLocalDatabaseUrl(databaseUrl);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('本番環境ではサンプル勤怠を登録できません。');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const insertedCount = await insertSampleAttendance(prisma);
    console.log(
      `社員番号 ${SAMPLE_EMP_ID} の 2026 年 10 月の勤怠を ${insertedCount} 件登録しました(登録済みの日は変更していません)。`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    'サンプル勤怠の登録に失敗しました:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
