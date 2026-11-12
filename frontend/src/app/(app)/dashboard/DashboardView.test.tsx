import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingApprovalCountProvider } from '@/components/layout/PendingApprovalCount';
import { ToastProvider } from '@/components/Toast';
import { ApiError, NetworkError } from '@/lib/api/client';
import type {
  AdminDashboardSummary,
  Attendance,
  AttendanceSheet,
  DepartmentStatus,
  Leave,
  LeaveBalance,
  Paginated,
} from '@/lib/api/types';
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

const SUMMARY: AdminDashboardSummary = {
  date: '2026-11-09',
  isWorkday: true,
  totalEmployeeCount: 30,
  clockedInCount: 12,
  notClockedInCount: 3,
  onLeaveCount: 2,
  attendanceRate: 70.6,
  pendingLeaveCount: 7,
};

const DEPARTMENTS: DepartmentStatus = {
  date: '2026-11-09',
  isWorkday: true,
  departments: [
    {
      departmentId: 'd-1',
      departmentName: '開発部',
      memberCount: 10,
      clockedInCount: 8,
      onLeaveCount: 1,
      notClockedInCount: 1,
      attendanceRate: 80,
    },
    {
      departmentId: null,
      departmentName: '未所属',
      memberCount: 1,
      clockedInCount: 0,
      onLeaveCount: 0,
      notClockedInCount: 1,
      attendanceRate: 0,
    },
  ],
};

const MONTHLY: AttendanceSheet = {
  month: '2026-11',
  days: [],
  summary: {
    scheduledWorkDays: 20,
    actualWorkDays: 12,
    actualWorkMinutes: 5790,
    overtimeMinutes: 600,
    nightMinutes: 0,
    holidayWorkMinutes: 480,
    paidLeaveDays: 1,
  },
};

type Handler = (init?: RequestInit) => unknown;

// パスの先頭一致で応答を返す(一致するキーのうち最長のものを使う。Promise を返せば任意のタイミングで解決できる)
function mockApi(overrides: Record<string, Handler> = {}): void {
  const handlers: Record<string, Handler> = {
    '/attendance/today': () => null,
    '/leaves/balance': () => BALANCE,
    '/leaves/me': () => page([]),
    '/leaves/pending-approval': () => page([]),
    '/admin/dashboard/summary': () => SUMMARY,
    '/dashboard/department-status': () => DEPARTMENTS,
    '/attendance/monthly': () => MONTHLY,
    ...overrides,
  };
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const key = Object.keys(handlers)
      .filter((k) => path.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];
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
      <PendingApprovalCountProvider>
        <DashboardView />
      </PendingApprovalCountProvider>
    </ToastProvider>,
  );
  return ui;
}

function cardOf(title: string): HTMLElement {
  return screen.getByRole('heading', { name: title }).closest('section') as HTMLElement;
}

async function findCard(title: string): Promise<HTMLElement> {
  return (await screen.findByRole('heading', { name: title })).closest('section') as HTMLElement;
}

