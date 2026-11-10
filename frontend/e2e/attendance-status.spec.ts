import { execSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 勤怠管理(SCR-003)の状態ボタンの E2E。実バックエンド・開発 DB と接続し、すべての状態ボタンについて
// 「押した時点で、その状態の記録だけが一覧に出る」ことを確かめる。
// 開始時に backend の db:e2e-attendance-fixture で E2E 管理者(900001)の勤怠を次の内容に入れ替え、終了時に削除する。
// backend/prisma/e2e-account-data.ts の E2E_ATTENDANCE_FIXTURE と同じ並びを前提にする。
//   今日: 勤務中 / 1・3 日前: 退勤漏れ / 2・4 日前: 退勤済み / 40 日前: 退勤済み(照会期間の外)
const t = messages.attendance;
const MISSING_ENV_MESSAGE = 'E2E_ADMIN_PASSWORD が必要です(E2E 管理者でログインするため)';
const PERIOD_DAYS = 10;

type Status = keyof typeof t.statuses;

// 一覧に出るはずの記録(新しい順)。daysAgo は東京の今日から何日前か
const WORKING_ROWS: Row[] = [{ daysAgo: 0, status: 'WORKING' }];
const DONE_ROWS: Row[] = [
  { daysAgo: 2, status: 'DONE' },
  { daysAgo: 4, status: 'DONE' },
];
const MISSING_ROWS: Row[] = [
  { daysAgo: 1, status: 'MISSING_CLOCK_OUT' },
  { daysAgo: 3, status: 'MISSING_CLOCK_OUT' },
];
const ALL_ROWS: Row[] = [...WORKING_ROWS, ...MISSING_ROWS, ...DONE_ROWS].sort(
  (a, b) => a.daysAgo - b.daysAgo,
);

interface Row {
  daysAgo: number;
  status: Status;
}

function runBackendScript(script: string): void {
  // PLAYWRIGHT_BASE_URL 指定時は対象環境が別の DB のため、ローカル DB を触らない(global-setup と同じ条件)
  if (process.env.PLAYWRIGHT_BASE_URL) return;
  execSync(`npm run ${script}`, {
    cwd: path.resolve(__dirname, '../../backend'),
    stdio: 'inherit',
    env: process.env,
  });
}

test.beforeAll(() => {
  expect(E2E_ADMIN.password, MISSING_ENV_MESSAGE).not.toBe('');
  runBackendScript('db:e2e-attendance-fixture');
});

test.afterAll(() => {
  runBackendScript('db:e2e-attendance-reset');
});

test.beforeEach(() => {
  expect(E2E_ADMIN.password, MISSING_ENV_MESSAGE).not.toBe('');
});

// 東京の今日から n 日前の 'YYYY-MM-DD'
function tokyoDate(daysAgo: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const time = new Date(`${today}T00:00:00Z`).getTime() - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(time).toISOString().slice(0, 10);
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(E2E_ADMIN.empId);
  await page.getByLabel(messages.login.password).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: messages.login.submit }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

// 照会期間(10 日前〜今日)で勤怠管理を開く。40 日前の記録は期間の外
async function openAttendance(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  const params = new URLSearchParams({
    startDate: tokyoDate(PERIOD_DAYS),
    endDate: tokyoDate(0),
  });
  await page.goto(`/attendance?${params.toString()}`);
  await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
  // 条件なしで 5 件(期間内の全記録)が出てから操作する
  await expectRows(page, ALL_ROWS);
}

function statusButton(page: Page, status: Status) {
  return page
    .getByRole('group', { name: t.status })
    .getByRole('button', { name: t.statuses[status] });
}

// 状態ボタンを押し、その絞り込みの API 応答(status と照会期間が正しく付いたもの)を待つ
async function pressStatus(page: Page, status: Status, expectedQuery: string): Promise<void> {
  const response = page.waitForResponse((res) => {
    const url = new URL(res.url());
    return (
      url.pathname === '/api/v1/attendance' &&
      url.searchParams.get('status') === expectedQuery &&
      url.searchParams.get('startDate') === tokyoDate(PERIOD_DAYS) &&
      url.searchParams.get('endDate') === tokyoDate(0)
    );
  });
  await statusButton(page, status).click();
  expect((await response).ok()).toBe(true);
}

// 一覧(表)の行が、期待した勤務日・状態の並びと完全に一致することを確かめる
async function expectRows(page: Page, expected: Row[]): Promise<void> {
  const rows = page.getByRole('table').locator('tbody tr');
  await expect(rows).toHaveCount(expected.length);
  for (const [index, { daysAgo, status }] of expected.entries()) {
    const row = rows.nth(index);
    await expect(row.locator('td').nth(0)).toContainText(tokyoDate(daysAgo).replaceAll('-', '/'));
    await expect(row.locator('td').nth(4)).toHaveText(t.statuses[status]);
  }
}

test('shouldShowOnlyWorkingRecordsWhenWorkingButtonPressed', async ({ page }) => {
  await openAttendance(page);

  await pressStatus(page, 'WORKING', 'WORKING');

  await expect(statusButton(page, 'WORKING')).toHaveAttribute('aria-pressed', 'true');
  await expectRows(page, WORKING_ROWS);
  // 退勤済み・退勤漏れの行は 1 件も出ない
  await expect(page.getByRole('table').getByText(t.statuses.DONE)).toHaveCount(0);
  await expect(page.getByRole('table').getByText(t.statuses.MISSING_CLOCK_OUT)).toHaveCount(0);
});

test('shouldShowOnlyDoneRecordsWhenDoneButtonPressed', async ({ page }) => {
  await openAttendance(page);

  await pressStatus(page, 'DONE', 'DONE');

  await expect(statusButton(page, 'DONE')).toHaveAttribute('aria-pressed', 'true');
  // 期間の外にある 40 日前の退勤済みは出ない(2 件のみ)
  await expectRows(page, DONE_ROWS);
  await expect(page.getByRole('table').getByText(t.statuses.WORKING)).toHaveCount(0);
  await expect(page.getByRole('table').getByText(t.statuses.MISSING_CLOCK_OUT)).toHaveCount(0);
});

test('shouldShowOnlyMissingClockOutRecordsWhenMissingButtonPressed', async ({ page }) => {
  await openAttendance(page);

  await pressStatus(page, 'MISSING_CLOCK_OUT', 'MISSING_CLOCK_OUT');

  await expect(statusButton(page, 'MISSING_CLOCK_OUT')).toHaveAttribute('aria-pressed', 'true');
  await expectRows(page, MISSING_ROWS);
  await expect(page.getByRole('table').getByText(t.statuses.WORKING)).toHaveCount(0);
  await expect(page.getByRole('table').getByText(t.statuses.DONE)).toHaveCount(0);
});

test('shouldShowRecordsOfAnySelectedStatusWhenMultipleButtonsPressed', async ({ page }) => {
  await openAttendance(page);

  await pressStatus(page, 'MISSING_CLOCK_OUT', 'MISSING_CLOCK_OUT');
  await pressStatus(page, 'DONE', 'DONE,MISSING_CLOCK_OUT');
  await expectRows(
    page,
    [...MISSING_ROWS, ...DONE_ROWS].sort((a, b) => a.daysAgo - b.daysAgo),
  );
  await expect(page.getByRole('table').getByText(t.statuses.WORKING)).toHaveCount(0);

  await pressStatus(page, 'WORKING', 'WORKING,DONE,MISSING_CLOCK_OUT');
  await expectRows(page, ALL_ROWS);
});

test('shouldShowAllRecordsAgainWhenSelectedButtonPressedAgain', async ({ page }) => {
  await openAttendance(page);
  await pressStatus(page, 'WORKING', 'WORKING');
  await expectRows(page, WORKING_ROWS);

  // 選択を解除すると、条件なし(期間内の全記録)に戻る
  const response = page.waitForResponse((res) => {
    const url = new URL(res.url());
    return url.pathname === '/api/v1/attendance' && !url.searchParams.has('status');
  });
  await statusButton(page, 'WORKING').click();
  expect((await response).ok()).toBe(true);

  await expect(statusButton(page, 'WORKING')).toHaveAttribute('aria-pressed', 'false');
  await expectRows(page, ALL_ROWS);
});

test('shouldKeepSelectedStatusAfterReload', async ({ page }) => {
  await openAttendance(page);
  await pressStatus(page, 'DONE', 'DONE');
  await expectRows(page, DONE_ROWS);

  await page.reload();

  await expect(statusButton(page, 'DONE')).toHaveAttribute('aria-pressed', 'true');
  await expectRows(page, DONE_ROWS);
});
