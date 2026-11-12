import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 休暇管理のサイドバーサブメニュー(自分の休暇 / 休暇カレンダー / 承認)の E2E。実バックエンド・開発 DB と接続し、データは作らない。
const t = messages.leaveManagement;
const MISSING_ENV_MESSAGE =
  'E2E_ADMIN_PASSWORD と E2E_INITIAL_PASSWORD が必要です(backend の E2E アカウントを初期化するため)';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };
const SCREENSHOT_DIR = process.env.SUBMENU_SCREENSHOT_DIR;

test.beforeEach(() => {
  expect(E2E_ADMIN.password, MISSING_ENV_MESSAGE).not.toBe('');
});

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(E2E_ADMIN.empId);
  await page.getByLabel(messages.login.password).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: messages.login.submit }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function mainNav(page: Page) {
  return page.getByRole('navigation', { name: messages.nav.mainLabel });
}

function leaveToggle(page: Page) {
  return mainNav(page).getByRole('button', { name: new RegExp(messages.nav.leaves) });
}

function submenuLink(page: Page, name: string) {
  return mainNav(page).getByRole('link', { name, exact: true });
}

async function shot(page: Page, name: string): Promise<void> {
  if (SCREENSHOT_DIR) await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png` });
}

test('shouldToggleSubmenuAndNavigateWithActiveStateOnDesktop', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAsAdmin(page);

  // 休暇管理の外では閉じている。押すと開き、もう一度押すと閉じる
  await expect(leaveToggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(submenuLink(page, t.tabMine)).toBeHidden();
  await leaveToggle(page).click();
  await expect(leaveToggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(submenuLink(page, t.tabMine)).toBeVisible();
  await expect(submenuLink(page, t.tabCalendar)).toBeVisible();
  await expect(submenuLink(page, t.tabApprovals)).toBeVisible();
  await shot(page, 'desktop-open');
  await leaveToggle(page).click();
  await expect(leaveToggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(submenuLink(page, t.tabMine)).toBeHidden();

  // 配下へ移動すると Active が付き、開いたままになる。画面内のタブは無い
  await leaveToggle(page).click();
  await submenuLink(page, t.tabCalendar).click();
  await expect(page).toHaveURL(/\/leaves\/calendar$/);
  await expect(submenuLink(page, t.tabCalendar)).toHaveAttribute('aria-current', 'page');
  await expect(submenuLink(page, t.tabMine)).not.toHaveAttribute('aria-current', 'page');
  await expect(leaveToggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: t.title })).toHaveCount(0);
  await shot(page, 'desktop-calendar-active');

  await submenuLink(page, t.tabApprovals).click();
  await expect(page).toHaveURL(/\/leaves\/approvals$/);
  await expect(submenuLink(page, t.tabApprovals)).toHaveAttribute('aria-current', 'page');

  // 戻る・進む・再読み込みでも、画面と選択状態が一致する
  await page.goBack();
  await expect(page).toHaveURL(/\/leaves\/calendar$/);
  await expect(submenuLink(page, t.tabCalendar)).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(submenuLink(page, t.tabApprovals)).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(leaveToggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(submenuLink(page, t.tabApprovals)).toHaveAttribute('aria-current', 'page');

  // 直接アクセスでは自動で開く。休暇管理の外へ出ると、閉じた状態に戻せる
  await page.goto('/leaves');
  await expect(leaveToggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(submenuLink(page, t.tabMine)).toHaveAttribute('aria-current', 'page');
  await mainNav(page).getByRole('link', { name: messages.nav.dashboard }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goBack();
  await expect(leaveToggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(submenuLink(page, t.tabMine)).toHaveAttribute('aria-current', 'page');
});

test('shouldOperateSubmenuInDrawerOnMobile', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await loginAsAdmin(page);

  await page.getByRole('button', { name: messages.nav.openMenu }).click();
  await expect(leaveToggle(page)).toHaveAttribute('aria-expanded', 'false');
  await leaveToggle(page).click();
  await expect(submenuLink(page, t.tabCalendar)).toBeVisible();
  await shot(page, 'mobile-drawer-open');

  // 配下の画面を選ぶとドロワーが閉じ、開き直すと選択状態が残っている
  await submenuLink(page, t.tabCalendar).click();
  await expect(page).toHaveURL(/\/leaves\/calendar$/);
  await expect(page.getByRole('button', { name: messages.nav.openMenu })).toBeVisible();
  await page.getByRole('button', { name: messages.nav.openMenu }).click();
  await expect(leaveToggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(submenuLink(page, t.tabCalendar)).toHaveAttribute('aria-current', 'page');
  await shot(page, 'mobile-drawer-active');

  // 画面全体が横にあふれない
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
