import { expect, test } from '@playwright/test';
import { cleanupUsersData, expectNoOverflow, loginAsAdmin, openUsersPage } from './users-helpers';

// 社員管理のレスポンシブ確認(1440・1024・390・375)。横はみ出し・ボタン重なり・モーダル内スクロールを検出する
// スクリーンショットは test-results/ に保存し、レイアウトの目視確認に使う(自動比較はしない)
const VIEWPORTS = [
  { label: '1440', width: 1440, height: 900 },
  { label: '1024', width: 1024, height: 768 },
  { label: '390', width: 390, height: 844 },
  { label: '375', width: 375, height: 812 },
] as const;

test.beforeAll(() => {
  cleanupUsersData();
});

test.afterAll(() => {
  cleanupUsersData();
});

for (const viewport of VIEWPORTS) {
  test.describe(`viewport ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await openUsersPage(page);
    });

    test('shouldNotOverflowHorizontallyOnUsersPage', async ({ page }) => {
      await expectNoOverflow(page);
      await page.screenshot({
        path: `test-results/users-${viewport.label}.png`,
        fullPage: true,
      });
    });

    test('shouldUseCardListBelowLgAndTableFromLg', async ({ page }) => {
      // 表示切替は xl(1280px) 基準(lg では 8 列が入らないため)
      const table = page.getByRole('table');
      if (viewport.width < 1280) {
        await expect(table).toBeHidden();
      } else {
        await expect(table).toBeVisible();
      }
    });

    test('shouldKeepJobTitleModalBadgesAndButtonsNonOverlapping', async ({ page }) => {
      await page.getByRole('button', { name: '役職確認' }).click();
      const dialog = page.getByRole('dialog', { name: '役職確認' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: /を編集$/ }).first()).toBeVisible();
      await expectNoOverflow(page);

      const overlap = await dialog.evaluate((root) => {
        const rows = Array.from(root.querySelectorAll('tr, [data-row]'));
        return rows.some((row) => {
          const badge = row.querySelector('[class*="rounded-full"]');
          const button = row.querySelector('button');
          if (!badge || !button) return false;
          const a = badge.getBoundingClientRect();
          const b = button.getBoundingClientRect();
          return a.right > b.left && b.right > a.left && a.bottom > b.top && b.bottom > a.top;
        });
      });
      expect(overlap, '役職バッジと操作ボタンが重なっている').toBe(false);
      await page.screenshot({ path: `test-results/job-titles-${viewport.label}.png` });
    });

    test('shouldFitUserCreateModalAndKeepFooterVisible', async ({ page }) => {
      await page.getByRole('button', { name: '社員追加' }).click();
      const dialog = page.getByRole('dialog', { name: '社員追加' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: '追加する' })).toBeInViewport();
      await expectNoOverflow(page);
      await page.screenshot({ path: `test-results/user-create-${viewport.label}.png` });
    });

    test('shouldScrollModalBodyOnShortViewport', async ({ page }) => {
      // 高さ 640 の低いビューポートでも、社員追加は本文だけがスクロールし footer の追加ボタンが見える
      await page.setViewportSize({ width: viewport.width, height: 640 });
      await page.getByRole('button', { name: '社員追加' }).click();
      const dialog = page.getByRole('dialog', { name: '社員追加' });
      // モーダル本文は header と footer の間の内部スクロール領域(overflow-y-auto)
      const body = dialog.locator('.overflow-y-auto').first();
      await expect(body).toBeVisible();
      const scrollable = await body.evaluate((el) => el.scrollHeight > el.clientHeight);
      expect(scrollable).toBe(true);
      await expect(dialog.getByRole('button', { name: '追加する' })).toBeVisible();
    });

    test('shouldWrapPaginationOnNarrowWidths', async ({ page }) => {
      const pagination = page.getByRole('navigation').first();
      const box = await pagination.boundingBox();
      expect(box?.width ?? 0).toBeLessThanOrEqual(viewport.width);
      await expectNoOverflow(page);
    });
  });
}
