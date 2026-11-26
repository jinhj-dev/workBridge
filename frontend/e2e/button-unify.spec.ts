import { expect, test } from '@playwright/test';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';
import { blockWrites, focusRingClipping, login, measureBox, navigateInApp } from './button-helpers';

// 詳細・編集ボタンの統一(button-unify)を実ブラウザで確認する。読み取り専用。
// GET は実バックエンドへ届く。POST・PATCH・DELETE は中断する(blockWrites)。
// 一覧の GET は固定 1 件に差し替える(承認・休暇履歴・全体勤怠の表が空でも押せるようにするため)。
// モーダルは開いて閉じるまで。保存・承認・削除は押さない。

const WIDTHS = [360, 768, 1024, 1440] as const;

const FIXED_LEAVE = {
  id: 'e2e-unify-leave-1',
  user: { id: 'e2e-unify-user-1', name: 'E2E統一確認', empId: '900098', departmentName: '営業部' },
  approver: null,
  leaveType: 'ANNUAL',
  startDate: '2026-11-20',
  endDate: '2026-11-21',
  days: 2,
  reason: 'E2E用',
  status: 'PENDING',
  autoApproved: false,
  processedBy: null,
  processedAt: null,
  rejectReason: null,
  createdAt: '2026-11-01T09:00:00+09:00',
};

const FIXED_LEAVE_PAGE = { items: [FIXED_LEAVE], page: 1, limit: 20, totalCount: 1, totalPages: 1 };

const FIXED_ADMIN_ATTENDANCE = {
  items: [
    {
      id: 'e2e-unify-att-1',
      user: {
        id: 'e2e-unify-user-1',
        name: 'E2E統一確認',
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

interface ButtonStyle {
  height: string;
  paddingLeft: string;
  paddingRight: string;
  borderColor: string;
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  borderRadius: string;
  columnGap: string;
  svgWidth: number;
  svgHeight: number;
}

// 外形の計算値。配色・余白・アイコンの大きさを比べる
async function buttonStyle(locator: Locator): Promise<ButtonStyle> {
  return locator.evaluate((el): ButtonStyle => {
    const s = getComputedStyle(el);
    const svg = el.querySelector('svg')?.getBoundingClientRect();
    return {
      height: s.height,
      paddingLeft: s.paddingLeft,
      paddingRight: s.paddingRight,
      borderColor: s.borderTopColor,
      color: s.color,
      backgroundColor: s.backgroundColor,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      borderRadius: s.borderTopLeftRadius,
      columnGap: s.columnGap,
      svgWidth: svg?.width ?? -1,
      svgHeight: svg?.height ?? -1,
    };
  });
}

// 一覧の GET を固定応答にする。承認の件数バッジ(limit=1)も同じ応答を受ける
async function fixLists(page: Page): Promise<void> {
  await page.route('**/api/v1/leaves/pending-approval?*', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(FIXED_LEAVE_PAGE),
        })
      : route.fallback(),
  );
  await page.route('**/api/v1/leaves/me?*', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(FIXED_LEAVE_PAGE),
        })
      : route.fallback(),
  );
  await page.route('**/api/v1/admin/attendance**', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(FIXED_ADMIN_ATTENDANCE),
        })
      : route.fallback(),
  );
}

// ログインし、アプリ内リンクで対象画面へ移る(再読み込みしない)
async function openScreen(page: Page, href: string): Promise<void> {
  await blockWrites(page);
  await fixLists(page);
  await page.goto('/login');
  await login(page, E2E_ADMIN);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await navigateInApp(page, href);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

// 詳細ボタン(行)。名前は画面ごとに異なる
const DETAIL_NAME: Record<string, RegExp> = {
  '/admin/users': /の詳細$/,
  '/admin/departments': /^部署「.+」の詳細を表示$/,
  '/leaves': /の申請の詳細を開く$/,
  '/leaves/approvals': /さんの申請の詳細を開く$/,
};

function firstDetailButton(page: Page, href: string): Locator {
  if (href === '/admin/departments') {
    // 表(1024 以上)とカード(360·768)の両方に当たるよう、行ではなく名前で絞る(未所属は除外)
    return page.getByRole('button', { name: /^部署「(?!未所属).+」の詳細を表示$/ }).first();
  }
  return page.getByRole('button', { name: DETAIL_NAME[href] }).first();
}

function firstEditButton(page: Page, href: string): Locator {
  if (href === '/admin/departments') {
    return page.getByRole('button', { name: /^部署「(?!未所属).+」を編集$/ }).first();
  }
  if (href === '/admin/attendance') {
    return page.getByRole('button', { name: /の勤怠を編集$/ }).first();
  }
  return page.getByRole('button', { name: /を編集$/ }).first();
}

const DETAIL_SCREENS = [
  '/admin/users',
  '/admin/departments',
  '/leaves',
  '/leaves/approvals',
] as const;

// P1: 詳細ボタンの外形は SCR-006 の基準と同じ(表の 1 行目)
test('shouldMatchDetailButtonStyleAcrossScreensAt1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const styles: Record<string, ButtonStyle> = {};
  for (const href of DETAIL_SCREENS) {
    await openScreen(page, href);
    styles[href] = await buttonStyle(firstDetailButton(page, href));
  }
  const base = styles['/admin/users'];
  expect(base.height).toBe('36px');
  expect(base.paddingLeft).toBe('12px');
  expect(base.paddingRight).toBe('12px');
  expect(base.fontSize).toBe('14px');
  expect(base.fontWeight).toBe('700');
  expect(base.borderRadius).toBe('8px');
  expect(base.columnGap).toBe('4px');
  expect(base.svgWidth).toBe(16);
  expect(base.svgHeight).toBe(16);
  for (const href of DETAIL_SCREENS) {
    expect(styles[href], href).toEqual(base);
  }
});

