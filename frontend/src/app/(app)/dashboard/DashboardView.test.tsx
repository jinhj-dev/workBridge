import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError, NetworkError } from '@/lib/api/client';
import type { Attendance, Leave, LeaveBalance, Paginated } from '@/lib/api/types';
import type { AuthUser } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { DashboardView } from './DashboardView';

const t = messages.dashboard;

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/dashboard' }));

const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock('@/lib/auth/AuthProvider', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: auth.user,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const EMPLOYEE: AuthUser = {
  id: 'u-me',
  name: '山田太郎',
  empId: '10001',
  role: 'EMPLOYEE',
  departmentName: '開発部',
  approvalRequired: true,
  mustChangePassword: false,
};
const ADMIN: AuthUser = { ...EMPLOYEE, role: 'ADMIN', name: '管理者' };

const userSummary = { id: 'u-me', name: '山田太郎', empId: '10001', departmentName: '開発部' };

function attendance(overrides: Partial<Attendance> = {}): Attendance {
  return {
    id: 'att-1',
    user: userSummary,
    workDate: '2026-11-09',
    clockIn: '2026-11-09T09:01:00+09:00',
    clockOut: null,
    workMinutes: null,
    status: 'WORKING',
    modifiedAt: null,
    ...overrides,
  };
}

const BALANCE: LeaveBalance = {
  year: 2026,
  grantedDays: 15,
  approvedDays: 2.5,
  pendingDays: 1,
  remainingDays: 11.5,
};

function leave(i: number): Leave {
  return {
    id: `leave-${i}`,
    user: { id: `u-${i}`, name: `申請者${i}`, empId: `2000${i}`, departmentName: '営業部' },
    approver: userSummary,
    leaveType: 'ANNUAL',
    startDate: '2026-11-20',
    endDate: '2026-11-21',
    days: 2,
    reason: '私用',
    status: 'PENDING',
    autoApproved: false,
    processedBy: null,
    processedAt: null,
    rejectReason: null,
    createdAt: '2026-11-08T10:00:00+09:00',
  };
}

function page(items: Leave[]): Paginated<Leave> {
  return { items, page: 1, limit: 5, totalCount: items.length, totalPages: items.length ? 1 : 0 };
}

const SUMMARY = {
  date: '2026-11-09',
  clockedInCount: 12,
  notClockedInCount: 3,
  onLeaveCount: 2,
  pendingLeaveCount: 7,
};

type Handler = (init?: RequestInit) => unknown;

// パスの先頭一致で応答を返す(Promise を返せば任意のタイミングで解決できる)
function mockApi(overrides: Record<string, Handler> = {}): void {
  const handlers: Record<string, Handler> = {
    '/attendance/today': () => null,
    '/leaves/balance': () => BALANCE,
    '/leaves/pending-approval': () => page([]),
    '/admin/dashboard/summary': () => SUMMARY,
    ...overrides,
  };
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const key = Object.keys(handlers).find((k) => path.startsWith(k));
    if (!key) throw new Error(`想定外の API 呼び出し: ${path}`);
    return handlers[key](init);
  });
}

function callsTo(path: string): unknown[][] {
  return apiFetch.mock.calls.filter(([p]) => String(p).startsWith(path));
}

function renderView(user: AuthUser = EMPLOYEE): ReturnType<typeof userEvent.setup> {
  auth.user = user;
  const ui = userEvent.setup();
  render(
    <ToastProvider>
      <DashboardView />
    </ToastProvider>,
  );
  return ui;
}

