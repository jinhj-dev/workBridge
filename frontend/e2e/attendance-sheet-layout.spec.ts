import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 出勤簿(SCR-003)のレイアウト E2E。読み取り専用(データの作成・削除なし)。
// 左右分離・行の位置合わせ・行高・区切り線・日付形式・Pill を実ブラウザで確認し、スクリーンショットを保存する。
const s = messages.attendance.sheet;
const SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../../.claude/work/attendance-sheet-ui/screenshots',
);
const MISSING_ENV_MESSAGE = 'E2E_ADMIN_PASSWORD が必要です';
const DESKTOP_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
];

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

async function openSheet(page: Page, month: string): Promise<{ left: Locator; region: Locator }> {
  await page.goto(`/attendance?month=${month}`);
  const left = page.getByRole('table', { name: s.tableTitle });
  await expect(left).toBeVisible();
  return { left, region: page.getByRole('region', { name: s.timeline }) };
}

// ページ全体の横はみ出し量(0 以下なら横スクロールなし)
async function pageHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

// 要素の { top, height } を行ごとに返す
async function rowBoxes(table: Locator): Promise<{ top: number; height: number }[]> {
  return table.locator('tbody tr').evaluateAll((rows) =>
    rows.map((row) => {
      const rect = row.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    }),
  );
}

for (const viewport of DESKTOP_VIEWPORTS) {
  test.describe(`出勤簿レイアウト ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test('shouldKeepLayoutAlignedFixedAndFreeOfPageScroll', async ({ page }) => {
      await loginAsAdmin(page);
      const { left, region } = await openSheet(page, '2026-11');

      // E1 ページの横スクロールなし
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(pageOverflow).toBeLessThanOrEqual(0);

      // E5 行高 36 / E4 行の位置合わせ
      const leftRows = await rowBoxes(left);
      const rightRows = await rowBoxes(region.locator('table'));
      expect(leftRows).toHaveLength(30);
      expect(rightRows).toHaveLength(30);
      leftRows.forEach((box, index) => {
        expect(Math.abs(box.height - 36)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.top - rightRows[index].top)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.height - rightRows[index].height)).toBeLessThanOrEqual(1);
      });

      // E6 区切り線 2px(左領域の右罫線)
      const divider = left.locator('xpath=..');
      await expect(divider).toHaveCSS('border-right-width', '2px');
      await expect(divider).toHaveCSS('border-right-color', 'rgb(161, 167, 196)');
      const leftHeight = (await left.boundingBox())?.height ?? 0;
      const dividerHeight = (await divider.boundingBox())?.height ?? 0;
      expect(Math.abs(leftHeight - dividerHeight)).toBeLessThanOrEqual(1);

      // E2・E3 グラフ領域だけがスクロールし、左側は動かない
      const before = await left.boundingBox();
      const dividerBefore = await divider.boundingBox();
      await region.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      const after = await left.boundingBox();
      const dividerAfter = await divider.boundingBox();
      expect(after?.x).toBe(before?.x);
      expect(after?.width).toBe(before?.width);
      expect(dividerAfter?.x).toBe(dividerBefore?.x);

      // E3 日付列は横スクロール後も画面内に残る(sticky)
      const dateCellBox = await left
        .locator('tbody tr')
        .first()
        .locator('td')
        .first()
        .boundingBox();
      expect(dateCellBox?.x ?? -1).toBeGreaterThanOrEqual(0);

      // E2 グラフ領域の内側スクロール。1920 は収まり、480px 以上の幅を持つ
      const regionOverflow = await region.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      );
      const regionWidth = (await region.boundingBox())?.width ?? 0;
      if (viewport.width === 1920) {
        expect(regionOverflow).toBeLessThanOrEqual(0);
        expect(regionWidth).toBeGreaterThanOrEqual(480);
      }
      // 外側の安全網は、グラフ領域だけで収まる幅なら横スクロールしない
      const outerOverflow = await divider
        .locator('xpath=..')
        .evaluate((element) => element.scrollWidth - element.clientWidth);
      if (viewport.width >= 1366) expect(outerOverflow).toBeLessThanOrEqual(0);

      // ページを下へスクロールしても行は揃っている
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(500);
      const leftAfter = await rowBoxes(left);
      const rightAfter = await rowBoxes(region.locator('table'));
      leftAfter.forEach((box, index) => {
        expect(Math.abs(box.top - rightAfter[index].top)).toBeLessThanOrEqual(1);
      });

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `sheet-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    });
  });
}

