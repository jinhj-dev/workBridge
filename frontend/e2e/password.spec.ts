import { expect, test } from '@playwright/test';
import { messages } from '../src/messages/ja';

// 開発 DB の管理者のパスワードは変えてはいけないため、変更 API を送信するケースは扱わない(API の結合テストで確認する)
const EMP_ID = '00001';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
const t = messages.password;

test('shouldRedirectToLoginWithReturnPathWhenUnauthenticated', async ({ page }) => {
  await page.goto('/password');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fpassword$/);
});

// seed の初期 ADMIN は初回ログイン扱い(mustChangePassword = true)。開発 DB の状態は変えられないため、
// 変更不要な利用者の表示(取消ボタンあり・案内文なし)は PasswordChangeForm のコンポーネントテストで確認する
test('shouldMoveToPasswordAfterLoginAndRejectMismatchWithoutCallingApiWhenMustChange', async ({
  page,
}) => {
  test.skip(!PASSWORD, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

  // 万一送信されても開発 DB を変えないよう、変更 API は通信を止めて回数だけ数える
  let passwordRequests = 0;
  await page.route('**/api/v1/auth/password', (route) => {
    passwordRequests += 1;
    return route.abort();
  });

  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(EMP_ID);
  await page.getByLabel(messages.login.password).fill(PASSWORD);
  await page.getByRole('button', { name: messages.login.submit }).click();

  // ログイン直後に変更画面へ移り、案内文とログアウトだけが出る(取消は出ない)
  await expect(page).toHaveURL(/\/password$/);
  await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
  await expect(page.getByText(t.notice)).toBeVisible();
  await expect(page.getByRole('button', { name: t.logout })).toBeVisible();
  await expect(page.getByRole('button', { name: t.cancel })).toHaveCount(0);

  // URL を直接開くとページが読み込み直されるが、refresh で認証が復元され変更画面のまま表示される
  await page.goto('/password');
  await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
  await expect(page.getByText(t.notice)).toBeVisible();

  await page.getByLabel(t.currentPassword, { exact: true }).fill(PASSWORD);
  await page.getByLabel(t.newPassword, { exact: true }).fill('NewPass123');
  await page.getByLabel(t.confirmPassword, { exact: true }).fill('NewPass124');
  await page.getByRole('button', { name: t.submit }).click();

  await expect(page.getByText(t.validation.mismatch)).toBeVisible();
  await expect(page).toHaveURL(/\/password$/);
  expect(passwordRequests).toBe(0);
});
