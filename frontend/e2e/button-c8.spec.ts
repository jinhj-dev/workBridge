import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';
import {
  appendMeasurement,
  blockWrites,
  captureScreenshot,
  login,
  measureBox,
  navigateInApp,
} from './button-helpers';

// C8 モバイル反応の検証(読み取り専用)。GET 以外は中断し、モーダルは開いて閉じるまでで送信しない。
// パスワード変更画面(BT04)は、実際のログイン応答の mustChangePassword だけを true に書き換えて開く(開発 DB は変えない)。
// 測定値は jsonl、画面は PNG として .claude/work/button-refactor/screenshots/c8/ に保存する(PNG は gitignore 対象)。
// 測定ファイルは実行開始時に空にし、再実行のたびに置き換える。

const OUT_DIR = path.resolve(__dirname, '../../.claude/work/button-refactor/screenshots/c8');
const MEASUREMENTS_FILE = path.join(OUT_DIR, 'measurements.jsonl');
const ADMIN_ATTENDANCE_PATH = '**/api/v1/admin/attendance**';
const WIDTHS = [360, 768, 1024, 1440] as const;
const FIXED_ADMIN_ATTENDANCE = {
  items: [
    {
      id: 'e2e-c8-row-1',
      user: {
        id: 'e2e-c8-user-1',
        name: 'E2E長い氏名テスト社員名前の確認用',
        empId: '900098',
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

// 実行ごとに測定ファイルを作り直す(以前の実行の測定が残らないように)
test.beforeAll(() => {
  writeFileSync(MEASUREMENTS_FILE, '', { flag: 'w' });
});

function record(width: number, key: string, values: Record<string, unknown>): void {
  appendMeasurement(MEASUREMENTS_FILE, width, key, values);
}

async function capture(page: Page, testInfo: TestInfo, width: number, name: string): Promise<void> {
  const file = path.join(OUT_DIR, `c8-${width}-${name}.png`);
  await captureScreenshot(page, testInfo, file, `${width}-${name}`);
}

// 検索ボタン: 直近の親要素の内容幅(padding を除く)に対する比率(sm 未満は全幅が期待)
async function searchButtonFill(button: Locator) {
  const buttonWidth = (await measureBox(button)).width;
  const { contentWidth, formWidth } = await button.evaluate((el) => {
    const parent = el.parentElement;
    if (!parent) return { contentWidth: -1, formWidth: -1 };
    const cs = getComputedStyle(parent);
    const content = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return {
      contentWidth: content,
      formWidth: el.closest('form')?.getBoundingClientRect().width ?? -1,
    };
  });
  return {
    buttonWidth,
    contentWidth,
    formWidth,
    ratioToParent: contentWidth > 0 ? buttonWidth / contentWidth : -1,
  };
}

// WCAG 2.5.8 の判定材料。対象の高さ・幅と、中心から他のターゲットまでの最短距離(24px 円の間隔例外は距離 ≥ 12)
async function targetMetrics(locator: Locator) {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const selector =
      'a[href],button,input,select,textarea,[role="button"],[role="link"],[role="menuitem"]';
    let minFromCenter = Number.POSITIVE_INFINITY;
    for (const other of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      if (other === el || el.contains(other) || other.contains(el)) continue;
      const b = other.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      const dx = Math.max(b.left - cx, 0, cx - b.right);
      const dy = Math.max(b.top - cy, 0, cy - b.bottom);
      minFromCenter = Math.min(minFromCenter, Math.hypot(dx, dy));
    }
    return {
      height: r.height,
      width: r.width,
      clearanceFromCenter: Number.isFinite(minFromCenter) ? minFromCenter : -1,
    };
  });
}

// 24px 以上、または 24px 円の間隔例外が成り立つか
function meetsTargetSizeRule(metrics: { height: number; clearanceFromCenter: number }): boolean {
  return metrics.height >= 24 || metrics.clearanceFromCenter >= 12;
}

// フォーカス時のリングが、スクロール・オーバーフロー枠(hidden/clip/auto/scroll)で切れていないか(リングは 2px+offset 2px = 4px)
async function focusRingClipping(locator: Locator) {
  await locator.focus();
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const ring = 4;
    let clipped = false;
    let containerFound = false;
    let node = el.parentElement;
    const clipping = ['hidden', 'clip', 'auto', 'scroll'];
    while (node && node !== document.body) {
      const cs = getComputedStyle(node);
      if (clipping.includes(cs.overflowX) || clipping.includes(cs.overflowY)) {
        containerFound = true;
        const a = node.getBoundingClientRect();
        clipped =
          r.top - ring < a.top ||
          r.bottom + ring > a.bottom ||
          r.left - ring < a.left ||
          r.right + ring > a.right;
        break;
      }
      node = node.parentElement;
    }
    return { containerFound, clipped, outlineStyle: getComputedStyle(el).outlineStyle };
  });
}

