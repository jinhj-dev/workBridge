import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';
import {
  appendMeasurement,
  blockWrites,
  captureScreenshot,
  login as loginWithCredentials,
  measureBox,
  navigateInApp,
} from './button-helpers';

// 共通ボタン(B3)の高さ・位置を実ブラウザで測定し、画面を撮影する。
// 測定は GET のみ実バックエンドに届く。POST・PATCH・DELETE は中断して書き込みを防ぐ(ログインだけ例外)。
// 出勤 API も固定応答にし、出勤・申請・作成のボタンは押さない。
// 撮影は Playwright の出力フォルダへ保存する(リポジトリにはコミットしない)。

const WIDTHS = [360, 768, 1024, 1440] as const;

async function login(page: Page): Promise<void> {
  await loginWithCredentials(page, E2E_ADMIN);
}

async function capture(page: Page, testInfo: TestInfo, width: number, name: string): Promise<void> {
  await captureScreenshot(
    page,
    testInfo,
    testInfo.outputPath(`${width}-${name}.png`),
    `${width}-${name}`,
  );
}

// 測定値は出力フォルダの measurements.jsonl へ追記する(テストの実行ごとに出力フォルダは作り直される)
function record(
  testInfo: TestInfo,
  width: number,
  key: string,
  values: Record<string, unknown>,
): void {
  appendMeasurement(testInfo.outputPath('measurements.jsonl'), width, key, values);
}

// 検索入力(44px)と通常の入力(48px)の高さ・余白・文字を分けて確認する。ログイン画面の GET のみ(認証不要)
test('shouldKeepLoginInputsAt48pxWhileSearchInputIs44px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/login');
  const empId = page.getByLabel(messages.login.empId);
  await expect(empId).toHaveCSS('height', '48px');
  await expect(empId).toHaveCSS('padding-left', '16px');
  await expect(empId).toHaveCSS('font-size', '16px');
  await expect(empId).toHaveCSS('line-height', '24px');
  await expect(page.getByLabel(messages.login.password)).toHaveCSS('height', '48px');
});

