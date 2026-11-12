import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN } from './accounts';

// 部署管理(SCR-010)の一覧スクロール・ボタン構成・部署詳細モーダルの検証。開発 DB を使う。
// 件数を制御するため、このテストが API で作る部署(名前に PREFIX を含む)だけを検索で絞り込む。
// 作った部署は finally で API から削除し、既存の部署には触れない。
const t = messages.departments;
const PREFIX = 'E2E一覧検証';
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

// アクセストークンはメモリ保持のため、refresh Cookie で取り直してから API を呼ぶ(回転するので 1 回だけ取得して使い回す)
async function accessToken(page: Page): Promise<string> {
  const res = await page.request.post('/api/v1/auth/refresh');
  expect(res.status(), 'refresh に失敗しました').toBe(200);
  return ((await res.json()) as { accessToken: string }).accessToken;
}

async function createDepartments(page: Page, token: string, from: number, to: number) {
  const stamp = Date.now().toString().slice(-6);
  for (let n = from; n <= to; n += 1) {
    const res = await page.request.post('/api/v1/admin/departments', {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: `EL${stamp}-${n}`, name: `${PREFIX}${n}`, description: `検証用 ${n}` },
    });
    expect(res.status(), `部署${n}の作成に失敗しました`).toBe(201);
  }
}

async function deleteAllTestDepartments(page: Page, token: string): Promise<void> {
  const res = await page.request.get(
    `/api/v1/admin/departments?name=${encodeURIComponent(PREFIX)}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = (await res.json()) as { items: { id: string; name: string }[] };
  for (const item of body.items.filter((d) => d.name.startsWith(PREFIX))) {
    await page.request.delete(`/api/v1/admin/departments/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function search(page: Page): Promise<void> {
  await page.getByPlaceholder(t.searchPlaceholder).fill(PREFIX);
  await expect(page).toHaveURL(/name=/);
}

// 表のデータ領域(縦スクロールする要素)
function listScroller(page: Page): Locator {
  return page.locator('table').locator('xpath=..');
}

function rowOf(page: Page, name: string): Locator {
  return page.getByRole('row').filter({ hasText: name });
}

interface Metrics {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}

async function metrics(scroller: Locator): Promise<Metrics> {
  return scroller.evaluate((el) => ({
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
    scrollTop: el.scrollTop,
  }));
}

test('shouldScrollInsideListOnlyWhenMoreThanFiveDepartments', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  const token = await accessToken(page);
  try {
    // 5 件: スクロールなし
    await createDepartments(page, token, 1, 5);
    await page.goto('/admin/departments');
    await search(page);
    await expect(rowOf(page, `${PREFIX}5`)).toBeVisible();
    const scroller = listScroller(page);
    const five = await metrics(scroller);
    expect(five.scrollHeight, '5 件ではスクロールしない').toBeLessThanOrEqual(five.clientHeight);

    // 7 件: 内部スクロール
    await createDepartments(page, token, 6, 7);
    await page.reload();
    await search(page);
    await expect(rowOf(page, `${PREFIX}7`)).toBeAttached();
    const seven = await metrics(scroller);
    expect(seven.scrollHeight, '7 件では内部スクロールする').toBeGreaterThan(seven.clientHeight);
    // 見出し 44 + 行 52 x 5 を超えない
    expect(seven.clientHeight).toBeLessThanOrEqual(304);
    await expect(scroller.getByRole('row')).toHaveCount(8); // 見出し + 7 件

    // 先頭では 1〜5 件目が完全に見え、6 件目は切れている
    const box = (await scroller.boundingBox())!;
    const visibleRows = await scroller.locator('tbody tr').evaluateAll((rows, bottom) => {
      return rows.filter((r) => r.getBoundingClientRect().bottom <= (bottom as number) + 1).length;
    }, box.y + box.height);
    expect(visibleRows).toBe(5);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix3-scroll-top-1440.png` });

    // スクロール: 見出しは固定、ページ全体は動かない
    const pageYBefore = await page.evaluate(() => window.scrollY);
    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const after = await metrics(scroller);
    expect(after.scrollTop).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageYBefore);
    const headBox = (await scroller.locator('th').first().boundingBox())!;
    expect(Math.abs(headBox.y - box.y)).toBeLessThanOrEqual(1);
    await expect(rowOf(page, `${PREFIX}7`)).toBeInViewport();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix3-scroll-bottom-1440.png` });

    // 確認ボタン: 押した行の部署の所属社員モーダルが開き、閉じてもスクロール位置は維持される
    await rowOf(page, `${PREFIX}7`)
      .getByRole('button', { name: t.viewMembersLabel(`${PREFIX}7`) })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: t.membersModal.title })).toBeVisible();
    await expect(dialog.getByText(t.membersModal.subtitle(`${PREFIX}7`, 0))).toBeVisible();
    await expect(dialog.getByText(t.membersModal.empty)).toBeVisible();
    await dialog.getByRole('button', { name: t.membersModal.close }).last().click();
    await expect(dialog).toBeHidden();
    expect((await metrics(scroller)).scrollTop).toBe(after.scrollTop);
    await expect(page.getByPlaceholder(t.searchPlaceholder)).toHaveValue(PREFIX);

    // 並び替えでも全件を保ったまま(件数は変わらない)
    await page.getByRole('button', { name: t.sort.columnLabel(t.name) }).click();
    await expect(page).toHaveURL(/sort=name&order=desc/);
    await expect(scroller.getByRole('row')).toHaveCount(8);
  } finally {
    await deleteAllTestDepartments(page, token);
  }
});