function attendanceCard(): HTMLElement {
  return cardOf(t.attendance.title);
}
function clockInButton(): HTMLElement {
  return within(attendanceCard()).getByRole('button', { name: t.attendance.clockInAction });
}
function clockOutButton(): HTMLElement {
  return within(attendanceCard()).getByRole('button', { name: t.attendance.clockOutAction });
}
function doneButton(): HTMLElement {
  return within(attendanceCard()).getByRole('button', { name: t.attendance.doneAction });
}
async function waitAttendanceLoaded(): Promise<void> {
  await waitFor(() =>
    expect(within(attendanceCard()).queryByRole('status')).not.toBeInTheDocument(),
  );
}
function progressValue(): string | null {
  return within(attendanceCard()).getByRole('progressbar').getAttribute('aria-valuenow');
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
  it('shouldNotRenderAdminCardsNorCallSummaryApiForEmployee', async () => {
    mockApi();
    renderView(EMPLOYEE);
    await waitAttendanceLoaded();

    expect(screen.queryByRole('heading', { name: t.company.title })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: t.stats.label })).not.toBeInTheDocument();
    expect(callsTo('/admin/dashboard/summary')).toHaveLength(0);
  });

  it('shouldNotShowPendingCardForEmployeeWithoutAssignedApprovals', async () => {
    mockApi();
    renderView(EMPLOYEE);
    await waitAttendanceLoaded();
    // バッジ用の件数確認(limit=1)が済むのを待つ
    await waitFor(() => expect(callsTo('/leaves/pending-approval')).toHaveLength(1));

    expect(screen.queryByRole('heading', { name: /^承認待ちの申請/ })).not.toBeInTheDocument();
    expect(callsTo('/leaves/pending-approval?scope=mine&limit=5')).toHaveLength(0);
  });

  it('shouldNotRenderCalendarNorNoticeAndNotCallCalendarApi', async () => {
    mockApi();
    renderView(ADMIN);
    await waitAttendanceLoaded();

    expect(screen.queryByText('休暇カレンダー')).not.toBeInTheDocument();
    expect(screen.queryByText('お知らせ')).not.toBeInTheDocument();
    expect(callsTo('/dashboard/leave-calendar')).toHaveLength(0);
  });

  it('shouldShowThreeStatsWithPendingLinkAndCompanyDonutForAdmin', async () => {
    mockApi();
    renderView(ADMIN);

    const stats = await screen.findByRole('group', { name: t.stats.label });
    expect(within(stats).getByText('30')).toBeInTheDocument();
    expect(within(stats).getByText('12')).toBeInTheDocument();
    expect(within(stats).getByText('7')).toBeInTheDocument();
    expect(within(stats).getAllByText(t.stats.peopleUnit)).toHaveLength(2);
    expect(within(stats).getByRole('link', { name: /承認待ちの申請/ })).toHaveAttribute(
      'href',
      '/leaves/approvals?scope=all',
    );

    const company = cardOf(t.company.title);
    // 割合の分母は 出勤 + 休暇 + 未出勤 = 17
    expect(await within(company).findByText('12名（70.6%）')).toBeInTheDocument();
    expect(within(company).getByText('3名（17.6%）')).toBeInTheDocument();
    expect(within(company).getByText('2名（11.8%）')).toBeInTheDocument();
    expect(within(company).getByRole('img')).toHaveAccessibleName(/出勤率 70.6%/);
    // 統計と全社の出勤状況で 1 回だけ取得する
    expect(callsTo('/admin/dashboard/summary')).toHaveLength(1);
  });

  it('shouldShowHolidayNoteAndDashWhenNotWorkdayAndRateIsNull', async () => {
    mockApi({
      '/admin/dashboard/summary': () => ({
        ...SUMMARY,
        isWorkday: false,
        clockedInCount: 0,
        notClockedInCount: 0,
        onLeaveCount: 0,
        attendanceRate: null,
      }),
    });
    renderView(ADMIN);

    const company = await findCard(t.company.title);
    expect(await within(company).findByText(t.holidayNote)).toBeInTheDocument();
    expect(within(company).getAllByText('0名（—）')).toHaveLength(3);
    expect(within(company).getByRole('img')).toHaveAccessibleName(/出勤率 —/);
  });

  it('shouldShowAdminPendingCardWithScopeAllAndTotalCountInTitle', async () => {
    mockApi({
      '/leaves/pending-approval?scope=all': () => ({ ...page([1, 2].map(leave)), totalCount: 7 }),
    });
    renderView(ADMIN);

    const card = await findCard('承認待ちの申請（7件）');
    expect(within(card).getByRole('link', { name: t.pending.viewAll })).toHaveAttribute(
      'href',
      '/leaves/approvals?scope=all',
    );
    expect(callsTo('/leaves/pending-approval?scope=all&limit=5')).toHaveLength(1);
  });

  it('shouldShowEmptyMessageInAdminPendingCard', async () => {
    mockApi();
    renderView(ADMIN);

    expect(await screen.findByText(t.pending.empty)).toBeInTheDocument();
  });
});

