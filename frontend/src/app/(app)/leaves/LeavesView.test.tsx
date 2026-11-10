import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { Leave, LeaveBalance, Paginated } from '@/lib/api/types';
import type { AuthUser } from '@/lib/auth/AuthProvider';
import { tokyoToday } from '@/lib/date-range';
import { messages } from '@/messages/ja';
import { LeavesView } from './LeavesView';

const t = messages.leaves;
const YEAR = Number(tokyoToday(new Date()).slice(0, 4));

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

// 申請モーダル本体は LeaveApplyModal.test で検証する。ここでは開閉と申請後の動きだけを見る
const applied = vi.hoisted(() => ({ leave: null as unknown }));
vi.mock('@/components/leave/LeaveApplyModal', () => ({
  LeaveApplyModal: ({ open, onApplied }: { open: boolean; onApplied: (leave: unknown) => void }) =>
    open ? (
      <div role="dialog" aria-label="apply-modal">
        <button type="button" onClick={() => onApplied(applied.leave)}>
          apply-done
        </button>
      </div>
    ) : null,
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
  year: YEAR,
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

describe('LeavesView(SCR-004 休暇管理)', () => {
  it('shouldShowSummaryAndHistoryByDefault', async () => {
    mockApi(pageOf([leave()]));
    renderView();

    expect(await screen.findByText('20日')).toBeInTheDocument();
    expect(screen.getByText('3日')).toBeInTheDocument();
    expect(screen.getByText('1.5日')).toBeInTheDocument();
    expect(screen.getByText('15.5日')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.applyButton })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(historyCalls()).toEqual([`/leaves/me?year=${YEAR}&page=1&limit=20`]);
  });

  it('shouldIgnoreTabParamAndStillLoadHistory', async () => {
    nav.search = 'tab=apply';
    mockApi(pageOf([leave()]));
    renderView();

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(historyCalls()).toEqual([`/leaves/me?year=${YEAR}&page=1&limit=20`]);
    expect(screen.queryByRole('dialog', { name: 'apply-modal' })).not.toBeInTheDocument();
  });

  it('shouldOpenApplyModalFromHeaderButton', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView();
    await screen.findByRole('table');
    await ui.click(screen.getByRole('button', { name: t.applyButton }));
    expect(screen.getByRole('dialog', { name: 'apply-modal' })).toBeInTheDocument();
  });

  it('shouldCloseModalReloadSummaryAndMoveToStartYearAfterApplied', async () => {
    applied.leave = leave({ startDate: `${YEAR + 1}-01-05`, endDate: `${YEAR + 1}-01-05` });
    nav.search = 'status=APPROVED&leaveType=HALF_AM&page=2';
    mockApi(pageOf([leave()]));
    const ui = renderView();
    await screen.findByRole('table');
    const before = apiFetch.mock.calls.filter(([path]) => path === '/leaves/balance').length;
    await ui.click(screen.getByRole('button', { name: t.applyButton }));
    await ui.click(screen.getByRole('button', { name: 'apply-done' }));

    expect(screen.queryByRole('dialog', { name: 'apply-modal' })).not.toBeInTheDocument();
    expect(router.push).toHaveBeenLastCalledWith(`/leaves?year=${YEAR + 1}`);
    await waitFor(() =>
      expect(apiFetch.mock.calls.filter(([path]) => path === '/leaves/balance').length).toBe(
        before + 1,
      ),
    );
  });

  it('shouldReloadHistoryWhenAppliedLeaveMatchesCurrentUrl', async () => {
    applied.leave = leave();
    mockApi(pageOf([leave()]));
    const ui = renderView();
    await screen.findByRole('table');
    const before = historyCalls().length;
    await ui.click(screen.getByRole('button', { name: t.applyButton }));
    await ui.click(screen.getByRole('button', { name: 'apply-done' }));

    expect(router.push).not.toHaveBeenCalled();
    await waitFor(() => expect(historyCalls().length).toBe(before + 1));
  });

  it('shouldReloadHistoryAndCleanUrlWhenOldTabUrlHasSameHistoryPath', async () => {
    applied.leave = leave();
    nav.search = 'tab=apply';
    mockApi(pageOf([leave()]));
    const ui = renderView();
    await screen.findByRole('table');
    const before = historyCalls().length;
    await ui.click(screen.getByRole('button', { name: t.applyButton }));
    await ui.click(screen.getByRole('button', { name: 'apply-done' }));

    expect(router.push).toHaveBeenLastCalledWith('/leaves');
    await waitFor(() => expect(historyCalls().length).toBe(before + 1));
  });

  it('shouldRenderHistoryRowsWithAutoApprovedLabel', async () => {
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
    expect(cells.slice(0, 6)).toEqual([
      '2026/11/08',
      '年次休暇',
      '2026/11/20 ～ 2026/11/21',
      '2日',
      '佐藤花子',
      '承認待ち',
    ]);
    expect(within(rows[2]).getByText(messages.leave.detail.autoApproved)).toBeInTheDocument();
  });

  it('shouldShowEmptyMessage', async () => {
    mockApi(pageOf([]));
    renderView();
    expect(await screen.findByText(t.history.empty)).toBeInTheDocument();
  });

  it('shouldShowErrorWithRetryAndReload', async () => {
    mockApi(new ApiError(500, 'INTERNAL', 'error'));
    const ui = renderView();
    await screen.findByText(messages.common.loadError);
    const before = historyCalls().length;
    await ui.click(screen.getByRole('button', { name: messages.common.retry }));
    await waitFor(() => expect(historyCalls().length).toBeGreaterThan(before));
  });

  it('shouldPushFilterToUrlAndResetPage', async () => {
    nav.search = 'page=2';
    mockApi(pageOf([leave()], { page: 2, totalCount: 30, totalPages: 2 }));
    const ui = renderView();
    await screen.findByRole('table');

    const statusGroup = screen.getByRole('group', { name: t.history.status });
    await ui.click(
      within(statusGroup).getByRole('button', { name: messages.leave.statuses.PENDING }),
    );
    expect(router.push).toHaveBeenLastCalledWith('/leaves?status=PENDING', { scroll: false });

    const typeGroup = screen.getByRole('group', { name: t.history.leaveType });
    await ui.click(within(typeGroup).getByRole('button', { name: messages.leave.types.HALF_PM }));
    // 状態の選択は URL に残ったまま(この時点の画面上の選択と合わせて送る)
    expect(router.push).toHaveBeenLastCalledWith('/leaves?status=PENDING&leaveType=HALF_PM', {
      scroll: false,
    });

    // 年の変更は従来どおり scroll オプションなし
    await ui.selectOptions(screen.getByLabelText(t.history.year), String(YEAR - 1));
    expect(router.push).toHaveBeenLastCalledWith(`/leaves?year=${YEAR - 1}`);
    expect(router.push.mock.lastCall).toHaveLength(1);
  });

  it('shouldRestoreTogglesFromUrlIgnoringUnknownValues', async () => {
    nav.search = 'status=APPROVED,REJECTED,FOO&leaveType=HALF_AM';
    mockApi(pageOf([leave()]));
    renderView();
    await screen.findByRole('table');

    const statusGroup = screen.getByRole('group', { name: t.history.status });
    expect(
      within(statusGroup).getByRole('button', { name: messages.leave.statuses.APPROVED }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(statusGroup).getByRole('button', { name: messages.leave.statuses.REJECTED }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(statusGroup).getByRole('button', { name: messages.leave.statuses.PENDING }),
    ).toHaveAttribute('aria-pressed', 'false');
    const typeGroup = screen.getByRole('group', { name: t.history.leaveType });
    expect(
      within(typeGroup).getByRole('button', { name: messages.leave.types.HALF_AM }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('combobox', { name: t.history.status })).not.toBeInTheDocument();
  });

  it('shouldRemoveParamWhenLastToggleDeselected', async () => {
    nav.search = 'status=PENDING';
    mockApi(pageOf([leave()]));
    const ui = renderView();
    await screen.findByRole('table');

    const statusGroup = screen.getByRole('group', { name: t.history.status });
    await ui.click(
      within(statusGroup).getByRole('button', { name: messages.leave.statuses.PENDING }),
    );
    expect(router.push).toHaveBeenLastCalledWith('/leaves', { scroll: false });
  });

  it('shouldAddSecondStatusToggleToUrlAndResetPage', async () => {
    nav.search = 'status=PENDING&page=2';
    mockApi(pageOf([leave()], { page: 2, totalCount: 30, totalPages: 2 }));
    const ui = renderView();
    await screen.findByRole('table');

    const statusGroup = screen.getByRole('group', { name: t.history.status });
    await ui.click(
      within(statusGroup).getByRole('button', { name: messages.leave.statuses.APPROVED }),
    );
    // 表示順(PENDING → APPROVED)で並び、ページは 1 に戻る
    expect(router.push).toHaveBeenLastCalledWith('/leaves?status=PENDING%2CAPPROVED', {
      scroll: false,
    });
  });

  it('shouldPassTwoStatusTogglesToApiInDisplayOrder', async () => {
    nav.search = 'status=APPROVED,PENDING';
    mockApi(pageOf([leave()]));
    renderView();
    await screen.findByRole('table');

    const statusGroup = screen.getByRole('group', { name: t.history.status });
    expect(
      within(statusGroup).getByRole('button', { name: messages.leave.statuses.PENDING }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(statusGroup).getByRole('button', { name: messages.leave.statuses.APPROVED }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(historyCalls()).toEqual([
      `/leaves/me?year=${YEAR}&status=PENDING%2CAPPROVED&page=1&limit=20`,
    ]);
  });

  it('shouldPassUrlFiltersToApi', async () => {
    nav.search = `year=${YEAR - 1}&status=REJECTED,PENDING&leaveType=HALF_PM,ANNUAL&page=2`;
    mockApi(pageOf([leave()], { page: 2, totalCount: 30, totalPages: 2 }));
    renderView();
    await screen.findByRole('table');
    expect(historyCalls()).toEqual([
      `/leaves/me?year=${YEAR - 1}&status=PENDING%2CREJECTED&leaveType=ANNUAL%2CHALF_PM&page=2&limit=20`,
    ]);
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

    expect(await screen.findByText(t.history.empty)).toBeInTheDocument();
    expect(apiFetch.mock.calls.filter(([p]) => p === '/leaves/balance').length).toBeGreaterThan(1);
  });

  it('shouldShowSectionErrorForSummaryWithoutHidingHistory', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/leaves/balance') throw new ApiError(500, 'INTERNAL', 'error');
      if (path === '/leaves/approvers') return [];
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
      if (path === '/leaves/approvers') return [];
      if (path.startsWith('/leaves/me')) return pageOf([leave()]);
      throw new Error(`想定外の API 呼び出し: ${path}`);
    });
    renderView();
    expect((await screen.findAllByText(messages.common.loading)).length).toBeGreaterThan(0);
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('shouldPassScrollFalseOnToggleAndKeepBothWhenPressedConsecutively', async () => {
    nav.search = '';
    mockApi(pageOf([leave()]));
    const ui = renderView();
    await screen.findByRole('table');

    const statusGroup = screen.getByRole('group', { name: t.history.status });
    await ui.click(
      within(statusGroup).getByRole('button', { name: messages.leave.statuses.PENDING }),
    );
    expect(router.push).toHaveBeenLastCalledWith('/leaves?status=PENDING', { scroll: false });

    // 続けて別グループを押しても、前の選択(状態)を取りこぼさない
    const typeGroup = screen.getByRole('group', { name: t.history.leaveType });
    await ui.click(within(typeGroup).getByRole('button', { name: messages.leave.types.HALF_AM }));
    expect(router.push).toHaveBeenLastCalledWith('/leaves?status=PENDING&leaveType=HALF_AM', {
      scroll: false,
    });
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('shouldKeepPreviousListWithAriaBusyWhileFilteredResultLoads', async () => {
    auth.user = ME;
    nav.search = '';
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
    const { rerender } = render(
      <ToastProvider>
        <LeavesView />
      </ToastProvider>,
    );
    const table = await screen.findByRole('table');
    expect(await screen.findByText('20日')).toBeInTheDocument();
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
    // 画面全体の live region(Toast)は常時あるため、一覧の領域の中でスケルトンが出ていないことを見る
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
    expect(await within(table).findByText(messages.leave.detail.autoApproved)).toBeInTheDocument();
    expect(table.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false');
  });

  it('shouldShowErrorInsteadOfPreviousListWhenFilteredRequestFails', async () => {
    auth.user = ME;
    nav.search = '';
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

  it('shouldPlaceYearLabelAndSelectInOneRowOnMobile', async () => {
    mockApi(pageOf([leave()]));
    renderView();
    await screen.findByRole('table');

    // モバイル(sm 未満)の横 1 列は class で確認する。実際の見た目は未検証(ブラウザ確認が必要)
    const yearSelect = screen.getByLabelText(t.history.year);
    expect(yearSelect.parentElement).toHaveClass('flex', 'items-center');
  });
});