// P2: 編集ボタンの外形は SCR-010 の基準と同じ(SCR-006・SCR-008 でも)
test('shouldMatchEditButtonStyleAcrossScreensAt1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const screens = ['/admin/departments', '/admin/users', '/admin/attendance'] as const;
  const styles: Record<string, ButtonStyle> = {};
  for (const href of screens) {
    await openScreen(page, href);
    styles[href] = await buttonStyle(firstEditButton(page, href));
  }
  const base = styles['/admin/departments'];
  expect(base.borderColor).toBe(styles['/admin/users'].borderColor);
  expect(base.color).toBe(styles['/admin/users'].color);
  for (const href of screens) {
    expect(styles[href], href).toEqual(base);
  }
});

// P3: hover の背景色。詳細は SCR-006 の基準、編集は SCR-010 の基準と一致する
test('shouldMatchHoverBackgroundForDetailAndEdit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScreen(page, '/admin/users');
  const userDetail = firstDetailButton(page, '/admin/users');
  await userDetail.hover();
  const baseDetailHover = await userDetail.evaluate((el) => getComputedStyle(el).backgroundColor);

  await openScreen(page, '/admin/departments');
  const deptDetail = firstDetailButton(page, '/admin/departments');
  await deptDetail.hover();
  expect(await deptDetail.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    baseDetailHover,
  );

  const deptEdit = firstEditButton(page, '/admin/departments');
  await deptEdit.hover();
  const baseEditHover = await deptEdit.evaluate((el) => getComputedStyle(el).backgroundColor);

  await openScreen(page, '/admin/users');
  const userEdit = firstEditButton(page, '/admin/users');
  await userEdit.hover();
  expect(await userEdit.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(baseEditHover);
});

// P4: キーボードで届いたフォーカスの見た目。outline 2px・offset 2px・primary-100。表の枠で切れない
test('shouldShowFocusRingOnDetailAndEditWithoutClipping', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const href of ['/admin/users', '/admin/departments'] as const) {
    await openScreen(page, href);
    const target = firstDetailButton(page, href);
    await target.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(target).toBeFocused();
    const outline = await target.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        style: s.outlineStyle,
        width: s.outlineWidth,
        offset: s.outlineOffset,
        color: s.outlineColor,
      };
    });
    expect(outline.style).toBe('solid');
    expect(outline.width).toBe('2px');
    expect(outline.offset).toBe('2px');

    const ring = await focusRingClipping(target);
    expect(ring.clipped, `${href} 詳細のフォーカスリングが切れている`).toBe(false);
  }

  await openScreen(page, '/admin/departments');
  const edit = firstEditButton(page, '/admin/departments');
  const ring = await focusRingClipping(edit);
  expect(ring.clipped, '部署の編集のフォーカスリングが切れている').toBe(false);
  const editBorder = await edit.evaluate((el) => getComputedStyle(el).borderTopColor);
  const editOutline = await edit.evaluate((el) => getComputedStyle(el).outlineColor);
  expect(editOutline).toBe(editBorder);
});

// P5: キーボード操作。詳細は Enter で開き Esc で閉じ、フォーカスが同じボタンへ戻る。編集は Space で開く
test('shouldOpenDetailWithEnterAndRestoreFocusOnEscape', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScreen(page, '/admin/users');
  const detail = firstDetailButton(page, '/admin/users');
  await detail.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: messages.users.detailModal.title });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(detail).toBeFocused();
});

