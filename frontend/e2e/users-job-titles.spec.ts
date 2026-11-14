import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  cleanupUsersData,
  createE2eUserThroughModal,
  loginAsAdmin,
  openUsersPage,
  searchUsersByKeyword,
} from './users-helpers';

// 役職確認モーダル(1440)。追加 → 編集(色変更) → 未使用なら削除 / 社員一覧のバッジ色に反映 / 使用中は削除不可
const TITLE = `E2E役職${Date.now()}`;
const COLOR_TITLE = `E2E役職色${Date.now()}`;
const COLOR_USER = `E2E社員色${Date.now()}`;
// 色は messages.jobTitles.tones と同じ tone 定義(緑 = success-30, 黄 = yellow-30 / globals.css)
const GREEN_BACKGROUND = 'rgb(230, 247, 238)';
const YELLOW_BACKGROUND = 'rgb(255, 246, 204)';

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

async function openJobTitlesModal(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: '役職確認' }).click();
  return page.getByRole('dialog', { name: '役職確認' });
}

async function closeJobTitlesModal(dialog: Locator): Promise<void> {
  // 右上の × は aria-label も「閉じる」のため、テキストのあるフッターのボタンを指定する
  await dialog.locator('button', { hasText: /^閉じる$/ }).click();
  await expect(dialog).toBeHidden();
}

test('shouldAddEditAndDeleteJobTitleThroughModal', async ({ page }) => {
  const dialog = await openJobTitlesModal(page);
  await expect(dialog.getByText(/登録されている役職（\d+件）/)).toBeVisible();

  await dialog.getByRole('button', { name: '追加' }).click();
  await dialog.getByRole('textbox', { name: '役職名' }).fill(TITLE);
  await dialog.getByRole('radio', { name: '緑' }).click();
  await expect(dialog.getByText(TITLE).last()).toBeVisible();
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('役職を追加しました。')).toBeVisible();

  await dialog.getByRole('button', { name: `${TITLE}を編集` }).click();
  await dialog.getByRole('radio', { name: '黄' }).click();
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('役職を更新しました。')).toBeVisible();

  // 社員に割り当てていない役職は削除できる(削除ボタン → 確認 → 一覧から消える)
  await dialog.getByRole('button', { name: `${TITLE}を削除` }).click();
  await dialog.getByRole('button', { name: '削除', exact: true }).click();
  await expect(page.getByText('役職を削除しました。')).toBeVisible();
  await expect(dialog.getByRole('button', { name: `${TITLE}を編集` })).toHaveCount(0);

  await closeJobTitlesModal(dialog);
});

test('shouldReflectJobTitleColorChangeInUserListBadge', async ({ page }) => {
  let dialog = await openJobTitlesModal(page);
  await dialog.getByRole('button', { name: '追加' }).click();
  await dialog.getByRole('textbox', { name: '役職名' }).fill(COLOR_TITLE);
  await dialog.getByRole('radio', { name: '緑' }).click();
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('役職を追加しました。')).toBeVisible();
  await closeJobTitlesModal(dialog);

  await createE2eUserThroughModal(page, COLOR_USER, COLOR_TITLE);
  await searchUsersByKeyword(page, COLOR_USER);
  const badge = page
    .getByRole('row')
    .filter({ hasText: COLOR_USER })
    .getByText(COLOR_TITLE, { exact: true });
  await expect(badge).toHaveCSS('background-color', GREEN_BACKGROUND);

  // 役職の色を変えると、閉じた後の社員一覧のバッジ色も変わる(役職は社員に紐づいたまま)
  dialog = await openJobTitlesModal(page);
  await dialog.getByRole('button', { name: `${COLOR_TITLE}を編集` }).click();
  await dialog.getByRole('radio', { name: '黄' }).click();
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('役職を更新しました。')).toBeVisible();
  await closeJobTitlesModal(dialog);

  await expect(badge).toHaveCSS('background-color', YELLOW_BACKGROUND);
});

test('shouldShowInUseNoticeWhenServerRejectsDelete', async ({ page }) => {
  // 使用中の役職の削除は API が 409 を返す。その表示を確認するため応答を差し替える
  await page.route('**/api/v1/admin/job-titles/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 409,
          code: 'JOB_TITLE_IN_USE',
          message: 'この役職を使用している社員が存在するため、削除できません。',
          details: [],
        }),
      });
      return;
    }
    await route.continue();
  });

  const dialog = await openJobTitlesModal(page);
  await dialog.getByRole('button', { name: /を削除$/ }).first().click();
  await dialog.getByRole('button', { name: '削除', exact: true }).click();
  await expect(
    dialog.getByText('この役職を使用している社員が存在するため、削除できません。'),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: '削除', exact: true })).toBeDisabled();
});
