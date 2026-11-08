// テスト用 DB の接続先検証。e2e テストと、テスト用 DB へのマイグレーション(migrate-test-db.ts)で共通に使う。
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// テストで接続してよいホスト(ローカルの DB コンテナのみ)
const ALLOWED_TEST_DB_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// 実行時のカレントディレクトリに依存しないよう、このファイルからの位置で指定する
const ENV_TEST_PATH = fileURLToPath(new URL('../.env.test', import.meta.url));

// backend/.env.test を process.env に読み込む(既存の値は上書きする)。ファイルがなければ例外にする
export function loadEnvTest(): void {
  const { error } = config({ path: ENV_TEST_PATH, override: true, quiet: true });
  if (error) {
    throw new Error(`backend/.env.test を読み込めません(${ENV_TEST_PATH}): ${error.message}`);
  }
}

// 開発用 DB や他ホストの DB を誤って操作しないよう、接続先がローカルの *_test DB であることを確かめる
export function assertTestDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error('DATABASE_URL が設定されていません。backend/.env.test を確認してください。');
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('DATABASE_URL の形式が不正です。backend/.env.test を確認してください。');
  }
  if (!ALLOWED_TEST_DB_HOSTS.includes(parsed.hostname)) {
    throw new Error(`テスト用 DB はローカルのみ接続できます: "${parsed.hostname}"`);
  }
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`テスト用 DB(*_test)以外には接続できません: "${dbName}"`);
  }
  return url;
}