function attendanceCard(): HTMLElement {
  return screen
    .getByRole('heading', { name: t.attendance.title })
    .closest('section') as HTMLElement;
}
function clockInButton(): HTMLElement {
  return within(attendanceCard()).getByRole('button', { name: t.attendance.clockIn });
}
function clockOutButton(): HTMLElement {
  return within(attendanceCard()).getByRole('button', { name: t.attendance.clockOut });
}
async function waitAttendanceLoaded(): Promise<void> {
  await waitFor(() =>
    expect(within(attendanceCard()).queryByRole('status')).not.toBeInTheDocument(),
  );
}
function toast(): HTMLElement {
  // ToastProvider の通知領域(role=status, aria-live)
  return screen
    .getAllByRole('status')
    .find((el) => el.getAttribute('aria-live') === 'polite') as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DashboardView 権限による表示', () => {
  it('shouldNotRenderAdminSummaryNorCallApiForEmployee', async () => {
    mockApi();
    renderView(EMPLOYEE);
    await waitAttendanceLoaded();

    expect(screen.queryByRole('heading', { name: t.summary.title })).not.toBeInTheDocument();
    expect(callsTo('/admin/dashboard/summary')).toHaveLength(0);
  });

  it('shouldShowFourSummaryValuesWithPendingLinkForAdmin', async () => {
    mockApi();
    renderView(ADMIN);

    const section = (await screen.findByRole('heading', { name: t.summary.title })).closest(
      'section',
    ) as HTMLElement;
    await within(section).findByText('12名');
    expect(within(section).getByText('3名')).toBeInTheDocument();
    expect(within(section).getByText('2名')).toBeInTheDocument();
    expect(within(section).getByText('7件')).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: /承認待ち/ })).toHaveAttribute(
      'href',
      '/leaves/approvals?scope=all',
    );
    expect(callsTo('/admin/dashboard/summary')).toHaveLength(1);
  });
});

