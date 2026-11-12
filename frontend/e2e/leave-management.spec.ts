import { execSync } from 'node:child_process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN, E2E_INITIAL_USER } from './accounts';

// 休暇管理(SCR-004 自分の休暇・休暇カレンダー、SCR-005 承認タブ)の業務フロー E2E。実バックエンド・開発 DB と接続する。
// 開始時に 900001 の休暇を削除し、休暇カレンダーの固定月(2026-11)のサンプルを入れ替える(PLAYWRIGHT_BASE_URL 指定時は触らない)。
const t = messages.leaveManagement;
const MISSING_ENV_MESSAGE =
  'E2E_ADMIN_PASSWORD と E2E_INITIAL_PASSWORD が必要です(backend の E2E アカウントを初期化するため)';
const E2E_MONTH = '2026-11';
const MONTH_LABEL = messages.calendar.monthLabel(2026, 11);
const CALENDAR_TAB = t.tabCalendar;
// 픽스처: 10001 は 11/12 に承認済み休暇、10008・10009・10010 は PENDING・REJECTED・CANCELLED のみ
const APPROVED_EMP_ID = '10001';
const NON_VISIBLE_EMP_IDS = ['10008', '10009', '10010'];
// 管理者の特別休暇(即時承認)。固定月の平日
const SELF_LEAVE_DATE = '2026-11-25';
const SELF_LEAVE_REASON = 'E2E 休暇管理 特別休暇';
const SELF_EMP_ID = E2E_ADMIN.empId;
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

test.beforeAll(() => {
  expect(E2E_ADMIN.password, MISSING_ENV_MESSAGE).not.toBe('');
  // PLAYWRIGHT_BASE_URL 指定時は対象環境が別の DB のため、ローカル DB を触らない(global-setup と同じ条件)
  if (process.env.PLAYWRIGHT_BASE_URL) return;
  const cwd = path.resolve(__dirname, '../../backend');
  execSync('npm run db:e2e-leaves-reset', { cwd, stdio: 'inherit', env: process.env });
  execSync(`npm run db:e2e-leave-calendar-fixture -- --month=${E2E_MONTH}`, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
});

test.beforeEach(() => {
  expect(E2E_ADMIN.password, MISSING_ENV_MESSAGE).not.toBe('');
});

async function loginAs(page: Page, empId: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(empId);
  await page.getByLabel(messages.login.password).fill(password);
  await page.getByRole('button', { name: messages.login.submit }).click();
}

// パスワード変更画面で変更する。API 応答を待ってから次の操作へ進む
async function changePassword(
  page: Page,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await page.goto('/password');
  await page.getByLabel(messages.password.currentPassword, { exact: true }).fill(currentPassword);
  await page.getByLabel(messages.password.newPassword, { exact: true }).fill(newPassword);
  await page.getByLabel(messages.password.confirmPassword, { exact: true }).fill(newPassword);
  const responded = page.waitForResponse((response) =>
    response.url().includes('/api/v1/auth/password'),
  );
  await page.getByRole('button', { name: messages.password.submit }).click();
  expect((await responded).status()).toBeLessThan(300);
}

async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, E2E_ADMIN.empId, E2E_ADMIN.password);
  await expect(page).toHaveURL(/\/dashboard$/);
}

function leaveTabs(page: Page) {
  return page.getByRole('navigation', { name: t.tabsLabel });
}

function calendarTable(page: Page) {
  return page.getByRole('region', { name: messages.leaveCalendar.listScrollLabel });
}

// 休暇カレンダーを検索条件付きで開き、取得した応答を返す(E2E-07 で使う)
async function openCalendar(page: Page, query: string): Promise<void> {
  await page.goto(`/leaves/calendar?month=${E2E_MONTH}${query}`);
}

