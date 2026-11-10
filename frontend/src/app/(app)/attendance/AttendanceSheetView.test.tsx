import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MISSING_ROW_CLASS } from '@/components/attendance/attendanceStatus';
import { ApiError } from '@/lib/api/client';
import type { AttendanceSheet, LeaveBalance, SheetDay } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { AttendanceSheetView } from './AttendanceSheetView';

const t = messages.attendance;
const s = t.sheet;

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/attendance',
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

// 詳細モーダルは別のテストで確認済み。ここでは開く対象の ID だけ確かめる
vi.mock('@/components/leave/LeaveDetailModal', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/leave/LeaveDetailModal')>()),
  LeaveDetailModal: ({ leaveId }: { leaveId: string | null }) =>
    leaveId ? <div role="dialog">detail:{leaveId}</div> : null,
}));

function emptyDay(date: string, overrides: Partial<SheetDay> = {}): SheetDay {
  return {
    date,
    dayType: 'WEEKDAY',
    holidayName: null,
    attendance: null,
    breakTime: null,
    actualWorkMinutes: null,
    overtimeMinutes: 0,
    nightMinutes: 0,
    leaves: [],
    ...overrides,
  };
}

const DONE_DAY = emptyDay('2026-11-02', {
  attendance: {
    id: 'a1',
    clockIn: '2026-11-02T09:00:00+09:00',
    clockOut: '2026-11-02T18:30:00+09:00',
    status: 'DONE',
    modifiedAt: '2026-11-03T10:00:00+09:00',
  },
  breakTime: {
    minutes: 60,
    source: 'LEGAL_MINIMUM',
    start: '2026-11-02T13:15:00+09:00',
    end: '2026-11-02T14:15:00+09:00',
  },
  actualWorkMinutes: 510,
  overtimeMinutes: 30,
  leaves: [{ id: 'leave-1', leaveType: 'HALF_PM', status: 'PENDING' }],
});

function sheet(overrides: Partial<AttendanceSheet> = {}): AttendanceSheet {
  return {
    month: '2026-11',
    days: [
      DONE_DAY,
      emptyDay('2026-11-03', { dayType: 'HOLIDAY', holidayName: '文化の日' }),
      emptyDay('2026-11-04', {
        attendance: {
          id: 'a2',
          clockIn: '2026-11-04T09:00:00+09:00',
          clockOut: null,
          status: 'MISSING_CLOCK_OUT',
          modifiedAt: null,
        },
      }),
      emptyDay('2026-11-07', { dayType: 'WEEKEND' }),
      emptyDay('2026-11-10', {
        attendance: {
          id: 'a3',
          clockIn: '2026-11-10T09:00:00+09:00',
          clockOut: null,
          status: 'WORKING',
          modifiedAt: null,
        },
      }),
      emptyDay('2026-11-11', {
        leaves: [{ id: 'leave-2', leaveType: 'ANNUAL', status: 'APPROVED' }],
      }),
    ],
    summary: {
      scheduledWorkDays: 19,
      actualWorkDays: 18,
      actualWorkMinutes: 8640,
      overtimeMinutes: 120,
      nightMinutes: 30,
      holidayWorkMinutes: 0,
      paidLeaveDays: 1.5,
    },
    ...overrides,
  };
}

const BALANCE: LeaveBalance = {
  year: 2026,
  grantedDays: 20,
  approvedDays: 3,
  pendingDays: 0,
  remainingDays: 14.5,
};

function mockApi(
  data: AttendanceSheet | ApiError = sheet(),
  balance: LeaveBalance | Error = BALANCE,
) {
  apiFetch.mockImplementation((path: string) => {
    const result = path.startsWith('/attendance/monthly') ? data : balance;
    return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
  });
}

// 今日は 2026-11-10(東京)
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T09:14:00+09:00'));
  nav.search = '';
  apiFetch.mockReset();
  router.push.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function rowOf(label: string): HTMLElement {
  const cell = screen.getByRole('cell', { name: label });
  return cell.closest('tr') as HTMLElement;
}

