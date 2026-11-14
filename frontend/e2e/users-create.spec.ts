import { expect, test } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_INITIAL_USER } from './accounts';
import { cleanupUsersData, loginAsAdmin, openUsersPage } from './users-helpers';

// 社員追加モーダル(1440)。自動採番の予定表示 → 初期パスワード入力 → 登録 → そのアカウントでログイン
const NAME = `E2E社員登録${Date.now()}`;
const INITIAL_PASSWORD = 'Temp1234';

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
  await page.getByRole('button', { name: '社員追加' }).click();
});

async function fillRequired(page: import('@playwright/test').Page, name: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: '社員追加' });
  await dialog.getByRole('textbox', { name: '社員名' }).fill(name);
  await dialog.getByRole('combobox', { name: '役職' }).selectOption({ index: 1 });
  await dialog.getByRole('textbox', { name: 'メールアドレス' }).fill(`${Date.now()}@example.com`);
  await dialog.getByRole('combobox', { name: '所属部署' }).selectOption({ index: 1 });
  await dialog.getByLabel('入社日').fill('2026-12-01');
  await dialog.getByLabel('初期パスワード').fill(INITIAL_PASSWORD);
}

test('shouldShowPredictedAutoEmpIdReadOnly', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: '社員追加' });
  await expect(dialog.getByRole('radio', { name: '自動生成' })).toBeChecked();
  await expect(dialog.getByRole('textbox', { name: '社員ID' })).toHaveCount(0);
});

test('shouldRegisterAndShowConfirmedIdAndAllowLoginWithInitialPassword', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: '社員追加' });
  await fillRequired(page, NAME);
  await dialog.getByRole('button', { name: '追加する' }).click();

  const toast = page.getByText(/社員（社員ID: \d+）を登録しました。/);
  await expect(toast).toBeVisible();
  const empId = (await toast.textContent())?.match(/社員ID: (\d+)/)?.[1] ?? '';
  expect(empId).not.toBe('');

  // 一覧は入社日・社員ID順のため、登録した社員は検索で絞り込んで確認する
  await page.getByRole('searchbox', { name: '社員検索' }).fill(NAME);
  await expect(page.getByRole('table', { name: '社員一覧' }).getByText(NAME).first()).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(empId);
  await page.getByLabel(messages.login.password).fill(INITIAL_PASSWORD);
  await page.getByRole('button', { name: messages.login.submit }).click();
  await expect(page).toHaveURL(/\/password/);
});

test('shouldShowRequiredMessagesOnEmptySubmit', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: '社員追加' });
  await dialog.getByRole('button', { name: '追加する' }).click();
  await expect(dialog.getByText('社員名を入力してください。')).toBeVisible();
  await expect(dialog.getByText('初期パスワードを入力してください。')).toBeVisible();
});

test('shouldShowDuplicateErrorInDirectEntryMode', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: '社員追加' });
  await dialog.getByRole('radio', { name: '直接入力' }).check();
  await dialog.getByRole('textbox', { name: '社員ID' }).fill(E2E_INITIAL_USER.empId);
  await fillRequired(page, NAME);
  await dialog.getByRole('button', { name: '追加する' }).click();
  await expect(dialog.getByText('この社員IDは既に使用されています。')).toBeVisible();
});

test('shouldShowPasswordPolicyMessage', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: '社員追加' });
  await dialog.getByLabel('初期パスワード').fill('abcdefgh');
  await dialog.getByRole('button', { name: '追加する' }).click();
  await expect(
    dialog.getByText('パスワードは8文字以上で、英字と数字を含めてください。'),
  ).toBeVisible();
});

test('shouldShowErrorWhenServerFailsAndSendOnlyOnceOnDoubleClick', async ({ page }) => {
  let postCount = 0;
  await page.route('**/api/v1/admin/users', async (route) => {
    if (route.request().method() === 'POST') {
      postCount += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'サーバーエラーです。' }),
      });
      return;
    }
    await route.continue();
  });

  const dialog = page.getByRole('dialog', { name: '社員追加' });
  await fillRequired(page, NAME);
  const submit = dialog.getByRole('button', { name: '追加する' });
  await submit.dblclick();
  await expect(page.getByText('サーバーエラーです。')).toBeVisible();
  expect(postCount).toBe(1);
});