describe('DashboardView 勤怠', () => {
  it('shouldShowNotClockedInWithOnlyClockInButtonWhenTodayIsNull', async () => {
    mockApi();
    renderView();
    await waitAttendanceLoaded();

    expect(within(attendanceCard()).getByText(t.attendance.notClockedIn)).toBeInTheDocument();
    expect(clockInButton()).toBeEnabled();
    expect(within(attendanceCard()).getAllByRole('button')).toHaveLength(1);
    // 出勤時刻・退勤時刻は退勤前のため未確定（--:--）
    expect(within(attendanceCard()).getAllByText(t.attendance.noTime)).toHaveLength(2);
    expect(progressValue()).toBe('0');
  });

  it('shouldShowClockOutButtonAndPlaceholderClockOutTimeWhenWorking', async () => {
    mockApi({ '/attendance/today': () => attendance() });
    renderView();
    await waitAttendanceLoaded();

    expect(within(attendanceCard()).getByText(t.attendance.working)).toBeInTheDocument();
    expect(within(attendanceCard()).getByText('09:01')).toBeInTheDocument();
    // 退勤前は退勤時刻を未確定(--:--)で出し、出勤 + 9 時間の目安は出さない
    expect(within(attendanceCard()).getByText(t.attendance.clockOutTime)).toBeInTheDocument();
    expect(within(attendanceCard()).getByText(t.attendance.noTime)).toBeInTheDocument();
    expect(within(attendanceCard()).queryByText('18:01')).toBeNull();
    expect(clockOutButton()).toBeEnabled();
    expect(
      within(attendanceCard()).queryByRole('button', { name: t.attendance.clockInAction }),
    ).toBeNull();
  });

  it('shouldShowDisabledDoneButtonAndActualClockOutWhenDone', async () => {
    mockApi({
      '/attendance/today': () =>
        attendance({ status: 'DONE', clockOut: '2026-11-09T18:05:00+09:00', workMinutes: 544 }),
    });
    renderView();
    await waitAttendanceLoaded();

    // 状態バッジと、無効の [退勤済み] ボタンの 2 か所
    expect(within(attendanceCard()).getAllByText(t.attendance.done)).toHaveLength(2);
    expect(within(attendanceCard()).getByText('09:01')).toBeInTheDocument();
    expect(within(attendanceCard()).getByText(t.attendance.clockOutTime)).toBeInTheDocument();
    expect(within(attendanceCard()).getByText('18:05')).toBeInTheDocument();
    expect(doneButton()).toBeDisabled();
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
    // 送信中は Esc(cancel イベント)でも閉じない
    const escape = new Event('cancel', { cancelable: true });
    fireEvent(dialog, escape);
    expect(escape.defaultPrevented).toBe(true);

    resolveClockIn(attendance());
    await waitFor(() =>
      expect(within(attendanceCard()).getByText(t.attendance.working)).toBeInTheDocument(),
    );
    expect(toast()).toHaveTextContent(t.attendance.clockedIn);
    expect(clockOutButton()).toBeEnabled();
    // モーダルの閉じる処理(effect)は非同期に反映されるため待つ
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // 成功時は今日の勤怠を再取得しない(応答で置き換える)
    expect(callsTo('/attendance/today')).toHaveLength(1);
  });

  it('shouldReloadMonthlyAndDepartmentsAfterClockIn', async () => {
    mockApi({ '/attendance/clock-in': () => attendance() });
    const ui = renderView(ADMIN);
    await waitAttendanceLoaded();

    await ui.click(clockInButton());
    await ui.click(screen.getByRole('button', { name: t.attendance.confirm }));

    await waitFor(() => expect(callsTo('/attendance/monthly')).toHaveLength(2));
    expect(callsTo('/dashboard/department-status')).toHaveLength(2);
    expect(callsTo('/admin/dashboard/summary')).toHaveLength(2);
  });

  it('shouldFocusConfirmButtonWhenClockInConfirmOpens', async () => {
    mockApi();
    const ui = renderView();
    await waitAttendanceLoaded();

    await ui.click(clockInButton());
    expect(screen.getByRole('button', { name: t.attendance.confirm })).toHaveFocus();
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
      expect(within(attendanceCard()).getAllByText(t.attendance.done)).toHaveLength(2),
    );
    expect(within(attendanceCard()).getByText('18:00')).toBeInTheDocument();
    expect(toast()).toHaveTextContent(t.attendance.clockedOut);
    expect(doneButton()).toBeDisabled();
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

describe('DashboardView 勤務進捗(表示専用)', () => {
  it('shouldShowHalfProgressFourAndHalfHoursAfterClockIn', async () => {
    // 出勤 09:01 の 270 分後 = 270 / 540 = 50%
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-09T13:31:00+09:00'));
    mockApi({ '/attendance/today': () => attendance() });
    renderView();
    await waitAttendanceLoaded();

    expect(progressValue()).toBe('50');
  });

  it('shouldClampProgressTo100AfterNineHours', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-09T23:00:00+09:00'));
    mockApi({ '/attendance/today': () => attendance() });
    renderView();
    await waitAttendanceLoaded();

    expect(progressValue()).toBe('100');
  });

  it('shouldAdvanceProgressEveryMinuteWhileWorking', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-09T09:01:00+09:00'));
    mockApi({ '/attendance/today': () => attendance() });
    renderView();
    await waitAttendanceLoaded();
    expect(progressValue()).toBe('0');

    // 108 分後 = 108 / 540 = 20%
    await act(async () => {
      await vi.advanceTimersByTimeAsync(108 * 60_000);
    });
    expect(progressValue()).toBe('20');
  });
});

describe('DashboardView 休暇の残り日数', () => {
  it('shouldShowRemainingAndApprovedDaysWithHistoryLinkAndNoApplyButton', async () => {
    mockApi();
    renderView();

    const card = await findCard(t.leave.title);
    await within(card).findByText('11.5');
    expect(within(card).getByText(t.leave.remaining)).toBeInTheDocument();
    expect(within(card).getByText('2.5')).toBeInTheDocument();
    expect(within(card).queryByText('15日')).not.toBeInTheDocument();
    expect(within(card).queryByText(t.leave.notGranted)).not.toBeInTheDocument();
    expect(within(card).getByRole('link', { name: t.leave.viewHistory })).toHaveAttribute(
      'href',
      '/leaves',
    );
    expect(within(card).getByText(t.leave.approved)).toBeInTheDocument();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
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

// 承認者の社員向け: バッジ用の件数(limit=1)が 1 以上のときだけカードが出る
const PENDING_FIVE = {
  '/leaves/pending-approval': () => page([1, 2, 3, 4, 5].map(leave)),
};

describe('DashboardView 承認待ち', () => {
  it('shouldShowPendingCardForApproverWithFiveRowsAndRequestMineLimit5', async () => {
    mockApi(PENDING_FIVE);
    renderView(EMPLOYEE);

    const section = await findCard('承認待ちの申請（5件）');
    const table = await within(section).findByRole('table');
    // 見出し 5 列(最後は操作列)+ データ 5 行
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(within(table).getByText('申請者1')).toBeInTheDocument();
    expect(within(table).getAllByText('営業部')).toHaveLength(5);
    expect(within(table).getAllByText(messages.leave.types.ANNUAL)).toHaveLength(5);
    expect(within(table).getAllByText('2026/11/20 ～ 2026/11/21')).toHaveLength(5);
    expect(within(section).getByRole('link', { name: t.pending.viewAll })).toHaveAttribute(
      'href',
      '/leaves/approvals',
    );
    expect(callsTo('/leaves/pending-approval?scope=mine&limit=5')).toHaveLength(1);
  });

  it('shouldOpenDetailModalWhenRowIsSelected', async () => {
    mockApi({
      '/leaves/pending-approval': () => page([leave(1)]),
      '/leaves/leave-1': () => leave(1),
    });
    const ui = renderView(EMPLOYEE);

    await ui.click(await screen.findByRole('button', { name: t.pending.openDetail('申請者1') }));

    const dialog = await screen.findByRole('dialog', { name: messages.leave.detail.title });
    await within(dialog).findByText(/申請者1/);
    expect(callsTo('/leaves/leave-1')).toHaveLength(1);
  });

  async function approveFirstRow(user: AuthUser): Promise<void> {
    mockApi({
      '/leaves/pending-approval': () => page([leave(1)]),
      '/leaves/leave-1': (init) =>
        init?.method === 'PATCH' ? { ...leave(1), status: 'APPROVED' } : leave(1),
    });
    const ui = renderView(user);

    await ui.click(await screen.findByRole('button', { name: t.pending.openDetail('申請者1') }));
    const dialog = await screen.findByRole('dialog', { name: messages.leave.detail.title });
    await ui.click(
      await within(dialog).findByRole('button', { name: messages.leave.detail.approve }),
    );
    await ui.click(
      await within(dialog).findByRole('button', { name: messages.leave.approve.submit }),
    );
  }

  it('shouldReloadListAndBadgeAfterApproveFromDashboard', async () => {
    await approveFirstRow(EMPLOYEE);

    // 一覧(limit=5)とバッジ(limit=1)が、承認後に 1 回ずつ取り直される
    await waitFor(() =>
      expect(callsTo('/leaves/pending-approval?scope=mine&limit=5')).toHaveLength(2),
    );
    expect(callsTo('/leaves/pending-approval?scope=mine&limit=1')).toHaveLength(2);
    expect(callsTo('/leaves/leave-1/approve')).toHaveLength(1);
  });

  it('shouldReloadSummaryAndDepartmentsAfterApproveForAdmin', async () => {
    await approveFirstRow(ADMIN);

    await waitFor(() => expect(callsTo('/admin/dashboard/summary')).toHaveLength(2));
    expect(callsTo('/dashboard/department-status')).toHaveLength(2);
    expect(callsTo('/leaves/pending-approval?scope=all&limit=5')).toHaveLength(2);
  });
});

describe('DashboardView 承認待ち(件数・却下・処理後の状態)', () => {
  // 一覧から申請者1を開き、詳細の「承認」または「却下」を押して確認ステップまで進める
  async function openStep(
    ui: ReturnType<typeof userEvent.setup>,
    step: 'approve' | 'reject',
  ): Promise<HTMLElement> {
    await ui.click(await screen.findByRole('button', { name: t.pending.openDetail('申請者1') }));
    const dialog = await screen.findByRole('dialog', { name: messages.leave.detail.title });
    await ui.click(
      await within(dialog).findByRole('button', {
        name: step === 'approve' ? messages.leave.detail.approve : messages.leave.detail.reject,
      }),
    );
    return dialog;
  }

  function reasonField(dialog: HTMLElement): HTMLElement {
    return within(dialog).getByLabelText(messages.leave.reject.reasonLabel);
  }

  function pendingHandlers(overrides: Record<string, Handler> = {}): Record<string, Handler> {
    return {
      '/leaves/pending-approval': () => page([leave(1)]),
      '/leaves/leave-1': (init) =>
        init?.method === 'PATCH' ? { ...leave(1), status: 'APPROVED' } : leave(1),
      ...overrides,
    };
  }

  it('shouldNotShowPendingCardWhenBadgeCountRequestFails', async () => {
    mockApi({
      '/leaves/pending-approval?scope=mine&limit=1': () => {
        throw new NetworkError();
      },
    });
    renderView(EMPLOYEE);
    await waitAttendanceLoaded();

    // バッジの件数が取れない(null)ときは、承認待ちカードを出さない
    await waitFor(() =>
      expect(callsTo('/leaves/pending-approval?scope=mine&limit=1')).toHaveLength(1),
    );
    expect(screen.queryByRole('heading', { name: /^承認待ちの申請/ })).not.toBeInTheDocument();
    expect(callsTo('/leaves/pending-approval?scope=mine&limit=5')).toHaveLength(0);
  });

  it('shouldShowValidationAndNotCallRejectApiWhenReasonIsEmpty', async () => {
    mockApi(pendingHandlers());
    const ui = renderView(EMPLOYEE);

    const dialog = await openStep(ui, 'reject');
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.reject.submit }));

    expect(
      await within(dialog).findByText(messages.leave.reject.validation.required),
    ).toBeInTheDocument();
    expect(callsTo('/leaves/leave-1/reject')).toHaveLength(0);
  });

  it('shouldShowValidationWhenReasonIsOnlyWhitespace', async () => {
    mockApi(pendingHandlers());
    const ui = renderView(EMPLOYEE);

    const dialog = await openStep(ui, 'reject');
    fireEvent.change(reasonField(dialog), { target: { value: '   ' } });
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.reject.submit }));

    expect(
      await within(dialog).findByText(messages.leave.reject.validation.required),
    ).toBeInTheDocument();
    expect(callsTo('/leaves/leave-1/reject')).toHaveLength(0);
  });

  it('shouldShowTooLongValidationAndNotCallRejectApiWhenReasonExceeds500Chars', async () => {
    mockApi(pendingHandlers());
    const ui = renderView(EMPLOYEE);

    const dialog = await openStep(ui, 'reject');
    fireEvent.change(reasonField(dialog), { target: { value: 'あ'.repeat(501) } });
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.reject.submit }));

    expect(
      await within(dialog).findByText(messages.leave.reject.validation.tooLong),
    ).toBeInTheDocument();
    expect(callsTo('/leaves/leave-1/reject')).toHaveLength(0);
  });

  it('shouldRejectWithTrimmedReasonThenShowToastAndReloadList', async () => {
    mockApi(pendingHandlers());
    const ui = renderView(EMPLOYEE);

    const dialog = await openStep(ui, 'reject');
    fireEvent.change(reasonField(dialog), { target: { value: '  条件不一致  ' } });
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.reject.submit }));

    await waitFor(() => expect(callsTo('/leaves/leave-1/reject')).toHaveLength(1));
    const [, init] = callsTo('/leaves/leave-1/reject')[0] as [string, RequestInit];
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ rejectReason: '条件不一致' });
    await waitFor(() => expect(toast()).toHaveTextContent(messages.leave.reject.success));
    await waitFor(() =>
      expect(callsTo('/leaves/pending-approval?scope=mine&limit=5')).toHaveLength(2),
    );
    expect(callsTo('/leaves/pending-approval?scope=mine&limit=1')).toHaveLength(2);
  });

  it('shouldShowAlreadyProcessedToastAndReloadListWhenApproveReturns409', async () => {
    mockApi(
      pendingHandlers({
        '/leaves/leave-1': (init) => {
          if (init?.method === 'PATCH') {
            throw new ApiError(409, 'ALREADY_PROCESSED', messages.leave.alreadyProcessed);
          }
          return leave(1);
        },
      }),
    );
    const ui = renderView(EMPLOYEE);

    const dialog = await openStep(ui, 'approve');
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.approve.submit }));

    await waitFor(() => expect(callsTo('/leaves/leave-1/approve')).toHaveLength(1));
    await waitFor(() => expect(toast()).toHaveTextContent(messages.leave.alreadyProcessed));
    // 409 は処理できない申請として閉じ、一覧とバッジを取り直す
    await waitFor(() =>
      expect(callsTo('/leaves/pending-approval?scope=mine&limit=5')).toHaveLength(2),
    );
    expect(callsTo('/leaves/pending-approval?scope=mine&limit=1')).toHaveLength(2);
    expect(
      screen.queryByRole('dialog', { name: messages.leave.detail.title }),
    ).not.toBeInTheDocument();
  });

  it('shouldRemoveCardAndKeepToastWhenLastPendingItemIsApproved', async () => {
    // 承認すると一覧もバッジも 0 件になる(サーバー側の状態を再現する)
    let remaining: Leave[] = [leave(1)];
    mockApi(
      pendingHandlers({
        '/leaves/pending-approval': () => page(remaining),
        '/leaves/leave-1': (init) => {
          if (init?.method === 'PATCH') {
            remaining = [];
            return { ...leave(1), status: 'APPROVED' };
          }
          return leave(1);
        },
      }),
    );
    const ui = renderView(EMPLOYEE);

    const dialog = await openStep(ui, 'approve');
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.approve.submit }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /^承認待ちの申請/ })).not.toBeInTheDocument(),
    );
    // 件数 0 になったのでカードは消えるが、処理結果のトーストは残る
    expect(toast()).toHaveTextContent(messages.leave.approve.success);
    expect(callsTo('/leaves/leave-1/approve')).toHaveLength(1);
    expect(callsTo('/leaves/pending-approval?scope=mine&limit=1')).toHaveLength(2);
  });
});

