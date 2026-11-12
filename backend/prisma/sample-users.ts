// 社員番号 10001〜10100 のサンプル社員 100 名を登録する入口。開発 DB 専用(本番では実行できない)。
// 一覧・検索・ページネーションなどを画面で確認するために使う。再実行しても重複しない。
// 実行: npm run db:sample-users(DATABASE_URL と SEED_USER_PASSWORD が必要)
// 全員のパスワードは SEED_USER_PASSWORD(初回ログイン時に変更が必要)。登録済みの社員はパスワード・役職・連絡先を更新する
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { assertLocalDatabaseUrl } from './e2e-account-data.js';
import {
  insertSampleUsers,
  parseSampleUserPassword,
  SAMPLE_USER_COUNT,
} from './sample-users-data.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      '環境変数 DATABASE_URL が設定されていません。backend/.env に設定してください。',
    );
  }
  assertLocalDatabaseUrl(databaseUrl);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('本番環境ではサンプル社員を登録できません。');
  }

  const password = parseSampleUserPassword(process.env);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const { createdCount, updatedCount } = await insertSampleUsers(prisma, password);
    console.log(
      `サンプル社員 ${SAMPLE_USER_COUNT} 名を処理しました(新規登録 ${createdCount} 名、パスワード・役職・連絡先更新 ${updatedCount} 名)。`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    'サンプル社員の登録に失敗しました:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
