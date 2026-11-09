import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN, E2E_INITIAL_USER } from './accounts';

// 実バックエンド・開発 DB と接続した勤怠の E2E。
// 出勤は開発 DB で 1 日 1 回しか登録できないため、出勤済みなら出勤操作を飛ばす。
// E-02 は当日の記録に退勤を入れた後、退勤時刻を空欄に戻して次回実行の E-01 の前提(勤務中)を保つ。
// E-03 は初回ログイン用の 900002 のパスワードを変更するため、終了後に backend の E2E 初期化で元に戻す。
const t = messages.attendance;
const dashboard = messages.dashboard.attendance;
const adminAttendance = messages.adminAttendance;
const ADMIN_NAME = 'E2E管理者';
const MISSING_ENV_MESSAGE =
  'E2E_ADMIN_PASSWORD と E2E_INITIAL_PASSWORD が必要です(backend の E2E アカウントを初期化するため)';

test.beforeEach(() => {
  expect(E2E_ADMIN.password, MISSING_ENV_MESSAGE).not.toBe('');
});

// 東京の今日 'YYYY-MM-DD'(勤務日の基準)
function tokyoToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(E2E_ADMIN.empId);
  await page.getByLabel(messages.login.password).fill(E2E_ADMIN.password);
  const loginResponse = page.waitForResponse('**/api/v1/auth/login');
  await page.getByRole('button', { name: messages.login.submit }).click();
  const body = (await (await loginResponse).json()) as { user: { mustChangePassword: boolean } };
  expect(body.user.mustChangePassword, 'E2E 管理者はパスワード変更不要の状態であること').toBe(
    false,
  );
  await expect(page).toHaveURL(/\/dashboard$/);
}

// 管理者の全体勤怠を、E2E 管理者の今日の記録だけに絞って開く
async function gotoTodayAdminList(page: Page, today: string): Promise<void> {
  const params = new URLSearchParams({ name: ADMIN_NAME, startDate: today, endDate: today });
  await page.goto(`/admin/attendance?${params.toString()}`);
}

// 今日の記録の修正モーダルで退勤時刻を設定し、確認を経て保存する
async function saveClockOut(page: Page, clockOut: string): Promise<void> {
  await page.getByRole('button', { name: /の勤怠を修正$/ }).click();
  const modal = page.getByRole('dialog', { name: adminAttendance.modal.title });
  await modal.locator('#attendance-edit-clock-out').fill(clockOut);
  await modal.getByRole('button', { name: adminAttendance.modal.save, exact: true }).click();
  await modal.getByRole('button', { name: adminAttendance.modal.submit, exact: true }).click();
  await expect(page.getByText(adminAttendance.modal.success)).toBeVisible();
}

test('shouldShowTodayClockInAsWorkingOnAttendancePage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);

  // 出勤済みなら出勤ボタンは disabled になる(非表示にはならない)ため、有効かどうかで登録を判断する
  const clockIn = page.getByRole('button', { name: dashboard.clockIn, exact: true });
  if (await clockIn.isEnabled()) {
    await clockIn.click();
    const dialog = page.getByRole('dialog', { name: dashboard.confirmClockInTitle });
    await dialog.getByRole('button', { name: dashboard.confirm, exact: true }).click();
    await expect(page.getByText(dashboard.clockedIn)).toBeVisible();
  }
  await expect(page.getByRole('button', { name: dashboard.clockOut, exact: true })).toBeVisible();

  await page.goto('/attendance');
  await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: t.statuses.WORKING })).toHaveCount(1);
});

test('shouldEditTodayClockOutFromAdminAttendanceAndRestoreIt', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  const today = tokyoToday();
  // 保存を試みた後は、途中で失敗しても必ず退勤時刻を空欄に戻す(次回実行の E-01 の前提を守るため)
  let clockOutSaveAttempted = false;

  try {
    await gotoTodayAdminList(page, today);
    await expect(page.getByRole('button', { name: /の勤怠を修正$/ })).toHaveCount(1);
    clockOutSaveAttempted = true;
    await saveClockOut(page, `${today}T23:59`);
    await expect(page.getByRole('row').filter({ hasText: t.statuses.DONE })).toHaveCount(1);
  } finally {
    if (clockOutSaveAttempted) {
      await gotoTodayAdminList(page, today);
      await saveClockOut(page, '');
      await expect(page.getByRole('row').filter({ hasText: t.statuses.WORKING })).toHaveCount(1);
    }
  }
});

test.describe('一般社員の管理者画面アクセス', () => {
  test.beforeEach(() => {
    expect(E2E_INITIAL_USER.password, MISSING_ENV_MESSAGE).not.toBe('');
  });

  // 900002 は最初のログインでパスワード変更が必要なため、変更してから確かめる。
  // 変更後の状態を残さないよう、終了後に E2E アカウントを初期化する(password.spec が元のパスワードを前提にするため)
  test.afterAll(() => {
    execSync('npm run db:e2e-accounts', {
      cwd: path.resolve(__dirname, '../../backend'),
      stdio: 'inherit',
      env: process.env,
    });
  });

  test('shouldRedirectEmployeeToDashboardWithForbiddenToastWhenOpeningAdminAttendance', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const newPassword = `Pw1${randomUUID().replaceAll('-', '').slice(0, 16)}`;

    await page.goto('/login');
    await page.getByLabel(messages.login.empId).fill(E2E_INITIAL_USER.empId);
    await page.getByLabel(messages.login.password).fill(E2E_INITIAL_USER.password);
    await page.getByRole('button', { name: messages.login.submit }).click();

    // 初回ログインのためパスワード変更画面へ移る
    await expect(page).toHaveURL(/\/password$/);
    await page
      .getByLabel(messages.password.currentPassword, { exact: true })
      .fill(E2E_INITIAL_USER.password);
    await page.getByLabel(messages.password.newPassword, { exact: true }).fill(newPassword);
    await page.getByLabel(messages.password.confirmPassword, { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: messages.password.submit }).click();
    await expect(page.getByText(messages.password.success)).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);

    // 一般社員が管理者画面を直接開くと、ダッシュボードへ戻されて権限エラーの通知が出る
    await page.goto('/admin/attendance');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(messages.common.forbidden)).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: adminAttendance.title }),
    ).toHaveCount(0);
  });
});
