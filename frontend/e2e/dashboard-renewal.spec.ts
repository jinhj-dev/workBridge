import { expect, test } from '@playwright/test';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN, E2E_INITIAL_USER } from './accounts';

// ダッシュボード刷新(SCR-002)の実バックエンド E2E(test-plan §4 P-01〜P-10)。
// 前提: 開発 DB ではなくテスト用 DB に接続したバックエンドと、900001(ADMIN)・900002(EMPLOYEE)が存在すること。
// 900002 には承認者 900001 宛ての PENDING 休暇が 2 件あること(承認・反領の対象)。
// 数値は絶対値ではなく「操作前後の増減」で判定する(開発 DB の既存データに依存しないため)。

const t = messages.dashboard;
const SCREENSHOT_WIDTHS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 900 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
  { width: 360, height: 740 },
] as const;

type LoginBody = { accessToken: string; user: { role: string; mustChangePassword: boolean } };

async function login(page: Page, empId: string, password: string): Promise<LoginBody> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(empId);
  await page.getByLabel(messages.login.password).fill(password);
  const response = page.waitForResponse('**/api/v1/auth/login');
  await page.getByRole('button', { name: messages.login.submit }).click();
  return (await (await response).json()) as LoginBody;
}

async function expectDashboardLoaded(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard$/);
  // 見出しは「{挨拶}、{氏名}さん」
  await expect(page.getByRole('heading', { level: 1, name: /、.+さん$/ })).toBeVisible();
  await expect(page.getByText(messages.common.loadError)).toHaveCount(0);
}

function section(page: Page, title: string | RegExp): Locator {
  return page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: title }),
  });
}

// StatCard(全社の状況)の数値。ラベルを含む親要素のテキストから先頭の数字を取り出す
async function readStat(page: Page, label: string): Promise<number> {
  const card = page
    .getByRole('group', { name: t.stats.label })
    .getByText(label, { exact: true })
    .locator('xpath=ancestor::*[self::a or self::div or self::span][1]');
  const text = await card.innerText();
  const match = /(\d+)/.exec(text);
  if (!match) throw new Error(`統計「${label}」の数値が読み取れません: ${text}`);
  return Number(match[1]);
}

// dt/dd の組から dd のテキストを読む
function definitionValue(page: Page, term: string): Locator {
  return page.locator('dt', { hasText: term }).locator('xpath=following-sibling::dd[1]');
}

function pendingRowButtons(page: Page): Locator {
  return section(page, /^承認待ちの申請/).getByRole('button', { name: /さんの申請の詳細を開く$/ });
}

// 一覧の読み込み完了(行あり または Empty 文言)を待ってから件数を読む
async function waitForPendingListSettled(page: Page): Promise<void> {
  const pendingSection = section(page, /^承認待ちの申請/);
  await expect(
    pendingRowButtons(page).first().or(pendingSection.getByText(t.pending.empty)),
  ).toBeVisible();
}

async function readPendingCount(page: Page): Promise<number> {
  return readStat(page, t.stats.pending);
}

// 承認・却下後の共通確認: 一覧の件数と統計が 1 件減る
async function expectPendingDecreasedBy(
  page: Page,
  rowsBefore: number,
  countBefore: number,
): Promise<void> {
  await expect.poll(() => pendingRowButtons(page).count()).toBe(rowsBefore - 1);
  await expect.poll(() => readPendingCount(page)).toBe(countBefore - 1);
}

async function saveFullPageScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(name);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

// 退勤前後の画面を 390px(退勤前) と 1440px(退勤後) で撮影し、退勤時刻が HH:mm で即時反映されることを確認する
async function clockOutWithScreenshots(
  page: Page,
  testInfo: TestInfo,
  prefix: string,
): Promise<void> {
  const clockOutButton = page.getByRole('button', {
    name: t.attendance.clockOutAction,
    exact: true,
  });
  await expect(clockOutButton, '出勤済みの状態で開始すること').toBeEnabled();
  await expect(definitionValue(page, t.attendance.clockOutTime)).toHaveText(t.attendance.noTime);
  await saveFullPageScreenshot(page, testInfo, `${prefix}-before-1440.png`);
  await page.setViewportSize({ width: 390, height: 844 });
  await saveFullPageScreenshot(page, testInfo, `${prefix}-before-390.png`);

  await page.setViewportSize({ width: 1440, height: 900 });
  await clockOutButton.click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: t.attendance.confirm, exact: true })
    .click();
  await expect(page.getByText(t.attendance.clockedOut)).toBeVisible();
  await expect(
    page.getByRole('button', { name: t.attendance.doneAction, exact: true }),
  ).toBeVisible();
  // リロードせず、退勤時刻が実際の HH:mm で即時反映される
  await expect
    .poll(async () => (await definitionValue(page, t.attendance.clockOutTime).innerText()).trim())
    .toMatch(/^\d{2}:\d{2}$/);
  await saveFullPageScreenshot(page, testInfo, `${prefix}-after-1440.png`);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => (await definitionValue(page, t.attendance.clockOutTime).innerText()).trim())
    .toMatch(/^\d{2}:\d{2}$/);
  await saveFullPageScreenshot(page, testInfo, `${prefix}-after-390.png`);
}

