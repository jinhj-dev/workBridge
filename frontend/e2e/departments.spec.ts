import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 実バックエンド・開発 DB と接続した部署管理(SCR-010)の E2E。
// 開発 DB に部署コード対応のマイグレーションが適用済みであることが前提。
// 作成した部署は同じテストの中で削除し、データを残さない。
const t = messages.departments;
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

test('shouldRedirectToLoginWithReturnPathWhenNotAuthenticated', async ({ page }) => {
  await page.goto('/admin/departments');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin%2Fdepartments$/);
});

test('shouldOpenFromSidebarAndShowSystemDepartmentWithoutActions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page
    .getByRole('navigation', { name: messages.nav.mainLabel })
    .getByRole('link', { name: messages.nav.adminDepartments })
    .click();
  await expect(page).toHaveURL(/\/admin\/departments$/);
  await expect(page.getByRole('heading', { name: t.title })).toBeVisible();

  const systemRow = page.getByRole('row').filter({ hasText: 'UNASSIGNED' });
  await expect(systemRow.getByText(t.system)).toBeVisible();
  // 未所属は詳細と所属社員の確認のみ(編集・削除は出ない)
  await expect(systemRow.getByRole('button', { name: t.edit })).toHaveCount(0);
  await expect(systemRow.getByRole('button', { name: t.delete })).toHaveCount(0);
  await expect(systemRow.getByRole('button', { name: /所属社員を確認/ })).toBeVisible();
});

test('shouldCreateEditAndDeleteDepartment', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.goto('/admin/departments');

  const code = `E2E${Date.now().toString().slice(-8)}`;
  const name = `E2E部署${code}`;
  const renamed = `${name}改`;

  await page.getByRole('button', { name: t.create }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(t.code).fill(code);
  await dialog.getByLabel(t.name).fill(name);
  await dialog.getByRole('button', { name: t.form.create }).click();
  await expect(page.getByText(t.form.created)).toBeVisible();

  await page.getByPlaceholder(t.searchPlaceholder).fill(name);
  await expect(page).toHaveURL(/name=/);
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByText(t.members(0))).toBeVisible();

  await row.getByRole('button', { name: t.edit }).click();
  await dialog.getByLabel(t.name).fill(renamed);
  await dialog.getByRole('button', { name: t.form.save }).click();
  await expect(page.getByText(t.form.updated)).toBeVisible();

  const renamedRow = page.getByRole('row').filter({ hasText: renamed });
  await renamedRow.getByRole('button', { name: t.delete }).click();
  await expect(dialog.getByText(t.deleteModal.confirm(renamed))).toBeVisible();
  await dialog.getByRole('button', { name: t.deleteModal.submit }).click();
  await expect(page.getByText(t.deleteModal.success)).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: renamed })).toHaveCount(0);
});

test('shouldShowErrorToastAndKeepRowWhenDeletingDepartmentWithActiveMembers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  // seed で作る総務部(GA)には有効な初期 ADMIN が所属する
  await page.goto('/admin/departments');

  const row = page.getByRole('row').filter({ hasText: 'GA' }).first();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: t.delete }).click();
  await expect(page.getByText(t.hasMembers)).toBeVisible();
  await expect(page.getByRole('dialog', { name: t.deleteModal.title })).toBeHidden();
  await expect(row).toBeVisible();
});

test('shouldSortSelectAndShowMembersOfDepartment', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.goto('/admin/departments');

  await page.getByRole('button', { name: t.sort.columnLabel(t.memberCount) }).click();
  await expect(page).toHaveURL(/sort=memberCount&order=desc/);

  // 下部の「選択中の部署情報」は無い
  await expect(page.getByRole('region', { name: '選択中の部署情報' })).toHaveCount(0);

  await page
    .getByRole('button', { name: /所属社員を確認/ })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: t.membersModal.close }).last().click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('button', { name: t.clear }).click();
  await expect(page).toHaveURL(/\/admin\/departments$/);
});

test('shouldCaptureDepartmentsScreenshotsOnDesktopAndMobile', async ({ page }) => {
  await loginAsAdmin(page);
  for (const [label, size] of [
    ['1440', { width: 1440, height: 1000 }],
    ['375', { width: 375, height: 900 }],
  ] as const) {
    await page.setViewportSize(size);
    await page.goto('/admin/departments');
    await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
    await page.screenshot({
      path: `../.claude/work/department-redesign/screenshots/departments-${label}.png`,
      fullPage: true,
    });
  }
});