describe('DashboardView 今月・部署・直近', () => {
  it('shouldShowMonthlyFourValuesWithHolidayWorkInHours', async () => {
    mockApi();
    renderView();

    const card = await findCard(t.monthly.title);
    await within(card).findByText('12');
    // 数字と単位は別の要素に分かれるため、カード全体の文字列で確認する
    expect(card.textContent).toContain('96時間30分');
    expect(card.textContent).toContain('10時間');
    expect(card.textContent).toContain('8時間');
    expect(within(card).getByText(t.monthly.holidayWork)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: t.monthly.viewDetail })).toHaveAttribute(
      'href',
      '/attendance',
    );
  });

  it('shouldShowDepartmentCountsOnlyAndHideLinkForEmployee', async () => {
    mockApi();
    renderView(EMPLOYEE);

    const card = await findCard(t.departments.title);
    const table = await within(card).findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText('開発部')).toBeInTheDocument();
    expect(within(rows[1]).getByText('10名')).toBeInTheDocument();
    expect(within(rows[1]).getByText('（80.0%）')).toBeInTheDocument();
    expect(within(rows[2]).getByText('未所属')).toBeInTheDocument();
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
  });

  it('shouldShowAllDepartmentsLinkForAdminAndEmptyMessage', async () => {
    mockApi({ '/dashboard/department-status': () => ({ ...DEPARTMENTS, departments: [] }) });
    renderView(ADMIN);

    const card = await findCard(t.departments.title);
    expect(await within(card).findByText(t.departments.empty)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: t.departments.viewAll })).toHaveAttribute(
      'href',
      '/admin/attendance',
    );
  });

  it('shouldShowHolidayNoteInDepartmentCardWhenNotWorkday', async () => {
    mockApi({ '/dashboard/department-status': () => ({ ...DEPARTMENTS, isWorkday: false }) });
    renderView(EMPLOYEE);

    const card = await findCard(t.departments.title);
    expect(await within(card).findByText(t.holidayNote)).toBeInTheDocument();
  });

  it('shouldShowRecentThreeRequestsAndOpenDetailModal', async () => {
    mockApi({
      '/leaves/me': () => page([1, 2, 3].map(leave)),
      '/leaves/leave-2': () => leave(2),
    });
    const ui = renderView();

    const card = await findCard(t.recent.title);
    const buttons = await within(card).findAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(callsTo('/leaves/me')[0][0]).toBe('/leaves/me?limit=3');
    expect(within(card).getAllByText(messages.leave.statuses.PENDING)).toHaveLength(3);
    expect(within(card).getByRole('link', { name: t.recent.viewAll })).toHaveAttribute(
      'href',
      '/leaves',
    );

    await ui.click(buttons[1]);
    expect(
      await screen.findByRole('dialog', { name: messages.leave.detail.title }),
    ).toBeInTheDocument();
    expect(callsTo('/leaves/leave-2')).toHaveLength(1);
  });

  it('shouldShowEmptyMessageWhenNoRecentRequests', async () => {
    mockApi();
    renderView();

    expect(await screen.findByText(t.recent.empty)).toBeInTheDocument();
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

    const card = await findCard(t.leave.title);
    expect(await within(card).findByText(messages.common.loadError)).toBeInTheDocument();
    // 他の領域は正常に表示される
    expect(await screen.findByText('12名（70.6%）')).toBeInTheDocument();
    expect(await screen.findByText(t.pending.empty)).toBeInTheDocument();
    await waitAttendanceLoaded();
    expect(within(attendanceCard()).getByText(t.attendance.notClockedIn)).toBeInTheDocument();
    expect(screen.getAllByText(messages.common.loadError)).toHaveLength(1);

    await ui.click(within(card).getByRole('button', { name: messages.common.retry }));
    expect(await within(card).findByText('11.5')).toBeInTheDocument();
    expect(callsTo('/leaves/balance')).toHaveLength(2);
  });

  it('shouldShowSkeletonInEachSectionWhileLoading', () => {
    apiFetch.mockImplementation(() => new Promise(() => {}));
    renderView(ADMIN);

    for (const title of [
      t.attendance.title,
      t.company.title,
      t.monthly.title,
      t.leave.title,
      t.departments.title,
      t.recent.title,
      t.pending.title,
    ]) {
      expect(within(cardOf(title)).getByRole('status')).toHaveTextContent(messages.common.loading);
    }
  });

  it('shouldShowGreetingNameSubtitleAndTokyoDateInHeader', async () => {
    // UTC 2026-11-08 15:30 = 東京 2026-11-09(月)00:30(挨拶は夜)
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-08T15:30:00Z'));
    mockApi();
    renderView();

    expect(
      screen.getByRole('heading', { level: 1, name: 'こんばんは、山田太郎さん' }),
    ).toBeInTheDocument();
    expect(screen.getByText(t.subtitle)).toBeInTheDocument();
    expect(screen.getByText('2026年11月9日(月)')).toBeInTheDocument();
    await waitAttendanceLoaded();
  });
});

