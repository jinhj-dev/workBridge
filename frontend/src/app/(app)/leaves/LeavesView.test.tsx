import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { Leave, LeaveBalance, Paginated } from '@/lib/api/types';
import type { AuthUser } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { LeavesView } from './LeavesView';

const t = messages.leaves;
const h = messages.leaves.history;

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/leaves',
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock('@/lib/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'authenticated', user: auth.user, login: vi.fn(), logout: vi.fn() }),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const ME: AuthUser = {
  id: 'u-me',
  name: '申請者',
  empId: '10001',
  role: 'EMPLOYEE',
  departmentName: '営業部',
  approvalRequired: true,
  mustChangePassword: false,
};

const BALANCE: LeaveBalance = {
  year: 2026,
  grantedDays: 20,
  approvedDays: 3,
  pendingDays: 1.5,
  remainingDays: 15.5,
};

function leave(overrides: Partial<Leave> = {}): Leave {
  return {
    id: 'leave-1',
    user: { id: 'u-me', name: '申請者', empId: '10001', departmentName: '営業部' },
    approver: { id: 'u-approver', name: '佐藤花子', empId: '10002', departmentName: '開発部' },
    leaveType: 'ANNUAL',
    startDate: '2026-11-20',
    endDate: '2026-11-21',
    days: 2,
    reason: '家族の用事',
    status: 'PENDING',
    autoApproved: false,
    processedBy: null,
    processedAt: null,
    rejectReason: null,
    createdAt: '2026-11-08T10:00:00+09:00',
    ...overrides,
  };
}

function pageOf(items: Leave[], overrides: Partial<Paginated<Leave>> = {}): Paginated<Leave> {
  return { items, page: 1, limit: 20, totalCount: items.length, totalPages: 1, ...overrides };
}

function historyCalls(): string[] {
  return apiFetch.mock.calls
    .map(([path]) => String(path))
    .filter((path) => path.startsWith('/leaves/me'));
}

function mockApi(list: Paginated<Leave> | Error, detail: Leave = leave()) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/leaves/balance') return BALANCE;
    if (path === '/leaves/approvers') return [];
    if (path.startsWith('/leaves/me')) {
      if (list instanceof Error) throw list;
      return list;
    }
    if (path === `/leaves/${detail.id}`) return detail;
    throw new Error(`想定外の API 呼び出し: ${path}`);
  });
}

function renderView() {
  auth.user = ME;
  const ui = userEvent.setup();
  render(
    <ToastProvider>
      <LeavesView />
    </ToastProvider>,
  );
  return ui;
}

beforeEach(() => {
  nav.search = '';
  vi.clearAllMocks();
});

describe('LeavesView 残高サマリー', () => {
  it('shouldShowBalanceValuesAndHistoryByDefault', async () => {
    mockApi(pageOf([leave()]));
    renderView();

    expect(await screen.findByText('15.5日')).toBeInTheDocument();
    expect(screen.getByText('3日')).toBeInTheDocument();
    expect(screen.getByText('1.5日')).toBeInTheDocument();
    expect(screen.getByText(t.summary.remaining)).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(historyCalls()).toEqual(['/leaves/me?page=1&limit=20']);
  });

  it('shouldShowSectionErrorForSummaryWithoutHidingHistory', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/leaves/balance') throw new ApiError(500, 'INTERNAL', 'error');
      if (path.startsWith('/leaves/me')) return pageOf([leave()]);
      throw new Error(`想定外の API 呼び出し: ${path}`);
    });
    renderView();
    expect(await screen.findByText(messages.common.loadError)).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('shouldShowLoadingStatusWhileSummaryPending', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/leaves/balance') return new Promise<LeaveBalance>(() => undefined);
      if (path.startsWith('/leaves/me')) return pageOf([leave()]);
      throw new Error(`想定外の API 呼び出し: ${path}`);
    });
    renderView();
    expect((await screen.findAllByText(messages.common.loading)).length).toBeGreaterThan(0);
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});