test('shouldShowTwoTabsAndNoApprovalMenuForEmployeeWithoutAssignments', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAs(page, E2E_INITIAL_USER.empId, E2E_INITIAL_USER.password);
  // 初回ログインのためパスワード変更が必要。変更後に元へ戻し、他の spec の前提を保つ
  await expect(page).toHaveURL(/\/password$/);
  const tempPassword = `Pw1${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  await changePassword(page, E2E_INITIAL_USER.password, tempPassword);
  await loginAs(page, E2E_INITIAL_USER.empId, tempPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/leaves');

  await expect(leaveTabs(page).getByRole('link')).toHaveCount(2);
  await expect(
    leaveTabs(page).getByRole('link', { name: t.tabApprovals, exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: messages.nav.mainLabel })).not.toContainText(
    '休暇承認',
  );

  // 元のパスワードへ戻す(他の spec が初回ログインの状態を前提にするため)
  await loginAs(page, E2E_INITIAL_USER.empId, tempPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
  await changePassword(page, tempPassword, E2E_INITIAL_USER.password);
});

test('shouldShowThreeTabsWithApprovalSummaryForAdmin', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAsAdmin(page);
  await page.goto('/leaves');

  await expect(leaveTabs(page).getByRole('link')).toHaveCount(3);
  await leaveTabs(page).getByRole('link', { name: t.tabApprovals, exact: true }).click();
  await expect(page).toHaveURL(/\/leaves\/approvals$/);
  await expect(page.getByText(messages.approvals.statusPending).first()).toBeVisible();
  await expect(page.getByText(messages.common.loadError)).toHaveCount(0);
});

test('shouldKeepSelectedTabAcrossBackForwardAndDirectAccess', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAsAdmin(page);
  await page.goto('/leaves');

  await leaveTabs(page).getByRole('link', { name: CALENDAR_TAB }).click();
  await expect(page).toHaveURL(/\/leaves\/calendar$/);
  await leaveTabs(page).getByRole('link', { name: t.tabMine }).click();
  await expect(page).toHaveURL(/\/leaves$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/leaves\/calendar$/);
  await expect(leaveTabs(page).getByRole('link', { name: CALENDAR_TAB })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.goForward();
  await expect(page).toHaveURL(/\/leaves$/);

  await page.goto('/leaves/approvals');
  await expect(leaveTabs(page).getByRole('link', { name: t.tabApprovals })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.reload();
  await expect(page).toHaveURL(/\/leaves\/approvals$/);
  await expect(leaveTabs(page).getByRole('link', { name: t.tabApprovals })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('shouldMoveCalendarMonthAndUpdateLabelAndData', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAsAdmin(page);
  await openCalendar(page, '');

  await expect(page.getByRole('group', { name: `${MONTH_LABEL}の休暇カレンダー` })).toBeVisible();
  await page.getByRole('button', { name: messages.leaveCalendar.nextMonth }).click();
  await expect(page).toHaveURL(/month=2026-12/);
  await expect(
    page.getByRole('group', { name: `${messages.calendar.monthLabel(2026, 12)}の休暇カレンダー` }),
  ).toBeVisible();

  await page.getByRole('button', { name: messages.leaveCalendar.prevMonth }).click();
  await expect(page.getByRole('group', { name: `${MONTH_LABEL}の休暇カレンダー` })).toBeVisible();
  await expect(calendarTable(page).getByText(`${APPROVED_EMP_ID}`).first()).toBeVisible();
});

test('shouldNarrowCalendarByNameEmpIdAndDepartment', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAsAdmin(page);
  await openCalendar(page, '');

  // 存在しない名前は 0 件の Empty
  await page.getByLabel(messages.leaveCalendar.nameSearch).fill('ZZZZ該当なし');
  await page.waitForURL(/name=/);
  await expect(calendarTable(page).getByText(messages.leaveCalendar.empty)).toBeVisible();

  // 社員番号で絞り込むと、その社員の休暇だけになる
  await page.getByLabel(messages.leaveCalendar.nameSearch).fill('');
  await page.getByLabel(messages.leaveCalendar.empIdSearch).fill(APPROVED_EMP_ID);
  await page.waitForURL(/empId=10001/);
  const rows = calendarTable(page).locator('tbody tr');
  await expect(rows.first()).toContainText(APPROVED_EMP_ID);
  const rowCount = await rows.count();
  for (let index = 0; index < rowCount; index += 1) {
    await expect(rows.nth(index)).toContainText(APPROVED_EMP_ID);
  }

  // 部署と社員番号を同時に指定すると両方で絞られる。部署は 10001 の所属(一覧の 3 列目)を選ぶ
  const departmentName = ((await rows.first().locator('td').nth(2).textContent()) ?? '').trim();
  expect(departmentName).not.toBe('');
  const responded = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/leaves/calendar') &&
      response.url().includes('departmentId='),
  );
  await page.locator('#calendar-department').selectOption({ label: departmentName });
  expect((await responded).status()).toBe(200);
  await expect(rows.first()).toContainText(APPROVED_EMP_ID);
  const combinedCount = await rows.count();
  for (let index = 0; index < combinedCount; index += 1) {
    await expect(rows.nth(index)).toContainText(APPROVED_EMP_ID);
    await expect(rows.nth(index)).toContainText(departmentName);
  }
});

test('shouldHideNonApprovedLeavesFromCalendarAndList', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAsAdmin(page);

  // PENDING・REJECTED・CANCELLED の社員は、社員番号で探しても表示されない
  for (const empId of NON_VISIBLE_EMP_IDS) {
    await openCalendar(page, `&empId=${empId}`);
    await expect(calendarTable(page).getByText(messages.leaveCalendar.empty)).toBeVisible();
  }
});

test('shouldRequestCalendarWithoutReasonAndWithSevenFieldItems', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAsAdmin(page);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/leaves/calendar') && response.request().method() === 'GET',
  );
  await openCalendar(page, '');
  const response = await responsePromise;
  expect(response.status()).toBe(200);

  const body = (await response.json()) as {
    items: Record<string, unknown>[];
    holidays: unknown[];
  };
  expect(body.items.length).toBeGreaterThan(0);
  for (const item of body.items) {
    expect(Object.keys(item).sort()).toEqual(
      ['category', 'departmentName', 'empId', 'endDate', 'halfDay', 'name', 'startDate'].sort(),
    );
    expect(item).not.toHaveProperty('reason');
  }
});

test('shouldUpdateMobileDayListWhenDateSelectedAndSwitchToMonth', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await loginAsAdmin(page);
  await openCalendar(page, '&date=2026-11-12');

  const day = messages.leaveCalendar.dayTitle('11月12日（木）');
  await expect(page.getByRole('region', { name: day })).toBeVisible();

  // 休暇の無い日(11/20 は承認済みの休暇なし)を選ぶと Empty 文言になる
  await page
    .getByRole('button', { name: messages.leaveCalendar.cellLabel('11月20日（金）', 0) })
    .click();
  await expect(page).toHaveURL(/date=2026-11-20/);
  await expect(page.getByText(messages.leaveCalendar.emptyDay)).toBeVisible();

  // 12 日へ戻し、[月全体] に切り替えると当月の休暇が並ぶ
  await page
    .getByRole('button', { name: messages.leaveCalendar.cellLabel('11月12日（木）', 6) })
    .click();
  await expect(page).toHaveURL(/date=2026-11-12/);
  await page.getByRole('button', { name: messages.leaveCalendar.segmentMonth }).click();
  await expect(page).toHaveURL(/view=month/);
  await expect(page.getByRole('heading', { name: messages.leaveCalendar.listTitle })).toBeVisible();
});

test('shouldApplySpecialLeaveAsAdminAndShowInHistoryAndCalendar', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAsAdmin(page);
  await page.goto('/leaves');
  await page.getByRole('button', { name: messages.leaves.applyButton }).click();

  // 申請履歴の絞り込みと同じラベルがあるため、申請モーダルの中だけを操作する
  const modal = page.getByRole('dialog', { name: messages.leaves.apply.title });
  await expect(modal.getByText(messages.leaves.apply.autoApprove)).toBeVisible();
  await modal
    .getByRole('combobox', { name: messages.leaves.apply.leaveType })
    .selectOption('SPECIAL');
  await modal.getByLabel(messages.leaves.apply.startDate).fill(SELF_LEAVE_DATE);
  await modal.getByLabel(messages.leaves.apply.endDate).fill(SELF_LEAVE_DATE);
  await modal.getByLabel(messages.leaves.apply.reason).fill(SELF_LEAVE_REASON);
  await modal.getByRole('button', { name: messages.leaves.apply.submit }).click();

  await expect(page.getByText(messages.leaves.apply.approvedSuccess)).toBeVisible();
  await expect(
    page.getByRole('table').getByText(messages.leave.types.SPECIAL).first(),
  ).toBeVisible();

  // 休暇カレンダーに自分の特別休暇が出る(名前ではなく社員番号で絞り込む)
  await openCalendar(page, `&empId=${SELF_EMP_ID}`);
  await expect(calendarTable(page).getByText(messages.leaveCategory.SPECIAL).first()).toBeVisible();
  await expect(calendarTable(page)).toContainText(SELF_EMP_ID);
});

test('shouldRejectWithReasonRequiredAndRefreshApprovalsList', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await loginAsAdmin(page);
  await page.goto('/leaves/approvals');

  // 対象は承認者 900001 宛ての PENDING の 10008 の行に限定する(他の spec の承認待ちデータを消さない)
  const rejectButtons = page.getByRole('button', { name: /さんの休暇を却下$/ });
  const targetRow = page.getByRole('row').filter({ hasText: NON_VISIBLE_EMP_IDS[0] ?? '' });
  const targetReject = targetRow.getByRole('button', { name: /さんの休暇を却下$/ });
  await expect(targetReject).toBeVisible();
  const before = await rejectButtons.count();

  await targetReject.click();
  const dialog = page.getByRole('dialog', { name: messages.leave.reject.title });
  await expect(dialog).toBeVisible();

  // 理由なしでは送信できず、理由の必須文言が出る
  await dialog.getByRole('button', { name: messages.leave.reject.submit }).click();
  await expect(dialog.getByText(messages.leave.reject.validation.required)).toBeVisible();

  await dialog.getByLabel(messages.leave.reject.reasonLabel).fill('E2E 却下テスト');
  await dialog.getByRole('button', { name: messages.leave.reject.submit }).click();
  await expect(page.getByText(messages.leave.reject.success)).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(rejectButtons).toHaveCount(Math.max(before - 1, 0));
});
