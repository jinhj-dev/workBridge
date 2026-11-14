import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// モーダル共通規約(フォーカス・Esc・送信中の操作止め)を実ブラウザで確認する。
// 出勤 API は page.route で応答を差し替え、開発 DB には出勤を書き込まない(1 日 1 回制限のため)。
// 当日の勤怠取得も未出勤の応答に固定し、ボタンの状態を毎回同じにする。
const t = messages.dashboard;

const CLOCK_IN_PATH = '**/api/v1/attendance/clock-in';
const TODAY_PATH = '**/api/v1/attendance/today*';

test.describe('モーダルのフォーカス・Esc・送信中', () => {
  test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');

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

  function clockInButton(page: Page) {
    return page.getByRole('button', { name: t.attendance.clockInAction });
  }

  function confirmDialog(page: Page) {
    return page.getByRole('dialog', { name: t.attendance.confirmClockInTitle });
  }

  test('shouldHandleFocusEscapeAndSubmittingInClockInConfirm', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // 未出勤の状態に固定(GET のみ差し替え)
    await page.route(TODAY_PATH, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
        : route.continue(),
    );
    // 出勤 API は手動で解放するまで保留し、応答は DB に触れず固定の値を返す
    let releaseClockIn: () => void = () => undefined;
    const clockInReleased = new Promise<void>((resolve) => (releaseClockIn = resolve));
    await page.route(CLOCK_IN_PATH, async (route) => {
      await clockInReleased;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-mock',
          user: { id: 'e2e-mock', name: 'E2E', empId: E2E_ADMIN.empId, departmentName: null },
          workDate: '2026-01-01',
          clockIn: '2026-01-01T09:00:00+09:00',
          clockOut: null,
          workMinutes: null,
          status: 'WORKING',
          modifiedAt: null,
        }),
      });
    });

    await page.goto('/login');
    await login(page);
    await expect(page.getByRole('heading', { level: 1, name: /、.+さん$/ })).toBeVisible();

    // ① 開いた直後の初期フォーカスは [登録する](X ではない)
    await clockInButton(page).click();
    const dialog = confirmDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: t.attendance.confirm })).toBeFocused();

    // ② Esc で閉じ、開いた出勤ボタンへフォーカスが戻る
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(clockInButton(page)).toBeFocused();

    // ③ 送信中は Esc を連打しても閉じず、X と キャンセル が無効になる
    await clockInButton(page).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: t.attendance.confirm }).click();
    await expect(dialog.getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: messages.common.close })).toBeDisabled();
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();

    // ④ 応答後はモーダルが閉じ、出勤済みの表示に切り替わる。終了時のフォーカス位置を記録する
    releaseClockIn();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(t.attendance.working)).toBeVisible();
    const focusedLabel = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.tagName.toLowerCase()} ${el.textContent?.trim().slice(0, 40) ?? ''}` : 'none';
    });
    test.info().annotations.push({ type: 'focus-after-clock-in', description: focusedLabel });
  });

  test('shouldSizeFooterButtons40pxAndCloseIconRadius8px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // 未出勤の状態に固定(GET のみ差し替え)。モーダルを開くだけで出勤 API は呼ばない
    await page.route(TODAY_PATH, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
        : route.continue(),
    );

    await page.goto('/login');
    await login(page);
    await expect(page.getByRole('heading', { level: 1, name: /、.+さん$/ })).toBeVisible();

    await clockInButton(page).click();
    const dialog = confirmDialog(page);
    await expect(dialog).toBeVisible();
    // フッターのボタンは md 高さ(40px)
    await expect(dialog.getByRole('button', { name: t.attendance.confirm })).toHaveCSS(
      'height',
      '40px',
    );
    await expect(dialog.getByRole('button', { name: messages.common.cancel })).toHaveCSS(
      'height',
      '40px',
    );
    // 閉じる(X)は ghost の角丸(8px)
    await expect(dialog.getByRole('button', { name: messages.common.close })).toHaveCSS(
      'border-radius',
      '8px',
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
