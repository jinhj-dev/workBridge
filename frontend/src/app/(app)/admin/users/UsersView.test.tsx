import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { UsersView } from './UsersView';

// 社員管理一覧(design-frontend §1)。URL Query・デバウンス・ページ 1 リセット・Empty/Error を確認
const apiFetch = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
let searchParams = new URLSearchParams();

vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => searchParams,
}));

const SUMMARY = { employeeCount: 120, adminCount: 8, hiredThisMonthCount: 3 };
const LIST = {
  items: [
    {
      id: 'u-1',
      empId: '10001',
      name: '山田 太郎',
      hireDate: '2026-04-01',
      departmentId: 'd-1',
      departmentName: '開発部',
      role: 'EMPLOYEE',
      approvalRequired: true,
      isActive: true,
      employmentStatus: 'ACTIVE',
      jobTitle: { id: 'jt-1', name: 'マネージャー', tone: 'VIOLET' },
      contactEmail: 'yamada@example.com',
      createdAt: '2026-01-02T09:00:00+09:00',
    },
  ],
  page: 1,
  limit: 10,
  totalCount: 1,
  totalPages: 1,
};

const DEPARTMENTS = [{ id: 'd-1', name: '開発部' }];
const JOB_TITLES = [{ id: 'jt-1', name: 'マネージャー', tone: 'VIOLET' }];