describe('DashboardView 勤怠', () => {
  it('shouldShowNotClockedInWithOnlyClockInEnabledWhenTodayIsNull', async () => {
    mockApi();
    renderView();
    await waitAttendanceLoaded();

    expect(within(attendanceCard()).getByText(t.attendance.notClockedIn)).toBeInTheDocument();
    expect(clockInButton()).toBeEnabled();
    expect(clockOutButton()).toBeDisabled();
  });

  it('shouldEnableOnlyClockOutAndShowTimeWhenWorking', async () => {
    mockApi({ '/attendance/today': () => attendance() });
    renderView();
    await waitAttendanceLoaded();

    expect(within(attendanceCard()).getByText(t.attendance.working)).toBeInTheDocument();
    expect(within(attendanceCard()).getByText('09:01')).toBeInTheDocument();
    expect(clockInButton()).toBeDisabled();
    expect(clockOutButton()).toBeEnabled();
  });

  it('shouldDisableBothButtonsAndShowTimesWhenDone', async () => {
    mockApi({
      '/attendance/today': () =>
        attendance({ status: 'DONE', clockOut: '2026-11-09T18:05:00+09:00', workMinutes: 544 }),
    });
    renderView();
    await waitAttendanceLoaded();

    expect(within(attendanceCard()).getByText(t.attendance.done)).toBeInTheDocument();
    expect(within(attendanceCard()).getByText('09:01')).toBeInTheDocument();
    expect(within(attendanceCard()).getByText('18:05')).toBeInTheDocument();
    expect(clockInButton()).toBeDisabled();
    expect(clockOutButton()).toBeDisabled();
  });

  it('shouldClockInAfterConfirmAndDisableButtonsWhileSubmitting', async () => {
    let resolveClockIn: (value: Attendance) => void = () => {};
    mockApi({
      '/attendance/clock-in': () =>
        new Promise<Attendance>((resolve) => {
          resolveClockIn = resolve;
        }),
    });
    const ui = renderView();
    await waitAttendanceLoaded();

    await ui.click(clockInButton());
    const dialog = screen.getByRole('dialog', { name: t.attendance.confirmClockInTitle });
    expect(dialog).toHaveTextContent(t.attendance.confirmClockIn);
    const confirm = within(dialog).getByRole('button', { name: t.attendance.confirm });
    await ui.click(confirm);
    await ui.click(confirm);

    expect(confirm).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    expect(callsTo('/attendance/clock-in')).toHaveLength(1);
    expect(callsTo('/attendance/clock-in')[0][1]).toMatchObject({ method: 'POST' });

    resolveClockIn(attendance());
    await waitFor(() =>
      expect(within(attendanceCard()).getByText(t.attendance.working)).toBeInTheDocument(),
    );
    expect(toast()).toHaveTextContent(t.attendance.clockedIn);
    expect(clockInButton()).toBeDisabled();
    expect(clockOutButton()).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // 成功時は再取得しない(応答で置き換える)
    expect(callsTo('/attendance/today')).toHaveLength(1);
  });

  it('shouldNotCallApiWhenConfirmIsCancelled', async () => {
    mockApi();
    const ui = renderView();
    await waitAttendanceLoaded();

    await ui.click(clockInButton());
    const dialog = screen.getByRole('dialog');
    await ui.click(within(dialog).getByRole('button', { name: messages.common.cancel }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(callsTo('/attendance/clock-in')).toHaveLength(0);
  });

  it('shouldShowServerMessageAndReloadTodayWhenAlreadyClockedIn', async () => {
    let todayCalls = 0;
    mockApi({
      '/attendance/today': () => (++todayCalls === 1 ? null : attendance()),
      '/attendance/clock-in': () => {
        throw new ApiError(409, 'ALREADY_CLOCKED_IN', '本日の出勤はすでに登録されています。');
      },
    });
    const ui = renderView();
    await waitAttendanceLoaded();

    await ui.click(clockInButton());
    await ui.click(screen.getByRole('button', { name: t.attendance.confirm }));

    await waitFor(() => expect(toast()).toHaveTextContent('本日の出勤はすでに登録されています。'));
    await waitFor(() => expect(callsTo('/attendance/today')).toHaveLength(2));
    await waitFor(() =>
      expect(within(attendanceCard()).getByText(t.attendance.working)).toBeInTheDocument(),
    );
  });

  it('shouldBecomeDoneAfterClockOut', async () => {
    mockApi({
      '/attendance/today': () => attendance(),
      '/attendance/clock-out': () =>
        attendance({ status: 'DONE', clockOut: '2026-11-09T18:00:00+09:00', workMinutes: 539 }),
    });
    const ui = renderView();
    await waitAttendanceLoaded();

    await ui.click(clockOutButton());
    const dialog = screen.getByRole('dialog', { name: t.attendance.confirmClockOutTitle });
    await ui.click(within(dialog).getByRole('button', { name: t.attendance.confirm }));

    await waitFor(() =>
      expect(within(attendanceCard()).getByText(t.attendance.done)).toBeInTheDocument(),
    );
    expect(within(attendanceCard()).getByText('18:00')).toBeInTheDocument();
    expect(toast()).toHaveTextContent(t.attendance.clockedOut);
    expect(clockOutButton()).toBeDisabled();
  });

  it('shouldShowMessageAndReloadWhenAlreadyClockedOut', async () => {
    mockApi({
      '/attendance/today': () => attendance(),
      '/attendance/clock-out': () => {
        throw new ApiError(409, 'ALREADY_CLOCKED_OUT', '本日の退勤はすでに登録されています。');
      },
    });
    const ui = renderView();
    await waitAttendanceLoaded();

    await ui.click(clockOutButton());
    await ui.click(screen.getByRole('button', { name: t.attendance.confirm }));

    await waitFor(() => expect(toast()).toHaveTextContent('本日の退勤はすでに登録されています。'));
    await waitFor(() => expect(callsTo('/attendance/today')).toHaveLength(2));
  });

  it('shouldShowNetworkToastWhenClockInFailsByNetwork', async () => {
    mockApi({
      '/attendance/clock-in': () => {
        throw new NetworkError();
      },
    });
    const ui = renderView();
    await waitAttendanceLoaded();

    await ui.click(clockInButton());
    await ui.click(screen.getByRole('button', { name: t.attendance.confirm }));

    await waitFor(() => expect(toast()).toHaveTextContent(messages.error.network));
    expect(within(attendanceCard()).getByText(t.attendance.notClockedIn)).toBeInTheDocument();
  });
});

describe('DashboardView 休暇状況', () => {
  it('shouldShowBalanceValuesAndApplyLink', async () => {
    mockApi();
    renderView();

    const card = (await screen.findByRole('heading', { name: t.leave.title })).closest(
      'section',
    ) as HTMLElement;
    await within(card).findByText('15日');
    expect(within(card).getByText('2.5日')).toBeInTheDocument();
    expect(within(card).getByText('1日')).toBeInTheDocument();
    expect(within(card).getByText('11.5日')).toBeInTheDocument();
    expect(within(card).getByText(t.leave.year(2026))).toBeInTheDocument();
    expect(within(card).queryByText(t.leave.notGranted)).not.toBeInTheDocument();
    expect(within(card).getByRole('link', { name: t.leave.apply })).toHaveAttribute(
      'href',
      '/leaves?tab=apply',
    );
  });

  it('shouldShowNotGrantedNoticeWhenGrantedDaysIsZero', async () => {
    mockApi({
      '/leaves/balance': () => ({
        year: 2026,
        grantedDays: 0,
        approvedDays: 0,
        pendingDays: 0,
        remainingDays: 0,
      }),
    });
    renderView();

    expect(await screen.findByText(t.leave.notGranted)).toBeInTheDocument();
  });
});

describe('DashboardView 承認待ち', () => {
  it('shouldShowFiveRowsWithSixColumnsAndRequestMineLimit5', async () => {
    mockApi({ '/leaves/pending-approval': () => page([1, 2, 3, 4, 5].map(leave)) });
    renderView();

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(6);
    // ヘッダー行 + 5 行
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(within(table).getByText('申請者1')).toBeInTheDocument();
    expect(within(table).getAllByText('2026/11/20 ~ 2026/11/21')).toHaveLength(5);
    expect(within(table).getAllByText('2026/11/08')).toHaveLength(5);
    expect(callsTo('/leaves/pending-approval')[0][0]).toContain('scope=mine&limit=5');
  });

  it('shouldShowEmptyMessageAndViewAllLink', async () => {
    mockApi();
    renderView();

    expect(await screen.findByText(t.pending.empty)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.pending.viewAll })).toHaveAttribute(
      'href',
      '/leaves/approvals',
    );
  });

  it('shouldOpenDetailModalWhenRowIsSelected', async () => {
    mockApi({
      '/leaves/pending-approval': () => page([leave(1)]),
      '/leaves/leave-1': () => leave(1),
    });
    const ui = renderView();

    await ui.click(await screen.findByRole('button', { name: t.pending.openDetail('申請者1') }));

    const dialog = await screen.findByRole('dialog', { name: messages.leave.detail.title });
    await within(dialog).findByText(/申請者1/);
    expect(callsTo('/leaves/leave-1')).toHaveLength(1);
  });
});

