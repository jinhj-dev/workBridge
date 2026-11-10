import { act, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attendance, AttendanceSheet, LeaveBalance, Paginated } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { AttendanceView } from './AttendanceView';

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

// 詳細モーダルは AuthProvider を必要とするため、このテストでは描画しない
vi.mock('@/components/leave/LeaveDetailModal', () => ({
  LeaveDetailModal: () => null,
}));

// 幅の判定だけを制御する。change リスナーは外から発火させる
const media = vi.hoisted(() => ({ matches: true, listeners: new Set<() => void>() }));

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return media.matches;
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => media.listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => media.listeners.delete(cb),
    })),
  );
}

// 幅を変えて change を発火する(ブラウザのリサイズ相当)
function resizeTo(matches: boolean) {
  media.matches = matches;
  act(() => media.listeners.forEach((cb) => cb()));
}

function sheetMonth(month: string, days: number): AttendanceSheet {
  return {
    month,
    days: Array.from({ length: days }, (_, i) => {
      const date = `${month}-${String(i + 1).padStart(2, '0')}`;
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
      };
    }),
    summary: {
      scheduledWorkDays: 20,
      actualWorkDays: 0,
      actualWorkMinutes: 0,
      overtimeMinutes: 0,
      nightMinutes: 0,
      holidayWorkMinutes: 0,
      paidLeaveDays: 0,
    },
  };
}

const BALANCE: LeaveBalance = {
  year: 2026,
  grantedDays: 20,
  approvedDays: 0,
  pendingDays: 0,
  remainingDays: 20,
};

// 旧来の勤怠一覧(md 未満)に 1 件出す。出勤簿の表が出ていないことを、一覧が空でない状態で確かめるため
const HISTORY_ITEM: Attendance = {
  id: 'attendance-1',
  user: { id: 'user-1', name: 'テスト太郎', empId: '000001', departmentName: null },
  workDate: '2026-11-10',
  clockIn: '2026-11-10T09:00:00+09:00',
  clockOut: null,
  workMinutes: null,
  status: 'WORKING',
  modifiedAt: null,
};
const HISTORY: Paginated<Attendance> = {
  items: [HISTORY_ITEM],
  page: 1,
  limit: 20,
  totalCount: 1,
  totalPages: 1,
};

// 呼び出されたパスの一覧(オプション引数は除く)
function calledPaths(): string[] {
  return apiFetch.mock.calls.map((call) => String(call[0]));
}