test('shouldShowDetailModalAndSwitchToEditAndStyleDeleteAsDanger', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  const token = await accessToken(page);
  try {
    await createDepartments(page, token, 1, 3);
    await page.goto('/admin/departments');
    await search(page);
    const row = rowOf(page, `${PREFIX}2`);
    await expect(row).toBeVisible();

    // 下部の「選択中の部署情報」は無い
    await expect(page.getByRole('region', { name: '選択中の部署情報' })).toHaveCount(0);
    await expect(page.getByText('選択中の部署情報')).toHaveCount(0);

    // 操作ボタンは [詳細] [編集] [削除] の順。旧「所属社員確認」ボタンは無い
    const buttons = row.locator('td').last().getByRole('button');
    await expect(buttons).toHaveText([t.detail, t.edit, t.delete]);
    await expect(row.getByRole('button', { name: '所属社員確認' })).toHaveCount(0);

    // 削除ボタンは Danger(danger-100 = #f0142f)
    const danger = await row
      .getByRole('button', { name: t.deleteLabel(`${PREFIX}2`) })
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return { color: style.color, border: style.borderTopColor };
      });
    expect(danger).toEqual({ color: 'rgb(240, 20, 47)', border: 'rgb(240, 20, 47)' });

    // 詳細モーダルは押した行の部署だけを表示
    await row.getByRole('button', { name: t.detailLabel(`${PREFIX}2`) }).click();
    const detail = page.getByRole('dialog', { name: t.detailModal.title });
    await expect(detail).toBeVisible();
    await expect(detail.getByText(`${PREFIX}2`).first()).toBeVisible();
    await expect(detail.getByText('検証用 2')).toBeVisible();
    await expect(detail.getByText(`${PREFIX}3`)).toHaveCount(0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix3-detail-modal-1440.png` });

    // 編集モーダルへ切り替え
    await detail.getByRole('button', { name: t.editSelected }).click();
    const edit = page.getByRole('dialog', { name: t.form.editTitle });
    await expect(edit).toBeVisible();
    await expect(detail).toBeHidden();
    await expect(edit.getByLabel(t.name)).toHaveValue(`${PREFIX}2`);
    await page.keyboard.press('Escape');
    await expect(edit).toBeHidden();

    // 閉じる(X)で一覧に戻る。URL は変わらない
    await row.getByRole('button', { name: t.detailLabel(`${PREFIX}2`) }).click();
    await expect(detail).toBeVisible();
    await detail.getByRole('button', { name: t.detailModal.close }).first().click();
    await expect(detail).toBeHidden();
    await expect(row).toBeVisible();
  } finally {
    await deleteAllTestDepartments(page, token);
  }
});

test('shouldFitCardListAndButtonsAt375', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginAsAdmin(page);
  const token = await accessToken(page);
  try {
    await createDepartments(page, token, 1, 3);
    await page.goto('/admin/departments');
    await search(page);
    const card = page.getByRole('listitem').filter({ hasText: `${PREFIX}2` });
    await expect(card).toBeVisible();
    await expect(card.getByRole('button')).toHaveText([t.viewMembers, t.detail, t.edit, t.delete]);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const outside = Array.from(document.querySelectorAll('button, a[href]'))
        .filter((el) => el.getBoundingClientRect().width > 0)
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.left < -1 || rect.right > window.innerWidth + 1;
        })
        .map((el) => el.getAttribute('aria-label') ?? el.textContent ?? '');
      return { horizontal: doc.scrollWidth > window.innerWidth, outside };
    });
    expect(overflow.horizontal).toBe(false);
    expect(overflow.outside).toEqual([]);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix3-cards-375.png` });

    // カードの確認・詳細も同じ部署を開く
    await card.getByRole('button', { name: t.viewMembersLabel(`${PREFIX}2`) }).click();
    const members = page.getByRole('dialog');
    await expect(members.getByRole('heading', { name: t.membersModal.title })).toBeVisible();
    await members.getByRole('button', { name: t.membersModal.close }).last().click();
    await card.getByRole('button', { name: t.detailLabel(`${PREFIX}2`) }).click();
    const detail = page.getByRole('dialog', { name: t.detailModal.title });
    await expect(detail).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/fix3-detail-modal-375.png` });
    const box = (await detail.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(376);
  } finally {
    await deleteAllTestDepartments(page, token);
  }
});
