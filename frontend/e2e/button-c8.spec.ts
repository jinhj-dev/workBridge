import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// C8 モバイル反応の検証(読み取り専用)。GET 以外は中断し、モーダルは開いて閉じるまでで送信しない。
// 測定値は jsonl、画面は PNG として .claude/work/button-refactor/screenshots/c8/ に保存する(PNG は gitignore 対象)。

const OUT_DIR = path.resolve(__dirname, '../../.claude/work/button-refactor/screenshots/c8');
const TODAY_PATH = '**/api/v1/attendance/today*';
const ADMIN_ATTENDANCE_PATH = '**/api/v1/admin/attendance**';
const WIDTHS = [360, 768, 1024, 1440] as const;
const SCREENSHOT_NAME_PREFIX = 'c8';
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

mkdirSync(OUT_DIR, { recursive: true });

async function login(page: Page): Promise<void> {
  await page.getByLabel(messages.login.empId).fill(E2E_ADMIN.empId);
  await page.getByLabel(messages.login.password).fill(E2E_ADMIN.password);
  const loginResponse = page.waitForResponse('**/api/v1/auth/login');
  await page.getByRole('button', { name: messages.login.submit }).click();
  const body = (await (await loginResponse).json()) as {
    user: { role: string; mustChangePassword: boolean };
  };
  expect(body.user.mustChangePassword).toBe(false);
}

async function blockWrites(page: Page): Promise<void> {
  await page.route('**/api/v1/**', (route) => {
    const request = route.request();
    if (request.method() === 'GET' || request.url().endsWith('/api/v1/auth/login')) {
      return route.continue();
    }
    return route.abort();
  });
  await page.route(TODAY_PATH, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
      : route.fallback(),
  );
}

// 全画面の再読み込みは行わない(refresh 呼び出しを避ける)。アプリ内リンクを押して遷移する
async function navigateInApp(page: Page, href: string): Promise<void> {
  await page
    .locator(`a[href="${href}"]`)
    .first()
    .evaluate((el) => (el as HTMLAnchorElement).click());
  await page.waitForURL(`**${href}`);
}

function record(width: number, key: string, values: Record<string, unknown>): void {
  // viewport は要素の width と衝突しないよう別名にする
  const line = JSON.stringify({ viewport: width, key, ...values });
  console.log(`[c8] ${line}`);
  appendFileSync(path.join(OUT_DIR, 'measurements.jsonl'), `${line}\n`);
}

async function capture(page: Page, testInfo: TestInfo, width: number, name: string): Promise<void> {
  const file = path.join(OUT_DIR, `${SCREENSHOT_NAME_PREFIX}-${width}-${name}.png`);
  // 読み込み中のスケルトンを撮らないよう、通信が落ち着くまで待つ(落ち着かなければそのまま撮る)
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.screenshot({ path: file });
  await testInfo.attach(`${width}-${name}`, { path: file, contentType: 'image/png' });
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('boundingBox を取得できない(表示されていない可能性)');
  return box;
}

