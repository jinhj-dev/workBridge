import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN, E2E_INITIAL_USER } from './accounts';

// 部署管理(SCR-010)の所属社員確認モーダルの検証。開発 DB の実データを読むだけで、既存の部署・社員は変更しない。
// 空の部署はこのテストが API で作り、finally で API から削除する。
// 前提条件: db:migrate → db:seed(部署・役職) → db:e2e-accounts(E2E 管理者 900001・初回 900002)。
// 人事部のデザイナー配色の検証は選択スクリプト db:sample-users の投入データが必要で、無ければ skip する。
const t = messages.departments;
const m = t.membersModal;
const EMPTY_NAME = 'E2E所属社員確認';
const SCREENSHOT_DIR = '../.claude/work/employee-position-contact/screenshots';

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

// アクセストークンはメモリ保持のため、refresh Cookie で取り直してから API を呼ぶ
async function accessToken(page: Page): Promise<string> {
  const res = await page.request.post('/api/v1/auth/refresh');
  expect(res.status(), 'refresh に失敗しました').toBe(200);
  return ((await res.json()) as { accessToken: string }).accessToken;
}

interface Member {
  id: string;
  empId: string;
  name: string;
  hireDate: string;
  jobTitle: { id: string; name: string; tone: string } | null;
  contactEmail: string | null;
}

