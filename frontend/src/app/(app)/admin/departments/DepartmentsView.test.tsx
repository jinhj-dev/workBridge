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

function mockList(items: DepartmentDetail[]) {
  apiFetch.mockImplementation((path: string, init?: RequestInit) => {
    if (init?.method) return Promise.resolve(undefined);
    expect(path).toContain('/admin/departments');
    return Promise.resolve(pageOf(items));
  });
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
});

describe('DepartmentsView(SCR-010 部署管理)', () => {
  it('shouldShowRowsWithCodeNameAndMemberCount', async () => {
    mockList([EMPTY_DEPT, USED_DEPT]);
    renderView();
    const row = await waitFor(() => tableRow('営業部'));
    expect(within(row).getByText('SALES')).toBeInTheDocument();
    expect(within(row).getByText('3名')).toBeInTheDocument();
    expect(screen.getByText(t.memberCountNote)).toBeInTheDocument();
  });

  it('shouldHideEditAndDeleteForSystemDepartmentAndShowBadge', async () => {
    mockList([SYSTEM_DEPT]);
    renderView();
    const row = await waitFor(() => tableRow('未所属'));
    expect(within(row).getByText(t.system)).toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
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

  it('shouldPushTrimmedConditionsAndPageOneToUrlWhenSearching', async () => {
    nav.search = 'page=3';
    mockList([EMPTY_DEPT]);
    renderView();
    await waitFor(() => tableRow('開発部'));
    const user = userEvent.setup();
    await user.type(screen.getAllByLabelText(t.code)[0], ' dev ');
    await user.type(screen.getAllByLabelText(t.name)[0], '開発');
    await user.click(screen.getByRole('button', { name: t.search }));
    expect(router.push).toHaveBeenCalledWith('/admin/departments?code=dev&name=%E9%96%8B%E7%99%BA');
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
      return Promise.resolve(pageOf([EMPTY_DEPT]));
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

  it('shouldShowLoadingStatusBeforeListArrives', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));
    renderView();
    expect(screen.getByText(messages.common.loading)).toBeInTheDocument();
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
    nav.search = 'code=sal&name=%E5%96%B6&page=2';
    apiFetch.mockResolvedValue(pageOf([USED_DEPT], 2, 2));
    renderView();
    await waitFor(() => tableRow('営業部'));
    expect(screen.getAllByLabelText(t.code)[0]).toHaveValue('sal');
    expect(screen.getAllByLabelText(t.name)[0]).toHaveValue('営');
    expect(apiFetch.mock.calls[0][0]).toBe(
      '/admin/departments?code=sal&name=%E5%96%B6&page=2&limit=20',
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
        return Promise.resolve(pageOf([dept({ id: 'd-1', name: '開発部' })]));
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
    return apiFetch.mock.calls.filter(([, init]) => !init?.method).length;
  }
});
