// Prisma CLI の設定。接続先は backend/.env の DATABASE_URL を使う。
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // 初期データ投入(npm run db:seed)
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // .env がなくても prisma generate(npm install 時)は動くよう空文字を許す。
    // migrate など DB を使うコマンドは接続先がないため失敗する。
    url: process.env.DATABASE_URL ?? '',
  },
});