function mockApi() {
  apiFetch.mockImplementation((path: string) => {
    if (path.startsWith('/attendance/monthly')) {
      return Promise.resolve(sheetMonth('2026-11', 30));
    }
    if (path.startsWith('/leaves/balance')) return Promise.resolve(BALANCE);
    if (path.startsWith('/attendance?')) return Promise.resolve(HISTORY);
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

// 今日は 2026-11-10(東京)
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T09:14:00+09:00'));
  nav.search = '';
  media.matches = true;
  media.listeners.clear();
  apiFetch.mockReset();
  router.push.mockReset();
  router.replace.mockReset();
  stubMatchMedia();
  mockApi();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('AttendanceView(SCR-003 幅による切り替え)', () => {
  it('shouldShowSheetOnlyWhenWidthIsMdOrMore', async () => {
    media.matches = true;
    render(<AttendanceView />);
    expect(await screen.findByRole('table', { name: t.sheet.tableTitle })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: s.prevMonth })).toBeInTheDocument();
    expect(screen.queryByText(t.searchTitle)).not.toBeInTheDocument();
  });

  it('shouldShowHistoryOnlyWhenWidthIsLessThanMd', async () => {
    media.matches = false;
    render(<AttendanceView />);
    expect(await screen.findByText(t.searchTitle)).toBeInTheDocument();
    // 一覧は空でなく表示されている(旧来の一覧が描かれている根拠)
    expect(await screen.findByRole('listitem')).toHaveTextContent(
      HISTORY_ITEM.workDate.replaceAll('-', '/'),
    );
    // 出勤簿の月間表・前後月の操作・月間集計は出ない
    expect(screen.queryByRole('columnheader', { name: s.workPattern })).not.toBeInTheDocument();
    expect(screen.queryByText(s.summaryTitle)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: s.prevMonth })).not.toBeInTheDocument();
  });

  it('shouldShowTitleHeadingInBothLayouts', async () => {
    media.matches = true;
    const { unmount } = render(<AttendanceView />);
    expect(screen.getByRole('heading', { level: 1, name: t.title })).toBeInTheDocument();
    await screen.findByRole('table', { name: t.sheet.tableTitle });
    unmount();

    media.matches = false;
    render(<AttendanceView />);
    expect(screen.getByRole('heading', { level: 1, name: t.title })).toBeInTheDocument();
    await screen.findByText(t.searchTitle);
  });

  it('shouldCallOnlyMonthlyAndBalanceWhenDesktop', async () => {
    media.matches = true;
    render(<AttendanceView />);
    await screen.findByRole('table', { name: t.sheet.tableTitle });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(calledPaths()).toEqual(
      expect.arrayContaining(['/attendance/monthly?month=2026-11', '/leaves/balance?year=2026']),
    );
    expect(calledPaths().some((p) => p.startsWith('/attendance?'))).toBe(false);
  });

  it('shouldCallOnlyHistoryListWhenMobile', async () => {
    media.matches = false;
    render(<AttendanceView />);
    await screen.findByText(t.searchTitle);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    expect(calledPaths()[0]).toMatch(/^\/attendance\?/);
    expect(calledPaths().some((p) => p.startsWith('/attendance/monthly'))).toBe(false);
    expect(calledPaths().some((p) => p.startsWith('/leaves/balance'))).toBe(false);
  });

  it('shouldSwitchToSheetWithoutRouterChangeWhenWidthGrows', async () => {
    media.matches = false;
    render(<AttendanceView />);
    await screen.findByText(t.searchTitle);

    resizeTo(true);

    expect(await screen.findByRole('table', { name: t.sheet.tableTitle })).toBeInTheDocument();
    expect(screen.queryByText(t.searchTitle)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: t.title })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shouldSwitchToHistoryWithoutRouterChangeWhenWidthShrinks', async () => {
    media.matches = true;
    render(<AttendanceView />);
    await screen.findByRole('table', { name: t.sheet.tableTitle });

    resizeTo(false);

    expect(await screen.findByText(t.searchTitle)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: s.workPattern })).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shouldNotDuplicateApiCallsAfterSwitching', async () => {
    media.matches = true;
    render(<AttendanceView />);
    await screen.findByRole('table', { name: t.sheet.tableTitle });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));

    // 切り替え後は新しい方の画面だけが 1 回ずつ呼ぶ(旧画面の取得は増えない)
    apiFetch.mockClear();
    resizeTo(false);
    await screen.findByText(t.searchTitle);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    expect(calledPaths()[0]).toMatch(/^\/attendance\?/);
    expect(calledPaths().some((p) => p.startsWith('/attendance/monthly'))).toBe(false);
  });

  it('shouldShowSpinnerOnlyBeforeWidthIsKnownOnServer', () => {
    // サーバー描画では幅が分からないため、判定前のスピナーだけを描く。API は呼ばない
    vi.stubGlobal('matchMedia', undefined);
    const html = renderToString(<AttendanceView />);
    expect(html).toContain('role="status"');
    expect(html).not.toContain(t.searchTitle);
    expect(html).not.toContain(s.prevMonth);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('shouldApplyOwnQueryKeysPerLayoutWhenMixedQuery', async () => {
    nav.search = 'month=2026-10&status=DONE';

    media.matches = true;
    const { unmount } = render(<AttendanceView />);
    await screen.findByRole('table', { name: t.sheet.tableTitle });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(calledPaths()).toContain('/attendance/monthly?month=2026-10');
    unmount();
    apiFetch.mockClear();

    media.matches = false;
    render(<AttendanceView />);
    await screen.findByText(t.searchTitle);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    const historyPath = calledPaths()[0];
    expect(historyPath).toContain('status=DONE');
    expect(historyPath).not.toContain('month=');
  });
});
