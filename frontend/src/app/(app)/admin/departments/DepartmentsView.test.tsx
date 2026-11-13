import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { DepartmentDetail, Paginated } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { DepartmentsView } from './DepartmentsView';

const t = messages.departments;

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/departments',
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

function dept(overrides: Partial<DepartmentDetail>): DepartmentDetail {
  return {
    id: 'd-1',
    code: 'DEV',
    name: '開発部',
    memberCount: 0,
    inactiveMemberCount: 0,
    isSystem: false,
    description: null,
    manager: null,
    createdAt: '2026-11-01T09:00:00+09:00',
    updatedAt: '2026-11-08T09:00:00+09:00',
    ...overrides,
  };
}

const EMPTY_DEPT = dept({ id: 'd-1', code: 'DEV', name: '開発部', memberCount: 0 });
const USED_DEPT = dept({ id: 'd-2', code: 'SALES', name: '営業部', memberCount: 3 });
const SYSTEM_DEPT = dept({ id: 'd-3', code: 'UNASSIGNED', name: '未所属', isSystem: true });

function pageOf(items: DepartmentDetail[], page = 1, totalPages = 1): Paginated<DepartmentDetail> {
  return { items, page, limit: 20, totalCount: items.length, totalPages };
}

const SUMMARY = { departmentCount: 8, memberCount: 120 };

// 要約(API-DEPT-007)・所属社員(API-DEPT-008)・一覧を振り分ける
function respond(items: DepartmentDetail[], path: string, init?: RequestInit) {
  if (init?.method) return Promise.resolve(undefined);
  if (path.startsWith('/admin/departments/summary')) return Promise.resolve(SUMMARY);
  if (path.startsWith('/admin/departments/manager-candidates')) return Promise.resolve([]);
  if (path.includes('/members')) {
    return Promise.resolve({
      items: [
        {
          id: 'u-1',
          empId: '00001',
          name: '山田 太郎',
          hireDate: '2020-04-01',
          jobTitle: null,
          contactEmail: null,
        },
      ],
      page: 1,
      limit: 20,
      totalCount: 1,
      totalPages: 1,
    });
  }
  return Promise.resolve(pageOf(items));
}

function mockList(items: DepartmentDetail[]) {
  apiFetch.mockImplementation((path: string, init?: RequestInit) => respond(items, path, init));
}

function renderView() {
  render(
    <ToastProvider>
      <DepartmentsView />
    </ToastProvider>,
  );
}

// md 以上の表(jsdom では CSS が効かないため表と一覧の両方が存在する)
function tableRow(name: string): HTMLElement {
  return screen.getByRole('cell', { name: new RegExp(name) }).closest('tr') as HTMLElement;
}

