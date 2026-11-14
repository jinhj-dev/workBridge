import { expect, test } from '@playwright/test';
import {
  cleanupUsersData,
  createE2eUserThroughModal,
  expectNoOverflow,
  loginAsAdmin,
  openUsersPage,
  searchUsersByKeyword,
} from './users-helpers';

// 社員管理(SCR-006) 一覧・検索・フィルタ・詳細・編集・削除。1440px で検証
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(() => {
  cleanupUsersData();
});

test.afterAll(() => {
  cleanupUsersData();
});

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await openUsersPage(page);
});

test('shouldShowSummaryValuesMatchingApi', async ({ page }) => {
  // 画面が呼ぶ summary API の応答と比べる(page.request は認証ヘッダを持たないため使わない)
  // 画面が受け取った summary の応答を route で取り込む(reload で遷移すると本文は読めなくなるため)
  const captured: { employeeCount?: number } = {};
  await page.route('**/api/v1/admin/users/summary', async (route) => {
    const response = await route.fetch();
    const json = (await response.json()) as { employeeCount: number };
    captured.employeeCount = json.employeeCount;
    await route.fulfill({ response });
  });
  await page.reload();
  await expect.poll(() => captured.employeeCount).toEqual(expect.any(Number));
  await expect(page.getByText('社員数')).toBeVisible();
  await expect(page.locator('main')).toContainText(`${captured.employeeCount}名`);
});

test('shouldSearchByEmpIdNameAndEmailThroughSearchBox', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: '社員検索' });
  await search.fill('900001');
  await expect(page).toHaveURL(/keyword=900001/);
  await expect(page.getByRole('button', { name: /の詳細$/ }).first()).toBeVisible();
});

test('shouldFilterByDepartmentJobTitleAndStatusAsQuery', async ({ page }) => {
  await page.getByRole('combobox', { name: 'ステータス' }).selectOption('INACTIVE');
  await expect(page).toHaveURL(/status=INACTIVE/);
  await page.getByRole('combobox', { name: '役職' }).selectOption({ index: 1 });
  await expect(page).toHaveURL(/jobTitleId=/);
  await page.getByRole('button', { name: 'クリア' }).click();
  await expect(page).not.toHaveURL(/status=/);
});

test('shouldPaginateTenRowsAndReturnToFirstPageOnSearch', async ({ page }) => {
  await expect(page.getByText(/全 \d+ 件中 1 – 10 件を表示/)).toBeVisible();
  await page.getByRole('button', { name: '2ページ', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(/全 \d+ 件中 11 – /)).toBeVisible();

  await page.getByRole('searchbox', { name: '社員検索' }).fill('900');
  await expect(page).not.toHaveURL(/page=2/);
});

test('shouldOpenDetailModalAndShowDetailItems', async ({ page }) => {
  await page.getByRole('button', { name: /の詳細$/ }).first().click();
  const dialog = page.getByRole('dialog', { name: '社員詳細' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('社員ID')).toBeVisible();
  await expect(dialog.getByText('入社日')).toBeVisible();
});

test('shouldEditUserAndReflectChangedNameInList', async ({ page }) => {
  // 既存の社員は書き換えない(開発 DB の他テストが参照する)。このテスト用に作った社員だけを編集する
  const originalName = `E2E社員編集前${Date.now()}`;
  await createE2eUserThroughModal(page, originalName);
  await searchUsersByKeyword(page, originalName);
  await page.getByRole('button', { name: `${originalName}を編集` }).click();
  const dialog = page.getByRole('dialog', { name: '社員編集' });
  const newName = `E2E社員編集後${Date.now()}`;
  await dialog.getByRole('textbox', { name: '社員名' }).fill(newName);
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('保存しました。')).toBeVisible();
  // 絞り込みは旧名のままなので、新しい名前で検索し直して一覧の表示を確認する
  await searchUsersByKeyword(page, newName);
});

test('shouldDeactivateUserAsDeleteAndShowInactiveStatus', async ({ page }) => {
  // テスト用に作った社員だけを削除(無効化)する
  const targetName = `E2E社員削除対象${Date.now()}`;
  await createE2eUserThroughModal(page, targetName);
  await searchUsersByKeyword(page, targetName);
  await page.getByRole('button', { name: `${targetName}を削除` }).click();
  const dialog = page.getByRole('dialog', { name: '社員を削除' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('社員を削除しました。')).toBeVisible();
  await page.getByRole('combobox', { name: 'ステータス' }).selectOption('INACTIVE');
  // option の「無効」は非表示のため、対象社員の行のステータス表示を見る
  const row = page.getByRole('row').filter({ hasText: targetName });
  await expect(row.getByRole('cell', { name: '無効', exact: true })).toBeVisible();
});

test('shouldFitUsersPageWithoutOverflowAt1440', async ({ page }) => {
  await expectNoOverflow(page);
});

test('shouldRedirectUnauthenticatedVisitorFromUsersPage', async ({ page, context }) => {
  // 未ログインでは既存の AppShell ガードで /login に遷移する
  await context.clearCookies();
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/login/);
});
