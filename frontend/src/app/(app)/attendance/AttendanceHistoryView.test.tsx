import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError } from '@/lib/api/client';
import type { Attendance, Paginated } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { AttendanceHistoryView } from './AttendanceHistoryView';

const t = messages.attendance;

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

const USER = { id: 'u-1', name: '山田太郎', empId: '10001', departmentName: '開発部' };

function record(overrides: Partial<Attendance> = {}): Attendance {
  return {
    id: 'att-1',
    user: USER,
    workDate: '2026-11-06',
    clockIn: '2026-11-06T09:00:00+09:00',
    clockOut: '2026-11-06T18:00:00+09:00',
    workMinutes: 540,
    status: 'DONE',
    modifiedAt: null,
    ...overrides,
  };
}

function pageOf(
  items: Attendance[],
  overrides: Partial<Paginated<Attendance>> = {},
): Paginated<Attendance> {
  return { items, page: 1, limit: 20, totalCount: items.length, totalPages: 1, ...overrides };
}

// 今日は 2026-11-09(東京)。既定の照会期間は 2026-11-01 〜 2026-11-09
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-09T09:00:00+09:00'));
  nav.search = '';
  apiFetch.mockReset();
  router.push.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AttendanceHistoryView(SCR-003)', () => {
  it('shouldQueryDefaultPeriodFromFirstOfMonthToTodayWhenEnteredWithoutQuery', async () => {
    apiFetch.mockResolvedValue(pageOf([record()]));
    render(<AttendanceHistoryView />);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/attendance?startDate=2026-11-01&endDate=2026-11-09&page=1&limit=20',
      ),
    );
    expect(screen.getByLabelText(messages.dateRange.startDate)).toHaveValue('2026-11-01');
    expect(screen.getByLabelText(messages.dateRange.endDate)).toHaveValue('2026-11-09');
  });

  it('shouldShowOrderErrorAndNotNavigateWhenStartAfterEnd', async () => {
    apiFetch.mockResolvedValue(pageOf([record()]));
    render(<AttendanceHistoryView />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(messages.dateRange.startDate), {
      target: { value: '2026-11-08' },
    });
    fireEvent.change(screen.getByLabelText(messages.dateRange.endDate), {
      target: { value: '2026-11-07' },
    });
    fireEvent.click(screen.getByRole('button', { name: messages.dateRange.search }));

    expect(screen.getByText(messages.dateRange.order)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.dateRange.startDate)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shouldShowRequiredMessageWhenPeriodEmpty', () => {
    apiFetch.mockResolvedValue(pageOf([]));
    render(<AttendanceHistoryView />);

    fireEvent.change(screen.getByLabelText(messages.dateRange.endDate), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: messages.dateRange.search }));

    expect(screen.getByText(messages.dateRange.required)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shouldShowTooLongMessageWhen367Days', () => {
    apiFetch.mockResolvedValue(pageOf([]));
    render(<AttendanceHistoryView />);

    fireEvent.change(screen.getByLabelText(messages.dateRange.startDate), {
      target: { value: '2024-01-01' },
    });
    fireEvent.change(screen.getByLabelText(messages.dateRange.endDate), {
      target: { value: '2025-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: messages.dateRange.search }));

    expect(screen.getByText(messages.dateRange.tooLong)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shouldHighlightMissingClockOutRowAndShowModifiedNote', async () => {
    apiFetch.mockResolvedValue(
      pageOf([
        record({
          id: 'a',
          workDate: '2026-11-05',
          clockOut: null,
          workMinutes: null,
          status: 'MISSING_CLOCK_OUT',
        }),
        record({ id: 'b', modifiedAt: '2026-11-07T10:00:00+09:00' }),
      ]),
    );
    render(<AttendanceHistoryView />);

    const missingBadge = (await screen.findAllByText(t.statuses.MISSING_CLOCK_OUT))[0];
    expect(missingBadge.closest('tr')).toHaveClass('bg-danger-30/40');
    // 表の中のバッジにツールチップが付き、hover で文言が出ることを確かめる(モバイル一覧の文言では代用しない)
    const table = screen.getByRole('table');
    const missingTrigger = within(table)
      .getByText(t.statuses.MISSING_CLOCK_OUT)
      .closest('[tabindex="0"]');
    if (!(missingTrigger instanceof HTMLElement)) {
      throw new Error('表の退勤なしバッジにツールチップのトリガーがありません');
    }
    expect(within(table).queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.mouseEnter(missingTrigger);
    expect(within(table).getByRole('tooltip')).toHaveTextContent(t.missingHint);
    expect(missingTrigger).toHaveAttribute(
      'aria-describedby',
      within(table).getByRole('tooltip').id,
    );
    // 修正済みの行だけ「管理者修正」を表示する(表のセルと、モバイル一覧の「備考: 管理者修正」)
    expect(screen.getAllByText(t.modified)).toHaveLength(1);
    expect(screen.getAllByText(new RegExp(t.modified))).toHaveLength(2);
    expect(screen.getAllByText(messages.common.noValue).length).toBeGreaterThan(0);
  });

  it('shouldShowEmptyMessageWhenNoRecords', async () => {
    apiFetch.mockResolvedValue(pageOf([]));
    render(<AttendanceHistoryView />);
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('shouldShowLoadingSkeletonWhileFetchingWithoutTableOrEmptyMessage', () => {
    // 応答を返さないままにして、読み込み中の表示を確かめる
    apiFetch.mockReturnValue(new Promise(() => {}));
    render(<AttendanceHistoryView />);

    const loading = screen.getByRole('status');
    expect(loading).toHaveTextContent(messages.common.loading);
    expect(loading.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(t.empty)).not.toBeInTheDocument();
  });

  it('shouldShowSectionErrorAndReloadOnRetry', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    apiFetch.mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce(pageOf([record()]));
    render(<AttendanceHistoryView />);

    await user.click(await screen.findByRole('button', { name: messages.common.retry }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(await screen.findAllByText(t.statuses.DONE)).not.toHaveLength(0);
  });

  it('shouldShowServerMessageWhenServerRejectsRange', async () => {
    apiFetch.mockRejectedValue(new ApiError(400, 'INVALID_DATE_RANGE', 'サーバーの文言です。'));
    render(<AttendanceHistoryView />);
    expect(await screen.findByText('サーバーの文言です。')).toBeInTheDocument();
  });

  it('shouldQueryWithPageFromUrlAndPushUrlOnPageClick', async () => {
    nav.search = 'startDate=2026-10-01&endDate=2026-10-31&page=2';
    apiFetch.mockResolvedValue(pageOf([record()], { page: 2, totalCount: 60, totalPages: 3 }));
    render(<AttendanceHistoryView />);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/attendance?startDate=2026-10-01&endDate=2026-10-31&page=2&limit=20',
      ),
    );
    const pager = screen.getByRole('navigation', { name: messages.pagination.label });
    expect(
      within(pager).getByRole('button', { name: messages.pagination.page(2) }),
    ).toHaveAttribute('aria-current', 'page');

    fireEvent.click(within(pager).getByRole('button', { name: messages.pagination.page(3) }));
    expect(router.push).toHaveBeenCalledWith(
      '/attendance?startDate=2026-10-01&endDate=2026-10-31&page=3',
    );
  });

  it('shouldResetPageToOneWhenSearchSubmitted', async () => {
    nav.search = 'startDate=2026-10-01&endDate=2026-10-31&page=2';
    apiFetch.mockResolvedValue(pageOf([record()], { page: 2, totalCount: 60, totalPages: 3 }));
    render(<AttendanceHistoryView />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(messages.dateRange.endDate), {
      target: { value: '2026-10-30' },
    });
    fireEvent.click(screen.getByRole('button', { name: messages.dateRange.search }));

    expect(router.push).toHaveBeenCalledWith(
      '/attendance?startDate=2026-10-01&endDate=2026-10-30&page=1',
    );
  });
});
