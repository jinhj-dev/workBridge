// テスト用 DB(backend/.env.test)にマイグレーションを適用する。実行: npm run db:migrate:test
// 接続先がローカルの *_test DB であることを確かめてから prisma migrate deploy を実行する。
import { spawnSync } from 'node:child_process';
import { assertTestDatabaseUrl, loadEnvTest } from './test-database-url.js';

loadEnvTest();
const databaseUrl = assertTestDatabaseUrl(process.env.DATABASE_URL);

// npm scripts から実行するため、prisma は node_modules/.bin から解決される。
// Windows では .cmd を起動するために shell が必要(引数は固定値のみ)
const result = spawnSync('prisma', ['migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
