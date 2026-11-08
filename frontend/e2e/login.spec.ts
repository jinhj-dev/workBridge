import { expect, test } from '@playwright/test';
import { messages } from '../src/messages/ja';

// 実バックエンド・開発 DB のログイン可能な管理者。パスワードは環境変数 E2E_ADMIN_PASSWORD で渡す(コードに書かない)
const EMP_ID = '00001';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
const t = messages.login;
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR;

test.skip(!PASSWORD, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

test('shouldShowErrorMessageWhenPasswordIsWrong', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(t.empId).fill(EMP_ID);
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
  await page.getByRole('button', { name: t.submit }).click();

  // seed の初期 ADMIN は初回ログイン扱い(mustChangePassword = true)のため、ダイアログではなく変更画面へ移る
  // (変更不要な利用者のダイアログ表示は LoginForm のコンポーネントテストで確認する)
  await expect(page).toHaveURL(/\/password$/);
  await expect(page.getByRole('heading', { name: messages.password.title })).toBeVisible();
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

  if (SCREENSHOT_DIR)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-success-password.png` });

  // 再読み込み: refresh → me で復元される
  const refreshRequest = page.waitForRequest('**/api/v1/auth/refresh');
  const meRequest = page.waitForRequest('**/api/v1/auth/me');
  await page.reload();
  expect(await (await refreshRequest).headerValue('cookie')).toContain('refreshToken=');
  expect(await (await meRequest).headerValue('authorization')).toMatch(/^Bearer /);
  // 復元できればログイン画面へ戻されず、変更画面のまま表示される
  await expect(page.getByRole('heading', { name: messages.password.title })).toBeVisible();
  await expect(page).toHaveURL(/\/password$/);
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
