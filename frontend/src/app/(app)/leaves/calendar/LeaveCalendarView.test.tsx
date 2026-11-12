import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaveCalendarItem, LeaveCalendarResponse } from '@/lib/api/types';
import { formatDateLabel } from '@/lib/leave-calendar';
import { messages } from '@/messages/ja';
import { LeaveCalendarView } from './LeaveCalendarView';

const t = messages.leaveCalendar;
const DEPARTMENT_ID = '11111111-2222-4333-8444-555555555555';
const DAY = '2026-11-10';
const DAY_LABEL = formatDateLabel(DAY);

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
const nav = vi.hoisted(() => ({ pathname: '/leaves/calendar', search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const viewport = vi.hoisted(() => ({ desktop: true }));

// 同じ日に 3 名。PC は 2 段までしか描かないため 1 件は「+N件」に畳まれる
const ITEMS: LeaveCalendarItem[] = [
  {
    name: '山田太郎',
    empId: '10001',
    departmentName: '開発部',
    startDate: '2026-11-10',
    endDate: '2026-11-10',
    category: 'PAID',
    halfDay: null,
  },
  {
    name: '佐藤花子',
    empId: '10002',
    departmentName: '営業部',
    startDate: '2026-11-10',
    endDate: '2026-11-10',
    category: 'SPECIAL',
    halfDay: null,
  },
  {
    name: '鈴木一郎',
    empId: '10003',
    departmentName: '開発部',
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    category: 'PAID',
    halfDay: null,
  },
];

function calendarResponse(items: LeaveCalendarItem[]): LeaveCalendarResponse {
  return { month: '2026-11', holidays: [], items };
}

// 応答は path ごとに返す。カレンダー以外(部署一覧など)は空配列
function mockApi(items: LeaveCalendarItem[] = ITEMS) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/leaves/calendar')) return calendarResponse(items);
    if (path === '/departments') return [{ id: DEPARTMENT_ID, name: '開発部' }];
    throw new Error(`想定外の API 呼び出し: ${path}`);
  });
}

function calendarPaths(): string[] {
  return apiFetch.mock.calls
    .map(([path]) => String(path))
    .filter((path) => path.startsWith('/leaves/calendar'));
}

let rerenderView: () => void = () => {};

// 画面遷移を模擬する: router に渡された URL を検索条件に反映して再描画する
function goTo(url: string | undefined) {
  if (!url) throw new Error('遷移先の URL がありません');
  nav.search = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  rerenderView();
}

// 最後の呼び出しの URL。History API(null, '', url)は第 3 引数なので argIndex で指定する
function lastUrl(spy: { mock: { calls: unknown[][] } }, argIndex = 0): string {
  const calls = spy.mock.calls;
  return String(calls[calls.length - 1]?.[argIndex] ?? '');
}

function renderView(search = 'month=2026-11') {
  nav.search = search;
  const result = render(<LeaveCalendarView />);
  rerenderView = () => result.rerender(<LeaveCalendarView />);
  return userEvent.setup();
}

function setDesktop(desktop: boolean) {
  viewport.desktop = desktop;
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === '(min-width: 768px)' ? viewport.desktop : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  nav.pathname = '/leaves/calendar';
  nav.search = '';
  setDesktop(true);
});

