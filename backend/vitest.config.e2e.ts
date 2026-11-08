import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // テスト用 DB(backend/.env.test)を使う。開発用 DB は触らない
    setupFiles: ['./test/setup-e2e.ts', './src/config/zod-locale.ts'],
    // テスト用 DB を共有するため、ファイル単位では並列実行しない
    // (seed のテストは「活性 ADMIN がいない」状態を前提にする)
    fileParallelism: false,
  },
});