// 横方向のはみ出しがないこと(承認待ちの表は意図的に表内だけスクロールする)
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, '横方向にはみ出している要素がある').toBeLessThanOrEqual(0);
}

test.describe('ダッシュボード刷新(管理者)', () => {
  test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');
  test.setTimeout(120_000);

  test('P-01 shouldRenderAdminDashboardAtFourWidthsAndSaveScreenshots', async ({
    page,
  }, testInfo) => {
    const body = await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    expect(body.user.mustChangePassword).toBe(false);
    await expectDashboardLoaded(page);

    for (const { width, height } of SCREENSHOT_WIDTHS) {
      await page.setViewportSize({ width, height });
      await expectDashboardLoaded(page);
      await expect(page.getByRole('group', { name: t.stats.label })).toBeVisible();
      for (const title of [
        t.attendance.title,
        t.company.title,
        t.monthly.title,
        t.leave.title,
        t.departments.title,
        t.recent.title,
      ]) {
        await expect(section(page, title)).toBeVisible();
      }
      await expect(section(page, /^承認待ちの申請/)).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await saveFullPageScreenshot(page, testInfo, `admin-${width}.png`);
    }
  });

  test('P-04 shouldReturnForbiddenWhenEmployeeCallsAdminApisDirectly', async ({ request }) => {
    const body = await (
      await request.post('/api/v1/auth/login', {
        data: { empId: E2E_INITIAL_USER.empId, password: E2E_INITIAL_USER.password },
      })
    ).json();
    const token = (body as { accessToken: string }).accessToken;
    expect(token, 'EMPLOYEE のログインでアクセストークンが得られること').toBeTruthy();
    const headers = { Authorization: `Bearer ${token}` };

    const summary = await request.get('/api/v1/admin/dashboard/summary', { headers });
    expect(summary.status()).toBe(403);
    const pending = await request.get('/api/v1/leaves/pending-approval?scope=all', { headers });
    expect(pending.status()).toBe(403);
    // 一般社員も部署別現況は参照できる(権限の境界確認)
    const departments = await request.get('/api/v1/dashboard/department-status', { headers });
    expect(departments.status()).toBe(200);
  });

  test('P-06 shouldRemoveApprovedItemAndUpdateStatWhenApprovedInPreview', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    await expectDashboardLoaded(page);
    await waitForPendingListSettled(page);

    const rowsBefore = await pendingRowButtons(page).count();
    expect(rowsBefore, 'フィクスチャの承認待ちが 2 件以上あること').toBeGreaterThanOrEqual(2);
    const countBefore = await readPendingCount(page);

    await pendingRowButtons(page).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: messages.leave.detail.approve, exact: true }).click();
    await dialog.getByRole('button', { name: messages.leave.approve.submit, exact: true }).click();

    await expect(page.getByText(messages.leave.approve.success)).toBeVisible();
    await expect(dialog).toBeHidden();
    await expectPendingDecreasedBy(page, rowsBefore, countBefore);
  });

  test('P-07 shouldRemoveRejectedItemAndUpdateStatWhenRejectedInPreview', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    await expectDashboardLoaded(page);
    await waitForPendingListSettled(page);

    const rowsBefore = await pendingRowButtons(page).count();
    expect(rowsBefore, 'フィクスチャの承認待ちが 1 件以上あること').toBeGreaterThanOrEqual(1);
    const countBefore = await readPendingCount(page);

    await pendingRowButtons(page).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: messages.leave.detail.reject, exact: true }).click();

    // 理由未入力は送信されず検証メッセージが出る
    await dialog.getByRole('button', { name: messages.leave.reject.submit, exact: true }).click();
    await expect(dialog.getByText(messages.leave.reject.validation.required)).toBeVisible();

    await dialog.getByLabel(messages.leave.reject.reasonLabel).fill('E2E 却下テスト');
    await dialog.getByRole('button', { name: messages.leave.reject.submit, exact: true }).click();

    await expect(page.getByText(messages.leave.reject.success)).toBeVisible();
    await expect(dialog).toBeHidden();
    await expectPendingDecreasedBy(page, rowsBefore, countBefore);
  });

  test('P-13 shouldShowPlainHeaderAndEmptyMessageWhenNoPendingApprovals', async ({ page }) => {
    // P-06・P-07 で承認待ち 2 件を処理した後の状態を確認する(P-07 より後に配置)
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    await expectDashboardLoaded(page);
    await waitForPendingListSettled(page);

    await expect(pendingRowButtons(page)).toHaveCount(0);
    expect(await readPendingCount(page)).toBe(0);
    const pendingSection = section(page, /^承認待ちの申請/);
    // SCR-002: 見出しは 0 件でも「承認待ちの申請（0件）」(件数付き)
    await expect(
      pendingSection.getByRole('heading', {
        level: 2,
        name: t.pending.titleWithCount(0),
        exact: true,
      }),
    ).toBeVisible();
    await expect(pendingSection.getByText(t.pending.empty, { exact: true })).toBeVisible();
  });

  test('P-08 shouldIncreaseClockedInCountAndDepartmentAfterClockIn', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    await expectDashboardLoaded(page);

    // 出勤は 1 日 1 回のみ。実行前にテスト用 DB の 900001 の勤怠を消しておくこと
    const clockInButton = page.getByRole('button', {
      name: t.attendance.clockInAction,
      exact: true,
    });
    await expect(
      clockInButton,
      '未出勤の状態で開始すること(900001 の当日勤怠を削除してから実行)',
    ).toBeEnabled();

    const statBefore = await readStat(page, t.stats.clockedIn);
    const deptRow = section(page, t.departments.title).getByRole('row', { name: /開発部/ });
    // 先頭セルは rowheader(部署名)。出勤（率）列は cell の 2 番目(index 1)
    const deptBefore = Number(
      /(\d+)名/.exec(await deptRow.getByRole('cell').nth(1).innerText())?.[1],
    );

    await clockInButton.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: t.attendance.confirm, exact: true }).click();
    await expect(page.getByText(t.attendance.clockedIn)).toBeVisible();

    await expect(
      page.getByRole('button', { name: t.attendance.clockOutAction, exact: true }),
    ).toBeVisible();
    await expect.poll(() => readStat(page, t.stats.clockedIn)).toBe(statBefore + 1);
    await expect
      .poll(async () =>
        Number(/(\d+)名/.exec(await deptRow.getByRole('cell').nth(1).innerText())?.[1]),
      )
      .toBe(deptBefore + 1);

    // 退勤前の退勤時刻は未確定(--:--)
    expect((await definitionValue(page, t.attendance.clockOutTime).innerText()).trim()).toBe(
      t.attendance.noTime,
    );
  });

  test('P-11 shouldShowRealClockOutTimeImmediatelyAfterClockOut', async ({ page }, testInfo) => {
    // P-08 で出勤済みの状態から開始する(出勤・退勤は 1 日 1 回)
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    await expectDashboardLoaded(page);
    await clockOutWithScreenshots(page, testInfo, 'final2-admin-clockout');
  });

  test('P-09 shouldShowNewLeaveAtTopOfRecentAndReduceRemainingDays', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    await expectDashboardLoaded(page);

    const remainingBefore = Number(
      /(\d+(?:\.\d+)?)/.exec(await definitionValue(page, t.leave.remaining).innerText())?.[1],
    );
    // ダッシュボードに申請ボタンはない。休暇管理画面から申請し、ダッシュボードへ戻って反映を確認する
    await page.goto('/leaves');
    await page.getByRole('button', { name: messages.leaves.applyButton, exact: true }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(messages.leaves.apply.leaveType).selectOption('ANNUAL');
    await dialog.getByLabel(messages.leaves.apply.startDate).fill('2026-12-14');
    await dialog.getByLabel(messages.leaves.apply.endDate).fill('2026-12-14');
    await dialog.getByLabel(messages.leaves.apply.reason).fill('E2E P-09 dashboard-renewal');
    await dialog.getByRole('button', { name: messages.leaves.apply.submit, exact: true }).click();

    // 900001 は承認者不要(自動承認)
    await expect(page.getByText(messages.leaves.apply.approvedSuccess)).toBeVisible();
    await expect(dialog).toBeHidden();

    await page.goto('/dashboard');
    await expectDashboardLoaded(page);
    const topRecent = section(page, t.recent.title)
      .getByRole('button', { name: /の申請の詳細を開く$/ })
      .first();
    await expect(topRecent).toHaveAccessibleName(new RegExp(messages.leave.types.ANNUAL));

    await expect
      .poll(async () =>
        Number(
          /(\d+(?:\.\d+)?)/.exec(await definitionValue(page, t.leave.remaining).innerText())?.[1],
        ),
      )
      .toBe(remainingBefore - 1);
  });

  test('P-12 shouldShowDividedRecentRowsWithPointerCursorAndOpenDetailOnClick', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    await expectDashboardLoaded(page);

    const recent = section(page, t.recent.title);
    const rows = recent.getByRole('button', { name: /の申請の詳細を開く$/ });
    // 読み込み中(status)が消えて行が出るまで待つ
    await expect.poll(() => rows.count(), '直近の申請が 1 件以上あること').toBeGreaterThan(0);

    // 行の区切り線(上罫線)
    const borderTop = await recent
      .locator('ul')
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(borderTop).not.toBe('0px');

    // 行は pointer カーソル。hover で背景色が変わる
    const firstRow = rows.first();
    await expect(firstRow).toHaveCSS('cursor', 'pointer');
    const bgBefore = await firstRow.evaluate((el) => getComputedStyle(el).backgroundColor);
    await firstRow.hover();
    await expect
      .poll(() => firstRow.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(bgBefore);

    // クリックで申請詳細(ダイアログ)が開く。ページ遷移はしない
    const urlBefore = page.url();
    await firstRow.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(page.url()).toBe(urlBefore);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('P-14 shouldKeepOtherScreensWithoutPageOverflowAfterCardChange', async ({
    page,
  }, testInfo) => {
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    await expectDashboardLoaded(page);
    const paths = [
      '/attendance',
      '/leaves',
      '/leaves/approvals',
      '/admin/attendance',
      '/admin/departments',
    ];
    for (const width of [1440, 1024, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of paths) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expect(page.getByText(messages.common.loadError)).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
        const name = `final2-other-${path.replaceAll('/', '_')}-${width}.png`;
        await saveFullPageScreenshot(page, testInfo, name);
      }
    }
  });
});

