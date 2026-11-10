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

async function openApprovalsFromSidebar(page: Page): Promise<void> {
  await page
    .getByRole('navigation', { name: messages.nav.mainLabel })
    .getByRole('link', {
      name: new RegExp(messages.nav.approvals),
    })
    .click();
  await expect(page).toHaveURL(/\/leaves\/approvals$/);
}

test('shouldRedirectToLoginWithReturnPathWhenNotAuthenticated', async ({ page }) => {
  await page.goto('/leaves/approvals');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fleaves%2Fapprovals$/);
});

test('shouldShowApprovalsPageFromSidebarWithoutLoadError', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await openApprovalsFromSidebar(page);

  await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: messages.nav.mainLabel }).getByRole('link', {
      name: new RegExp(messages.nav.approvals),
    }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText(messages.common.loadError)).toHaveCount(0);
});

test('shouldSwitchBetweenMineAndAllScopeForAdmin', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await openApprovalsFromSidebar(page);
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
