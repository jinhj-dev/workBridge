import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';

// 実バックエンド・開発 DB と接続したダッシュボードの E2E。
// 出勤・退勤は開発 DB に 1 日 1 回しか登録できず繰り返し実行できないため、ここでは押さない
// (コンポーネントテストと API の結合テストで確認する)
const EMP_ID = '00001';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
const t = messages.dashboard;
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR;

test('shouldRedirectToLoginWithReturnPathWhenUnauthenticated', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
  await expect(page.getByRole('heading', { name: messages.login.title })).toBeVisible();
});

test.describe('ログイン後', () => {
  test.skip(!PASSWORD, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

  // ログインして、パスワード変更が不要な管理者であることを確かめる(必要ならダッシュボードは使えない)
  async function login(page: Page): Promise<void> {
    await page.getByLabel(messages.login.empId).fill(EMP_ID);
    await page.getByLabel(messages.login.password).fill(PASSWORD);
    const loginResponse = page.waitForResponse('**/api/v1/auth/login');
    await page.getByRole('button', { name: messages.login.submit }).click();
    const body = (await (await loginResponse).json()) as {
      user: { role: string; mustChangePassword: boolean };
    };
    expect(body.user.mustChangePassword, '開発 DB の管理者のパスワード変更が済んでいること').toBe(
      false,
    );
    expect(body.user.role).toBe('ADMIN');
  }

  async function expectDashboard(page: Page): Promise<void> {
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
    for (const title of [t.summary.title, t.attendance.title, t.leave.title, t.pending.title]) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
  }

  test('shouldShowDashboardWithAdminSectionsAfterLogin', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await login(page);

    await expectDashboard(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const sidebar = page.getByRole('navigation', { name: messages.nav.mainLabel }).first();
    await expect(sidebar.getByRole('link', { name: messages.nav.adminUsers })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: messages.nav.adminAttendance })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: messages.nav.dashboard })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // 各領域が読み込みを終え、照会失敗が出ていない
    await expect(page.getByText(messages.common.loadError)).toHaveCount(0);
    if (SCREENSHOT_DIR) await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-e2e.png` });
  });

  test('shouldReturnToRedirectTargetAfterLogin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
    await login(page);

    await expectDashboard(page);
  });

  test('shouldGoToLoginAfterLogoutAndRequireLoginAgain', async ({ page }) => {
    await page.goto('/login');
    await login(page);
    await expectDashboard(page);

    await page.getByRole('button', { name: new RegExp(messages.nav.userMenu) }).click();
    await page.getByRole('button', { name: messages.nav.logout }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
  });

  test('shouldKeepSessionAndShowDashboardAfterReload', async ({ page }) => {
    await page.goto('/login');
    await login(page);
    await expectDashboard(page);

    await page.reload();
    await expectDashboard(page);
  });
});