test.describe('出勤簿の表示内容', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('shouldShowDayFormatSundayColorAndPills', async ({ page }) => {
    await loginAsAdmin(page);
    const { left } = await openSheet(page, '2026-11');

    // E7 日付形式・日曜の色
    const sunday = left.getByRole('cell', { name: '1日（日）', exact: true });
    await expect(sunday).toBeVisible();
    await expect(sunday).toHaveCSS('color', 'rgb(240, 20, 47)');
    await expect(left.getByRole('cell', { name: '8日（日）', exact: true })).toBeVisible();
    await expect(left.getByRole('cell', { name: '7日（土）', exact: true })).not.toHaveCSS(
      'color',
      'rgb(240, 20, 47)',
    );
    await expect(page.getByText('11/1(日)')).toHaveCount(0);

    // E8 Pill
    const dayOff = left.getByText(s.dayOff, { exact: true }).first();
    const normal = left.getByText(s.normalDay, { exact: true }).first();
    await expect(dayOff).toHaveCSS('background-color', 'rgb(253, 231, 234)');
    await expect(normal).toHaveCSS('background-color', 'rgb(230, 233, 244)');
    const dayOffBox = await dayOff.boundingBox();
    const normalBox = await normal.boundingBox();
    expect(dayOffBox?.height).toBe(normalBox?.height);
    const radius = await dayOff.evaluate((element) =>
      parseFloat(getComputedStyle(element).borderTopLeftRadius),
    );
    expect(radius).toBeGreaterThanOrEqual((dayOffBox?.height ?? 0) / 2);
  });

  test('shouldRenderMonthLengthsInBothTables', async ({ page }) => {
    await loginAsAdmin(page);
    // E9 月の日数(28・29・30・31)
    for (const [month, days] of [
      ['2026-02', 28],
      ['2028-02', 29],
      ['2026-11', 30],
      ['2026-10', 31],
    ] as const) {
      const { left, region } = await openSheet(page, month);
      await expect(left.locator('tbody tr')).toHaveCount(days);
      await expect(region.locator('tbody tr')).toHaveCount(days);
      const leftRows = await rowBoxes(left);
      const rightRows = await rowBoxes(region.locator('table'));
      leftRows.forEach((box, index) => {
        expect(Math.abs(box.top - rightRows[index].top)).toBeLessThanOrEqual(1);
      });
      expect(await pageHorizontalOverflow(page)).toBeLessThanOrEqual(0);
    }
  });

  // E10 ウィンドウ幅の変更後も位置合わせとページ幅が保たれる
  test('shouldKeepAlignmentAfterResizingWindow', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginAsAdmin(page);
    const { left, region } = await openSheet(page, '2026-11');
    for (const width of [1366, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(300);
      expect(await pageHorizontalOverflow(page)).toBeLessThanOrEqual(0);
      const leftRows = await rowBoxes(left);
      const rightRows = await rowBoxes(region.locator('table'));
      expect(leftRows).toHaveLength(30);
      leftRows.forEach((box, index) => {
        expect(Math.abs(box.top - rightRows[index].top)).toBeLessThanOrEqual(1);
      });
    }
  });
});

for (const width of [1024, 768]) {
  test.describe(`出勤簿 ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test(`shouldNotBreakLayoutAt${width}`, async ({ page }) => {
      await loginAsAdmin(page);
      const { left, region } = await openSheet(page, '2026-11');
      await expect(region).toBeVisible();
      // E11 タブレットでページ自体は横スクロールしない(安全網はグラフ側のみ)
      expect(await pageHorizontalOverflow(page)).toBeLessThanOrEqual(0);
      const leftRows = await rowBoxes(left);
      const rightRows = await rowBoxes(region.locator('table'));
      leftRows.forEach((box, index) => {
        expect(Math.abs(box.top - rightRows[index].top)).toBeLessThanOrEqual(1);
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `sheet-${width}.png`),
        fullPage: true,
      });
    });
  });
}