describe('LeaveCalendarView 検索条件とAPI呼び出し(FC-06)', () => {
  it('shouldSendDepartmentNameAndEmpIdInOneCalendarQuery', async () => {
    mockApi();
    const search = `month=2026-11&departmentId=${DEPARTMENT_ID}&name=${encodeURIComponent('山田')}&empId=10001`;
    renderView(search);

    await waitFor(() => expect(calendarPaths()).toHaveLength(1));
    const url = new URL(calendarPaths()[0] ?? '', 'http://localhost');
    expect(url.searchParams.get('month')).toBe('2026-11');
    expect(url.searchParams.get('departmentId')).toBe(DEPARTMENT_ID);
    expect(url.searchParams.get('name')).toBe('山田');
    expect(url.searchParams.get('empId')).toBe('10001');
  });

  it('shouldReplaceUrlWithNameAfterTypingInNameSearch', async () => {
    mockApi();
    const ui = renderView('month=2026-11');
    await ui.type(screen.getByLabelText(t.nameSearch), '山田');

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    const url = new URL(lastUrl(router.replace), 'http://localhost');
    expect(url.searchParams.get('name')).toBe('山田');
  });

  it('shouldPushMonthParamAndRefetchWhenNextMonthClicked', async () => {
    mockApi();
    const ui = renderView('month=2026-11');
    await waitFor(() => expect(calendarPaths()).toHaveLength(1));

    await ui.click(screen.getByRole('button', { name: t.nextMonth }));
    expect(router.push).toHaveBeenCalledWith('/leaves/calendar?month=2026-12');

    goTo(lastUrl(router.push));
    await waitFor(() =>
      expect(calendarPaths().some((p) => p.includes('month=2026-12'))).toBe(true),
    );
  });
});

describe('LeaveCalendarView PC 表と月カレンダーの一致(FC-07)', () => {
  it('shouldShowOneRowPerUniqueLeaveInScheduleTable', async () => {
    mockApi();
    renderView();

    const region = await screen.findByRole('region', { name: t.listScrollLabel });
    const rows = within(region).getAllByRole('row').slice(1); // ヘッダー行を除く
    expect(rows).toHaveLength(ITEMS.length);
    for (const item of ITEMS) {
      expect(within(region).getByText(item.name)).toBeInTheDocument();
    }
  });

  it('shouldOpenDayModalWithSingleLeaveWhenBarClicked', async () => {
    mockApi();
    const ui = renderView();

    await ui.click(await screen.findByRole('button', { name: new RegExp(`^${ITEMS[0]?.name} `) }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.dayModalTitle(ITEMS[0]?.name ?? ''))).toBeInTheDocument();
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1);
  });

  it('shouldOpenDayModalWithAllLeavesOfDayWhenMoreCountClicked', async () => {
    mockApi();
    const ui = renderView();

    // 2 段に収まらなかった分は「+1件」として出る
    const more = await screen.findByRole('button', { name: t.moreLabel(DAY_LABEL, 1) });
    await ui.click(more);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.dayModalTitle(DAY_LABEL))).toBeInTheDocument();
    // 日付の全員(3名)が出る。表示中のデータだけを使い API は再度呼ばない
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3);
    expect(calendarPaths()).toHaveLength(1);
  });
});

