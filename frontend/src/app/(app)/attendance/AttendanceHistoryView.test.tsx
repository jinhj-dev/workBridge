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

    // 同じ文言の状態ボタンがあるため、表の中のバッジに絞る
    const table = await screen.findByRole('table');
    const missingBadge = within(table).getByText(t.statuses.MISSING_CLOCK_OUT);
    expect(missingBadge.closest('tr')).toHaveClass('bg-danger-30/40');
    // 表の中のバッジにツールチップが付き、hover で文言が出ることを確かめる(モバイル一覧の文言では代用しない)
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

  describe('状態の絞り込み', () => {
    const statusButton = (status: keyof typeof t.statuses) =>
      screen.getByRole('button', { name: t.statuses[status] });

    it('shouldQueryWithStatusesFromUrlAndShowThemAsPressed', async () => {
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31&status=MISSING_CLOCK_OUT%2CDONE';
      apiFetch.mockResolvedValue(pageOf([record()]));
      render(<AttendanceHistoryView />);

      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith(
          '/attendance?startDate=2026-10-01&endDate=2026-10-31&status=DONE%2CMISSING_CLOCK_OUT&page=1&limit=20',
        ),
      );
      expect(statusButton('DONE')).toHaveAttribute('aria-pressed', 'true');
      expect(statusButton('MISSING_CLOCK_OUT')).toHaveAttribute('aria-pressed', 'true');
      expect(statusButton('WORKING')).toHaveAttribute('aria-pressed', 'false');
    });

    it('shouldIgnoreUnknownStatusInUrl', async () => {
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31&status=UNKNOWN';
      apiFetch.mockResolvedValue(pageOf([record()]));
      render(<AttendanceHistoryView />);

      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith(
          '/attendance?startDate=2026-10-01&endDate=2026-10-31&page=1&limit=20',
        ),
      );
    });

    it('shouldPushStatusImmediatelyWithAppliedPeriodAndResetPageWithoutSearchButton', async () => {
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31&page=2';
      apiFetch.mockResolvedValue(pageOf([record()], { page: 2, totalCount: 60, totalPages: 3 }));
      render(<AttendanceHistoryView />);
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

      // 期間を入力しただけ([照会] 前)なら、状態を押しても URL の期間のまま絞り込む
      fireEvent.change(screen.getByLabelText(messages.dateRange.endDate), {
        target: { value: '2026-10-15' },
      });
      fireEvent.click(statusButton('MISSING_CLOCK_OUT'));

      expect(router.push).toHaveBeenLastCalledWith(
        '/attendance?startDate=2026-10-01&endDate=2026-10-31&status=MISSING_CLOCK_OUT&page=1',
        { scroll: false },
      );
      // 続けて押しても前の選択を取りこぼさず、表示順で並べる
      fireEvent.click(statusButton('DONE'));
      expect(router.push).toHaveBeenLastCalledWith(
        '/attendance?startDate=2026-10-01&endDate=2026-10-31&status=DONE%2CMISSING_CLOCK_OUT&page=1',
        { scroll: false },
      );
      expect(router.push).toHaveBeenCalledTimes(2);
      // 入力中の期間は残る
      expect(screen.getByLabelText(messages.dateRange.endDate)).toHaveValue('2026-10-15');
    });

    it('shouldDeselectStatusAndPushUrlWithoutStatusWhenNoneSelected', async () => {
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31&status=DONE';
      apiFetch.mockResolvedValue(pageOf([record()]));
      render(<AttendanceHistoryView />);
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

      fireEvent.click(statusButton('DONE'));

      expect(statusButton('DONE')).toHaveAttribute('aria-pressed', 'false');
      expect(router.push).toHaveBeenCalledWith(
        '/attendance?startDate=2026-10-01&endDate=2026-10-31&page=1',
        { scroll: false },
      );
    });

    it('shouldPushPeriodWithSelectedStatusesWhenSearchSubmitted', async () => {
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31&status=DONE';
      apiFetch.mockResolvedValue(pageOf([record()]));
      render(<AttendanceHistoryView />);
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

      fireEvent.change(screen.getByLabelText(messages.dateRange.endDate), {
        target: { value: '2026-10-15' },
      });
      fireEvent.click(screen.getByRole('button', { name: messages.dateRange.search }));

      expect(router.push).toHaveBeenCalledWith(
        '/attendance?startDate=2026-10-01&endDate=2026-10-15&status=DONE&page=1',
      );
    });

    it('shouldColorStatusButtonsLikeListBadges', () => {
      apiFetch.mockResolvedValue(pageOf([]));
      render(<AttendanceHistoryView />);

      expect(statusButton('WORKING')).toHaveClass('bg-success-40');
      expect(statusButton('DONE')).toHaveClass('bg-general-40', 'text-general-80');
      expect(statusButton('MISSING_CLOCK_OUT')).toHaveClass('bg-danger-30');
    });

    it('shouldKeepStatusesInUrlWhenPageClicked', async () => {
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31&status=DONE&page=1';
      apiFetch.mockResolvedValue(pageOf([record()], { page: 1, totalCount: 60, totalPages: 3 }));
      render(<AttendanceHistoryView />);
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

      const pager = screen.getByRole('navigation', { name: messages.pagination.label });
      fireEvent.click(within(pager).getByRole('button', { name: messages.pagination.page(2) }));

      expect(router.push).toHaveBeenCalledWith(
        '/attendance?startDate=2026-10-01&endDate=2026-10-31&status=DONE&page=2',
      );
    });

    it('shouldKeepPreviousListVisibleWithoutSkeletonWhileFilteredResultIsLoading', async () => {
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31';
      apiFetch.mockResolvedValueOnce(
        pageOf([record({ id: 'a', workDate: '2026-10-05' }), record({ id: 'b' })]),
      );
      const { rerender } = render(<AttendanceHistoryView />);
      const table = await screen.findByRole('table');
      expect(within(table).getAllByRole('row')).toHaveLength(3);

      // 状態で絞り込んだ結果がまだ届かない間
      let resolveFiltered: (value: Paginated<Attendance>) => void = () => undefined;
      apiFetch.mockReturnValueOnce(
        new Promise<Paginated<Attendance>>((resolve) => {
          resolveFiltered = resolve;
        }),
      );
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31&status=DONE';
      rerender(<AttendanceHistoryView />);

      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
      // 前の一覧が残り(読み込み表示に置き換わらず)、取得中であることだけを示す
      expect(screen.getByRole('table')).toBe(table);
      expect(within(table).getAllByRole('row')).toHaveLength(3);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(table.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');

      // 結果が届いたら入れ替わる
      resolveFiltered(pageOf([record({ id: 'c', workDate: '2026-10-07' })]));
      await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(2));
      expect(table.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false');
    });

    it('shouldShowErrorInsteadOfPreviousListWhenFilteredRequestFails', async () => {
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31';
      apiFetch.mockResolvedValueOnce(pageOf([record()]));
      const { rerender } = render(<AttendanceHistoryView />);
      await screen.findByRole('table');

      apiFetch.mockRejectedValueOnce(new NetworkError());
      nav.search = 'startDate=2026-10-01&endDate=2026-10-31&status=DONE';
      rerender(<AttendanceHistoryView />);

      expect(await screen.findByText(messages.common.loadError)).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('shouldShowFilteredEmptyMessageOnlyWhenStatusIsApplied', async () => {
      nav.search = 'status=WORKING';
      apiFetch.mockResolvedValue(pageOf([]));
      const { unmount } = render(<AttendanceHistoryView />);
      expect(await screen.findByText(t.emptyFiltered)).toBeInTheDocument();
      unmount();

      nav.search = '';
      render(<AttendanceHistoryView />);
      expect(await screen.findByText(t.empty)).toBeInTheDocument();
    });
  });
});