function routeApi(list: unknown = LIST) {
  apiFetch.mockImplementation((path: string) => {
    if (path.startsWith('/admin/users/summary')) return Promise.resolve(SUMMARY);
    if (path.startsWith('/admin/users?') || path === '/admin/users') return Promise.resolve(list);
    if (path.startsWith('/admin/job-titles')) return Promise.resolve(JOB_TITLES);
    if (path.startsWith('/departments')) return Promise.resolve(DEPARTMENTS);
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

function listCalls(): string[] {
  return apiFetch.mock.calls
    .map(([path]) => String(path))
    .filter((p) => p.startsWith('/admin/users?'));
}

function renderView() {
  return render(
    <ToastProvider>
      <UsersView />
    </ToastProvider>,
  );
}

// 表示幅の判定(useMediaQuery)に使う。jsdom には matchMedia が無いため、デスクトップ幅(表)として差し替える
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  apiFetch.mockReset();
  replace.mockReset();
  searchParams = new URLSearchParams();
  routeApi();
});

describe('UsersView(社員管理)', () => {
  it('shouldShowHeadingSummaryValuesAndListCountFromApi', async () => {
    renderView();
    expect(await screen.findByRole('heading', { name: '社員管理' })).toBeInTheDocument();
    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(screen.getByText('社員数')).toBeInTheDocument();
    expect(screen.getByText('管理者数')).toBeInTheDocument();
    expect(screen.getByText('今月の入社')).toBeInTheDocument();
    expect(screen.getByText('社員一覧（全 1 名）')).toBeInTheDocument();
  });

  it('shouldRenderRowActionsWithNameInAriaLabelAndHideDeleteForInactive', async () => {
    renderView();
    expect(await screen.findByRole('button', { name: '山田 太郎の詳細' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '山田 太郎を編集' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '山田 太郎を削除' })).toBeInTheDocument();
  });

  it('shouldHideDeleteButtonForInactiveRow', async () => {
    routeApi({
      ...LIST,
      items: [{ ...LIST.items[0], isActive: false, employmentStatus: 'INACTIVE' }],
    });
    renderView();
    await screen.findByRole('button', { name: '山田 太郎の詳細' });
    expect(screen.queryByRole('button', { name: '山田 太郎を削除' })).not.toBeInTheDocument();
  });

  it('shouldShowEmptyMessageWhenNoRows', async () => {
    routeApi({ items: [], page: 1, limit: 10, totalCount: 0, totalPages: 0 });
    renderView();
    expect(await screen.findByText('条件に一致する社員はいません。')).toBeInTheDocument();
  });

  it('shouldShowErrorSectionWhenSummaryFails', async () => {
    apiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/admin/users/summary')) return Promise.reject(new Error('down'));
      if (path.startsWith('/admin/users')) return Promise.resolve(LIST);
      return Promise.resolve([]);
    });
    renderView();
    // 値の「—」は 3 枚の統計カードに出る。失敗時はセクションのエラー表示も出る
    expect(await screen.findAllByText('—')).toHaveLength(3);
    expect(await screen.findByRole('button', { name: /再読み込み|再試行/ })).toBeInTheDocument();
  });

  it('shouldDebounceKeywordAndResetPageToOne', async () => {
    const user = userEvent.setup();
    renderView();
    await screen.findByRole('button', { name: '山田 太郎の詳細' });
    await user.type(screen.getByRole('searchbox'), '10001');

    await waitFor(() => {
      expect(replace).toHaveBeenLastCalledWith(
        expect.stringContaining('keyword=10001'),
        expect.anything(),
      );
    });
    expect(replace.mock.lastCall?.[0]).not.toContain('page=');
  });

  it('shouldResetPageWhenStatusFilterChanges', async () => {
    searchParams = new URLSearchParams('page=3');
    const user = userEvent.setup();
    renderView();
    await screen.findByRole('button', { name: '山田 太郎の詳細' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'ステータス' }), 'INACTIVE');
    expect(replace.mock.lastCall?.[0]).toContain('status=INACTIVE');
    expect(replace.mock.lastCall?.[0]).not.toContain('page=3');
  });

  it('shouldRestoreFiltersFromUrlQuery', async () => {
    searchParams = new URLSearchParams('keyword=abc&status=UPCOMING&page=2');
    renderView();
    await waitFor(() => {
      expect(
        listCalls().some((p) => p.includes('keyword=abc') && p.includes('status=UPCOMING')),
      ).toBe(true);
    });
    expect(screen.getByRole('combobox', { name: 'ステータス' })).toHaveValue('UPCOMING');
  });

  it('shouldShowPageRangeText', async () => {
    routeApi({ ...LIST, totalCount: 120, totalPages: 12, page: 2 });
    renderView();
    const nav = await screen.findByRole('navigation');
    expect(
      within(nav.parentElement as HTMLElement).getByText('全 120 件中 11 – 20 件を表示'),
    ).toBeInTheDocument();
  });

  it('shouldOpenDetailModalFromRowButton', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(await screen.findByRole('button', { name: '山田 太郎の詳細' }));
    expect(await screen.findByRole('dialog', { name: '社員詳細' })).toBeInTheDocument();
  });
  it('shouldReplaceQueryWithDepartmentAndResetPageWhenDepartmentChanges', async () => {
    searchParams = new URLSearchParams('page=3&keyword=abc');
    const user = userEvent.setup();
    renderView();
    await screen.findByRole('button', { name: '山田 太郎の詳細' });
    await user.selectOptions(screen.getByRole('combobox', { name: '所属部署' }), 'd-1');
    const url = String(replace.mock.lastCall?.[0]);
    expect(url).toContain('departmentId=d-1');
    expect(url).toContain('keyword=abc');
    expect(url).not.toContain('page=3');
  });

  it('shouldReplaceQueryWithJobTitleAndResetPageWhenJobTitleChanges', async () => {
    searchParams = new URLSearchParams('page=2');
    const user = userEvent.setup();
    renderView();
    await screen.findByRole('button', { name: '山田 太郎の詳細' });
    await user.selectOptions(screen.getByRole('combobox', { name: '役職' }), 'jt-1');
    const url = String(replace.mock.lastCall?.[0]);
    expect(url).toContain('jobTitleId=jt-1');
    expect(url).not.toContain('page=2');
  });

  it('shouldDisableClearButtonWhenNoConditions', async () => {
    renderView();
    await screen.findByRole('button', { name: '山田 太郎の詳細' });
    expect(screen.getByRole('button', { name: 'クリア' })).toBeDisabled();
  });

  it('shouldClearAllConditionsWhenClearButtonClicked', async () => {
    searchParams = new URLSearchParams(
      'keyword=abc&departmentId=d-1&jobTitleId=jt-1&status=INACTIVE&page=2',
    );
    const user = userEvent.setup();
    renderView();
    await screen.findByRole('button', { name: '山田 太郎の詳細' });
    const clearButton = screen.getByRole('button', { name: 'クリア' });
    expect(clearButton).toBeEnabled();
    await user.click(clearButton);
    // 検索語・部署・役職・ステータス・ページを URL から外す(パスのみに戻す)
    expect(replace).toHaveBeenLastCalledWith('/admin/users', expect.anything());
  });

  it('shouldShowLoadingStateWhileListIsPending', async () => {
    apiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/admin/users/summary')) return Promise.resolve(SUMMARY);
      if (path.startsWith('/admin/users?')) return new Promise(() => undefined);
      return Promise.resolve([]);
    });
    renderView();
    // 件数が決まるまでは見出しに件数を出さず、行も出さない
    expect(await screen.findByText('社員一覧')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '山田 太郎の詳細' })).not.toBeInTheDocument();
    expect(screen.queryByText('条件に一致する社員はいません。')).not.toBeInTheDocument();
  });

  it('shouldShowErrorSectionWhenListFails', async () => {
    apiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/admin/users/summary')) return Promise.resolve(SUMMARY);
      if (path.startsWith('/admin/users?')) return Promise.reject(new Error('down'));
      return Promise.resolve([]);
    });
    renderView();
    expect(await screen.findByRole('button', { name: /再読み込み|再試行/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '山田 太郎の詳細' })).not.toBeInTheDocument();
    expect(screen.queryByText('条件に一致する社員はいません。')).not.toBeInTheDocument();
  });
});

afterEach(() => {
  // 未処理の描画 effect が matchMedia を呼ぶため、スタブを外す前にアンマウントする
  cleanup();
  vi.unstubAllGlobals();
});
