import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 休暇管理の見た目確認。スクリーンショットは作業フォルダ(screenshots/)へ保存する。
// 横スクロールの有無・Primary 色・下部タブとの重なりは自動で判定する。
// レイアウトの細部(レファレンスとの差)は保存画像を人が Read で比較する。
const SHOT_DIR = path.resolve(__dirname, '../../.claude/work/leave-management/screenshots');

const VIEWPORTS: { name: string; width: number; height: number }[] = [
  { name: 'pc-1920', width: 1920, height: 1080 },
  { name: 'pc-1440', width: 1440, height: 900 },
  { name: 'pc-1366', width: 1366, height: 768 },
  { name: 'sp-375', width: 375, height: 812 },
  { name: 'sp-390', width: 390, height: 844 },
  { name: 'sp-430', width: 430, height: 932 },
];
// 横スクロール確認のみ(画像は保存しない)
const NARROW = { name: 'sp-320', width: 320, height: 568 };
const MOBILE_WIDTHS = [375, 390, 430];

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, '横スクロールが発生').toBeLessThanOrEqual(0);
}

// --tokens の Primary 値(--color-primary-100)と、Primary を使う要素の computed color / background を比べる
async function expectPrimaryColorsMatchToken(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const token = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary-100')
      .trim();
    const probe = document.createElement('span');
    probe.style.color = token;
    document.body.appendChild(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();

    const textTargets = Array.from(
      document.querySelectorAll<HTMLElement>('[aria-selected="true"], [aria-current="page"]'),
    );
    const bgTargets = Array.from(document.querySelectorAll<HTMLElement>('[class*="bg-primary-100"]'));
    return {
      token,
      expected,
      textColors: textTargets.map((el) => getComputedStyle(el).color),
      bgColors: bgTargets.map((el) => getComputedStyle(el).backgroundColor),
    };
  });
  expect(result.token, 'Primary トークンが読めない').not.toBe('');
  // 活性タブ・現在地リンクは最低 1 件あること(0 件なら検査できていない)
  expect(result.textColors.length, '活性タブ・現在地の要素が見つからない').toBeGreaterThan(0);
  for (const color of result.textColors) {
    expect(color, '活性要素の文字色が Primary トークンと不一致').toBe(result.expected);
  }
  for (const color of result.bgColors) {
    expect(color, 'Primary 背景色が Primary トークンと不一致').toBe(result.expected);
  }
}

