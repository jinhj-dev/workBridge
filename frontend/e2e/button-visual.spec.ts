import { appendFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 共通ボタン(B3)の高さ・位置を実ブラウザで測定し、画面を撮影する。
// 測定は GET のみ実バックエンドに届く。POST・PATCH・DELETE は中断して書き込みを防ぐ(ログインだけ例外)。
// 出勤 API も固定応答にし、出勤・申請・作成のボタンは押さない。
// 撮影は Playwright の出力フォルダへ保存する(リポジトリにはコミットしない)。

const TODAY_PATH = '**/api/v1/attendance/today*';
const WIDTHS = [360, 768, 1024, 1440] as const;

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
  // 当日の出勤は未出勤に固定する(出勤ボタンを表示させるため)。GET 以外は下の制限へ渡す
  await page.route(TODAY_PATH, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
      : route.fallback(),
  );
}

async function measureBox(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('boundingBox を取得できない(表示されていない可能性)');
  return box;
}

// 全画面の再読み込みは行わない(再読み込みは refresh 呼び出しを伴うため)。アプリ内リンクを押して遷移する。
// 幅によりリンクが描画外(ドロワー内)にあっても DOM 上にあれば click で遷移できる
async function navigateInApp(page: Page, href: string): Promise<void> {
  await page
    .locator(`a[href="${href}"]`)
    .first()
    .evaluate((el) => (el as HTMLAnchorElement).click());
  await page.waitForURL(`**${href}`);
}

async function capture(page: Page, testInfo: TestInfo, width: number, name: string): Promise<void> {
  const path = testInfo.outputPath(`${width}-${name}.png`);
  await page.screenshot({ path });
  await testInfo.attach(`${width}-${name}`, { path, contentType: 'image/png' });
}

// 測定値は数値だけを記録する(画面文言やユーザー情報は含めない)。失敗しても残るよう出力フォルダへ書く
function record(
  testInfo: TestInfo,
  width: number,
  key: string,
  values: Record<string, number | string>,
): void {
  const line = JSON.stringify({ width, key, ...values });
  console.log(`[button-visual] ${line}`);
  appendFileSync(testInfo.outputPath('measurements.jsonl'), `${line}\n`);
}

// 検索入力(44px)と通常の入力(48px)の高さを分けて確認する。ログイン画面の GET のみ(認証不要)
test('shouldKeepLoginInputsAt48pxWhileSearchInputIs44px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/login');
  await expect(page.getByLabel(messages.login.empId)).toHaveCSS('height', '48px');
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
      const searchBox = await measureBox(
        page.getByPlaceholder(messages.departments.searchPlaceholder),
      );
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
      // 計算値でも 44px であることを確認する(Fix 1: 高さのクラス衝突の解消)
      await expect(page.getByPlaceholder(messages.departments.searchPlaceholder)).toHaveCSS(
        'height',
        '44px',
      );
    });
  });
}
