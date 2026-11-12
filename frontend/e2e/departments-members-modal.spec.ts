import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 部署管理(SCR-010)の所属社員確認モーダルの検証。開発 DB の実データを読むだけで、既存の部署・社員は変更しない。
// 空の部署はこのテストが API で作り、finally で API から削除する。
const t = messages.departments;
const m = t.membersModal;
const EMPTY_NAME = 'E2E所属社員確認';
const SCREENSHOT_DIR = '../.claude/work/department-redesign/screenshots';

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
  for (const name of [m.empId, m.name, m.department]) {
    await expect(dialog.getByRole('columnheader', { name })).toBeVisible();
  }
  // 役職・連絡先・入社日の列は無い
  await expect(dialog.getByRole('columnheader')).toHaveCount(3);
  // 全社員が表示される(100 名超でも全ページ分)
  await expect(dialog.locator('tbody tr')).toHaveCount(total);
  await expect(dialog.getByRole('cell', { name: dept.name }).first()).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-members-1440.png` });

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
  await expect(dialog.locator('tbody tr')).toHaveCount(expected.length);
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

  // モーダルが画面内に収まる(一覧の内部スクロールは見た目の確認で担保し、ここでは検証しない)
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
    await expect(dialog.getByRole('columnheader')).toHaveCount(3);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-empty-1440.png` });
    await dialog.getByRole('button', { name: m.close }).last().click();
    await expect(dialog).toBeHidden();
  } finally {
    await page.request.delete(`/api/v1/admin/departments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test('shouldFitMembersModalInMobileViewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await loginAsAdmin(page);
  const token = await accessToken(page);
  const dept = await biggestDepartment(page, token);
  const dialog = await openMembers(page, dept.name);
  await expect(dialog.getByRole('columnheader', { name: m.department })).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(box.y + box.height).toBeLessThanOrEqual(667);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-members-375.png` });
  await dialog.getByRole('searchbox', { name: m.searchLabel }).fill('該当なしzzz');
  await expect(dialog.getByText(m.noResult)).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/fix4-no-result-375.png` });
});