for (const width of WIDTHS) {
  test.describe(`幅 ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

    test('shouldMeasureHeaderAndActionButtonsAndCapture', async ({ page }, testInfo) => {
      await blockWrites(page);
      await page.goto('/login');
      await login(page);

      // ④ ダッシュボードの出勤ボタン(lg = 48px)。押さない
      const dashboardTitle = page.getByRole('heading', { level: 1 });
      await expect(dashboardTitle).toBeVisible();
      const clockInBox = await measureBox(
        page.getByRole('button', { name: messages.dashboard.attendance.clockInAction }),
      );
      record(testInfo, width, 'B3-4-dashboard-clock-in', { height: clockInBox.height });
      expect(clockInBox.height).toBeCloseTo(48, 0);
      await capture(page, testInfo, width, 'dashboard');

      // ① /leaves: 見出しは 1 行、主ボタンは見出しと同じ行(上端の差が主ボタンの高さ未満)
      await navigateInApp(page, '/leaves');
      const leaveTitle = page.getByRole('heading', { level: 1 });
      await expect(leaveTitle).toBeVisible();
      const leaveTitleBox = await measureBox(leaveTitle);
      const lineHeight = parseFloat(
        await leaveTitle.evaluate((el) => getComputedStyle(el).lineHeight),
      );
      expect(Number.isFinite(lineHeight)).toBe(true);
      const applyBox = await measureBox(
        page.getByRole('button', { name: messages.leaves.applyButton }),
      );
      record(testInfo, width, 'B3-1-leaves-title', {
        titleHeight: leaveTitleBox.height,
        lineHeight,
        topDiff: Math.abs(applyBox.y - leaveTitleBox.y),
        applyHeight: applyBox.height,
      });
      expect(leaveTitleBox.height).toBeLessThanOrEqual(lineHeight + 1);
      expect(Math.abs(applyBox.y - leaveTitleBox.y)).toBeLessThan(applyBox.height);
      await capture(page, testInfo, width, 'leaves');

      // ① ② ③ /admin/departments (SCR-010)
      await navigateInApp(page, '/admin/departments');
      const deptTitle = page.getByRole('heading', { level: 1 });
      await expect(deptTitle).toBeVisible();
      const deptTitleBox = await measureBox(deptTitle);
      const deptLineHeight = parseFloat(
        await deptTitle.evaluate((el) => getComputedStyle(el).lineHeight),
      );
      const createBox = await measureBox(
        page.getByRole('button', { name: messages.departments.create }),
      );
      record(testInfo, width, 'B3-1-departments-title', {
        titleHeight: deptTitleBox.height,
        lineHeight: deptLineHeight,
        topDiff: Math.abs(createBox.y - deptTitleBox.y),
        createHeight: createBox.height,
      });
      // ② SCR-010 ヘッダーの主ボタンは lg(48px)
      expect(createBox.height).toBeCloseTo(48, 0);
      expect(deptTitleBox.height).toBeLessThanOrEqual(deptLineHeight + 1);
      expect(Math.abs(createBox.y - deptTitleBox.y)).toBeLessThan(createBox.height);

      // ③ 条件をクリア(40px)と検索入力(44px)。縦の中心差は記録する(幅により折り返すため)
      const clearBox = await measureBox(
        page.getByRole('button', { name: messages.departments.clear }),
      );
      const searchInput = page.getByPlaceholder(messages.departments.searchPlaceholder);
      const searchBox = await measureBox(searchInput);
      const clearCenter = clearBox.y + clearBox.height / 2;
      const searchCenter = searchBox.y + searchBox.height / 2;
      record(testInfo, width, 'B3-3-clear-search', {
        clearHeight: clearBox.height,
        searchHeight: searchBox.height,
        centerDiff: Math.abs(clearCenter - searchCenter),
      });
      await capture(page, testInfo, width, 'departments');
      expect(clearBox.height).toBeCloseTo(40, 0);
      expect(searchBox.height).toBeCloseTo(44, 0);
      // 計算値: 高さ 44・左余白 40(アイコン分)・右余白 16・文字 14/20(Fix 1 の確認事項)
      await expect(searchInput).toHaveCSS('height', '44px');
      await expect(searchInput).toHaveCSS('padding-left', '40px');
      await expect(searchInput).toHaveCSS('padding-right', '16px');
      await expect(searchInput).toHaveCSS('font-size', '14px');
      await expect(searchInput).toHaveCSS('line-height', '20px');
    });
  });
}

// B10: 全体勤怠管理(SCR-008)の表内の修正ボタン。360 はカード形式、1024 は表。
// 一覧の GET は固定の 1 行に差し替える(開発 DB の内容に依存しない)。修正は押してモーダルを開くだけで、保存しない。
const ADMIN_ATTENDANCE_PATH = '**/api/v1/admin/attendance**';
const FIXED_ADMIN_ATTENDANCE = {
  items: [
    {
      id: 'e2e-b10-row-1',
      user: {
        id: 'e2e-b10-user-1',
        name: 'E2E長い氏名テスト社員名前の確認用',
        empId: '900099',
        departmentName: '営業部',
      },
      workDate: '2026-11-06',
      clockIn: '2026-11-06T09:00:00+09:00',
      clockOut: '2026-11-06T18:00:00+09:00',
      workMinutes: 540,
      status: 'DONE',
      modifiedAt: null,
    },
  ],
  page: 1,
  limit: 20,
  totalCount: 1,
  totalPages: 1,
};

for (const width of [360, 1024] as const) {
  test.describe(`B10 幅 ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

    test('shouldKeepEditButtonOneLineInAdminAttendance', async ({ page }, testInfo) => {
      await blockWrites(page);
      await page.route(ADMIN_ATTENDANCE_PATH, (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(FIXED_ADMIN_ATTENDANCE),
            })
          : route.fallback(),
      );
      await page.goto('/login');
      await login(page);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await navigateInApp(page, '/admin/attendance');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const editButton = page.getByRole('button', { name: messages.common.edit }).first();
      await expect(editButton).toBeVisible();
      const editBox = await measureBox(editButton);
      const measured = await editButton.evaluate((el) => {
        const row = el.closest('tr') ?? el.closest('li');
        const table = el.closest('table');
        const container = table?.parentElement;
        return {
          rowHeight: row ? row.getBoundingClientRect().height : -1,
          tableScrollWidth: container ? container.scrollWidth : -1,
          tableClientWidth: container ? container.clientWidth : -1,
          whiteSpace: getComputedStyle(el).whiteSpace,
          hasSvg: el.querySelector('svg') !== null,
        };
      });
      record(testInfo, width, 'B10-admin-attendance-edit', {
        buttonHeight: editBox.height,
        buttonWidth: editBox.width,
        rowHeight: measured.rowHeight,
        tableScrollWidth: measured.tableScrollWidth,
        tableClientWidth: measured.tableClientWidth,
        whiteSpace: measured.whiteSpace,
      });
      await capture(page, testInfo, width, 'admin-attendance');

      // 高さ 36(sm)・1 行(nowrap)・アイコン付き
      expect(editBox.height).toBeCloseTo(36, 0);
      expect(measured.whiteSpace).toBe('nowrap');
      expect(measured.hasSvg).toBe(true);

      // 押すのは修正モーダルを開くところまで。保存はしない
      await editButton.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    });
  });
}

