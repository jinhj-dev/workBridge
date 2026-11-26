import { appendFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { messages } from '../src/messages/ja';

// ボタン・レイアウトの測定 spec(button-visual / button-c8)で共有する読み取り専用ヘルパー。
// 書き込みは遮断する(GET 以外は中断。ログインだけ実バックエンドへ通す)。

export const TODAY_PATH = '**/api/v1/attendance/today*';

export interface Credentials {
  empId: string;
  password: string;
}

// ログインする。forceMustChangePassword のとき、実際のログイン応答の user.mustChangePassword だけを true に書き換える
// (開発 DB の状態は変えない。パスワード変更画面 /password を開くため)
export async function login(
  page: Page,
  credentials: Credentials,
  options: { forceMustChangePassword?: boolean } = {},
): Promise<void> {
  const forced = options.forceMustChangePassword === true;
  if (forced) {
    await page.route('**/api/v1/auth/login', async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as { user: Record<string, unknown> };
      await route.fulfill({
        response,
        json: { ...body, user: { ...body.user, mustChangePassword: true } },
      });
    });
  }
  await page.getByLabel(messages.login.empId).fill(credentials.empId);
  await page.getByLabel(messages.login.password).fill(credentials.password);
  const loginResponse = page.waitForResponse('**/api/v1/auth/login');
  await page.getByRole('button', { name: messages.login.submit }).click();
  const body = (await (await loginResponse).json()) as {
    user: { mustChangePassword: boolean };
  };
  expect(body.user.mustChangePassword).toBe(forced);
}

export async function blockWrites(page: Page): Promise<void> {
  await page.route('**/api/v1/**', (route) => {
    const request = route.request();
    if (request.method() === 'GET' || request.url().endsWith('/api/v1/auth/login')) {
      return route.continue();
    }
    return route.abort();
  });
  // 当日の出勤は未出勤に固定する(出勤ボタンを表示させるため)。GET 以外は既存の遮断へ渡す
  await page.route(TODAY_PATH, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
      : route.fallback(),
  );
}

// 全画面の再読み込みは行わない(再読み込みは refresh 呼び出しを伴うため)。アプリ内リンクを押して遷移する。
// 幅によりリンクが描画外(ドロワー内)にあっても DOM 上にあれば click で遷移できる
export async function navigateInApp(page: Page, href: string): Promise<void> {
  await page
    .locator(`a[href="${href}"]`)
    .first()
    .evaluate((el) => (el as HTMLAnchorElement).click());
  await page.waitForURL(`**${href}`);
}

export async function measureBox(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('boundingBox を取得できない(表示されていない可能性)');
  return box;
}

// フォーカスリングが表・カードの枠で切れていないか(リングの幅 4px を見込む)。button-c8・button-unify で共有
export async function focusRingClipping(locator: Locator): Promise<{
  containerFound: boolean;
  clipped: boolean;
  outlineStyle: string;
}> {
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

// 通信が落ち着くまで待ってから撮る(スケルトンを撮らない。落ち着かなければそのまま撮る)
export async function captureScreenshot(
  page: Page,
  testInfo: TestInfo,
  filePath: string,
  attachName: string,
): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.screenshot({ path: filePath });
  await testInfo.attach(attachName, { path: filePath, contentType: 'image/png' });
}

// 測定値は数値だけを追記する(画面文言やユーザー情報は含めない)。呼び出し側が実行開始時に空にしたファイルへ書く
export function appendMeasurement(
  filePath: string,
  viewport: number,
  key: string,
  values: Record<string, unknown>,
): void {
  const line = JSON.stringify({ viewport, key, ...values });
  console.log(`[measure] ${line}`);
  appendFileSync(filePath, `${line}\n`);
}