describe('DashboardView 配置', () => {
  // 1 列の並び替えは CSS(order)だけで行い、DOM 順(= 2 列の流れ)は変えない
  it('shouldKeepDomOrderAndUseOrderClassesOnlyForAdmin', async () => {
    mockApi();
    renderView(ADMIN);
    await waitAttendanceLoaded();

    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
    expect(titles).toEqual([
      t.attendance.title,
      t.pending.titleWithCount(0),
      t.company.title,
      t.monthly.title,
      t.leave.title,
      t.departments.title,
      t.recent.title,
    ]);
    expect(cardOf(t.company.title).parentElement).toHaveClass('order-1', 'xl:order-none');
    expect(cardOf(t.recent.title).parentElement).toHaveClass('order-7');
  });

  it('shouldNotUseOrderClassesForEmployee', async () => {
    mockApi();
    renderView(EMPLOYEE);
    await waitAttendanceLoaded();

    const recent = cardOf(t.recent.title).parentElement as HTMLElement;
    expect(recent.className).not.toMatch(/order-/);
    // 直近は部署と同じ行に並べるため、ぶち抜きにしない
    expect(recent).not.toHaveClass('xl:col-span-2');
  });

  it('shouldNotSpanRecentForApprover', async () => {
    mockApi(PENDING_FIVE);
    renderView(EMPLOYEE);
    await findCard('承認待ちの申請（5件）');

    expect(cardOf(t.recent.title).parentElement).not.toHaveClass('xl:col-span-2');
  });
});