// 休暇カレンダーの 7 列と曜日色を検査する。列は曜日見出しの横位置で判定し、
// 土曜は --color-calendar-saturday、日曜と祝日は --color-calendar-sunday の文字色になることを確認する
async function expectCalendarWeekendColors(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const group = document.querySelector<HTMLElement>('[role="group"][aria-label*="休暇カレンダー"]');
    if (!group) throw new Error('休暇カレンダーが見つからない');
    const probeColor = (cssVar: string): string => {
      const probe = document.createElement('span');
      probe.style.color = `var(${cssVar})`;
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const header = group.querySelector<HTMLElement>(':scope > div[aria-hidden="true"]');
    const headerCells = Array.from(header?.children ?? []) as HTMLElement[];
    const headers = headerCells.map((el) => {
      const rect = el.getBoundingClientRect();
      return { label: (el.textContent ?? '').trim(), center: (rect.left + rect.right) / 2 };
    });

    const checked: { col: number; holiday: boolean; color: string }[] = [];
    // 当日(白文字の丸)と当月外(灰色)は曜日色の対象外
    const numbers = Array.from(group.querySelectorAll<HTMLElement>('span.tabular-nums.rounded-full'));
    for (const el of numbers) {
      const className = el.className;
      if (className.includes('text-general-60') || className.includes('bg-primary-100')) continue;
      const rect = el.getBoundingClientRect();
      const center = (rect.left + rect.right) / 2;
      let col = -1;
      let best = Infinity;
      headers.forEach((h, index) => {
        const distance = Math.abs(h.center - center);
        if (distance < best) {
          best = distance;
          col = index;
        }
      });
      // PC は祝日名 span、モバイルはセルボタンの title に祝日名が入る
      const holiday =
        el.closest('[title]') !== null || el.parentElement?.querySelector('[title]') != null;
      checked.push({ col, holiday, color: getComputedStyle(el).color });
    }

    return {
      labels: headers.map((h) => h.label),
      sunday: probeColor('--color-calendar-sunday'),
      saturday: probeColor('--color-calendar-saturday'),
      headerSunday: headerCells[0] ? getComputedStyle(headerCells[0]).color : '',
      headerSaturday: headerCells[6] ? getComputedStyle(headerCells[6]).color : '',
      checked,
    };
  });

  expect(result.labels, '曜日見出しが 7 列ではない').toEqual(messages.calendar.weekdays);
  expect(result.headerSunday, '日曜見出しの色').toBe(result.sunday);
  expect(result.headerSaturday, '土曜見出しの色').toBe(result.saturday);
  expect(result.checked.length, '日付が検査できていない').toBeGreaterThan(0);
  expect(new Set(result.checked.map((c) => c.col)).size, '日付の列が 7 列そろっていない').toBe(7);
  for (const cell of result.checked) {
    if (cell.col === 0 || cell.holiday) {
      expect(cell.color, '日曜・祝日の文字色').toBe(result.sunday);
    } else if (cell.col === 6) {
      expect(cell.color, '土曜の文字色').toBe(result.saturday);
    } else {
      expect([result.sunday, result.saturday], '平日の文字色が曜日色になっている').not.toContain(
        cell.color,
      );
    }
  }
}

// 下部タブ(lg 未満)と本文の重なりを検査する。最下部までスクロールした状態で、
// タブに隠れる本文テキストが無いことを確認する。スクロール枠の中で切れている要素は除外する。
async function findTabBarOverlaps(page: Page): Promise<{ barTop: number; hits: string[] }> {
  return page.evaluate((tabLabel: string) => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const bar = document.querySelector<HTMLElement>(`nav[aria-label="${tabLabel}"]`);
    if (!bar) throw new Error('下部タブが見つからない');
    const barRect = bar.getBoundingClientRect();
    const hits: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      if (bar.contains(el) || el.closest('[aria-hidden="true"]')) continue;
      const hasText = Array.from(el.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
      );
      if (!hasText) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const overlaps =
        rect.bottom > barRect.top + 1 &&
        rect.top < barRect.bottom - 1 &&
        rect.right > barRect.left &&
        rect.left < barRect.right;
      if (!overlaps) continue;
      // 上にあるスクロール枠で切れている要素は、タブに隠れていないので除外する
      let clippedAbove = false;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowY === 'visible') continue;
        if (parent.getBoundingClientRect().bottom <= barRect.top + 1) {
          clippedAbove = true;
          break;
        }
      }
      if (!clippedAbove) hits.push((el.textContent ?? '').trim().slice(0, 30));
    }
    return { barTop: barRect.top, hits };
  }, messages.nav.tabLabel);
}