// C7: アイコン・月移動ボタン。ベル(TopBar)の角丸、出勤簿の月移動(40px)と 360 のヘッダー、休暇カレンダーの月移動(40px)。
// 月の移動は GET のみ。ボタンを押して月を変える以外は操作しない。
const SHEET = messages.attendance.sheet;
const CALENDAR = messages.leaveCalendar;

for (const width of [360, 1440] as const) {
  test.describe(`C7 幅 ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

    test('shouldSizeMonthNavigatorsAt40pxAndBellRadius8px', async ({ page }, testInfo) => {
      await blockWrites(page);
      await page.goto('/login');
      await login(page);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // ベル(承認画面へのリンク)の角丸は ghost の 8px
      const bell = page.locator('a[href="/leaves/approvals"]').first();
      await expect(bell).toHaveCSS('border-radius', '8px');
      const bellBox = await measureBox(bell);
      record(testInfo, width, 'C7-bell', { height: bellBox.height, width: bellBox.width });

      // 出勤簿の月移動: 前月・翌月・今月
      await navigateInApp(page, '/attendance');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // 出勤簿(月移動つき)は md 以上だけ表示する。狭い幅では履歴の表示になるため件数だけ記録する
      if (width < 768) {
        const narrowCount = await page.getByRole('button', { name: SHEET.prevMonth }).count();
        record(testInfo, width, 'C7-sheet-narrow', { monthNavCount: narrowCount });
      } else {
        const prev = page.getByRole('button', { name: SHEET.prevMonth });
        const next = page.getByRole('button', { name: SHEET.nextMonth });
        const thisMonth = page.getByRole('button', { name: SHEET.thisMonth });
        await expect(prev).toBeVisible();
        const title = page.getByRole('heading', { level: 1 });
        const titleBox = await measureBox(title);
        const titleLineHeight = parseFloat(
          await title.evaluate((el) => getComputedStyle(el).lineHeight),
        );
        const prevBox = await measureBox(prev);
        const nextBox = await measureBox(next);
        const overflowX = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        record(testInfo, width, 'C7-sheet-header', {
          titleHeight: titleBox.height,
          titleLineHeight,
          prevTopDiff: Math.abs(prevBox.y - titleBox.y),
          prevHeight: prevBox.height,
          nextHeight: nextBox.height,
          overflowX,
        });
        await expect(prev).toHaveCSS('height', '40px');
        await expect(next).toHaveCSS('height', '40px');
        await expect(thisMonth).toHaveCSS('height', '40px');
        await capture(page, testInfo, width, 'attendance-month-nav');
      }

      // 休暇カレンダーの月移動(MonthNavigator)も 40px
      await navigateInApp(page, '/leaves/calendar');
      const calPrev = page.getByRole('button', { name: CALENDAR.prevMonth });
      const calNext = page.getByRole('button', { name: CALENDAR.nextMonth });
      await expect(calPrev).toBeVisible();
      const calPrevBox = await measureBox(calPrev);
      const calNextBox = await measureBox(calNext);
      record(testInfo, width, 'C7-calendar-month-nav', {
        prevHeight: calPrevBox.height,
        nextHeight: calNextBox.height,
      });
      await expect(calPrev).toHaveCSS('height', '40px');
      await expect(calNext).toHaveCSS('height', '40px');
      await capture(page, testInfo, width, 'calendar-month-nav');
    });
  });
}