describe('AttendanceSheetView(SCR-003 出勤簿)', () => {
  it('shouldRequestCurrentMonthWhenMonthParamIsMissing', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    expect(await screen.findByText('2日（月）')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/attendance/monthly?month=2026-11');
    expect(apiFetch).toHaveBeenCalledWith('/leaves/balance?year=2026');
    expect(screen.getByRole('heading', { level: 1, name: t.title })).toBeInTheDocument();
    expect(screen.getByText('2026年11月')).toBeInTheDocument();
  });

  it('shouldFallBackToCurrentMonthWhenMonthParamIsInvalid', async () => {
    nav.search = 'month=2026-99';
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    expect(apiFetch).toHaveBeenCalledWith('/attendance/monthly?month=2026-11');
  });

  it('shouldShowSkeletonWhileLoading', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));
    render(<AttendanceSheetView />);
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shouldShowRowValuesForDoneDay', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    const row = within(rowOf('2日（月）'));
    expect(row.getByText('通常')).toBeInTheDocument();
    expect(row.getByText('09:00')).toBeInTheDocument();
    expect(row.getByText('18:30')).toBeInTheDocument();
    expect(row.getByText(/1:00/)).toBeInTheDocument();
    expect(row.getByText(s.computed)).toBeInTheDocument();
    expect(row.getByText('8:30')).toBeInTheDocument();
    expect(row.getByText(t.modified)).toBeInTheDocument();
    // 時間帯は右側の表の行にある。名前は日付で始まる
    expect(
      screen.getByRole('img', { name: /^2日（月） 09:00〜18:30 勤務、13:15〜14:15 休憩/ }),
    ).toBeInTheDocument();
  });

  it('shouldShowHolidayAsGreyRowWithNameAndPattern', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('3日（火）');
    const tr = rowOf('3日（火）');
    expect(tr).toHaveClass('bg-general-30');
    expect(within(tr).getByText(s.holiday)).toBeInTheDocument();
    expect(within(tr).getByText('文化の日')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '3日（火）' })).toHaveClass('text-danger-100');
  });

  it('shouldShowWeekendAsGreyRowWithDayOffPattern', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('7日（土）');
    expect(rowOf('7日（土）')).toHaveClass('bg-general-30');
    expect(within(rowOf('7日（土）')).getByText(s.dayOff)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '7日（土）' })).toHaveClass('text-primary-100');
  });

  it('shouldShowLeaveTypeAndGreyRowForApprovedFullDayLeave', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('11日（水）');
    const tr = rowOf('11日（水）');
    expect(tr).toHaveClass('bg-general-30');
    expect(within(tr).getAllByText(/年次休暇/).length).toBeGreaterThan(0);
  });

  it('shouldShowStatusBadgesForWorkingAndMissingClockOut', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('4日（水）');
    expect(within(rowOf('4日（水）')).getByText(t.statuses.MISSING_CLOCK_OUT)).toBeInTheDocument();
    expect(within(rowOf('10日（火）')).getByText(t.statuses.WORKING)).toBeInTheDocument();
  });

  it('shouldMarkTodayAndSelectItByDefault', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('10日（火）');
    expect(screen.getByRole('cell', { name: '10日（火）' })).toHaveAttribute(
      'aria-current',
      'date',
    );
    expect(rowOf('10日（火）')).toHaveAttribute('aria-selected', 'true');
  });

  it('shouldSelectRowByClickAndEnterKey', async () => {
    mockApi();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    await user.click(rowOf('2日（月）'));
    expect(rowOf('2日（月）')).toHaveAttribute('aria-selected', 'true');
    expect(rowOf('10日（火）')).toHaveAttribute('aria-selected', 'false');

    rowOf('7日（土）').focus();
    await user.keyboard('{Enter}');
    expect(rowOf('7日（土）')).toHaveAttribute('aria-selected', 'true');
  });

  it('shouldOpenLeaveDetailWithoutChangingSelection', async () => {
    mockApi();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    await user.click(screen.getByRole('button', { name: /休暇 承認待ち/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('detail:leave-1');
    expect(rowOf('10日（火）')).toHaveAttribute('aria-selected', 'true');
  });

  it('shouldShowSummaryValuesAndRemainingLeave', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    const summary = screen.getByRole('region', { name: s.summaryTitle });
    expect(within(summary).getByText(s.scheduledWorkDays).nextSibling).toHaveTextContent('19日');
    expect(within(summary).getByText(s.actualWorkTime).nextSibling).toHaveTextContent('144:00');
    expect(within(summary).getByText(s.overtime).nextSibling).toHaveTextContent('2:00');
    expect(within(summary).getByText(s.paidLeaveDays).nextSibling).toHaveTextContent('1.5日');
    expect(await within(summary).findByText(s.leaveRemaining(2026))).toBeInTheDocument();
    await waitFor(() =>
      expect(within(summary).getByText(s.leaveRemaining(2026)).nextSibling).toHaveTextContent(
        '14.5日',
      ),
    );
    expect(within(summary).queryByText(/所定労働時間|欠勤/)).toBeNull();
  });

  it('shouldShowDashInsteadOfRemainingLeaveWhenBalanceFails', async () => {
    mockApi(sheet(), new Error('x'));
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    const summary = screen.getByRole('region', { name: s.summaryTitle });
    await waitFor(() =>
      expect(within(summary).getByText(s.leaveRemaining(2026)).nextSibling).toHaveTextContent('—'),
    );
  });

  it('shouldShowErrorWithRetryWhenSheetFails', async () => {
    mockApi(new ApiError(500, 'INTERNAL', 'x', []));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AttendanceSheetView />);
    const retryButtons = await screen.findAllByRole('button', { name: /再試行|もう一度/ });
    expect(retryButtons.length).toBeGreaterThan(0);
    mockApi();
    await user.click(retryButtons[0]);
    expect(await screen.findByText('2日（月）')).toBeInTheDocument();
  });

  it('shouldNavigateToPreviousAndNextMonthViaUrl', async () => {
    mockApi();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    await user.click(screen.getByRole('button', { name: s.prevMonth }));
    expect(router.push).toHaveBeenLastCalledWith('/attendance?month=2026-10');
    await user.click(screen.getByRole('button', { name: s.nextMonth }));
    expect(router.push).toHaveBeenLastCalledWith('/attendance?month=2026-12');
  });

  it('shouldDisableThisMonthButtonOnCurrentMonthAndEnableOnOtherMonth', async () => {
    mockApi();
    const { unmount } = render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    expect(screen.getByRole('button', { name: s.thisMonth })).toBeDisabled();
    unmount();

    nav.search = 'month=2026-09';
    mockApi(sheet({ month: '2026-09' }));
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    expect(screen.getByRole('button', { name: s.thisMonth })).toBeEnabled();
    expect(apiFetch).toHaveBeenCalledWith('/attendance/monthly?month=2026-09');
    expect(apiFetch).toHaveBeenCalledWith('/leaves/balance?year=2026');
  });

  it('shouldNotRenderClockInOrClockOutButtons', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    expect(
      screen.queryByRole('button', { name: messages.dashboard.attendance.clockIn }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: messages.dashboard.attendance.clockOut }),
    ).toBeNull();
  });
});

