import { execSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 実バックエンド・開発 DB と接続した休暇管理(SCR-004)の E2E。
// 開始時に E2E 管理者(900001)が申請者の休暇だけを backend で削除し、前回実行の申請と重複しないようにする。
// E2E 管理者は承認不要のため、申請は即時承認になる。控除のない特別休暇を使い、残日数に依存しない。
const t = messages.leaves;
const MISSING_ENV_MESSAGE =
  'E2E_ADMIN_PASSWORD と E2E_INITIAL_PASSWORD が必要です(backend の E2E アカウントを初期化するため)';

test.beforeAll(() => {
  expect(E2E_ADMIN.password, MISSING_ENV_MESSAGE).not.toBe('');
  // PLAYWRIGHT_BASE_URL 指定時は対象環境が別の DB のため、ローカル DB を触らない(global-setup と同じ条件)
  if (process.env.PLAYWRIGHT_BASE_URL) return;
  execSync('npm run db:e2e-leaves-reset', {
    cwd: path.resolve(__dirname, '../../backend'),
    stdio: 'inherit',
    env: process.env,
  });
});

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

// 来年 3 月の最初の月曜(常に未来の平日。履歴の年の選択肢にも含まれる)
function nextYearMonday(): { year: number; ymd: string } {
  const year = new Date().getFullYear() + 1;
  const date = new Date(Date.UTC(year, 2, 1));
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);
  return { year, ymd: date.toISOString().slice(0, 10) };
}

test('shouldRedirectToLoginWithReturnPathWhenNotAuthenticated', async ({ page }) => {
  await page.goto('/leaves');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fleaves$/);
});

test('shouldShowSummaryAndHistoryWithoutLoadError', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.goto('/leaves');

  await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
  await expect(page.getByText(t.remaining)).toBeVisible();
  await expect(page.getByRole('tab', { name: t.tabHistory })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(messages.common.loadError)).toHaveCount(0);
});

test('shouldApplyLeaveAutoApprovedThenCancelFromDetail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.goto('/leaves?tab=apply');

  const { year, ymd } = nextYearMonday();
  await expect(page.getByText(t.apply.autoApprove)).toBeVisible();
  await page.getByLabel(t.apply.leaveType).selectOption('SPECIAL');
  await page.getByLabel(t.apply.startDate).fill(ymd);
  await page.getByLabel(t.apply.endDate).fill(ymd);
  await page.getByLabel(t.apply.reason).fill('E2E 休暇申請');
  await page.getByRole('button', { name: t.apply.submit }).click();

  await expect(page.getByText(t.apply.approvedSuccess)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/leaves\\?year=${year}$`));
  const row = page.getByRole('row', { name: new RegExp(ymd.replaceAll('-', '/')) });
  await expect(row).toContainText(messages.leave.detail.autoApproved);
  await expect(row).toContainText(messages.leave.statuses.APPROVED);

  await row.getByRole('button', { name: t.history.detail }).click();
  const dialog = page.getByRole('dialog', { name: messages.leave.detail.title });
  await dialog.getByRole('button', { name: messages.leave.detail.cancel }).click();
  await page
    .getByRole('dialog', { name: messages.leave.cancel.title })
    .getByRole('button', { name: messages.leave.cancel.submit })
    .click();

  await expect(page.getByText(messages.leave.cancel.success)).toBeVisible();
  await expect(row).toContainText(messages.leave.statuses.CANCELLED);
});

test('shouldOpenApplyTabFromDashboardButton', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);

  await page.getByRole('link', { name: messages.dashboard.leave.apply }).click();
  await expect(page).toHaveURL(/\/leaves\?tab=apply$/);
  await expect(page.getByLabel(t.apply.leaveType)).toBeVisible();
});

test('shouldShowLeaveConflictToastWhenSameDateAppliedAgain', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  // 1 回目と同じ期間を 2 回目に申請する。1 回目の取消済み申請とは重ならない別日を使う
  const { ymd } = nextYearMonday();
  const tuesday = new Date(`${ymd}T00:00:00Z`);
  tuesday.setUTCDate(tuesday.getUTCDate() + 1);
  const day = tuesday.toISOString().slice(0, 10);

  const apply = async (): Promise<void> => {
    await page.goto('/leaves?tab=apply');
    await page.getByLabel(t.apply.leaveType).selectOption('SPECIAL');
    await page.getByLabel(t.apply.startDate).fill(day);
    await page.getByLabel(t.apply.endDate).fill(day);
    await page.getByLabel(t.apply.reason).fill('E2E 重複申請');
    await page.getByRole('button', { name: t.apply.submit }).click();
  };

  await apply();
  await expect(page.getByText(t.apply.approvedSuccess)).toBeVisible();

  await apply();
  // サーバーの LEAVE_CONFLICT メッセージ(ja.ts に無いため部分一致で確認する)
  await expect(page.getByText(/すでに申請された休暇/)).toBeVisible();
});

test('shouldNotOverflowHorizontallyAtNarrowWidth', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginAsAdmin(page);

  for (const path of ['/leaves', '/leaves?tab=apply']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} で横スクロールが発生`).toBeLessThanOrEqual(0);
  }
});

test('shouldShowValidationErrorsWhenSubmittingEmptyForm', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginAsAdmin(page);
  await page.goto('/leaves?tab=apply');

  await page.getByRole('button', { name: t.apply.submit }).click();
  await expect(page.getByText(t.apply.validation.leaveType)).toBeVisible();
  await expect(page.getByText(t.apply.validation.period)).toBeVisible();
  await expect(page.getByText(t.apply.validation.reasonRequired)).toBeVisible();
});
