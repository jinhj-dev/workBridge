import { defineConfig } from '@playwright/test';

// 実バックエンド(npm run start)と接続した E2E。バックエンド(4000)と開発 DB が起動済みであること。
// PLAYWRIGHT_BASE_URL を指定しない場合は next dev(3000)を自動で起動する。
// 実行前に globalSetup で開発 DB の E2E アカウントを初期化する(backend の npm run db:e2e-accounts)。
// 必要な環境変数: E2E_ADMIN_PASSWORD(900001)、E2E_INITIAL_PASSWORD(900002)。どちらも未設定なら初期化しない。
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  workers: 1,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000' },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:3000/login', reuseExistingServer: true },
});