// 検索ボタン: 直近の親要素の幅に対する比率(sm 未満は全幅が期待)。フォーム幅も参考に記録する
async function searchButtonFill(button: Locator) {
  const buttonWidth = (await boxOf(button)).width;
  // 親の内側(padding を除いた内容幅)に対する比率。フォームの padding で外側幅と内容幅がずれるため内容幅を使う
  const { contentWidth, formWidth } = await button.evaluate((el) => {
    const parent = el.parentElement;
    if (!parent) return { contentWidth: -1, formWidth: -1 };
    const cs = getComputedStyle(parent);
    const content =
      parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
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
    const selector = 'a[href],button,input,select,textarea,[role="button"],[role="link"],[role="menuitem"]';
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

// モーダルのフッター: 2 列(同じ top)か、3 個以上の折り返し、ボタン幅、はみ出し
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

    test('shouldMeasureMobileButtonsAndModalsAndCapture', async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      await blockWrites(page);

      // SCR-001 ログイン(認証不要)
      await page.goto('/login');
      await expect(page.getByLabel(messages.login.empId)).toBeVisible();
      await capture(page, testInfo, width, 'SCR-001-login');

      await login(page);
      const dashboardTitle = page.getByRole('heading', { level: 1 });
      await expect(dashboardTitle).toBeVisible();

      // SCR-002 ダッシュボード
      await capture(page, testInfo, width, 'SCR-002-dashboard');
      const clockIn = page.getByRole('button', { name: messages.dashboard.attendance.clockInAction });
      const clockInMetrics = await targetMetrics(clockIn);
      record(width, 'C8-dashboard-clock-in', clockInMetrics);
      expect.soft(clockInMetrics.height).toBeCloseTo(48, 0);

      // BT38 CardLink「すべて見る」(テキストリンク)
      const viewAll = page.getByRole('link', { name: /すべて見る/ }).first();
      if (await viewAll.count()) {
        const m = await targetMetrics(viewAll);
        const ok = m.height >= 24 || m.clearanceFromCenter >= 12;
        record(width, 'C8-text-link-BT38-cardlink-viewAll', { ...m, meets24pxRule: ok });
        expect.soft(ok, 'テキストリンク BT38: 高さ 24 未満かつ間隔例外も不成立').toBe(true);
      } else {
        record(width, 'C8-text-link-BT38-cardlink-viewAll', { notFound: true });
      }

      // BT04 ログアウト(ユーザーメニュー内、開くだけ・押さない)
      await page.getByRole('button', { name: new RegExp(messages.nav.userMenu) }).first().click();
      const logoutLink = page.locator('#user-menu').getByText(messages.nav.logout, { exact: true }).first();
      await expect(logoutLink).toBeVisible();
      const logoutMetrics = await targetMetrics(logoutLink);
      const logoutOk = logoutMetrics.height >= 24 || logoutMetrics.clearanceFromCenter >= 12;
      record(width, 'C8-text-link-BT04-logout', { ...logoutMetrics, meets24pxRule: logoutOk });
      expect.soft(logoutOk, 'テキストリンク BT04: 高さ 24 未満かつ間隔例外も不成立').toBe(true);
      await page.keyboard.press('Escape');

      // 出勤確認モーダル(開いて閉じるまで。登録は押さない)
      await clockIn.click();
      const clockDialog = page.getByRole('dialog', { name: messages.dashboard.attendance.confirmClockInTitle });
      await expect(clockDialog).toBeVisible();
      const clockFooter = await footerMetrics(clockDialog);
      record(width, 'C8-modal-clock-in-confirm', clockFooter);
      expect.soft(clockFooter.allInside).toBe(true);
      await capture(page, testInfo, width, 'modal-clock-in-confirm');
      await closeWithEscape(page, clockDialog);

      // SCR-003 出勤(検索フォーム)
      await navigateInApp(page, '/attendance');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await capture(page, testInfo, width, 'SCR-003-attendance');
      const attendanceSearch = page.getByRole('button', { name: messages.dateRange.search }).first();
      if (await attendanceSearch.count()) {
        const fill = await searchButtonFill(attendanceSearch);
        record(width, 'C8-search-attendance', fill);
        if (width < 640) expect.soft(fill.ratioToParent).toBeGreaterThanOrEqual(0.98);
      }

      // SCR-004 休暇管理
      await navigateInApp(page, '/leaves');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await capture(page, testInfo, width, 'SCR-004-leaves');
      const leaveSearch = page.getByRole('button', { name: messages.leaves.history.search }).first();
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

      // SCR-008 全体勤怠(固定 1 行、修正ボタンと社員名リンク)
      await page.route(ADMIN_ATTENDANCE_PATH, (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(FIXED_ADMIN_ATTENDANCE),
            })
          : route.fallback(),
      );
      await navigateInApp(page, '/admin/attendance');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await capture(page, testInfo, width, 'SCR-008-admin-attendance');

      const adminSearch = page.getByRole('button', { name: messages.dateRange.search }).first();
      if (await adminSearch.count()) {
        const fill = await searchButtonFill(adminSearch);
        record(width, 'C8-search-admin-attendance', fill);
        if (width < 640) expect.soft(fill.ratioToParent).toBeGreaterThanOrEqual(0.98);
      }

      // BT32・BT33 社員名リンク(テキストリンク)
      // 表示中のリンクだけ(狭い幅は表が隠れてカードのリンクになる)
      const nameLink = page.locator('a[href^="/admin/users/"]:visible').first();
      if (await nameLink.count()) {
        const m = await targetMetrics(nameLink);
        const ok = m.height >= 24 || m.clearanceFromCenter >= 12;
        record(width, 'C8-text-link-BT32-name', { ...m, meets24pxRule: ok });
        expect.soft(ok, 'テキストリンク BT32: 高さ 24 未満かつ間隔例外も不成立').toBe(true);
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