describe('LeavesView 申請履歴の検索(FC-10)', () => {
  it('shouldIgnoreLegacyYearAndTabParams', async () => {
    nav.search = 'tab=apply&year=2025';
    mockApi(pageOf([leave()]));
    renderView();

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(historyCalls()).toEqual(['/leaves/me?page=1&limit=20']);
  });

  it('shouldPassUrlFiltersToApiAsSingleValues', async () => {
    nav.search = 'appliedFrom=2026-01-05&appliedTo=2026-03-31&leaveType=HALF_AM&status=APPROVED&page=2';
    mockApi(pageOf([leave()], { page: 2, totalCount: 30, totalPages: 2 }));
    renderView();
    await screen.findByRole('table');
    expect(historyCalls()).toEqual([
      '/leaves/me?appliedFrom=2026-01-05&appliedTo=2026-03-31&leaveType=HALF_AM&status=APPROVED&page=2&limit=20',
    ]);
  });

  it('shouldRestoreFormFieldsFromUrl', async () => {
    nav.search = 'appliedFrom=2026-01-05&leaveType=OTHER&status=REJECTED';
    mockApi(pageOf([leave()]));
    renderView();
    await screen.findByRole('table');

    expect(screen.getByLabelText(`${h.appliedPeriod} ${messages.dateRange.startDate}`)).toHaveValue(
      '2026-01-05',
    );
    expect(screen.getByLabelText(h.leaveTypeFilter)).toHaveValue('OTHER');
    expect(screen.getByLabelText(h.statusFilter)).toHaveValue('REJECTED');
  });

  it('shouldPushFilterToUrlAndResetPageOnSearch', async () => {
    nav.search = 'page=2';
    mockApi(pageOf([leave()], { page: 2, totalCount: 30, totalPages: 2 }));
    const ui = renderView();
    await screen.findByRole('table');

    await ui.selectOptions(screen.getByLabelText(h.statusFilter), 'PENDING');
    await ui.click(screen.getByRole('button', { name: h.search }));
    // 検索を押すまで URL は変わらず、押すと 1 ページ目へ戻る
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenLastCalledWith('/leaves?status=PENDING');
  });

  it('shouldSearchWhenEnterPressedInAppliedDateInput', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView();
    await screen.findByRole('table');

    const startDate = screen.getByLabelText(`${h.appliedPeriod} ${messages.dateRange.startDate}`);
    await ui.click(startDate);
    await ui.keyboard('{Enter}');

    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('shouldNotSearchWhenAppliedRangeIsReversed', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView();
    await screen.findByRole('table');

    fireEvent.change(screen.getByLabelText(`${h.appliedPeriod} ${messages.dateRange.startDate}`), {
      target: { value: '2026-11-10' },
    });
    fireEvent.change(screen.getByLabelText(`${h.appliedPeriod} ${messages.dateRange.endDate}`), {
      target: { value: '2026-11-01' },
    });
    expect(screen.getByText(messages.dateRange.order)).toBeInTheDocument();
    await ui.click(screen.getByRole('button', { name: h.search }));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shouldShowSixColumnsWithoutApproverColumn', async () => {
    mockApi(pageOf([leave()]));
    renderView();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      h.createdAt,
      h.period,
      h.leaveType,
      h.days,
      h.statusColumn,
      h.actions,
    ]);
  });

  it('shouldRenderHistoryRowValues', async () => {
    mockApi(
      pageOf([
        leave(),
        leave({
          id: 'leave-2',
          approver: null,
          autoApproved: true,
          status: 'APPROVED',
          leaveType: 'HALF_AM',
          startDate: '2026-12-01',
          endDate: '2026-12-01',
          days: 0.5,
        }),
      ]),
    );
    renderView();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    const cells = within(rows[1])
      .getAllByRole('cell')
      .map((cell) => cell.textContent);
    expect(cells.slice(0, 4)).toEqual([
      '2026/11/08',
      '2026/11/20 ～ 2026/11/21',
      messages.leave.types.ANNUAL,
      '2日',
    ]);
  });

  it('shouldShowEmptyMessage', async () => {
    mockApi(pageOf([]));
    renderView();
    expect(await screen.findByText(h.empty)).toBeInTheDocument();
  });

  it('shouldShowErrorWithRetryAndReload', async () => {
    mockApi(new ApiError(500, 'INTERNAL', 'error'));
    const ui = renderView();
    await screen.findByText(messages.common.loadError);
    const before = historyCalls().length;
    await ui.click(screen.getByRole('button', { name: messages.common.retry }));
    await waitFor(() => expect(historyCalls().length).toBeGreaterThan(before));
  });

  it('shouldRenderEyeIconSecondaryDetailButtonInHistoryRow', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView();
    const table = await screen.findByRole('table');
    const detail = within(table).getByRole('button', {
      name: h.detailLabel(messages.leave.types.ANNUAL, '2026/11/20 ～ 2026/11/21'),
    });
    expect(detail).toHaveTextContent(messages.common.detail);
    expect(detail.querySelectorAll('svg')).toHaveLength(1);
    expect(detail).toHaveClass('border-general-50', 'text-general-100');
    await ui.click(detail);
    expect(
      await screen.findByRole('dialog', { name: messages.leave.detail.title }),
    ).toBeInTheDocument();
  });

  it('shouldOpenDetailModalFromRow', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView();
    const table = await screen.findByRole('table');
    await ui.click(within(table).getByRole('button', { name: /年次休暇/ }));
    expect(
      await screen.findByRole('dialog', { name: messages.leave.detail.title }),
    ).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/leaves/leave-1');
  });

  it('shouldShowCancelInModalAndReloadListAndSummaryAfterCancel', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView();
    const table = await screen.findByRole('table');
    await ui.click(within(table).getByRole('button', { name: /年次休暇/ }));
    const dialog = await screen.findByRole('dialog', { name: messages.leave.detail.title });
    await ui.click(
      await within(dialog).findByRole('button', { name: messages.leave.detail.cancel }),
    );

    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/leaves/leave-1/cancel') return leave({ status: 'CANCELLED' });
      if (path === '/leaves/balance') return BALANCE;
      if (path.startsWith('/leaves/me')) return pageOf([]);
      throw new Error(`想定外の API 呼び出し: ${path}`);
    });
    const confirm = await screen.findByRole('dialog', { name: messages.leave.cancel.title });
    await ui.click(within(confirm).getByRole('button', { name: messages.leave.cancel.submit }));

    expect(await screen.findByText(h.empty)).toBeInTheDocument();
    expect(apiFetch.mock.calls.filter(([p]) => p === '/leaves/balance').length).toBeGreaterThan(1);
  });

  it('shouldKeepPreviousListWithAriaBusyWhileFilteredResultLoads', async () => {
    let resolveFiltered: (value: Paginated<Leave>) => void = () => undefined;
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/leaves/balance') return BALANCE;
      if (path.includes('status=PENDING')) {
        return new Promise<Paginated<Leave>>((resolve) => {
          resolveFiltered = resolve;
        });
      }
      if (path.startsWith('/leaves/me')) return pageOf([leave()]);
      throw new Error(`想定外の API 呼び出し: ${path}`);
    });
    auth.user = ME;
    const { rerender } = render(
      <ToastProvider>
        <LeavesView />
      </ToastProvider>,
    );
    const table = await screen.findByRole('table');
    expect(await screen.findByText('15.5日')).toBeInTheDocument();
    expect(within(table).queryByText(messages.leave.detail.autoApproved)).not.toBeInTheDocument();

    // 状態で絞り込み、結果がまだ届かない間
    nav.search = 'status=PENDING';
    rerender(
      <ToastProvider>
        <LeavesView />
      </ToastProvider>,
    );
    await waitFor(() =>
      expect(historyCalls().some((path) => path.includes('status=PENDING'))).toBe(true),
    );

    // 前の一覧が残り、読み込み表示に置き換わらない。取得中であることは aria-busy で示す
    expect(screen.getByRole('table')).toBe(table);
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    const listRegion = table.closest('[aria-busy]');
    if (!(listRegion instanceof HTMLElement)) {
      throw new Error('一覧の aria-busy 領域が見つかりません');
    }
    expect(listRegion.querySelector('[role="status"]')).toBeNull();
    expect(listRegion).toHaveAttribute('aria-busy', 'true');

    // 結果が届いたら入れ替わり、aria-busy は false に戻る
    resolveFiltered(
      pageOf([leave({ id: 'leave-new', approver: null, autoApproved: true, status: 'PENDING' })]),
    );
    await waitFor(() => expect(table.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false'));
  });

  it('shouldShowErrorInsteadOfPreviousListWhenFilteredRequestFails', async () => {
    auth.user = ME;
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/leaves/balance') return BALANCE;
      if (path.includes('status=PENDING')) throw new ApiError(500, 'INTERNAL', 'error');
      if (path.startsWith('/leaves/me')) return pageOf([leave()]);
      throw new Error(`想定外の API 呼び出し: ${path}`);
    });
    const { rerender } = render(
      <ToastProvider>
        <LeavesView />
      </ToastProvider>,
    );
    await screen.findByRole('table');

    nav.search = 'status=PENDING';
    rerender(
      <ToastProvider>
        <LeavesView />
      </ToastProvider>,
    );

    expect(await screen.findByText(messages.common.loadError)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shouldChangePageWithoutScrollOption', async () => {
    nav.search = 'page=2';
    mockApi(pageOf([leave()], { page: 2, totalCount: 60, totalPages: 3 }));
    const ui = renderView();
    await screen.findByRole('table');

    const pager = screen.getByRole('navigation', { name: messages.pagination.label });
    await ui.click(within(pager).getByRole('button', { name: messages.pagination.page(3) }));
    expect(router.push).toHaveBeenLastCalledWith('/leaves?page=3');
    expect(router.push.mock.lastCall).toHaveLength(1);
  });

  it('shouldNotRenderLegacyTabsOrApplyButtonInsideView', async () => {
    mockApi(pageOf([leave()]));
    renderView();
    await screen.findByRole('table');
    // 休暇申請ボタン・タブは共通枠(LeaveManagementLayout)が出す
    expect(screen.queryByRole('button', { name: t.applyButton })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});
