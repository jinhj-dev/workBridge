// 初期データ投入の入口(部署と初期 ADMIN 1 名のみ)。何度実行しても重複しない。
// 実行: npm run db:seed(または prisma db seed)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEPARTMENT_NAMES, parseSeedConfig, seedInitialData } from './initial-data.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      '環境変数 DATABASE_URL が設定されていません。backend/.env に設定してください。',
    );
  }
  const config = parseSeedConfig(process.env);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const result = await seedInitialData(prisma, config);
    console.log(
      `部署: ${DEPARTMENT_NAMES.length} 件中 ${result.createdDepartmentCount} 件を新規登録しました。`,
    );
    if (result.admin === 'created') {
      console.log(
        `初期 ADMIN(${config.adminEmpId})を登録しました。初回ログイン時にパスワード変更が必要です。`,
      );
    } else {
      console.log('活性 ADMIN が既に存在するため、初期 ADMIN は登録しませんでした。');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('seed に失敗しました:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
