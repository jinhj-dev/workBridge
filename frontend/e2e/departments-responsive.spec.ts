import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 部署管理(SCR-010)のレイアウト確認。横スクロール・ボタンの画面外はみ出しを検出し、スクリーンショットを保存する。
// 保存先: .claude/work/department-redesign/screenshots/
const t = messages.departments;
const SCREENSHOT_DIR = '../.claude/work/department-redesign/screenshots';

const VIEWPORTS = [
  { label: '1440', width: 1440, height: 900 },
  { label: '1366', width: 1366, height: 768 },
  { label: '390', width: 390, height: 844 },
  { label: '375', width: 375, height: 812 },
] as const;

test.beforeEach(() => {
  expect(E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が必要です').not.toBe('');
});

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(E2E_ADMIN.empId);
  await page.getByLabel(messages.login.password).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: messages.login.submit }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

// 横スクロールがなく、表示中のボタンがすべてビューポート内にあるか
async function expectNoOverflow(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const horizontalScroll = doc.scrollWidth > window.innerWidth;
    const outside = Array.from(document.querySelectorAll('button, a[href]'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
      })
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.left < -1 || rect.right > window.innerWidth + 1;
      })
      .map((el) => (el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30));
    return { horizontalScroll, outside };
  });
  expect(result.horizontalScroll, '横スクロールが発生している').toBe(false);
  expect(result.outside, '画面外にはみ出したボタン').toEqual([]);
}

for (const viewport of VIEWPORTS) {
  test(`shouldFitDepartmentsScreenAt${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loginAsAdmin(page);
    await page.goto('/admin/departments');
    await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
    await expectNoOverflow(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/departments-${viewport.label}.png`,
      fullPage: true,
    });
  });

  test(`shouldFitCreateAndEditModalsAt${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loginAsAdmin(page);
    await page.goto('/admin/departments');
    await expect(page.getByRole('heading', { name: t.title })).toBeVisible();

    // 登録モーダル
    await page.getByRole('button', { name: t.create }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(t.form.description)).toBeVisible();
    await expect(dialog.locator('#department-manager')).toBeVisible();
    const createBox = await dialog.boundingBox();
    expect(createBox?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((createBox?.x ?? 0) + (createBox?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);
    await dialog.screenshot({
      path: `${SCREENSHOT_DIR}/departments-create-modal-${viewport.label}.png`,
    });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // 編集モーダル(未所属以外の最初の行)
    await page
      .getByRole('button', { name: /^部署「.+」を編集$/ })
      .first()
      .click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: t.form.save })).toBeVisible();
    await dialog.screenshot({
      path: `${SCREENSHOT_DIR}/departments-edit-modal-${viewport.label}.png`,
    });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
}
