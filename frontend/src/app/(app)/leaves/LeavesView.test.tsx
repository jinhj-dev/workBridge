import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { Leave, LeaveBalance, Paginated, UserSummary } from '@/lib/api/types';
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

const APPROVER: UserSummary = {
  id: 'u-approver',
  name: '佐藤花子',
  empId: '10002',
  departmentName: '開発部',
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
  it('shouldShowSummaryAndHistoryTabByDefault', async () => {
    mockApi(pageOf([leave()]));
    renderView();

    expect(await screen.findByText('20日')).toBeInTheDocument();
    expect(screen.getByText('3日')).toBeInTheDocument();
    expect(screen.getByText('1.5日')).toBeInTheDocument();
    expect(screen.getByText('15.5日')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: t.tabHistory })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(historyCalls()).toEqual([`/leaves/me?year=${YEAR}&page=1&limit=20`]);
  });

  it('shouldShowApplyFormWhenTabIsApplyAndSkipHistoryCall', async () => {
    nav.search = 'tab=apply';
    mockApi(pageOf([]));
    renderView();

    expect(await screen.findByLabelText(t.apply.leaveType)).toBeInTheDocument();
    expect(historyCalls()).toHaveLength(0);
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
      '2026/11/20 ~ 2026/11/21',
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

    await ui.selectOptions(screen.getByLabelText(t.history.status), 'PENDING');
    expect(router.push).toHaveBeenLastCalledWith('/leaves?status=PENDING');

    await ui.selectOptions(screen.getByLabelText(t.history.year), String(YEAR - 1));
    expect(router.push).toHaveBeenLastCalledWith(`/leaves?year=${YEAR - 1}`);
  });

  it('shouldPassUrlFiltersToApi', async () => {
    nav.search = `year=${YEAR - 1}&status=REJECTED&page=2`;
    mockApi(pageOf([leave()], { page: 2, totalCount: 30, totalPages: 2 }));
    renderView();
    await screen.findByRole('table');
    expect(historyCalls()).toEqual([`/leaves/me?year=${YEAR - 1}&status=REJECTED&page=2&limit=20`]);
  });

  it('shouldSwitchTabsByUrl', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView();
    await screen.findByRole('table');
    await ui.click(screen.getByRole('tab', { name: t.tabApply }));
    expect(router.push).toHaveBeenLastCalledWith('/leaves?tab=apply');
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

  it('shouldMoveToHistoryOfApplicationYearAfterApplying', async () => {
    nav.search = 'tab=apply';
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/leaves/balance') return BALANCE;
      if (path === '/leaves/approvers') return [APPROVER];
      if (path === '/leaves') return leave({ startDate: '2027-01-04', endDate: '2027-01-04' });
      if (path.startsWith('/leaves/me')) return pageOf([]);
      throw new Error(`想定外の API 呼び出し: ${path}`);
    });
    const ui = renderView();
    await ui.selectOptions(await screen.findByLabelText(t.apply.leaveType), 'ANNUAL');
    await ui.type(screen.getByLabelText(t.apply.startDate), '2027-01-04');
    await ui.type(screen.getByLabelText(t.apply.endDate), '2027-01-04');
    await ui.type(screen.getByLabelText(t.apply.reason), '私用');
    await ui.click(screen.getByLabelText(t.apply.approver));
    await ui.click(await screen.findByRole('option', { name: /佐藤花子/ }));
    await ui.click(screen.getByRole('button', { name: t.apply.submit }));

    await waitFor(() => expect(router.push).toHaveBeenLastCalledWith('/leaves?year=2027'));
  });
});