async function getJson<T>(page: Page, token: string, path: string): Promise<T> {
  const res = await page.request.get(`/api/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status(), path).toBe(200);
  return (await res.json()) as T;
}

// 期待値は画面と別経路(API を直接)で全ページ分取る
async function fetchAllMembers(page: Page, token: string, id: string): Promise<Member[]> {
  const all: Member[] = [];
  for (let p = 1; ; p += 1) {
    const body = await getJson<{ items: Member[]; totalPages: number }>(
      page,
      token,
      `admin/departments/${id}/members?page=${p}&limit=100`,
    );
    all.push(...body.items);
    if (p >= body.totalPages) return all;
  }
}

async function biggestDepartment(page: Page, token: string) {
  const body = await getJson<{ items: { id: string; name: string; memberCount: number }[] }>(
    page,
    token,
    'admin/departments?limit=100',
  );
  return body.items.reduce((a, b) => (b.memberCount > a.memberCount ? b : a));
}

async function openMembers(page: Page, name: string) {
  await page.goto(`/admin/departments?name=${encodeURIComponent(name)}`);
  await page
    .getByRole('button', { name: t.viewMembersLabel(name) })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: m.title });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('shouldShowDepartmentMembersFilterByNameAndKeepTotal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  const token = await accessToken(page);
  const dept = await biggestDepartment(page, token);
  const members = await fetchAllMembers(page, token, dept.id);
  expect(members.length, '社員のいる部署が必要です').toBeGreaterThan(0);

  const dialog = await openMembers(page, dept.name);
  const total = members.length;
  await expect(dialog.getByText(m.subtitle(dept.name, total))).toBeVisible();
  for (const name of [m.empId, m.name, m.hireDate, m.department, m.jobTitle, m.contact]) {
    await expect(dialog.getByRole('columnheader', { name })).toBeVisible();
  }
  await expect(dialog.getByRole('columnheader')).toHaveCount(7);
  // 1 ページ 5 名。全件(100 名超でも全ページ分)から 5 名ずつ分割される
  await expect(dialog.locator('tbody tr')).toHaveCount(Math.min(5, total));
  await expect(dialog.getByText(messages.pagination.total(total))).toBeVisible();
  await expect(dialog.getByRole('cell', { name: dept.name }).first()).toBeVisible();
  // 入社日は YYYY/MM/DD 表記
  await expect(
    dialog.getByRole('cell', { name: members[0].hireDate.replaceAll('-', '/') }).first(),
  ).toBeVisible();
  await expectNoHorizontalScroll(dialog);
  // 1440 では連絡先(メールアドレス)が省略されずに全文表示される
  const clippedContacts = await dialog
    .locator('tbody td span.truncate')
    .evaluateAll(
      (els) =>
        els.filter((el) => el.textContent?.includes('@') && el.scrollWidth > el.clientWidth).length,
    );
  expect(clippedContacts, '連絡先が省略されています').toBe(0);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-1440.png` });
  await dialog
    .getByRole('navigation', { name: messages.pagination.label })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix5-1440.png` });

  // ページ送り: 2 ページ目は次の 5 名(再読み込みなし)
  if (total > 5) {
    await dialog.getByRole('button', { name: messages.pagination.page(2) }).click();
    await expect(dialog.locator('tbody tr')).toHaveCount(Math.min(5, total - 5));
    await expect(dialog.getByText(members[5].name, { exact: true }).first()).toBeVisible();
    await dialog.getByRole('button', { name: messages.pagination.page(1) }).click();
  }

  // 検索: ページは再読み込みされず、件数は部署全体のまま
  await page.evaluate(() => {
    (window as unknown as { __marker: string }).__marker = 'alive';
  });
  const keyword = members[0].name.split(/[\s　]/)[0];
  const expected = members.filter((x) =>
    x.name
      .replace(/[\s　]/g, '')
      .toLowerCase()
      .includes(keyword.toLowerCase()),
  );
  await dialog.getByRole('searchbox', { name: m.searchLabel }).fill(keyword);
  await expect(dialog.locator('tbody tr')).toHaveCount(Math.min(5, expected.length));
  await expect(dialog.getByText(messages.pagination.total(expected.length))).toBeVisible();
  await expect(dialog.getByText(m.subtitle(dept.name, total))).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe(
    'alive',
  );
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-search-1440.png` });

  // 一致なし
  await dialog.getByRole('searchbox', { name: m.searchLabel }).fill('該当なしzzz');
  await expect(dialog.getByText(m.noResult)).toBeVisible();
  await expect(dialog.getByRole('columnheader', { name: m.empId })).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-no-result-1440.png` });

  // モーダルが画面内に収まる
  const box = (await dialog.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(900);

  // Esc で閉じる(検索欄に文字があると 1 回目の Esc はブラウザが入力を消すため、先に空にする)
  await dialog.getByRole('searchbox', { name: m.searchLabel }).fill('');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('shouldOpenMembersModalForEmptyDepartmentAndCloseWithButton', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  const token = await accessToken(page);
  const stamp = Date.now().toString().slice(-6);
  const created = await page.request.post('/api/v1/admin/departments', {
    headers: { Authorization: `Bearer ${token}` },
    data: { code: `EM${stamp}`, name: EMPTY_NAME },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };
  try {
    const dialog = await openMembers(page, EMPTY_NAME);
    await expect(dialog.getByText(m.subtitle(EMPTY_NAME, 0))).toBeVisible();
    await expect(dialog.getByText(m.empty)).toBeVisible();
    await expect(dialog.getByRole('columnheader')).toHaveCount(7);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-empty-1440.png` });
    await dialog.getByRole('button', { name: m.close }).last().click();
    await expect(dialog).toBeHidden();
  } finally {
    await page.request.delete(`/api/v1/admin/departments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

// モーダルとページのどちらにも横スクロールが出ていないこと
async function expectNoHorizontalScroll(dialog: Locator): Promise<void> {
  const overflow = await dialog
    .page()
    .evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow, 'ページが横にはみ出しています').toBe(false);
  const dialogOverflow = await dialog.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(dialogOverflow, 'モーダルが横にはみ出しています').toBe(false);
}

for (const size of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  test(`shouldShowMembersAsCardsInMobileViewport_${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAsAdmin(page);
    const token = await accessToken(page);
    const dept = await biggestDepartment(page, token);
    const members = await fetchAllMembers(page, token, dept.id);
    const dialog = await openMembers(page, dept.name);
    // 表ではなくカード。1 ページ 5 名で、表と同じ情報(社員番号・氏名・入社日・部署・役職・連絡先)を出す
    await expect(dialog.getByRole('table')).toHaveCount(0);
    const cards = dialog.getByRole('list', { name: m.listLabel }).getByRole('listitem');
    await expect(cards).toHaveCount(Math.min(5, members.length));
    const first = cards.first();
    await expect(first).toContainText(members[0].empId);
    await expect(first).toContainText(members[0].name);
    await expect(first).toContainText(dept.name);
    await expect(first).toContainText(m.hireDate + '：' + members[0].hireDate.replaceAll('-', '/'));
    // 右の矢印は飾り(操作できない)
    await expect(first.getByRole('button')).toHaveCount(0);
    await expect(first.getByRole('link')).toHaveCount(0);

    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    await expectNoHorizontalScroll(dialog);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-${size.width}.png` });

    // 本文だけがスクロールし、ヘッダー(閉じる)とフッターの閉じるボタンは画面内に残る
    const body = dialog
      .getByRole('searchbox', { name: m.searchLabel })
      .locator('xpath=ancestor::div[contains(@class,"overflow-y-auto")][1]');
    await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(dialog.getByRole('heading', { name: m.title })).toBeInViewport();
    await expect(dialog.getByRole('button', { name: m.close }).last()).toBeInViewport();
    await expect(
      dialog.getByRole('navigation', { name: messages.pagination.label }),
    ).toBeInViewport();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-${size.width}-scrolled.png` });

    // ページ送りと検索(1 ページ目へ戻る)
    if (members.length > 5) {
      await dialog.getByRole('button', { name: messages.pagination.page(2) }).click();
      await expect(first).toContainText(members[5].empId);
    }
    await dialog.getByRole('searchbox', { name: m.searchLabel }).fill('該当なしzzz');
    await expect(dialog.getByText(m.noResult)).toBeVisible();
    await expectNoHorizontalScroll(dialog);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-no-result-${size.width}.png` });
  });
}

// スマホ幅(320/375/390)のページ送りが、1・2・中間・最終ページのどれでも 1 行に収まること
const PAGINATION_SHOT_PREFIX = process.env.PAGINATION_SHOT_PREFIX ?? 'fix5';
for (const width of [320, 375, 390]) {
  test(`shouldKeepPaginationInOneRowInMobileViewport_${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await loginAsAdmin(page);
    const token = await accessToken(page);
    const dept = await biggestDepartment(page, token);
    const totalPages = Math.ceil(dept.memberCount / 5);
    test.skip(totalPages < 5, 'ページ数が足りない(5 ページ以上の部署が必要)');
    const dialog = await openMembers(page, dept.name);
    const nav = dialog.getByRole('navigation', { name: messages.pagination.label });
    const next = nav.getByRole('button', { name: messages.pagination.next });

    let current = 1;
    for (const target of [1, 2, 3, totalPages]) {
      if (target === totalPages) {
        await dialog.getByRole('button', { name: messages.pagination.page(totalPages) }).click();
        current = totalPages;
      }
      while (current < target) {
        await next.click();
        current += 1;
      }
      await expect(
        nav.getByRole('button', { name: messages.pagination.page(current) }),
      ).toHaveAttribute('aria-current', 'page');
      await nav.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${PAGINATION_SHOT_PREFIX}-${width}-p${current}.png`,
      });
      // 前へ・番号・…・次への上端がすべて同じ(= 1 行)で、モーダル内に収まる
      const tops = await nav
        .locator('li')
        .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size, `p${current} が複数行です: ${tops.join(',')}`).toBe(1);
      const navBox = (await nav.boundingBox())!;
      const dialogBox = (await dialog.boundingBox())!;
      expect(navBox.x).toBeGreaterThanOrEqual(dialogBox.x);
      expect(navBox.x + navBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width);
      await expectNoHorizontalScroll(dialog);
      // 現在ページ・前へ・次へは常に操作できる
      await expect(nav.getByRole('button', { name: messages.pagination.previous })).toBeVisible();
      await expect(next).toBeVisible();
    }
  });
}

// デスクトップ(lg 以上)の表は各行の右端に飾りの矢印を持ち、操作できない。1024/1280/1440 で 6 列が収まる
for (const width of [1024, 1280, 1440]) {
  test(`shouldShowDecorativeArrowOnEachDesktopRow_${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await loginAsAdmin(page);
    const token = await accessToken(page);
    const dept = await biggestDepartment(page, token);
    const members = await fetchAllMembers(page, token, dept.id);
    const dialog = await openMembers(page, dept.name);
    const rows = dialog.locator('tbody tr');
    await expect(rows).toHaveCount(Math.min(5, members.length));
    for (let i = 0; i < (await rows.count()); i += 1) {
      const row = rows.nth(i);
      await expect(row.locator('td').last().locator('svg[aria-hidden="true"]')).toHaveCount(1);
      await expect(row.getByRole('button')).toHaveCount(0);
      await expect(row.getByRole('link')).toHaveCount(0);
    }
    await expectNoHorizontalScroll(dialog);
    const clipped = await dialog
      .locator('tbody td span.truncate')
      .evaluateAll(
        (els) =>
          els.filter((el) => el.textContent?.includes('@') && el.scrollWidth > el.clientWidth)
            .length,
      );
    expect(clipped, '連絡先が省略されています').toBe(0);
    // 一般的な部署名(開発部など)のバッジは省略されない。バッジ内の文言は部署名と同じものだけを見る
    const clippedDept = await dialog
      .locator('tbody td:nth-child(4) span.truncate')
      .evaluateAll(
        (els) => els.filter((el) => el.scrollWidth > el.clientWidth).map((el) => el.textContent),
      );
    expect(clippedDept, '部署バッジが省略されています').toEqual([]);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix6-${width}.png` });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix7-${width}.png` });
  });
}