describe('DashboardView 領域ごとの状態', () => {
  it('shouldShowErrorOnlyInFailedSectionAndRetry', async () => {
    let balanceCalls = 0;
    mockApi({
      '/leaves/balance': () => {
        balanceCalls += 1;
        if (balanceCalls === 1) throw new ApiError(500, 'INTERNAL_ERROR', 'エラー');
        return BALANCE;
      },
    });
    const ui = renderView(ADMIN);

    const card = (await screen.findByRole('heading', { name: t.leave.title })).closest(
      'section',
    ) as HTMLElement;
    expect(await within(card).findByText(messages.common.loadError)).toBeInTheDocument();
    // 他の領域は正常に表示される
    expect(await screen.findByText('12名')).toBeInTheDocument();
    expect(await screen.findByText(t.pending.empty)).toBeInTheDocument();
    await waitAttendanceLoaded();
    expect(within(attendanceCard()).getByText(t.attendance.notClockedIn)).toBeInTheDocument();
    expect(screen.getAllByText(messages.common.loadError)).toHaveLength(1);

    await ui.click(within(card).getByRole('button', { name: messages.common.retry }));
    expect(await within(card).findByText('11.5日')).toBeInTheDocument();
    expect(callsTo('/leaves/balance')).toHaveLength(2);
  });

  it('shouldShowSkeletonInEachSectionWhileLoading', () => {
    apiFetch.mockImplementation(() => new Promise(() => {}));
    renderView(ADMIN);

    for (const title of [t.summary.title, t.attendance.title, t.leave.title, t.pending.title]) {
      const section = screen
        .getByRole('heading', { name: title })
        .closest('section') as HTMLElement;
      expect(within(section).getByRole('status')).toHaveTextContent(messages.common.loading);
    }
  });

  it('shouldShowNameDepartmentAndTokyoDateInHeader', async () => {
    // UTC 2026-11-08 15:30 = 東京 2026-11-09(月)00:30
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-08T15:30:00Z'));
    mockApi();
    renderView();

    expect(screen.getByRole('heading', { level: 1, name: t.title })).toBeInTheDocument();
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
    expect(screen.getByText(/開発部/)).toBeInTheDocument();
    expect(screen.getByText('2026年11月9日(月)')).toBeInTheDocument();
    await waitAttendanceLoaded();
  });
});