test.describe('ログイン前の画面(認証不要)', () => {
  for (const viewport of [...VIEWPORTS, NARROW]) {
    test(`shouldHaveNoHorizontalScrollOnLoginAt${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await expect(page.getByLabel(messages.login.empId)).toBeVisible();
      await expectNoHorizontalScroll(page);
      if (viewport !== NARROW) {
        await page.screenshot({
          path: path.join(SHOT_DIR, `login-${viewport.name}.png`),
          fullPage: true,
        });
      }
    });
  }
});

test.describe('ログイン後の休暇管理画面(E2E 管理者が必要)', () => {
  test.beforeAll(() => {
    // E2E アカウントの環境変数が無い環境では実行しない。未実行の理由は test-report.md に記録する
    test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため、ログイン後の画面は未検証');
  });

  async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/login');
    await page.getByLabel(messages.login.empId).fill(E2E_ADMIN.empId);
    await page.getByLabel(messages.login.password).fill(E2E_ADMIN.password);
    await page.getByRole('button', { name: messages.login.submit }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }

  const PAGES: { name: string; url: string }[] = [
    { name: 'leaves', url: '/leaves' },
    { name: 'leaves-calendar', url: '/leaves/calendar' },
    { name: 'leaves-approvals', url: '/leaves/approvals' },
  ];

  for (const viewport of VIEWPORTS) {
    for (const target of PAGES) {
      test(`shouldCapture${target.name}At${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await loginAsAdmin(page);
        await page.goto(target.url);
        await expect(page.getByRole('heading', { name: messages.leaveManagement.title })).toBeVisible();
        await expectNoHorizontalScroll(page);
        await expectPrimaryColorsMatchToken(page);
        await page.screenshot({
          path: path.join(SHOT_DIR, `${target.name}-${viewport.name}.png`),
          fullPage: true,
        });
      });
    }
  }

  for (const width of MOBILE_WIDTHS) {
    for (const target of PAGES) {
      test(`shouldNotOverlapBottomTabOn${target.name}At${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 812 });
        await loginAsAdmin(page);
        await page.goto(target.url);
        await expect(page.getByRole('heading', { name: messages.leaveManagement.title })).toBeVisible();
        const { hits } = await findTabBarOverlaps(page);
        expect(hits, '下部タブに隠れている本文').toEqual([]);
      });
    }
  }

  for (const viewport of [VIEWPORTS[1], VIEWPORTS[3]]) {
    test(`shouldShowSevenColumnsAndWeekendColorsOnCalendarAt${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await loginAsAdmin(page);
      await page.goto('/leaves/calendar');
      await expect(page.getByRole('group', { name: /休暇カレンダー/ })).toBeVisible();
      await expectCalendarWeekendColors(page);
    });
  }

  test('shouldCaptureLeaveDayModalAtPc1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);
    await page.goto('/leaves/calendar');
    const group = page.getByRole('group', { name: /休暇カレンダー/ });
    await expect(group).toBeVisible();
    // 「+N件」があればそれを押し、無ければ先頭の棒を押す
    const more = group.locator('button[aria-label*="さらに"]');
    const trigger = (await more.count()) > 0 ? more.first() : group.locator('button[aria-label]').first();
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOT_DIR, 'leave-day-modal-pc-1440.png') });
  });

  test('shouldCaptureMobileDaySelectionAtSp390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/leaves/calendar');
    const group = page.getByRole('group', { name: /休暇カレンダー/ });
    await expect(group).toBeVisible();
    // 休暇のある日(「N名」を含むセル)を選ぶ
    await group.getByRole('button', { name: /休暇 \d+名/ }).first().click();
    await page.waitForURL(/date=/);
    await page.screenshot({
      path: path.join(SHOT_DIR, 'calendar-day-select-sp-390.png'),
      fullPage: true,
    });
  });

  test('shouldCaptureScrolledBottomAtPc1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);
    await page.goto('/leaves/calendar');
    await expect(page.getByRole('heading', { name: messages.leaveManagement.title })).toBeVisible();
    // 実際にスクロールした最下部の表示で背景の連続性を判定する(fullPage 撮影は使わない)。
    // ウィンドウとスクロール枠の両方を最下部まで動かし、実際に位置が動いたことを確認する
    await page.mouse.move(700, 500);
    await page.mouse.wheel(0, 4000);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    const scrolled = await page.evaluate(() => {
      const elementScrolls = Array.from(document.querySelectorAll<HTMLElement>('*')).map(
        (el) => el.scrollTop,
      );
      return Math.max(window.scrollY, ...elementScrolls);
    });
    expect(scrolled, '最下部までスクロールできていない').toBeGreaterThan(0);
    await page.screenshot({ path: path.join(SHOT_DIR, 'leaves-calendar-pc-1440-bottom.png') });
  });
});