function cellsOf(label: string): HTMLElement[] {
  return Array.from(rowOf(label).querySelectorAll<HTMLElement>('td'));
}

describe('AttendanceSheetView(行の規則・集計・追従の追加シナリオ)', () => {
  it('shouldKeepApprovedHalfDayRowWhiteWithBadgeOnly', async () => {
    mockApi(
      sheet({
        days: [
          emptyDay('2026-11-05', {
            leaves: [{ id: 'leave-3', leaveType: 'HALF_AM', status: 'APPROVED' }],
          }),
        ],
      }),
    );
    render(<AttendanceSheetView />);
    await screen.findByText('5日（木）');
    const tr = rowOf('5日（木）');
    expect(tr).toHaveClass('bg-white');
    expect(tr).not.toHaveClass('bg-general-30');
    expect(
      within(tr).getByText(s.leaveBadge(s.requestKinds.LEAVE, messages.leave.statuses.APPROVED)),
    ).toBeInTheDocument();
  });

  it('shouldShowMissingClockOutRowHighlightAndHintTooltipOnHover', async () => {
    mockApi();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AttendanceSheetView />);
    await screen.findByText('4日（水）');
    const tr = rowOf('4日（水）');
    expect(tr).toHaveClass(MISSING_ROW_CLASS);
    const trigger = within(tr)
      .getByText(t.statuses.MISSING_CLOCK_OUT)
      .closest('[tabindex="0"]') as HTMLElement;
    await user.hover(trigger);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(t.missingHint);
  });

  it('shouldShowHolidayNameWithModifiedMarkInRemarks', async () => {
    mockApi(
      sheet({
        days: [
          emptyDay('2026-11-03', {
            dayType: 'HOLIDAY',
            holidayName: '文化の日',
            attendance: {
              id: 'a4',
              clockIn: '2026-11-03T09:00:00+09:00',
              clockOut: '2026-11-03T17:00:00+09:00',
              status: 'DONE',
              modifiedAt: '2026-11-04T10:00:00+09:00',
            },
            actualWorkMinutes: 480,
          }),
        ],
      }),
    );
    render(<AttendanceSheetView />);
    await screen.findByText('3日（火）');
    expect(
      within(rowOf('3日（火）')).getByText(`文化の日${s.separator}${t.modified}`),
    ).toBeInTheDocument();
  });

  it('shouldShowLeaveTypeInsteadOfHolidayPatternWhenApprovedFullDayLeaveOnHoliday', async () => {
    mockApi(
      sheet({
        days: [
          emptyDay('2026-11-03', {
            dayType: 'HOLIDAY',
            holidayName: '文化の日',
            leaves: [{ id: 'leave-4', leaveType: 'ANNUAL', status: 'APPROVED' }],
          }),
        ],
      }),
    );
    render(<AttendanceSheetView />);
    await screen.findByText('3日（火）');
    const cells = cellsOf('3日（火）');
    expect(cells[1]).toHaveTextContent(messages.leave.types.ANNUAL);
    expect(cells[1]).not.toHaveTextContent(s.holiday);
    expect(rowOf('3日（火）')).toHaveClass('bg-general-30');
  });

  it('shouldNotGreyWeekdayWhenApiReturnsWeekdayEvenOnNationalHolidayDate', async () => {
    // 祝日判定は API の dayType のみ。フロントは 11/3 でも WEEKDAY と返されれば平日扱い
    mockApi(sheet({ days: [emptyDay('2026-11-03')] }));
    render(<AttendanceSheetView />);
    await screen.findByText('3日（火）');
    expect(rowOf('3日（火）')).toHaveClass('bg-white');
    expect(screen.getByRole('cell', { name: '3日（火）' })).toHaveClass('text-general-100');
  });

  it('shouldRenderOneRowPerDayOfMonthIncludingDaysWithoutRecord', async () => {
    const days = Array.from({ length: 30 }, (_, index) =>
      emptyDay(`2026-11-${String(index + 1).padStart(2, '0')}`),
    );
    mockApi(sheet({ days }));
    render(<AttendanceSheetView />);
    await screen.findByText('1日（日）');
    // 左(出勤簿)と右(時間帯)の表に 1 日 1 行ずつ
    const leftTable = screen.getByRole('table', { name: s.tableTitle });
    expect(leftTable.querySelectorAll('tbody tr')).toHaveLength(30);
    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect(screen.getAllByRole('img')).toHaveLength(30);
  });

  it('shouldShowClockOutWithDateWhenShiftingPastMidnight', async () => {
    mockApi(
      sheet({
        days: [
          emptyDay('2026-11-04', {
            attendance: {
              id: 'a5',
              clockIn: '2026-11-04T20:00:00+09:00',
              clockOut: '2026-11-05T02:00:00+09:00',
              status: 'DONE',
              modifiedAt: null,
            },
            actualWorkMinutes: 360,
            nightMinutes: 240,
          }),
        ],
      }),
    );
    render(<AttendanceSheetView />);
    await screen.findByText('4日（水）');
    const cells = cellsOf('4日（水）');
    expect(cells[2]).toHaveTextContent('20:00');
    expect(cells[3]).toHaveTextContent('2026/11/05 02:00');
  });

  it('shouldShowHolidayWorkLabelWithoutWeekdayCaveat', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    const summary = screen.getByRole('region', { name: s.summaryTitle });
    expect(within(summary).getByText(s.holidayWork)).toBeInTheDocument();
    expect(screen.queryByText(/祝日は考慮していません/)).toBeNull();
  });

  it('shouldDimSummaryAndKeepPreviousValuesWhileSwitchingMonth', async () => {
    mockApi();
    const { rerender } = render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    apiFetch.mockImplementation((path: string) =>
      path.startsWith('/attendance/monthly') ? new Promise(() => {}) : Promise.resolve(BALANCE),
    );
    nav.search = 'month=2026-10';
    rerender(<AttendanceSheetView />);
    const summary = screen.getByRole('region', { name: s.summaryTitle });
    const list = within(summary).getByText(s.overtime).closest('dl') as HTMLElement;
    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(list).toHaveClass('opacity-60');
    expect(within(summary).getByText(s.scheduledWorkDays).nextSibling).toHaveTextContent('19日');
  });

  it('shouldMoveTodayHighlightAfterMidnightWithoutReload', async () => {
    // 表示中に日付が変わったら、再読み込みなしで「今日」の強調が移る(60 秒ごとに確認)
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-10T23:59:30+09:00'));
    mockApi();
    render(<AttendanceSheetView />);
    await act(async () => {});
    expect(screen.getByRole('cell', { name: '10日（火）' })).toHaveAttribute(
      'aria-current',
      'date',
    );

    act(() => {
      vi.setSystemTime(new Date('2026-11-11T00:01:00+09:00'));
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('cell', { name: '11日（水）' })).toHaveAttribute(
      'aria-current',
      'date',
    );
    expect(screen.getByRole('cell', { name: '10日（火）' })).not.toHaveAttribute('aria-current');
    expect(rowOf('11日（水）')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('AttendanceSheetView(UI 改善: 左右分離・Pill・申請表示)', () => {
  function layoutDays() {
    return [
      emptyDay('2026-11-01', { dayType: 'WEEKEND' }),
      emptyDay('2026-11-02'),
      emptyDay('2026-11-03', { dayType: 'HOLIDAY', holidayName: '文化の日' }),
      emptyDay('2026-11-04', { leaves: [{ id: 'l1', leaveType: 'ANNUAL', status: 'APPROVED' }] }),
      emptyDay('2026-11-05', { leaves: [{ id: 'l2', leaveType: 'SPECIAL', status: 'PENDING' }] }),
      emptyDay('2026-11-07', { dayType: 'WEEKEND' }),
    ];
  }

  async function renderLayout() {
    mockApi(sheet({ days: layoutDays() }));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AttendanceSheetView />);
    await screen.findByText('1日（日）');
    return user;
  }

  it('shouldShowRequestBadgeAsLeaveWithStatusForEveryLeaveType', async () => {
    await renderLayout();
    expect(screen.getByRole('button', { name: '休暇 承認済み の詳細を開く' })).toBeInTheDocument();
    expect(screen.getByText('休暇 承認待ち')).toBeInTheDocument();
    expect(screen.queryByText(/特別休暇 承認待ち/)).not.toBeInTheDocument();
  });

  it('shouldRenderWorkPatternAsPills', async () => {
    await renderLayout();
    const dayOff = within(rowOf('1日（日）')).getByText(s.dayOff);
    expect(dayOff).toHaveClass('rounded-full', 'bg-danger-30', 'h-6', 'px-3');
    const normal = within(rowOf('2日（月）')).getByText(s.normalDay);
    expect(normal).toHaveClass('rounded-full', 'bg-general-40', 'text-general-80', 'h-6', 'px-3');
    expect(within(rowOf('3日（火）')).getByText(s.holiday)).toHaveClass(
      'rounded-full',
      'bg-danger-30',
    );
    expect(within(rowOf('4日（水）')).getByText(messages.leave.types.ANNUAL)).toHaveClass(
      'rounded-full',
      'bg-success-40',
    );
  });

  it('shouldColorSundayRedAndKeepOtherCellsDefault', async () => {
    await renderLayout();
    expect(screen.queryByText(/11\/1\(/)).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '1日（日）' })).toHaveClass('text-danger-100');
    for (const cell of cellsOf('1日（日）').slice(2, 6)) {
      expect(cell).not.toHaveClass('text-danger-100');
    }
  });

  it('shouldSplitIntoFixedLeftAreaAndScrollableTimelineRegion', async () => {
    await renderLayout();
    const left = screen.getByRole('table', { name: s.tableTitle });
    expect(left.parentElement).toHaveClass('border-r-2', 'border-general-60');
    expect(left.parentElement).not.toHaveClass('overflow-x-auto');
    const region = screen.getByRole('region', { name: s.timeline });
    expect(region).toHaveClass('overflow-x-auto');
    // jsdom では寸法が 0 でスクロールできないため、キーボードで操作できる領域にはならない
    expect(region).not.toHaveAttribute('tabindex');
    expect(screen.getAllByRole('table')).toHaveLength(2);
  });

  it('shouldMakeTimelineRegionFocusableOnlyWhenItOverflows', async () => {
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500);
    const clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    try {
      await renderLayout();
      expect(screen.getByRole('region', { name: s.timeline })).toHaveAttribute('tabindex', '0');
    } finally {
      scrollWidth.mockRestore();
      clientWidth.mockRestore();
    }
  });

  it('shouldUseCompactRowHeightInBothTables', async () => {
    await renderLayout();
    for (const table of screen.getAllByRole('table')) {
      for (const cell of table.querySelectorAll('tbody td')) expect(cell).toHaveClass('h-9');
      for (const cell of table.querySelectorAll('thead th')) expect(cell).toHaveClass('h-11');
    }
  });

  it('shouldSelectLeftRowWhenTimelineRowIsClicked', async () => {
    const user = await renderLayout();
    const rightRows = screen.getByRole('region', { name: s.timeline }).querySelectorAll('tbody tr');
    await user.click(rightRows[1]);
    expect(rowOf('2日（月）')).toHaveAttribute('aria-selected', 'true');
    expect(rowOf('2日（月）')).toHaveClass('bg-primary-30');
    expect(rightRows[1]).toHaveClass('bg-primary-30');
  });

  it('shouldPrefixTimelineLabelWithDate', async () => {
    mockApi();
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    expect(screen.getByRole('img', { name: /^2日（月） 09:00〜18:30/ })).toBeInTheDocument();
  });

  it.each([28, 29, 31])('shouldRenderSameRowCountInBothTablesFor%iDays', async (count) => {
    const days = Array.from({ length: count }, (_, index) =>
      emptyDay(`2026-11-${String(index + 1).padStart(2, '0')}`),
    );
    mockApi(sheet({ days }));
    render(<AttendanceSheetView />);
    await screen.findByText('1日（日）');
    for (const table of screen.getAllByRole('table')) {
      expect(table.querySelectorAll('tbody tr')).toHaveLength(count);
    }
  });
});