test('shouldOpenDepartmentEditWithSpaceWithoutSaving', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScreen(page, '/admin/departments');
  const edit = firstEditButton(page, '/admin/departments');
  await edit.focus();
  await page.keyboard.press('Space');
  const dialog = page.getByRole('dialog', { name: messages.departments.form.editTitle });
  await expect(dialog).toBeVisible();
  // 保存は押さない。閉じるだけ
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

// P6: モーダル footer の編集。社員詳細 [編集] と部署詳細 [編集] は高さ 40・Pencil 20×20。
// 枠色は SCR-010 行の編集(基準の primary-100)と比べる
test('shouldStyleModalFooterEditButtonsAt40pxWithPencil', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScreen(page, '/admin/departments');
  const baseBorder = (await buttonStyle(firstEditButton(page, '/admin/departments'))).borderColor;

  await firstDetailButton(page, '/admin/departments').click();
  const deptDialog = page.getByRole('dialog', { name: messages.departments.detailModal.title });
  await expect(deptDialog).toBeVisible();
  const deptEdit = deptDialog.getByRole('button', { name: messages.common.edit });
  await expect(deptEdit).toHaveCSS('height', '40px');
  const deptStyle = await buttonStyle(deptEdit);
  expect(deptStyle.svgWidth).toBe(20);
  expect(deptStyle.svgHeight).toBe(20);
  expect(deptStyle.borderColor).toBe(baseBorder);
  await page.keyboard.press('Escape');
  await expect(deptDialog).toHaveCount(0);

  await openScreen(page, '/admin/users');
  await firstDetailButton(page, '/admin/users').click();
  const userDialog = page.getByRole('dialog', { name: messages.users.detailModal.title });
  await expect(userDialog).toBeVisible();
  const userEdit = userDialog.getByRole('button', { name: messages.common.edit });
  await expect(userEdit).toHaveCSS('height', '40px');
  const userStyle = await buttonStyle(userEdit);
  expect(userStyle.svgWidth).toBe(20);
  expect(userStyle.borderColor).toBe(baseBorder);
  await page.keyboard.press('Escape');
});

// P7: 役職確認の編集(アイコン専用)は 36×36・基準と同じ primary-100 の枠
test('shouldStyleIconOnlyEditInJobTitlesAt36px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScreen(page, '/admin/departments');
  const baseBorder = (await buttonStyle(firstEditButton(page, '/admin/departments'))).borderColor;

  await openScreen(page, '/admin/users');
  await page.getByRole('button', { name: messages.users.jobTitleCheck }).click();
  const dialog = page.getByRole('dialog', { name: messages.jobTitles.title });
  await expect(dialog).toBeVisible();
  const edit = dialog.getByRole('button', { name: /を編集$/ }).first();
  await expect(edit).toHaveCSS('width', '36px');
  await expect(edit).toHaveCSS('height', '36px');
  expect((await buttonStyle(edit)).borderColor).toBe(baseBorder);
  await page.keyboard.press('Escape');
});

// SCR-010 の表示切替は xl(1280px) 基準。1280 未満はカード、1280 以上は表
const DEPT_TABLE_MIN_WIDTH = 1280;
// SCR-005 の表示切替も xl(1280px) 基準。1280 未満はカード、1280 以上は表
const SCR005_TABLE_MIN_WIDTH = 1280;

// SCR-005 の操作ボタンが画面内にあることを確認する。承認待ちは GET 固定応答の 1 件。
// 1280 以上は表の 1 行 [詳細][承認][却下](3 つの上端が揃う)。
// 未満はカード 1 枚で [詳細] のみ(承認・却下は詳細モーダル内。SCR-005 §5 操作列)
async function expectScr005ActionsInViewport(page: Page, width: number): Promise<void> {
  const hasDetail = page.getByRole('button', { name: DETAIL_NAME['/leaves/approvals'] });
  const isTable = width >= SCR005_TABLE_MIN_WIDTH;
  const container = isTable
    ? page.locator('tr').filter({ has: hasDetail })
    : page.locator('ul.xl\\:hidden > li').filter({ has: hasDetail });
  const buttons = container.first().getByRole('button');
  await expect(buttons).toHaveCount(isTable ? 3 : 1);
  const boxes = await Promise.all((await buttons.all()).map((b) => measureBox(b)));
  for (const box of boxes) {
    expect(box.x, 'SCR-005 ボタンの左端がビューポート外').toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, 'SCR-005 ボタンの右端がビューポート外').toBeLessThanOrEqual(
      width + 1,
    );
    if (isTable) {
      expect(Math.abs(box.y - boxes[0].y), 'SCR-005 行内の上端のずれ').toBeLessThan(1);
    }
  }
}