// 1280×620 のような高さの足りない画面でも、ヘッダー・見出し行・閉じるボタンが見えて、横スクロールが無いこと
test('shouldKeepHeaderAndCloseVisibleInShortDesktopViewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  await loginAsAdmin(page);
  const token = await accessToken(page);
  const dept = await biggestDepartment(page, token);
  const dialog = await openMembers(page, dept.name);
  await expect(dialog.getByRole('columnheader')).toHaveCount(7);
  await expectNoHorizontalScroll(dialog);
  const box = (await dialog.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(620);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-1280x620.png` });
  await dialog
    .getByRole('navigation', { name: messages.pagination.label })
    .scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('heading', { name: m.title })).toBeInViewport();
  await expect(dialog.getByRole('button', { name: m.close }).last()).toBeInViewport();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-1280x620-scrolled.png` });
});

test('shouldShowJobTitleBadgeAndContactForE2eAccountsInDevDepartment', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  const token = await accessToken(page);
  const body = await getJson<{ items: { id: string; name: string; code: string }[] }>(
    page,
    token,
    'admin/departments?limit=100',
  );
  const dev = body.items.find((d) => d.code === 'DEV');
  expect(dev, 'DEV 部署が必要です(db:seed)').toBeDefined();

  const devMembers = await fetchAllMembers(page, token, dev!.id);
  const adminName = devMembers.find((x) => x.empId === E2E_ADMIN.empId)!.name;
  const initialName = devMembers.find((x) => x.empId === E2E_INITIAL_USER.empId)!.name;
  const dialog = await openMembers(page, dev!.name);
  // 1 ページ 5 名のため、社員名で絞り込んでから行を確認する
  const search = dialog.getByRole('searchbox', { name: m.searchLabel });
  await search.fill(adminName);
  // E2E 管理者(900001): 役職「マネージャー」(VIOLET)と連絡先
  const adminRow = dialog.locator('tbody tr', { hasText: E2E_ADMIN.empId });
  await expect(adminRow).toHaveCount(1);
  const badge = adminRow.getByText('マネージャー', { exact: true });
  await expect(badge).toBeVisible();
  await expect(adminRow.getByText('e2e-admin@example.com')).toBeVisible();
  // 配色はトークン値と一致(violet: 背景 #F1EBFD・文字 #6D28D9)
  const style = await badge.evaluate((el) => {
    const s = getComputedStyle(el);
    return { background: s.backgroundColor, color: s.color };
  });
  expect(style).toEqual({ background: 'rgb(241, 235, 253)', color: 'rgb(109, 40, 217)' });

  // 入社日は YYYY/MM/DD 表記
  await expect(adminRow.getByText(/^\d{4}\/\d{2}\/\d{2}$/)).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-dev-members-1440.png` });

  // E2E 初期ユーザー(900002): 役職・連絡先なしは「—」が 2 つ
  await search.fill(initialName);
  const initialRow = dialog.locator('tbody tr', { hasText: E2E_INITIAL_USER.empId });
  await expect(initialRow).toHaveCount(1);
  await expect(initialRow.getByText(messages.common.noValue)).toHaveCount(2);
  await dialog.getByRole('button', { name: m.close }).last().click();
  await expect(dialog).toBeHidden();
});

test('shouldShowDesignerBadgeColorInHrDepartmentForScreenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  // 前提: 人事部に「デザイナー」の社員がいること(npm run db:sample-users で投入される選択データ)。
  // globalSetup は E2E 管理者・初回ユーザーだけを作るため、無い環境では検証せずに skip する
  const token = await accessToken(page);
  const body = await getJson<{ items: { id: string; code: string }[] }>(
    page,
    token,
    'admin/departments?limit=100',
  );
  const hr = body.items.find((d) => d.code === 'HR');
  expect(hr, 'HR 部署が必要です(db:seed)').toBeDefined();
  const members = await fetchAllMembers(page, token, hr!.id);
  test.skip(
    !members.some((member) => member.jobTitle?.name === 'デザイナー'),
    '人事部に「デザイナー」の社員がいないため skip(npm run db:sample-users で投入)',
  );

  const dialog = await openMembers(page, '人事部');
  // 1 ページ 5 名のため、デザイナーの社員名で絞り込む
  const designer = members.find((member) => member.jobTitle?.name === 'デザイナー')!;
  await dialog.getByRole('searchbox', { name: m.searchLabel }).fill(designer.name);
  const badge = dialog.getByText('デザイナー', { exact: true }).first();
  await expect(badge).toBeVisible();
  const style = await badge.evaluate((el) => {
    const s = getComputedStyle(el);
    return { background: s.backgroundColor, color: s.color };
  });
  // pink: 背景 #FBE8FA・文字 #A21CAF
  expect(style).toEqual({ background: 'rgb(251, 232, 250)', color: 'rgb(162, 28, 175)' });
  await badge.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/hr-members-1440.png` });
});
