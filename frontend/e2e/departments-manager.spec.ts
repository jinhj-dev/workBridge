import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { messages } from '../src/messages/ja';
import { E2E_ADMIN, E2E_INITIAL_USER } from './accounts';

// 部署管理の追加検証(責任者・未所属の扱い・権限・検索と並び替え)。開発 DB を使う。
// 作成した部署は同じテストの中で削除する。残すのは E2E アカウント初期化で作られる DEV 部署のみ。
const t = messages.departments;
const ADMIN_EMP_ID = E2E_ADMIN.empId;
const CANDIDATE_API = '/api/v1/admin/departments/manager-candidates';

test.beforeEach(() => {
  expect(E2E_ADMIN.password, 'E2E_ADMIN_PASSWORD が必要です').not.toBe('');
});

async function login(page: Page, empId: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.login.empId).fill(empId);
  await page.getByLabel(messages.login.password).fill(password);
  await page.getByRole('button', { name: messages.login.submit }).click();
}

async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, E2E_ADMIN.empId, E2E_ADMIN.password);
  await expect(page).toHaveURL(/\/dashboard$/);
}

function uniqueCode(prefix: string): string {
  return `${prefix}${Date.now().toString().slice(-8)}`;
}

// アクセストークンはメモリ保持のため、refresh Cookie で取り直してから API を呼ぶ
async function accessToken(page: Page): Promise<string> {
  const res = await page.request.post('/api/v1/auth/refresh');
  expect(res.status(), 'refresh に失敗しました').toBe(200);
  const body = (await res.json()) as { accessToken: string };
  return body.accessToken;
}

async function getJson<T>(page: Page, token: string, path: string): Promise<T> {
  const res = await page.request.get(path, { headers: { Authorization: `Bearer ${token}` } });
  expect(res.status(), `GET ${path} が失敗しました`).toBe(200);
  return (await res.json()) as T;
}

