import { execSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 休暇カレンダー(モバイル)の表示崩れと、日付・表示範囲の切替でページが再読み込みされないことの E2E。
// 実バックエンド・開発 DB と接続する。固定月(2026-11)のサンプルを入れ替える(PLAYWRIGHT_BASE_URL 指定時は触らない)。
const t = messages.leaveCalendar;
const E2E_MONTH = '2026-11';
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
];

test.beforeAll(() => {
  expect(E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が必要です').not.toBe('');
  if (process.env.PLAYWRIGHT_BASE_URL) return;
  const cwd = path.resolve(__dirname, '../../backend');
  execSync(`npm run db:e2e-leave-calendar-fixture -- --month=${E2E_MONTH}`, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
});

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(E2E_ADMIN.empId);
  await page.getByLabel(messages.login.password).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: messages.login.submit }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function box(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const result = await locator.boundingBox();
  expect(result).not.toBeNull();
  return result as { x: number; y: number; width: number; height: number };
}

for (const viewport of VIEWPORTS) {
  test(`shouldKeepMobileLayoutInsideBoundsAt${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await loginAsAdmin(page);
    await page.goto(`/leaves/calendar?month=${E2E_MONTH}&date=2026-11-12`);

    const list = page.getByRole('region', { name: t.dayTitle('11月12日（木）') });
    await expect(list).toBeVisible();

    // ページ全体が横にはみ出さない
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // 凡例: 見出し・休暇・特別休暇の 3 行(上から順に縦並び)で、親の幅を超えない
    const legend = page.getByRole('list').filter({ hasText: t.legend }).first();
    const legendItems = legend.getByRole('listitem');
    await expect(legendItems).toHaveCount(3);
    const legendBox = await box(legend);
    const itemBoxes = await Promise.all([0, 1, 2].map((i) => box(legendItems.nth(i))));
    expect(itemBoxes[1].y).toBeGreaterThan(itemBoxes[0].y + itemBoxes[0].height - 1);
    expect(itemBoxes[2].y).toBeGreaterThan(itemBoxes[1].y + itemBoxes[1].height - 1);
    for (const item of itemBoxes) {
      expect(item.x + item.width).toBeLessThanOrEqual(legendBox.x + legendBox.width + 0.5);
    }
    const legendScroll = await legend.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(legendScroll).toBeLessThanOrEqual(0);

    // 休暇予定の見出しと [選択日 | 月全体] が同じ行で、カードの幅に収まる
    const heading = list.getByRole('heading');
    const dayButton = list.getByRole('button', { name: t.segmentDay });
    const monthButton = list.getByRole('button', { name: t.segmentMonth });
    const [headingBox, dayBox, monthBox, listBox] = await Promise.all([
      box(heading),
      box(dayButton),
      box(monthButton),
      box(list),
    ]);
    expect(Math.abs(headingBox.y + headingBox.height / 2 - (dayBox.y + dayBox.height / 2))).toBeLessThan(
      dayBox.height / 2,
    );
    expect(Math.abs(dayBox.y - monthBox.y)).toBeLessThan(2);
    expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(dayBox.x + 0.5);
    expect(monthBox.x + monthBox.width).toBeLessThanOrEqual(listBox.x + listBox.width);
    expect(dayBox.height).toBeGreaterThanOrEqual(32);
    const headingClipped = await heading.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(headingClipped).toBeLessThanOrEqual(0);

    // 選択日の輪郭: 同じ週の休暇チップが輪郭の外へはみ出さない(1 日だけの休暇チップ)
    const selected = page.getByRole('button', { name: t.cellLabel('11月12日（木）', 6) });
    const selectedBox = await box(selected);
    const chips = await page
      .locator('[aria-hidden="true"].pointer-events-none span.overflow-hidden')
      .evaluateAll((els) =>
        els.map((el) => {
          const rect = el.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }),
      );
    const chipsInSelectedRow = chips.filter(
      (chip) => chip.y >= selectedBox.y && chip.y + chip.height <= selectedBox.y + selectedBox.height,
    );
    expect(chipsInSelectedRow.length).toBeGreaterThan(0);
    for (const chip of chipsInSelectedRow) {
      const overlapsSelected = chip.x < selectedBox.x + selectedBox.width && chip.x + chip.width > selectedBox.x;
      if (!overlapsSelected) continue;
      // 選択セルの左右 2px 以上内側(輪郭 1.5px の内側)に収まる側の端だけ検査する。複数日にまたがる棒は端が他セルへ続く
      if (chip.x >= selectedBox.x) expect(chip.x).toBeGreaterThanOrEqual(selectedBox.x + 2);
      if (chip.x + chip.width <= selectedBox.x + selectedBox.width) {
        expect(chip.x + chip.width).toBeLessThanOrEqual(selectedBox.x + selectedBox.width - 2);
      }
    }

    await page.screenshot({
      path: path.resolve(
        __dirname,
        `../../.claude/work/leave-management/screenshots/fix4-legend-${viewport.width}.png`,
      ),
      fullPage: true,
    });
    testInfo.annotations.push({ type: 'viewport', description: `${viewport.width}` });
  });
}

test('shouldNotReloadPageWhenSelectingDateOrSwitchingRange', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS[0]);
  await loginAsAdmin(page);
  await page.goto(`/leaves/calendar?month=${E2E_MONTH}&date=2026-11-12`);
  await expect(page.getByRole('region', { name: t.dayTitle('11月12日（木）') })).toBeVisible();

  // 全体再読み込み(window のリセット)・カレンダーの作り直し・読み込み表示への置き換え・RSC/API 再取得を検知する
  const requests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/v1/leaves/calendar') || url.includes('_rsc=')) requests.push(url);
  });
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.evaluate((loadingText) => {
    const win = window as unknown as { __marker: string; __loadingSeen: number };
    win.__marker = 'alive';
    win.__loadingSeen = 0;
    const group = document.querySelector('[role="group"][aria-label*="2026"]');
    group?.setAttribute('data-e2e-node', 'same');
    new MutationObserver(() => {
      // Toast の入れ物(空の role=status)ではなく、読み込み表示(文言入り)だけを数える
      const loading = Array.from(document.querySelectorAll('[role="status"]')).find((el) =>
        el.textContent?.includes(loadingText),
      );
      if (loading) win.__loadingSeen += 1;
    }).observe(document.body, { childList: true, subtree: true });
  }, messages.common.loading);

  async function expectAlive(): Promise<void> {
    const state = await page.evaluate(() => ({
      marker: (window as unknown as { __marker?: string }).__marker,
      loading: (window as unknown as { __loadingSeen: number }).__loadingSeen,
      sameNode: document.querySelector('[data-e2e-node="same"]') !== null,
    }));
    expect(state.marker).toBe('alive');
    expect(state.loading).toBe(0);
    expect(state.sameNode).toBe(true);
  }

  // 日付を選ぶ(休暇の無い日 → 休暇のある日)
  await page.getByRole('button', { name: t.cellLabel('11月20日（金）', 0) }).click();
  await expect(page).toHaveURL(/date=2026-11-20/);
  await expect(page.getByText(t.emptyDay)).toBeVisible();
  await expect(page.getByRole('button', { name: t.cellLabel('11月20日（金）', 0) })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectAlive();
  await page.getByRole('button', { name: t.cellLabel('11月12日（木）', 6) }).click();
  await expect(page).toHaveURL(/date=2026-11-12/);
  await expect(page.getByRole('region', { name: t.dayTitle('11月12日（木）') })).toBeVisible();
  await expectAlive();

  // 選択日 / 月全体
  const monthButton = page.getByRole('button', { name: t.segmentMonth });
  await monthButton.click();
  await expect(page).toHaveURL(/view=month/);
  await expect(monthButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: t.listTitle })).toBeVisible();
  await expectAlive();
  const dayButton = page.getByRole('button', { name: t.segmentDay });
  await dayButton.click();
  await expect(dayButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: t.dayTitle('11月12日（木）') })).toBeVisible();
  await expect(page).not.toHaveURL(/view=month/);
  await expectAlive();

  // 既に取得済みの月は再取得しない(API・RSC リクエストが 0 件)
  expect(requests).toEqual([]);
  // 通常のブラウザナビゲーション(ドキュメント再読み込み)は発生していない(URL の更新のみ)
  expect(navigations.every((url) => url.includes('/leaves/calendar'))).toBe(true);
});
