// 社員管理 E2E(users*.spec.ts)の共通処理。開発 DB を使うため、生成データは E2E 接頭辞で識別し後始末する
import { execSync } from 'node:child_process';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 生成データの名前接頭辞(backend/prisma/e2e-users-cleanup.ts が同じ接頭辞で物理削除する)
export const E2E_USER_PREFIX = 'E2E社員';
export const E2E_JOB_TITLE_PREFIX = 'E2E役職';

const BACKEND_DIR = path.resolve(__dirname, '../../backend');

export function cleanupUsersData(): void {
  // 開発 DB 専用・localhost のみ(スクリプト側で production を拒否する)
  execSync('npm run db:e2e-users-cleanup', { cwd: BACKEND_DIR, stdio: 'inherit' });
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(E2E_ADMIN.empId);
  await page.getByLabel(messages.login.password).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: messages.login.submit }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function openUsersPage(page: Page): Promise<void> {
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: '社員管理' })).toBeVisible();
}

// 社員追加モーダルから E2E 社員を 1 人作る。編集・削除のテストは既存の社員(開発 DB のサンプル)に触れず、この社員だけを対象にする
// jobTitleName を省略すると役職は先頭の選択肢(サンプル役職)を使う
export async function createE2eUserThroughModal(
  page: Page,
  name: string,
  jobTitleName?: string,
): Promise<void> {
  await page.getByRole('button', { name: '社員追加' }).click();
  const dialog = page.getByRole('dialog', { name: '社員追加' });
  await dialog.getByRole('textbox', { name: '社員名' }).fill(name);
  const jobTitleSelect = dialog.getByRole('combobox', { name: '役職' });
  if (jobTitleName) await jobTitleSelect.selectOption({ label: jobTitleName });
  else await jobTitleSelect.selectOption({ index: 1 });
  await dialog.getByRole('textbox', { name: 'メールアドレス' }).fill(`${Date.now()}@example.com`);
  await dialog.getByRole('combobox', { name: '所属部署' }).selectOption({ index: 1 });
  await dialog.getByLabel('入社日').fill('2026-12-01');
  await dialog.getByLabel('初期パスワード').fill('Temp1234');
  await dialog.getByRole('button', { name: '追加する' }).click();
  await expect(page.getByText(/社員（社員ID: \d+）を登録しました。/)).toBeVisible();
  await expect(dialog).toBeHidden();
}

// 一覧を名前で絞り込み、その社員の行だけを対象にする
export async function searchUsersByKeyword(page: Page, keyword: string): Promise<void> {
  await page.getByRole('searchbox', { name: '社員検索' }).fill(keyword);
  await expect(page.getByRole('button', { name: `${keyword}を編集` })).toBeVisible();
}

// 横スクロールがなく、表示中のボタン・リンクがビューポート内に収まっているか
export async function expectNoOverflow(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const horizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
    const outside = Array.from(document.querySelectorAll('button, a[href]'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
      })
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.left < -1 || rect.right > window.innerWidth + 1;
      })
      .map((el) => (el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30));
    return { horizontalScroll, outside };
  });
  expect(result.horizontalScroll, '横スクロールが発生している').toBe(false);
  expect(result.outside, '画面外にはみ出したボタン').toEqual([]);
}
