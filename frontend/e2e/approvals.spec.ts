import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 実バックエンド・開発 DB と接続した休暇承認(SCR-005)の E2E。データは作らず表示と切り替えだけを確認する。
const t = messages.approvals;
const MISSING_ENV_MESSAGE =
  'E2E_ADMIN_PASSWORD と E2E_INITIAL_PASSWORD が必要です(backend の E2E アカウントを初期化するため)';

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

// 承認は休暇管理の「承認」タブから開く(サイドバーに承認メニューは無い)
async function openApprovalsFromLeaveTabs(page: Page): Promise<void> {
  await page.goto('/leaves');
  await page
    .getByRole('navigation', { name: messages.leaveManagement.tabsLabel })
    .getByRole('link', { name: messages.leaveManagement.tabApprovals })
    .click();
  await expect(page).toHaveURL(/\/leaves\/approvals$/);
}

test('shouldRedirectToLoginWithReturnPathWhenNotAuthenticated', async ({ page }) => {
  await page.goto('/leaves/approvals');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fleaves%2Fapprovals$/);
});

test('shouldShowApprovalsTabWithoutLoadError', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await openApprovalsFromLeaveTabs(page);

  await expect(
    page.getByRole('navigation', { name: messages.leaveManagement.tabsLabel }).getByRole('link', {
      name: messages.leaveManagement.tabApprovals,
    }),
  ).toHaveAttribute('aria-current', 'page');
  // サイドバーに「休暇承認」メニューが無いこと(「承認」の一致は承認待ち件数の文言でも起きるため語句を固定する)
  await expect(page.getByRole('navigation', { name: messages.nav.mainLabel })).not.toContainText(
    '休暇承認',
  );
  await expect(page.getByText(messages.common.loadError)).toHaveCount(0);
});

test('shouldSwitchBetweenMineAndAllScopeForAdmin', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await openApprovalsFromLeaveTabs(page);
  await expect(page.getByRole('tab', { name: t.scopeMine })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.getByRole('tab', { name: t.scopeAll }).click();
  await expect(page).toHaveURL(/\/leaves\/approvals\?scope=all$/);
  await expect(page.getByRole('tab', { name: t.scopeAll })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('shouldKeepAllScopeSelectedAfterReload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.goto('/leaves/approvals?scope=all');

  await expect(page.getByRole('tab', { name: t.scopeAll })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.reload();
  await expect(page).toHaveURL(/\/leaves\/approvals\?scope=all$/);
  await expect(page.getByRole('tab', { name: t.scopeAll })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('shouldShowListOrEmptyWithoutHorizontalScrollOnNarrowViewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await loginAsAdmin(page);
  await page.goto('/leaves/approvals');

  // 表は md 未満で非表示、カード一覧か Empty のどちらかが見える
  await expect(page.getByRole('table')).toBeHidden();
  const cards = page.locator('ul.md\\:hidden > li');
  const emptyMessages = page.getByText(new RegExp(`${t.emptyMine}|${t.emptyAll}`));
  await expect(cards.first().or(emptyMessages)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
