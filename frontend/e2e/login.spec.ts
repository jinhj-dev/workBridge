import { expect, test } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 実バックエンド・開発 DB の E2E 管理者(パスワード変更不要)。globalSetup が毎回初期化する。
// パスワードは環境変数 E2E_ADMIN_PASSWORD で渡す(コードに書かない)
const t = messages.login;
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR;

test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

test('shouldShowErrorMessageWhenPasswordIsWrong', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(t.empId).fill(E2E_ADMIN.empId);
  await page.getByLabel(t.password).fill('wrong-password-xyz');
  await page.getByRole('button', { name: t.submit }).click();

  await expect(page.locator('form').getByRole('alert')).toHaveText(t.error.invalidCredentials);
  await expect(page.getByLabel(t.password)).toHaveValue('');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('shouldRejectNonDigitEmpIdOnClientSide', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(t.empId).fill('abc');
  await page.getByLabel(t.password).fill('x');
  await page.getByRole('button', { name: t.submit }).click();

  await expect(page.getByText(t.validation.empIdDigitsOnly)).toBeVisible();
});

test('shouldKeepSessionAfterReloadWithRefreshCookie', async ({ page, context }) => {
  await page.goto('/login');
  await page.getByLabel(t.empId).fill(EMP_ID);
  await page.getByLabel(t.password).fill(PASSWORD);
  const loginResponse = page.waitForResponse('**/api/v1/auth/login');
  await page.getByRole('button', { name: t.submit }).click();
  const loggedIn = (await (await loginResponse).json()) as {
    user: { mustChangePassword: boolean };
  };

  // ログイン後はダイアログを出さずに次の画面へ移る。
  // 初回ログイン扱い(mustChangePassword = true)なら変更画面、それ以外はダッシュボード
  // (開発 DB の管理者がどちらの状態かは環境による。両方の分岐は LoginForm のコンポーネントテストで確認する)
  const expectedPath = loggedIn.user.mustChangePassword ? /\/password$/ : /\/dashboard$/;
  const expectedHeading = loggedIn.user.mustChangePassword
    ? messages.password.title
    : messages.dashboard.title;
  await expect(page).toHaveURL(expectedPath);
  await expect(page.getByRole('heading', { level: 1, name: expectedHeading })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Refresh Token は httpOnly Cookie として、認証 API のパスにだけ保存される
  const cookies = await context.cookies();
  const refresh = cookies.find((c) => c.name === 'refreshToken');
  expect(refresh).toMatchObject({
    path: '/api/v1/auth',
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
  });
  // JS からは読めない
  expect(await page.evaluate(() => document.cookie)).not.toContain('refreshToken');
  // Access Token はストレージに置かない
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).toBe(
    '{}',
  );

  if (SCREENSHOT_DIR) await page.screenshot({ path: `${SCREENSHOT_DIR}/login-success.png` });

  // 再読み込み: refresh → me で復元される
  const refreshRequest = page.waitForRequest('**/api/v1/auth/refresh');
  const meRequest = page.waitForRequest('**/api/v1/auth/me');
  await page.reload();
  expect(await (await refreshRequest).headerValue('cookie')).toContain('refreshToken=');
  expect(await (await meRequest).headerValue('authorization')).toMatch(/^Bearer /);
  // 復元できればログイン画面へ戻されず、同じ画面のまま表示される
  await expect(page.getByRole('heading', { level: 1, name: expectedHeading })).toBeVisible();
  await expect(page).toHaveURL(expectedPath);
});

test.describe('レスポンシブ表示', () => {
  for (const width of [360, 768, 1280, 1440]) {
    test(`shouldRenderWithoutHorizontalOverflowAt${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/login');
      await expect(page.getByRole('button', { name: t.submit })).toBeEnabled();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
      if (SCREENSHOT_DIR) await page.screenshot({ path: `${SCREENSHOT_DIR}/login-${width}.png` });

      // エラー表示時の崩れも確認する
      await page.getByRole('button', { name: t.submit }).click();
      await expect(page.getByText(t.validation.empIdRequired)).toBeVisible();
      if (SCREENSHOT_DIR) {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/login-${width}-validation.png` });
      }
    });
  }
});