// モーダルのフッター: 2 列(同じ top)か、ボタン幅、はみ出し
async function footerMetrics(dialog: Locator) {
  return dialog.evaluate((el) => {
    const dr = el.getBoundingClientRect();
    const footer = el.lastElementChild;
    const grid = footer?.firstElementChild;
    const buttons = Array.from(grid?.children ?? []) as HTMLElement[];
    const rects = buttons.map((b) => b.getBoundingClientRect());
    const tops = Array.from(new Set(rects.map((r) => Math.round(r.top))));
    return {
      dialogWidth: dr.width,
      count: buttons.length,
      rows: tops.length,
      widths: rects.map((r) => Math.round(r.width)),
      heights: rects.map((r) => Math.round(r.height)),
      allInside: rects.every((r) => r.left >= dr.left && r.right <= dr.right),
      labels: buttons.map((b) => (b.textContent ?? '').trim().slice(0, 12)),
    };
  });
}

async function closeWithEscape(page: Page, dialog: Locator): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
}

for (const width of WIDTHS) {
  test.describe(`C8 幅 ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

    // BT04 ログアウト(PasswordChangeForm の text 変形)。mustChangePassword の応答に書き換えて /password を開くだけ
    test('shouldMeasurePasswordScreenLogoutLinkAndCapture', async ({ page }, testInfo) => {
      await blockWrites(page);
      await page.goto('/login');
      await login(page, E2E_ADMIN, { forceMustChangePassword: true });
      await expect(page).toHaveURL(/\/password$/);

      const logout = page.getByRole('button', { name: messages.password.logout });
      await expect(logout).toBeVisible();
      const metrics = await targetMetrics(logout);
      const ok = meetsTargetSizeRule(metrics);
      record(width, 'C8-BT04-password-logout', { ...metrics, meets24pxRule: ok });
      expect.soft(ok, 'BT04: 高さ 24 未満かつ間隔例外も不成立').toBe(true);
      await capture(page, testInfo, width, 'SCR-009-password');
      // ログアウトは押さない(読み取りのみ)
    });

    test('shouldMeasureMobileButtonsAndModalsAndCapture', async ({ page }, testInfo) => {
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
      await expect(page.getByLabel(messages.login.empId)).toBeVisible();
      await capture(page, testInfo, width, 'SCR-001-login');

      await login(page, E2E_ADMIN);
      const dashboardTitle = page.getByRole('heading', { level: 1 });
      await expect(dashboardTitle).toBeVisible();

      // SCR-002 ダッシュボード
      await capture(page, testInfo, width, 'SCR-002-dashboard');
      const clockIn = page.getByRole('button', {
        name: messages.dashboard.attendance.clockInAction,
      });
      const clockInMetrics = await targetMetrics(clockIn);
      record(width, 'C8-dashboard-clock-in', clockInMetrics);
      expect.soft(clockInMetrics.height).toBeCloseTo(48, 0);

      // BT38 CardLink「すべて見る」(テキストリンク)
      const viewAll = page.getByRole('link', { name: /すべて見る/ }).first();
      if (await viewAll.count()) {
        const metrics = await targetMetrics(viewAll);
        const ok = meetsTargetSizeRule(metrics);
        record(width, 'C8-BT38-cardlink-viewAll', { ...metrics, meets24pxRule: ok });
        expect.soft(ok, 'BT38: 高さ 24 未満かつ間隔例外も不成立').toBe(true);
      }

      // 出勤確認モーダル(開いて閉じるまで。登録は押さない)
      await clockIn.click();
      const clockDialog = page.getByRole('dialog', {
        name: messages.dashboard.attendance.confirmClockInTitle,
      });
      await expect(clockDialog).toBeVisible();
      const clockFooter = await footerMetrics(clockDialog);
      record(width, 'C8-modal-clock-in-confirm', clockFooter);
      expect.soft(clockFooter.allInside).toBe(true);
      await capture(page, testInfo, width, 'modal-clock-in-confirm');
      await closeWithEscape(page, clockDialog);

      // SCR-003 出勤(検索フォーム。md 以上は出勤簿のため照会が無い)
      await navigateInApp(page, '/attendance');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await capture(page, testInfo, width, 'SCR-003-attendance');
      const attendanceSearch = page
        .getByRole('button', { name: messages.dateRange.search })
        .first();
      if (await attendanceSearch.count()) {
        const fill = await searchButtonFill(attendanceSearch);
        record(width, 'C8-search-attendance', fill);
        if (width < 640) expect.soft(fill.ratioToParent).toBeGreaterThanOrEqual(0.98);
      }

      // SCR-004 休暇管理
      await navigateInApp(page, '/leaves');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await capture(page, testInfo, width, 'SCR-004-leaves');
      const leaveSearch = page
        .getByRole('button', { name: messages.leaves.history.search })
        .first();
      if (await leaveSearch.count()) {
        const fill = await searchButtonFill(leaveSearch);
        record(width, 'C8-search-leaves', fill);
        if (width < 640) expect.soft(fill.ratioToParent).toBeGreaterThanOrEqual(0.98);
      }

      // 休暇申請モーダル(開いて閉じるまで。申請は押さない)
      await page.getByRole('button', { name: messages.leaves.applyButton }).first().click();
      const applyDialog = page.getByRole('dialog').first();
      await expect(applyDialog).toBeVisible();
      const applyFooter = await footerMetrics(applyDialog);
      record(width, 'C8-modal-leave-apply', applyFooter);
      expect.soft(applyFooter.allInside).toBe(true);
      await capture(page, testInfo, width, 'modal-leave-apply');
      await closeWithEscape(page, applyDialog);

      // SCR-004 休暇カレンダー
      await navigateInApp(page, '/leaves/calendar');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await capture(page, testInfo, width, 'SCR-004-calendar');

      // SCR-008 全体勤怠(固定 1 行)
      await navigateInApp(page, '/admin/attendance');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await capture(page, testInfo, width, 'SCR-008-admin-attendance');

      const adminSearch = page.getByRole('button', { name: messages.dateRange.search }).first();
      if (await adminSearch.count()) {
        const fill = await searchButtonFill(adminSearch);
        record(width, 'C8-search-admin-attendance', fill);
        if (width < 640) expect.soft(fill.ratioToParent).toBeGreaterThanOrEqual(0.98);
      }

      // BT33 カード形式の社員名リンク(md 未満)/ BT32 表の社員名リンク(md 以上)。表示中のリンクだけを測る
      const nameLink = page.locator('a[href^="/admin/users/"]:visible').first();
      if (await nameLink.count()) {
        const metrics = await targetMetrics(nameLink);
        const ok = meetsTargetSizeRule(metrics);
        const key = width < 768 ? 'C8-BT33-name-card' : 'C8-BT32-name-table';
        record(width, key, { ...metrics, meets24pxRule: ok });
        expect.soft(ok, `${key}: 高さ 24 未満かつ間隔例外も不成立`).toBe(true);
      }

      // 修正ボタンのフォーカスリング切れ(表・カードの枠の中か)
      const editButton = page.getByRole('button', { name: messages.adminAttendance.edit }).first();
      const ring = await focusRingClipping(editButton);
      record(width, 'C8-focus-ring-edit', ring);
      expect.soft(ring.clipped, '修正ボタンのフォーカスリングが枠で切れている').toBe(false);

      // 修正モーダル(開いて閉じるまで。保存は押さない)
      await editButton.click();
      const editDialog = page.getByRole('dialog').first();
      await expect(editDialog).toBeVisible();
      const editFooter = await footerMetrics(editDialog);
      record(width, 'C8-modal-attendance-edit', editFooter);
      expect.soft(editFooter.allInside).toBe(true);
      await capture(page, testInfo, width, 'modal-attendance-edit');
      await closeWithEscape(page, editDialog);

      // SCR-010 部署管理
      await navigateInApp(page, '/admin/departments');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await capture(page, testInfo, width, 'SCR-010-departments');

      // 部署作成モーダル(開いて閉じるまで。登録は押さない)
      await page.getByRole('button', { name: messages.departments.create }).first().click();
      const deptDialog = page.getByRole('dialog').first();
      await expect(deptDialog).toBeVisible();
      const deptFooter = await footerMetrics(deptDialog);
      record(width, 'C8-modal-department-create', deptFooter);
      expect.soft(deptFooter.allInside).toBe(true);
      await capture(page, testInfo, width, 'modal-department-create');
      await closeWithEscape(page, deptDialog);
    });
  });
}
