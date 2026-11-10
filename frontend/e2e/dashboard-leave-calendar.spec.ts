import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// ダッシュボードの休暇カレンダー(SCR-002 §3-6)の E2E。
// 実バックエンドと接続するが、人数や休暇者の値は DB 状態に依存するため、構造と操作の結果だけを確かめる。
// 休暇者の表示内容(反車ラベル・EMPLOYEE の表示)は単体テスト(LeaveCalendarSection.test.tsx・DashboardView.test.tsx)で確かめる。
const t = messages.dashboard.calendar;
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR;

// 東京の今日('YYYY-MM-DD')
function tokyoToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

function monthLabelOf(ymd: string): string {
  const [year, month] = ymd.split('-');
  return messages.calendar.monthLabel(Number(year), Number(month));
}

// セルの accessible name は「2026/11/03 休暇 2名」の形
function dayCellName(ymd: string): RegExp {
  return new RegExp(`^${ymd.replaceAll('-', '/')}`);
}

function dayTitleOf(ymd: string): string {
  const [year, month, day] = ymd.split('-');
  return t.dayTitle(`${year}年${month}月${day}日`);
}

// 休暇カレンダーのカード(見出しを含む section)
function calendarCard(page: Page): Locator {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: t.title }) });
}

async function login(page: Page, empId: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(empId);
  await page.getByLabel(messages.login.password).fill(password);
  await page.getByRole('button', { name: messages.login.submit }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

// 見出しが1行に収まっているか(行数 = 高さ / 行の高さ)
async function headingLineCount(heading: Locator): Promise<number> {
  return heading.evaluate((el) => {
    const style = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    return Math.round(el.getBoundingClientRect().height / lineHeight);
  });
}

test.describe('休暇カレンダー(管理者)', () => {
  test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

  const today = tokyoToday();

  test('shouldShowCalendarWithTodayHighlighted', async ({ page }) => {
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);

    await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
    await expect(page.getByRole('table', { name: monthLabelOf(today) })).toBeVisible();
    // 今日は 1 つだけ強調される
    await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: dayCellName(today) })).toHaveAttribute(
      'aria-current',
      'date',
    );
  });

  test('shouldMoveMonthAndOpenDayModalWhenDateClicked', async ({ page }) => {
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);

    await page.getByRole('button', { name: t.nextMonth }).click();
    await expect(page.getByRole('table', { name: monthLabelOf(today) })).toHaveCount(0);
    await page.getByRole('button', { name: t.prevMonth }).click();
    await expect(page.getByRole('table', { name: monthLabelOf(today) })).toBeVisible();

    // 今日を開く。休暇者の有無に関わらず、モーダルの題名と「一覧表 または 空の文言」が出る
    await page.getByRole('button', { name: dayCellName(today) }).click();
    const dialog = page.getByRole('dialog', { name: dayTitleOf(today) });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('table').or(dialog.getByText(t.empty))).toBeVisible();
  });

  test('shouldCaptureCalendarScreenshotsDesktopAndNarrow', async ({ page }) => {
    test.skip(!SCREENSHOT_DIR, 'E2E_SCREENSHOT_DIR が未設定のため撮影しない');
    await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
    const heading = page.getByRole('heading', { name: t.title });
    await expect(heading).toBeVisible();
    const card = calendarCard(page);

    // デスクトップ・375px・360px をすべて撮影してから、狭い幅では見出しが 1 行であることを確かめる
    const lineCounts: Record<number, number> = {};
    for (const [width, name] of [
      [1280, 'desktop-1280'],
      [375, 'mobile-375'],
      [360, 'mobile-360'],
    ] as const) {
      await page.setViewportSize({ width, height: 812 });
      await card.scrollIntoViewIfNeeded();
      await card.screenshot({ path: `${SCREENSHOT_DIR}/calendar-${name}.png` });
      lineCounts[width] = await headingLineCount(heading);
    }
    expect(lineCounts[375], '375px で見出しが 1 行').toBe(1);
    expect(lineCounts[360], '360px で見出しが 1 行').toBe(1);
  });
});