beforeEach(() => {
  apiFetch.mockReset();
  router.push.mockReset();
  nav.search = '';
  // 所属社員確認モーダルが画面幅(表かカードか)の判定に使う。jsdom には matchMedia が無い
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

describe('DepartmentsView(SCR-010 部署管理)', () => {
  it('shouldShowRowsWithCodeNameAndMemberCount', async () => {
    mockList([EMPTY_DEPT, USED_DEPT]);
    renderView();
    const row = await waitFor(() => tableRow('営業部'));
    expect(within(row).getByText('SALES')).toBeInTheDocument();
    expect(within(row).getByText('3名')).toBeInTheDocument();
    // 有効な社員のみを数える旨の案内は notes 一覧の末尾に表示される
    expect(screen.getByText('※ 所属社員数は有効な社員のみを数えます。')).toBeInTheDocument();
  });

  it('shouldHideEditAndDeleteForSystemDepartmentAndShowBadge', async () => {
    mockList([SYSTEM_DEPT]);
    renderView();
    const row = await waitFor(() => tableRow('未所属'));
    expect(within(row).getByText(t.system)).toBeInTheDocument();
    // 未所属は詳細と所属社員の確認のみ(編集・削除なし)
    expect(within(row).queryByRole('button', { name: t.editLabel('未所属') })).toBeNull();
    expect(within(row).queryByRole('button', { name: t.deleteLabel('未所属') })).toBeNull();
    expect(within(row).getByRole('button', { name: t.detailLabel('未所属') })).toBeInTheDocument();
    expect(
      within(row).getByRole('button', { name: t.viewMembersLabel('未所属') }),
    ).toBeInTheDocument();
  });

  it('shouldShowEmptyMessageWhenNoDepartments', async () => {
    mockList([]);
    renderView();
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('shouldShowErrorWithRetryWhenListFails', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, 'INTERNAL', 'error', []));
    renderView();
    expect(await screen.findByRole('button', { name: messages.common.retry })).toBeInTheDocument();
  });

  it('shouldReplaceUrlWithTrimmedNameAndPageOneAfterDebounce', async () => {
    nav.search = 'page=3';
    mockList([EMPTY_DEPT]);
    renderView();
    await waitFor(() => tableRow('開発部'));
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(t.searchPlaceholder), ' 開発 ');
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/admin/departments?name=%E9%96%8B%E7%99%BA'),
    );
  });

  it('shouldPushSortWithDefaultOrderWhenSortHeaderClicked', async () => {
    mockList([EMPTY_DEPT]);
    renderView();
    await waitFor(() => tableRow('開発部'));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: t.sort.columnLabel(t.memberCount) }));
    expect(router.push).toHaveBeenCalledWith('/admin/departments?sort=memberCount&order=desc');
  });

  it('shouldToggleOrderWhenSameSortHeaderClicked', async () => {
    nav.search = 'sort=updatedAt&order=desc';
    mockList([EMPTY_DEPT]);
    renderView();
    await waitFor(() => tableRow('開発部'));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: t.sort.columnLabel(t.updatedAt) }));
    expect(router.push).toHaveBeenCalledWith('/admin/departments?sort=updatedAt&order=asc');
  });

  it('shouldClearAllConditionsWhenClearClicked', async () => {
    nav.search = 'name=a&sort=updatedAt&order=desc&page=2';
    mockList([EMPTY_DEPT]);
    renderView();
    await waitFor(() => tableRow('開発部'));
    await userEvent.click(screen.getByRole('button', { name: t.clear }));
    expect(router.push).toHaveBeenCalledWith('/admin/departments');
  });

  it('shouldDisableClearWhenNoConditions', async () => {
    nav.search = '';
    mockList([EMPTY_DEPT]);
    renderView();
    await waitFor(() => tableRow('開発部'));
    expect(screen.getByRole('button', { name: t.clear })).toBeDisabled();
  });

  it('shouldEnableClearWhenNameConditionExists', async () => {
    nav.search = 'name=a';
    mockList([EMPTY_DEPT]);
    renderView();
    await waitFor(() => tableRow('開発部'));
    expect(screen.getByRole('button', { name: t.clear })).toBeEnabled();
  });

  it('shouldShowSummaryCounts', async () => {
    mockList([EMPTY_DEPT]);
    renderView();
    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shouldKeepListAndShowDashWhenSummaryFails', async () => {
    apiFetch.mockImplementation((path: string) =>
      path.startsWith('/admin/departments/summary')
        ? Promise.reject(new ApiError(500, 'INTERNAL', 'error', []))
        : Promise.resolve(pageOf([EMPTY_DEPT])),
    );
    renderView();
    await waitFor(() => tableRow('開発部'));
    await waitFor(() =>
      expect(screen.getAllByText(messages.common.noValue).length).toBeGreaterThanOrEqual(2),
    );
  });

  it('shouldShowDetailModalOfClickedDepartmentOnly', async () => {
    mockList([
      dept({
        id: 'd-1',
        name: '開発部',
        description: '開発を担当',
        manager: { id: 'u-9', empId: '00009', name: '鈴木 健太' },
      }),
      dept({ id: 'd-2', code: 'SALES', name: '営業部' }),
    ]);
    renderView();
    // 下部の「選択中の部署情報」は無くなり、詳細ボタンを押すまで何も開かない
    await waitFor(() => tableRow('開発部'));
    expect(screen.queryByRole('region', { name: '選択中の部署情報' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    const user = userEvent.setup();
    await user.click(
      within(tableRow('開発部')).getByRole('button', { name: t.detailLabel('開発部') }),
    );
    const modal = await screen.findByRole('dialog', { name: t.detailModal.title });
    expect(within(modal).getByText('鈴木 健太（00009）')).toBeInTheDocument();
    expect(within(modal).getByText('開発を担当')).toBeInTheDocument();
    expect(within(modal).queryByText('営業部')).toBeNull();
    await user.click(within(modal).getAllByRole('button', { name: t.detailModal.close })[1]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shouldOpenMembersModalWhenViewMembersClicked', async () => {
    mockList([EMPTY_DEPT]);
    renderView();
    // 所属社員数 0 名でも確認できる。押した行の部署 ID で所属社員を取得する
    const [button] = await screen.findAllByRole('button', { name: t.viewMembersLabel('開発部') });
    await userEvent.click(button);
    expect(await screen.findByText('山田 太郎')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t.membersModal.title })).toBeInTheDocument();
    expect(screen.getByText(t.membersModal.subtitle('開発部', 1))).toBeInTheDocument();
    expect(
      apiFetch.mock.calls.some(([path]) => String(path).includes('/admin/departments/d-1/members')),
    ).toBe(true);
  });

  it('shouldShowErrorToastWithoutCallingApiWhenDeletingDepartmentWithMembers', async () => {
    mockList([USED_DEPT]);
    renderView();
    await waitFor(() => tableRow('営業部'));
    const user = userEvent.setup();
    const callsBefore = apiFetch.mock.calls.length;
    await user.click(screen.getAllByRole('button', { name: t.deleteLabel('営業部') })[0]);
    expect(await screen.findByText(t.hasMembers)).toBeInTheDocument();
    expect(apiFetch.mock.calls.length).toBe(callsBefore);
  });

  it('shouldConfirmAndCallDeleteApiWhenDepartmentHasNoActiveMembers', async () => {
    mockList([dept({ id: 'd-1', name: '開発部', inactiveMemberCount: 2 })]);
    renderView();
    const user = userEvent.setup();
    const [button] = await screen.findAllByRole('button', { name: t.deleteLabel('開発部') });
    await user.click(button);
    expect(await screen.findByText(t.deleteModal.confirm('開発部'))).toBeInTheDocument();
    expect(screen.getByText(t.deleteModal.inactiveNote(2))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t.deleteModal.submit }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/admin/departments/d-1', { method: 'DELETE' }),
    );
    expect(await screen.findByText(t.deleteModal.success)).toBeInTheDocument();
  });

  it('shouldDisableCancelWhileDeleting', async () => {
    apiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return new Promise(() => {});
      return respond([EMPTY_DEPT], path, init);
    });
    renderView();
    const user = userEvent.setup();
    const [button] = await screen.findAllByRole('button', { name: t.deleteLabel('開発部') });
    await user.click(button);
    // 削除は取り消せないので、開いた直後の初期フォーカスは [キャンセル]
    expect(await screen.findByRole('button', { name: messages.common.cancel })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: t.deleteModal.submit }));
    expect(screen.getByRole('button', { name: messages.common.cancel })).toBeDisabled();
  });

  it('shouldNotShowInactiveNoteWhenNoInactiveMembers', async () => {
    mockList([EMPTY_DEPT]);
    renderView();
    const user = userEvent.setup();
    const [button] = await screen.findAllByRole('button', { name: t.deleteLabel('開発部') });
    await user.click(button);
    await screen.findByText(t.deleteModal.confirm('開発部'));
    expect(screen.queryByText(/無効の社員/)).not.toBeInTheDocument();
  });

  it('shouldShowServerMessageAndRefetchWhenDeleteConflicts', async () => {
    apiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return Promise.reject(new ApiError(409, 'DEPARTMENT_HAS_MEMBERS', 'サーバー側の文言', []));
      }
      return respond([EMPTY_DEPT], path, init);
    });
    renderView();
    const user = userEvent.setup();
    const [button] = await screen.findAllByRole('button', { name: t.deleteLabel('開発部') });
    await user.click(button);
    await user.click(await screen.findByRole('button', { name: t.deleteModal.submit }));
    expect(await screen.findByText('サーバー側の文言')).toBeInTheDocument();
    // 初回取得に加えて、409 の後にもう一度一覧を取得していること
    await waitFor(() => expect(listCallCount()).toBeGreaterThanOrEqual(2));
  });

  it('shouldFillEditModalWithSelectedDepartmentDescriptionAndManager', async () => {
    mockList([
      dept({
        id: 'd-1',
        code: 'DEV',
        name: '開発部',
        description: '開発を担当',
        manager: { id: 'u-9', empId: '00009', name: '鈴木 健太' },
      }),
    ]);
    renderView();
    const user = userEvent.setup();
    const [detailButton] = await screen.findAllByRole('button', { name: t.detailLabel('開発部') });
    await user.click(detailButton);
    const modal = await screen.findByRole('dialog', { name: t.detailModal.title });
    await user.click(within(modal).getByRole('button', { name: t.editSelected }));
    expect(await screen.findByText(t.form.editTitle)).toBeInTheDocument();
    // 詳細モーダルは閉じて編集モーダルに切り替わる
    expect(screen.queryByRole('dialog', { name: t.detailModal.title })).toBeNull();
    expect(screen.getByLabelText(t.code)).toHaveValue('DEV');
    expect(screen.getByLabelText(t.form.description)).toHaveValue('開発を担当');
    expect(await screen.findByLabelText(t.form.manager)).toHaveValue('鈴木 健太 (00009)');
  });

  it('shouldHideEditActionForSystemDepartmentInDetailModal', async () => {
    mockList([SYSTEM_DEPT, EMPTY_DEPT]);
    renderView();
    const user = userEvent.setup();
    const [detailButton] = await screen.findAllByRole('button', { name: t.detailLabel('未所属') });
    await user.click(detailButton);
    const modal = await screen.findByRole('dialog', { name: t.detailModal.title });
    expect(within(modal).getByText(t.system)).toBeInTheDocument();
    expect(within(modal).getAllByRole('button', { name: t.detailModal.close }).length).toBe(2);
    expect(within(modal).queryByRole('button', { name: t.editSelected })).toBeNull();
  });

  it('shouldShowUnsetManagerAndNoValueDescriptionWhenBothAreEmpty', async () => {
    mockList([EMPTY_DEPT]);
    renderView();
    const row = await waitFor(() => tableRow('開発部'));
    // 表の責任者・説明は「—」
    expect(within(row).getAllByText(messages.common.noValue).length).toBeGreaterThanOrEqual(2);
    const user = userEvent.setup();
    await user.click(within(row).getByRole('button', { name: t.detailLabel('開発部') }));
    const modal = await screen.findByRole('dialog', { name: t.detailModal.title });
    expect(within(modal).getByText(t.managerUnset)).toBeInTheDocument();
    expect(within(modal).getByText(messages.common.noValue)).toBeInTheDocument();
  });

  it('shouldApplyDangerStyleToDeleteButtonOnly', async () => {
    mockList([EMPTY_DEPT]);
    renderView();
    const row = await waitFor(() => tableRow('開発部'));
    expect(within(row).getByRole('button', { name: t.deleteLabel('開発部') })).toHaveClass(
      'border-danger-100',
      'text-danger-100',
    );
    expect(within(row).getByRole('button', { name: t.detailLabel('開発部') })).not.toHaveClass(
      'text-danger-100',
    );
  });

  it('shouldShowLoadingStatusBeforeListArrives', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));
    renderView();
    expect(screen.getAllByText(messages.common.loading).length).toBeGreaterThan(0);
  });

  it('shouldRefetchListWhenRetryClicked', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'error', []));
    apiFetch.mockResolvedValue(pageOf([EMPTY_DEPT]));
    renderView();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: messages.common.retry }));
    await waitFor(() => tableRow('開発部'));
    expect(listCallCount()).toBe(2);
  });

  it('shouldRestoreConditionsAndPageFromUrl', async () => {
    nav.search = 'name=%E5%96%B6&sort=updatedAt&order=desc&page=2';
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(
        path.startsWith('/admin/departments/summary') ? SUMMARY : pageOf([USED_DEPT], 2, 2),
      ),
    );
    renderView();
    await waitFor(() => tableRow('営業部'));
    expect(screen.getByPlaceholderText(t.searchPlaceholder)).toHaveValue('営');
    expect(apiFetch).toHaveBeenCalledWith(
      '/admin/departments?name=%E5%96%B6&sort=updatedAt&order=desc&page=2&limit=20',
    );
  });

  it('shouldRefetchListAfterSuccessfulDelete', async () => {
    mockList([dept({ id: 'd-1', name: '開発部' })]);
    renderView();
    const user = userEvent.setup();
    const [button] = await screen.findAllByRole('button', { name: t.deleteLabel('開発部') });
    await user.click(button);
    await user.click(await screen.findByRole('button', { name: t.deleteModal.submit }));
    expect(await screen.findByText(t.deleteModal.success)).toBeInTheDocument();
    await waitFor(() => expect(listCallCount()).toBeGreaterThanOrEqual(2));
  });

  it.each([
    ['FORBIDDEN', 403, '権限がありません。'],
    ['NOT_FOUND', 404, '部署が見つかりません。'],
    ['PROTECTED_DEPARTMENT', 409, '未所属部署は変更・削除できません。'],
  ])(
    'shouldCloseModalShowMessageAndRefetchWhenDeleteFails_%s',
    async (code, statusCode, message) => {
      apiFetch.mockImplementation((path: string, init?: RequestInit) => {
        if (init?.method === 'DELETE') {
          return Promise.reject(new ApiError(statusCode, code, message, []));
        }
        return respond([dept({ id: 'd-1', name: '開発部' })], path, init);
      });
      renderView();
      const user = userEvent.setup();
      const [button] = await screen.findAllByRole('button', { name: t.deleteLabel('開発部') });
      await user.click(button);
      await user.click(await screen.findByRole('button', { name: t.deleteModal.submit }));
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.queryByText(t.deleteModal.confirm('開発部'))).not.toBeInTheDocument();
      await waitFor(() => expect(listCallCount()).toBeGreaterThanOrEqual(2));
    },
  );

  // 一覧の取得(メソッドなし)の回数
  function listCallCount(): number {
    return apiFetch.mock.calls.filter(
      ([path, init]) => !init?.method && String(path).startsWith('/admin/departments?'),
    ).length;
  }
});