test.describe('ダッシュボード刷新(一般社員)', () => {
  test.skip(!E2E_INITIAL_USER.password, 'E2E_INITIAL_PASSWORD が未設定のため実行しない');
  test.setTimeout(120_000);

  test('P-02 shouldRenderEmployeeDashboardAtFourWidthsAndSaveScreenshots', async ({
    page,
  }, testInfo) => {
    const body = await login(page, E2E_INITIAL_USER.empId, E2E_INITIAL_USER.password);
    expect(body.user.role).toBe('EMPLOYEE');
    expect(body.user.mustChangePassword).toBe(false);
    await expectDashboardLoaded(page);

    for (const { width, height } of SCREENSHOT_WIDTHS) {
      await page.setViewportSize({ width, height });
      await expectDashboardLoaded(page);
      // 一般社員には統計・全社・承認待ちが出ない
      await expect(page.getByRole('group', { name: t.stats.label })).toHaveCount(0);
      await expect(section(page, /^承認待ちの申請/)).toHaveCount(0);
      for (const title of [
        t.attendance.title,
        t.monthly.title,
        t.leave.title,
        t.departments.title,
        t.recent.title,
      ]) {
        await expect(section(page, title)).toBeVisible();
      }
      await expectNoHorizontalOverflow(page);
      await saveFullPageScreenshot(page, testInfo, `employee-${width}.png`);
    }
  });

  test('P-05 shouldHidePendingApprovalCardForEmployeeWithoutAssignedItems', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, E2E_INITIAL_USER.empId, E2E_INITIAL_USER.password);
    await expectDashboardLoaded(page);
    await expect(section(page, /^承認待ちの申請/)).toHaveCount(0);
  });

  test('P-10 shouldKeepCardTitlesOnOneLineAt360Width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await login(page, E2E_INITIAL_USER.empId, E2E_INITIAL_USER.password);
    await expectDashboardLoaded(page);

    const headings = page.getByRole('heading', { level: 2 });
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const heading = headings.nth(i);
      const { height, lineHeight } = await heading.evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        lineHeight: parseFloat(getComputedStyle(el).lineHeight),
      }));
      expect(height, `見出し ${i + 1} が 2 行以上に折り返している`).toBeLessThanOrEqual(
        lineHeight * 1.5,
      );
    }
    await expectNoHorizontalOverflow(page);
  });

  test('P-15 shouldShowRealClockOutTimeImmediatelyAfterEmployeeClockOut', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, E2E_INITIAL_USER.empId, E2E_INITIAL_USER.password);
    await expectDashboardLoaded(page);

    const clockInButton = page.getByRole('button', {
      name: t.attendance.clockInAction,
      exact: true,
    });
    const clockOutButton = page.getByRole('button', {
      name: t.attendance.clockOutAction,
      exact: true,
    });
    // 勤怠の読み込み完了(出勤または退勤ボタンのどちらか)を待ってから分岐する
    await expect(clockInButton.or(clockOutButton)).toBeVisible();
    if (await clockInButton.isVisible()) {
      await expect(clockInButton).toBeEnabled();
      await clockInButton.click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: t.attendance.confirm, exact: true })
        .click();
      await expect(page.getByText(t.attendance.clockedIn)).toBeVisible();
    }
    await clockOutWithScreenshots(page, testInfo, 'final2-employee-clockout');
  });
});
