import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { messages } from '@/messages/ja';
import { LeaveCalendarSection } from './LeaveCalendarSection';

const t = messages.dashboard.calendar;

// useApiQuery の effect が router を依存に持つため、同じ参照を返す
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

function monthOf(path: string): string {
  return new URL(path, 'http://x').searchParams.get('month') ?? '';
}

function mockApi(day: () => unknown = () => ({ date: '2026-11-10', items: [] })): void {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/dashboard/leave-calendar/day')) return day();
    const month = monthOf(path);
    return { month, days: [{ date: `${month}-10`, count: 3 }] };
  });
}

function callsTo(prefix: string): unknown[][] {
  return apiFetch.mock.calls.filter(([p]) => String(p).startsWith(prefix));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-09T03:00:00Z') });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LeaveCalendarSection', () => {
  it('shouldShowCurrentTokyoMonthWithCountBadge', async () => {
    mockApi();
    render(<LeaveCalendarSection refreshSignal={0} />);

    const cell = await screen.findByRole('button', { name: `2026/11/10 ${t.dayDescription(3)}` });
    expect(cell).toHaveTextContent('3名');
    // データのない日は件数の表示がない
    expect(screen.getByRole('button', { name: /^2026\/11\/09/ })).not.toHaveTextContent('名');
    expect(screen.getByText('2026年11月')).toBeInTheDocument();
    expect(callsTo('/dashboard/leave-calendar?month=2026-11')).toHaveLength(1);
  });

  it('shouldFetchPreviousAndNextMonthWhenMoving', async () => {
    mockApi();
    const ui = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<LeaveCalendarSection refreshSignal={0} />);
    await screen.findByRole('button', { name: /2026\/11\/10/ });

    await ui.click(screen.getByRole('button', { name: t.prevMonth }));
    expect(await screen.findByText('2026年10月')).toBeInTheDocument();
    await screen.findByRole('button', { name: /2026\/10\/10/ });
    await ui.click(screen.getByRole('button', { name: t.nextMonth }));
    await ui.click(screen.getByRole('button', { name: t.nextMonth }));
    await screen.findByRole('button', { name: /2026\/12\/10/ });

    expect(callsTo('/dashboard/leave-calendar?month=2026-10')).toHaveLength(1);
    expect(callsTo('/dashboard/leave-calendar?month=2026-12')).toHaveLength(1);
  });

  it('shouldShowErrorWithRetryWhenMonthFails', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'error'));
    mockApi();
    const ui = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<LeaveCalendarSection refreshSignal={0} />);

    await ui.click(await screen.findByRole('button', { name: messages.common.retry }));
    expect(await screen.findByRole('button', { name: /2026\/11\/10/ })).toBeInTheDocument();
  });

  it('shouldReloadCurrentMonthWhenRefreshSignalChanges', async () => {
    mockApi();
    const { rerender } = render(<LeaveCalendarSection refreshSignal={0} />);
    await screen.findByRole('button', { name: /2026\/11\/10/ });

    rerender(<LeaveCalendarSection refreshSignal={1} />);
    await waitFor(() => expect(callsTo('/dashboard/leave-calendar?month=2026-11')).toHaveLength(2));
  });

  it('shouldListMembersWithHalfDayLabelInModal', async () => {
    mockApi(() => ({
      date: '2026-11-10',
      items: [
        { userId: 'u1', name: '山田太郎', departmentName: '開発部', halfDay: 'AM' },
        { userId: 'u2', name: '佐藤花子', departmentName: '営業部', halfDay: null },
      ],
    }));
    const ui = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<LeaveCalendarSection refreshSignal={0} />);

    await ui.click(await screen.findByRole('button', { name: /2026\/11\/10/ }));
    const dialog = await screen.findByRole('dialog', { name: t.dayTitle('2026/11/10') });
    expect(await within(dialog).findByText('山田太郎')).toBeInTheDocument();
    expect(within(dialog).getByText('開発部')).toBeInTheDocument();
    expect(within(dialog).getByText(messages.leave.types.HALF_AM)).toBeInTheDocument();
    expect(within(dialog).queryByText(messages.leave.types.HALF_PM)).not.toBeInTheDocument();
    expect(callsTo('/dashboard/leave-calendar/day?date=2026-11-10')).toHaveLength(1);
  });

  it('shouldShowSkeletonWhileMonthIsLoading', () => {
    apiFetch.mockImplementation(() => new Promise(() => {}));
    render(<LeaveCalendarSection refreshSignal={0} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shouldShowPmLabelAndNoLabelForFullDay', async () => {
    mockApi(() => ({
      date: '2026-11-10',
      items: [
        { userId: 'u1', name: '山田太郎', departmentName: '開発部', halfDay: 'PM' },
        { userId: 'u2', name: '佐藤花子', departmentName: '営業部', halfDay: null },
      ],
    }));
    const ui = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<LeaveCalendarSection refreshSignal={0} />);

    await ui.click(await screen.findByRole('button', { name: /2026\/11\/10/ }));
    const dialog = await screen.findByRole('dialog', { name: t.dayTitle('2026/11/10') });
    expect(await within(dialog).findByText(messages.leave.types.HALF_PM)).toBeInTheDocument();
    expect(within(dialog).queryByText(messages.leave.types.HALF_AM)).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
  });

  it('shouldShowErrorInModalAndRetryDayDetail', async () => {
    let dayCalls = 0;
    mockApi(() => {
      dayCalls += 1;
      if (dayCalls === 1) throw new ApiError(500, 'INTERNAL', 'error');
      return { date: '2026-11-10', items: [] };
    });
    const ui = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<LeaveCalendarSection refreshSignal={0} />);

    await ui.click(await screen.findByRole('button', { name: /2026\/11\/10/ }));
    const dialog = await screen.findByRole('dialog', { name: t.dayTitle('2026/11/10') });
    await ui.click(await within(dialog).findByRole('button', { name: messages.common.retry }));

    expect(await within(dialog).findByText(t.empty)).toBeInTheDocument();
    expect(callsTo('/dashboard/leave-calendar/day?date=2026-11-10')).toHaveLength(2);
    expect(callsTo('/dashboard/leave-calendar?month=2026-11')).toHaveLength(1);
  });

  it('shouldShowEmptyMessageWhenNobodyIsOnLeave', async () => {
    mockApi();
    const ui = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<LeaveCalendarSection refreshSignal={0} />);

    await ui.click(await screen.findByRole('button', { name: /2026\/11\/11/ }));
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });
});
