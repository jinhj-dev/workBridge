import { defineConfig } from '@playwright/test';

// 実バックエンド(npm run start)と接続した E2E。バックエンド(4000)と開発 DB が起動済みであること。
// PLAYWRIGHT_BASE_URL を指定しない場合は next dev(3000)を自動で起動する。
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000' },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: 'http://localhost:3000/login', reuseExistingServer: true },
});
