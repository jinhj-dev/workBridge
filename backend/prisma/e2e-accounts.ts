// Playwright 用 E2E アカウント(900001 / 900002)を作成・初期化する入口。開発 DB 専用(本番では実行できない)。
// 先に npm run db:seed で初期 ADMIN を登録しておくこと。
// 実行: npm run db:e2e-accounts(E2E_ADMIN_PASSWORD / E2E_INITIAL_PASSWORD が必要)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  assertLocalDatabaseUrl,
  parseE2eAccountConfig,
  resetE2eAccounts,
} from './e2e-account-data.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      '環境変数 DATABASE_URL が設定されていません。backend/.env に設定してください。',
    );
  }
  assertLocalDatabaseUrl(databaseUrl);
  const config = parseE2eAccountConfig(process.env);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const result = await resetE2eAccounts(prisma, config);
    // パスワードやハッシュは出力しない
    for (const account of result.accounts) {
      const action = account.status === 'created' ? '作成' : '初期化';
      console.log(`E2E アカウント(${account.empId})を${action}しました。`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    'E2E アカウントの作成に失敗しました:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