// テストが作った部署を API で後片付けする(UI の削除が途中で失敗した場合の保険)
// refresh は回転するため、1 回だけ取得したトークンを使い回す
async function removeDepartmentByName(page: Page, name: string): Promise<void> {
  const token = await accessToken(page);
  const body = await getJson<{ items: { id: string; name: string }[] }>(
    page,
    token,
    `/api/v1/admin/departments?name=${encodeURIComponent(name)}&limit=100`,
  );
  for (const item of body.items.filter((d) => d.name === name)) {
    await page.request.delete(`/api/v1/admin/departments/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function openCreateModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: t.create }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

// 責任者入力欄でサーバー検索し、社員番号が一致する候補を選ぶ
// 候補の表示は「{氏名} ({社員番号}) / {部署名}」。選んだ氏名を返す
async function pickManagerByServerSearch(page: Page, keyword: string): Promise<string> {
  const combobox = page.locator('#department-manager');
  const search = page.waitForResponse(
    (res) => res.url().includes(CANDIDATE_API) && res.url().includes(`keyword=${keyword}`),
  );
  await combobox.fill(keyword);
  await search;
  const option = page
    .getByRole('option')
    .filter({ hasText: `(${keyword})` })
    .first();
  const optionText = (await option.innerText()).trim();
  await option.click();
  return optionText.split(' (')[0] ?? optionText;
}

test('shouldBlockEmployeeFromAdminDepartmentsPage', async ({ page }) => {
  test.skip(E2E_INITIAL_USER.password === '', 'E2E_INITIAL_PASSWORD が未設定のため skip');
  await login(page, E2E_INITIAL_USER.empId, E2E_INITIAL_USER.password);
  // 初回の社員は /password へ、それ以外は /dashboard へ。どちらでも部署管理は表示されない
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/admin/departments');
  await expect(page).not.toHaveURL(/\/admin\/departments$/);
  await expect(page.getByRole('heading', { name: t.title })).toHaveCount(0);
});

test('shouldAssignManagerFromOtherDepartmentAndRelease', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.goto('/admin/departments');

  const code = uniqueCode('E2EM');
  const name = `E2E責任者${code}`;
  try {
    // 未所属ではない新規部署に、別部署(DEV)所属の E2E 管理者を責任者として登録する
    await openCreateModal(page);
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(t.code).fill(code);
    await dialog.getByLabel(t.name).fill(name);
    await dialog.getByLabel(t.form.description).fill('E2E 用の説明文');
    const managerName = await pickManagerByServerSearch(page, ADMIN_EMP_ID);
    await dialog.getByRole('button', { name: t.form.create }).click();
    await expect(page.getByText(t.form.created)).toBeVisible();

    await page.getByPlaceholder(t.searchPlaceholder).fill(name);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText(managerName);

    // 部署詳細モーダルにも責任者が出る
    await row.getByRole('button', { name: t.detailLabel(name) }).click();
    const detail = page.getByRole('dialog', { name: t.detailModal.title });
    await expect(detail).toContainText(managerName);
    await detail.getByRole('button', { name: t.detailModal.close }).last().click();
    await expect(detail).toBeHidden();

    // 責任者を空にして保存 → 未設定
    await row.getByRole('button', { name: t.editLabel(name) }).click();
    await dialog.locator('#department-manager').fill('');
    await dialog.locator('#department-manager').blur();
    await dialog.getByRole('button', { name: t.form.save }).click();
    await expect(page.getByText(t.form.updated)).toBeVisible();
    // 一覧の責任者列は未設定を「—」で表す(詳細パネルには「未設定」)
    await expect(page.getByRole('row').filter({ hasText: name })).not.toContainText(managerName);
    await expect(page.getByRole('row').filter({ hasText: name })).toContainText(
      messages.common.noValue,
    );
  } finally {
    // 作成した部署は後片付け(削除できない場合は API で削除)
    await removeDepartmentByName(page, name);
  }
});

test('shouldAllowSameManagerOnTwoDepartments', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.goto('/admin/departments');

  const codeA = uniqueCode('E2EA');
  const codeB = uniqueCode('E2EB');
  const nameA = `E2E兼任A${codeA}`;
  const nameB = `E2E兼任B${codeB}`;
  let managerName = '';
  try {
    for (const [code, name] of [
      [codeA, nameA],
      [codeB, nameB],
    ] as const) {
      await openCreateModal(page);
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel(t.code).fill(code);
      await dialog.getByLabel(t.name).fill(name);
      managerName = await pickManagerByServerSearch(page, ADMIN_EMP_ID);
      await dialog.getByRole('button', { name: t.form.create }).click();
      await expect(page.getByText(t.form.created)).toBeVisible();
    }

    // 同じ社員が両方の部署で責任者として保存される(兼任可)
    await page.getByPlaceholder(t.searchPlaceholder).fill('E2E兼任');
    await expect(page.getByRole('row').filter({ hasText: nameA })).toContainText(managerName);
    await expect(page.getByRole('row').filter({ hasText: nameB })).toContainText(managerName);
  } finally {
    await removeDepartmentByName(page, nameA);
    await removeDepartmentByName(page, nameB);
  }
});

test('shouldShowDepartmentCountExcludingUnassigned', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);

  const token = await accessToken(page);
  const summary = await getJson<{ departmentCount: number }>(
    page,
    token,
    '/api/v1/admin/departments/summary',
  );
  const list = await getJson<{ totalCount: number }>(
    page,
    token,
    '/api/v1/admin/departments?limit=1',
  );
  // 一覧の総数には未所属が含まれるため、部署数は総数 - 1
  expect(summary.departmentCount).toBe(list.totalCount - 1);

  await page.goto('/admin/departments');
  const card = page.getByText(t.summary.departments, { exact: true }).locator('xpath=..');
  await expect(card).toContainText(String(summary.departmentCount));
});

test('shouldSearchByNameAndSortByColumnHeader', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.goto('/admin/departments');

  // 部署名ヘッダ: 1回目で降順、2回目で昇順(初期は昇順)
  const nameHeader = page.getByRole('button', { name: t.sort.columnLabel(t.name) });
  await nameHeader.click();
  await expect(page).toHaveURL(/sort=name&order=desc/);
  await nameHeader.click();
  await expect(page).not.toHaveURL(/order=desc/);

  // 検索: 該当なし → 空の表示、クリアで戻る
  await page.getByPlaceholder(t.searchPlaceholder).fill('存在しない部署名ZZZ');
  await expect(page).toHaveURL(/name=/);
  await expect(page.getByText(t.empty)).toBeVisible();
  await page.getByRole('button', { name: t.clear }).click();
  await expect(page).toHaveURL(/\/admin\/departments$/);
  await expect(page.getByRole('row').filter({ hasText: 'UNASSIGNED' })).toBeVisible();
});