describe('LeaveCalendarView モバイルの日付選択(FC-08)', () => {
  beforeEach(() => {
    setDesktop(false);
  });

  it('shouldUpdateDayListWhenCellClicked', async () => {
    mockApi();
    const pushState = vi.spyOn(window.history, 'pushState');
    const ui = renderView('month=2026-11');

    const cell = await screen.findByRole('button', { name: t.cellLabel(DAY_LABEL, ITEMS.length) });
    const callsBefore = apiFetch.mock.calls.length;
    await ui.click(cell);
    // 日付の選択は History API で URL を書き換えるだけ(router のナビゲーションと API の再取得をしない)
    expect(pushState).toHaveBeenCalledWith(null, '', expect.stringContaining('date=2026-11-10'));
    expect(router.push).not.toHaveBeenCalled();
    expect(apiFetch.mock.calls.length).toBe(callsBefore);

    goTo(lastUrl(pushState as unknown as { mock: { calls: unknown[][] } }, 2));
    const section = await screen.findByRole('region', { name: t.dayTitle(DAY_LABEL) });
    expect(within(section).getByText(t.people(ITEMS.length))).toBeInTheDocument();
    for (const item of ITEMS) {
      expect(within(section).getByText(item.name)).toBeInTheDocument();
    }
  });

  it('shouldShowEmptyMessageWhenSelectedDayHasNoLeave', async () => {
    mockApi();
    renderView('month=2026-11&date=2026-11-01');

    const section = await screen.findByRole('region', {
      name: t.dayTitle(formatDateLabel('2026-11-01')),
    });
    expect(within(section).getByText(t.emptyDay)).toBeInTheDocument();
  });

  it('shouldSwitchToMonthListWhenMonthSegmentClicked', async () => {
    mockApi();
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const ui = renderView('month=2026-11&date=2026-11-10');

    const monthButton = await screen.findByRole('button', { name: t.segmentMonth });
    const callsBefore = apiFetch.mock.calls.length;
    await ui.click(monthButton);
    expect(replaceState).toHaveBeenCalledWith(null, '', expect.stringContaining('view=month'));
    expect(router.replace).not.toHaveBeenCalled();
    expect(apiFetch.mock.calls.length).toBe(callsBefore);

    goTo(lastUrl(replaceState as unknown as { mock: { calls: unknown[][] } }, 2));
    const section = await screen.findByRole('region', { name: t.dayTitle(DAY_LABEL) });
    expect(within(section).getByRole('heading', { name: t.listTitle })).toBeInTheDocument();
    // 月全体では選択日に関係なく当月の休暇が並ぶ
    for (const item of ITEMS) {
      expect(within(section).getByText(item.name)).toBeInTheDocument();
    }
  });

  it('shouldShowNameAndEmpIdSearchAlwaysWithoutSearchToggle', async () => {
    mockApi();
    renderView('month=2026-11');

    // 検索は折りたたまず、入力欄が最初から見える(「検索」トグル廃止)
    expect(await screen.findByLabelText(t.nameSearch)).toBeInTheDocument();
    expect(screen.getByLabelText(t.empIdSearch)).toBeInTheDocument();
  });

  it('shouldShowShortChipLabelsOnMobileBars', async () => {
    // 複数日の特別休暇(段が溢れない)で、棒のラベルが短い表記になることを確認する
    mockApi([
      {
        name: '佐藤花子',
        empId: '10002',
        departmentName: '営業部',
        startDate: '2026-11-05',
        endDate: '2026-11-07',
        category: 'SPECIAL',
        halfDay: null,
      },
    ]);
    renderView('month=2026-11');

    expect((await screen.findAllByText(t.chipLabel.SPECIAL)).length).toBeGreaterThan(0);
    expect(screen.queryByText('有給休暇')).not.toBeInTheDocument();
  });
});

describe('LeaveCalendarView 読み込み・エラー・空の表示(FC-12)', () => {
  it('shouldShowSkeletonWhileCalendarLoading', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/departments') return [];
      return new Promise(() => {});
    });
    const { container } = render(<LeaveCalendarView />);
    await waitFor(() => expect(container.querySelector('.animate-pulse')).not.toBeNull());
    expect(screen.queryByRole('group', { name: /の休暇カレンダー$/ })).not.toBeInTheDocument();
  });

  it('shouldShowErrorWithRetryAndRecoverOnRetry', async () => {
    let calendarCalls = 0;
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/departments') return [];
      calendarCalls += 1;
      if (calendarCalls === 1) throw new Error('network');
      return calendarResponse(ITEMS);
    });
    const ui = renderView();

    // PC はカードと一覧の両方に同じ失敗表示が出る(再試行は同じ取得を呼ぶ)
    const alerts = await screen.findAllByRole('alert');
    expect(alerts[0]).toHaveTextContent(messages.common.loadError);
    await ui.click(
      screen.getAllByRole('button', { name: messages.common.retry })[0] as HTMLElement,
    );

    expect(await screen.findByRole('group', { name: /の休暇カレンダー$/ })).toBeInTheDocument();
    expect(calendarCalls).toBe(2);
  });

  it('shouldShowEmptyMessagesWhenNoLeaveInMonth', async () => {
    mockApi([]);
    renderView();

    const region = await screen.findByRole('region', { name: t.listScrollLabel });
    // 検索条件が無い月の0件は emptyMonth(条件に一致する…は検索条件がある時だけ)
    expect(within(region).getByText(t.emptyMonth)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /の休暇カレンダー$/ })).toBeInTheDocument();
  });
});
