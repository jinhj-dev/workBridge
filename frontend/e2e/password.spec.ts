import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_INITIAL_USER } from './accounts';

// 初回ログイン用の E2E アカウント(900002)を使う。実際にパスワードを変更するが、
// globalSetup が実行のたびにパスワードと mustChangePassword = true を初期化するため繰り返し実行できる
const t = messages.password;
const SKIP_REASON = 'E2E_INITIAL_PASSWORD が未設定のため実行しない';

async function login(page: Page, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(E2E_INITIAL_USER.empId);
  await page.getByLabel(messages.login.password).fill(password);
  await page.getByRole('button', { name: messages.login.submit }).click();
}

test('shouldRedirectToLoginWithReturnPathWhenUnauthenticated', async ({ page }) => {
  await page.goto('/password');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fpassword$/);
});

// 変更不要な利用者の表示(取消ボタンあり・案内文なし)は PasswordChangeForm のコンポーネントテストで確認する
test('shouldMoveToPasswordAfterLoginAndRejectMismatchWithoutCallingApiWhenMustChange', async ({
  page,
}) => {
  test.skip(!E2E_INITIAL_USER.password, SKIP_REASON);

  // 不一致のときは変更 API を呼ばないことを確かめるため、この段階では通信を止めて回数だけ数える
  let passwordRequests = 0;
  await page.route('**/api/v1/auth/password', (route) => {
    passwordRequests += 1;
    return route.abort();
  });

  await login(page, E2E_INITIAL_USER.password);

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

  await page.getByLabel(t.currentPassword, { exact: true }).fill(E2E_INITIAL_USER.password);
  await page.getByLabel(t.newPassword, { exact: true }).fill('NewPass123');
  await page.getByLabel(t.confirmPassword, { exact: true }).fill('NewPass124');
  await page.getByRole('button', { name: t.submit }).click();

  await expect(page.getByText(t.validation.mismatch)).toBeVisible();
  await expect(page).toHaveURL(/\/password$/);
  expect(passwordRequests).toBe(0);
});

test('shouldChangePasswordAndLoginOnlyWithNewPassword', async ({ page }) => {
  test.skip(!E2E_INITIAL_USER.password, SKIP_REASON);

  // 新しいパスワードは実行のたびに作る(英字と数字を必ず含める)
  const newPassword = `Pw1${randomUUID().replaceAll('-', '').slice(0, 16)}`;

  await login(page, E2E_INITIAL_USER.password);
  await expect(page).toHaveURL(/\/password$/);
  await page.getByLabel(t.currentPassword, { exact: true }).fill(E2E_INITIAL_USER.password);
  await page.getByLabel(t.newPassword, { exact: true }).fill(newPassword);
  await page.getByLabel(t.confirmPassword, { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: t.submit }).click();

  await expect(page.getByText(t.success)).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { level: 1, name: messages.dashboard.title }),
  ).toBeVisible();

  await logout(page);

  // 新しいパスワードでログインすると、変更画面を経ずにダッシュボードへ移る
  const loginResponse = page.waitForResponse('**/api/v1/auth/login');
  await login(page, newPassword);
  const body = (await (await loginResponse).json()) as { user: { mustChangePassword: boolean } };
  expect(body.user.mustChangePassword).toBe(false);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { level: 1, name: messages.dashboard.title }),
  ).toBeVisible();

  await logout(page);

  // 元のパスワードではログインできない
  await login(page, E2E_INITIAL_USER.password);
  await expect(page.locator('form').getByRole('alert')).toHaveText(
    messages.login.error.invalidCredentials,
  );
  await expect(page).toHaveURL(/\/login$/);
});

async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: new RegExp(messages.nav.userMenu) }).click();
  await page.getByRole('button', { name: messages.nav.logout }).click();
  await expect(page).toHaveURL(/\/login$/);
}