describe('AttendanceSheetView(申請バッジ: 全休暇種別の文言・テスト補完)', () => {
  it('shouldShowRequestBadgeAsLeaveStatusForHalfDayAndOtherTypes', async () => {
    // C1: 半休・その他の種別でも申請列は「休暇 {状態}」。種別名のバッジは出さない
    mockApi(
      sheet({
        days: [
          emptyDay('2026-11-02', {
            leaves: [{ id: 'h1', leaveType: 'HALF_AM', status: 'APPROVED' }],
          }),
          emptyDay('2026-11-03', {
            dayType: 'WEEKDAY',
            leaves: [{ id: 'h2', leaveType: 'HALF_PM', status: 'PENDING' }],
          }),
          emptyDay('2026-11-04', {
            leaves: [{ id: 'o1', leaveType: 'OTHER', status: 'APPROVED' }],
          }),
        ],
      }),
    );
    render(<AttendanceSheetView />);
    await screen.findByText('2日（月）');
    // 承認済みは 2 件(午前半休・その他)。同名のボタンが複数あるため getAllByRole で数える
    expect(
      screen.getAllByRole('button', {
        name: `${s.requestKinds.LEAVE} ${messages.leave.statuses.APPROVED} の詳細を開く`,
      }),
    ).toHaveLength(2);
    expect(
      screen.getByText(`${s.requestKinds.LEAVE} ${messages.leave.statuses.PENDING}`),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(`${s.requestKinds.LEAVE} ${messages.leave.statuses.APPROVED}`),
    ).toHaveLength(2);
    for (const type of ['HALF_AM', 'HALF_PM', 'OTHER'] as const) {
      expect(screen.queryByText(new RegExp(`${messages.leave.types[type]} `))).toBeNull();
    }
  });
});