// P8: レスポンシブ。幅ごとに横あふれがないこと。表(1280 以上)は同じ行の詳細・編集の上端が揃う。
// SCR-005 は 1280 以上で表の行 [詳細][承認][却下]、未満でカードの [詳細] が画面内に収まる
for (const width of WIDTHS) {
  test(`shouldFitActionButtonsWithoutOverflowAt${width}`, async ({ page }, testInfo: TestInfo) => {
    test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');
    await page.setViewportSize({ width, height: 900 });
    await openScreen(page, '/admin/departments');

    const overflowOf = (): Promise<number> =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    expect(await overflowOf(), 'SCR-010 のはみ出し').toBeLessThanOrEqual(0);
    if (width >= DEPT_TABLE_MIN_WIDTH) {
      const detail = firstDetailButton(page, '/admin/departments');
      const edit = firstEditButton(page, '/admin/departments');
      const tops = await Promise.all(
        [detail, edit].map((b) => b.evaluate((el) => el.getBoundingClientRect().top)),
      );
      expect(Math.abs(tops[0] - tops[1])).toBeLessThan(1);
    }
    await page.screenshot({ path: testInfo.outputPath(`${width}-SCR-010.png`) });

    for (const href of ['/leaves', '/leaves/approvals', '/admin/users'] as const) {
      await navigateInApp(page, href);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await overflowOf(), `${href} のはみ出し`).toBeLessThanOrEqual(0);
      if (href === '/leaves/approvals') {
        await expectScr005ActionsInViewport(page, width);
      }
    }

    // 部署詳細 footer(2 ボタンの横並び)
    await navigateInApp(page, '/admin/departments');
    await firstDetailButton(page, '/admin/departments').click();
    const dialog = page.getByRole('dialog', { name: messages.departments.detailModal.title });
    await expect(dialog).toBeVisible();
    expect(await overflowOf(), '部署詳細 footer のはみ出し').toBeLessThanOrEqual(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}

// P11: SCR-010 の操作ボタン([詳細][編集][削除])が横スクロールなしに画面内で見える。
// 768〜1279 はカード、1280 以上は表。切替点(xl)の両側を確認する
for (const width of [360, 768, 1024, 1279, 1280, 1440] as const) {
  test(`shouldShowDepartmentActionButtonsInViewportAt${width}`, async ({ page }) => {
    test.skip(!E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が未設定のため実行しない');
    await page.setViewportSize({ width, height: 900 });
    await openScreen(page, '/admin/departments');

    const detail = firstDetailButton(page, '/admin/departments');
    const edit = firstEditButton(page, '/admin/departments');
    // 部署一覧の表は操作ボタンを持つ表だけを見る(画面内には統計などの別の表もある)
    const table = page.locator('table').filter({ has: detail });
    if (width >= DEPT_TABLE_MIN_WIDTH) {
      await expect(table).toBeVisible();
    } else {
      await expect(table).toBeHidden();
    }

    const remove = page.getByRole('button', { name: /^部署「(?!未所属).+」を削除$/ }).first();
    for (const button of [detail, edit, remove]) {
      await expect(button).toBeVisible();
      const box = await measureBox(button);
      expect(box.x, '左端がビューポート外').toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, '右端がビューポート外').toBeLessThanOrEqual(width + 1);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, '文書の横はみ出し').toBeLessThanOrEqual(0);
  });
}

// P9: 文言。対象 5 画面のボタンに「修正」が残らない(SCR-008 確認段階の [修正する] は保存直前のため対象外)
test('shouldNotShowShuuseiButtonTextOnUnifiedScreens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const href of [
    '/admin/users',
    '/admin/departments',
    '/leaves',
    '/leaves/approvals',
    '/admin/attendance',
  ] as const) {
    await openScreen(page, href);
    await expect(page.getByRole('button', { name: /修正/ })).toHaveCount(0);
  }
});

// P10: 画面遷移。詳細・編集はモーダルで開き、URL を変えない
test('shouldKeepUrlWhenOpeningDetailAndEditModals', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openScreen(page, '/admin/departments');
  const before = page.url();
  await firstDetailButton(page, '/admin/departments').click();
  const detailDialog = page.getByRole('dialog', { name: messages.departments.detailModal.title });
  await expect(detailDialog).toBeVisible();
  expect(page.url()).toBe(before);
  await page.keyboard.press('Escape');

  await firstEditButton(page, '/admin/departments').click();
  const editDialog = page.getByRole('dialog', { name: messages.departments.form.editTitle });
  await expect(editDialog).toBeVisible();
  expect(page.url()).toBe(before);
  await page.keyboard.press('Escape');
});
