import { execSync } from 'node:child_process';
import path from 'node:path';

// テスト開始前に開発 DB の E2E アカウントを作成・初期化する(backend の npm run db:e2e-accounts)。
// 失敗した場合は例外をそのまま投げ、テスト全体を開始させない。
export default async function globalSetup(): Promise<void> {
  if (!process.env.E2E_ADMIN_PASSWORD && !process.env.E2E_INITIAL_PASSWORD) {
    // パスワード未設定時は初期化しない(ログインが必要なテストは各 spec で skip する)
    return;
  }

  if (process.env.PLAYWRIGHT_BASE_URL) {
    // ローカルの backend/.env の DB が対象環境と異なる可能性があるため実行しない
    console.log(
      'PLAYWRIGHT_BASE_URL 指定時は E2E アカウントを初期化しません。対象環境で npm run db:e2e-accounts を実行してください。',
    );
    return;
  }

  execSync('npm run db:e2e-accounts', {
    cwd: path.resolve(__dirname, '../../backend'),
    stdio: 'inherit',
    env: process.env,
  });
}
