import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError, NetworkError } from '@/lib/api/client';
import type { Attendance, Department, Paginated } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { AdminAttendanceView } from './AdminAttendanceView';

const t = messages.adminAttendance;

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/attendance',
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const DEPARTMENT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const DEPARTMENTS: Department[] = [{ id: DEPARTMENT_ID, name: '開発部' }];

const ROW: Attendance = {
  id: 'att-1',
  user: { id: 'u-1', name: '山田太郎', empId: '10001', departmentName: '開発部' },
  workDate: '2026-11-08',
  clockIn: '2026-11-08T09:00:00+09:00',
  clockOut: null,
  workMinutes: null,
  status: 'MISSING_CLOCK_OUT',
  modifiedAt: null,
};

function pageOf(items: Attendance[]): Paginated<Attendance> {
  return { items, page: 1, limit: 20, totalCount: items.length, totalPages: 1 };
}

// 部署の取得結果と勤怠の取得結果をパスで振り分ける
function mockApi(options: { departments?: () => Promise<unknown>; list?: Attendance[] } = {}) {
  apiFetch.mockImplementation((path: string) => {
    if (path.startsWith('/departments')) {
      return options.departments ? options.departments() : Promise.resolve(DEPARTMENTS);
    }
    return Promise.resolve(pageOf(options.list ?? [ROW]));
  });
}

function renderView() {
  render(
    <ToastProvider>
      <AdminAttendanceView />
    </ToastProvider>,
  );
}

// 今日は 2026-11-09(東京)
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

describe('AdminAttendanceView(SCR-008 全体勤怠管理)', () => {
  it('shouldApplySearchConditionsFromUrlToQuery', async () => {
    nav.search = `startDate=2026-11-01&endDate=2026-11-09&name=${encodeURIComponent('山田')}&departmentId=${DEPARTMENT_ID}&status=DONE`;
    mockApi();
    renderView();

    await waitFor(() => {
      const listCall = apiFetch.mock.calls.find(([path]) =>
        String(path).startsWith('/admin/attendance?'),
      );
      expect(listCall).toBeDefined();
      const url = String(listCall?.[0]);
      expect(url).toContain('name=%E5%B1%B1%E7%94%B0');
      expect(url).toContain(`departmentId=${DEPARTMENT_ID}`);
      expect(url).toContain('status=DONE');
      expect(url).toContain('limit=20');
    });
    expect(screen.getByLabelText(t.department)).toHaveValue(DEPARTMENT_ID);
    expect(screen.getByLabelText(t.status)).toHaveValue('DONE');
  });

  it('shouldListDepartmentsInSelect', async () => {
    mockApi();
    renderView();
    const select = screen.getByLabelText(t.department);
    expect(await within(select).findByRole('option', { name: '開発部' })).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/departments');
  });

  it('shouldKeepListWhenDepartmentsFail', async () => {
    mockApi({ departments: () => Promise.reject(new NetworkError()) });
    renderView();

    expect((await screen.findAllByText('山田太郎'))[0]).toBeInTheDocument();
    const select = screen.getByLabelText(t.department);
    expect(within(select).getAllByRole('option')).toHaveLength(1);
    expect(within(select).getByRole('option', { name: messages.common.all })).toBeInTheDocument();
  });

  it('shouldLinkEmployeeNameToUserDetail', async () => {
    mockApi();
    renderView();
    const link = (await screen.findAllByRole('link', { name: '山田太郎' }))[0];
    expect(link).toHaveAttribute('href', '/admin/users/u-1');
  });

  it('shouldPushSearchConditionsWithPageOneWhenSearchSubmitted', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockApi();
    renderView();
    await screen.findAllByText('山田太郎');

    await user.type(screen.getByLabelText(t.name), ' 山田 ');
    await user.selectOptions(screen.getByLabelText(t.status), 'MISSING_CLOCK_OUT');
    fireEvent.click(screen.getByRole('button', { name: messages.dateRange.search }));

    expect(router.push).toHaveBeenCalledTimes(1);
    const target = String(router.push.mock.calls[0][0]);
    expect(target.startsWith('/admin/attendance?')).toBe(true);
    expect(target).toContain('name=%E5%B1%B1%E7%94%B0');
    expect(target).toContain('status=MISSING_CLOCK_OUT');
    expect(target).toContain('page=1');
  });

  it('shouldSubmitSearchWhenEnterPressedInNameInput', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockApi();
    renderView();
    await screen.findAllByText('山田太郎');

    await user.type(screen.getByLabelText(t.name), '山田{Enter}');

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(String(router.push.mock.calls[0][0])).toContain('name=%E5%B1%B1%E7%94%B0');
  });

  it('shouldShowRangeErrorAndNotQueryListWhenStartAfterEnd', async () => {
    mockApi();
    renderView();
    await screen.findAllByText('山田太郎');

    fireEvent.change(screen.getByLabelText(messages.dateRange.startDate), {
      target: { value: '2026-11-09' },
    });
    fireEvent.change(screen.getByLabelText(messages.dateRange.endDate), {
      target: { value: '2026-11-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: messages.dateRange.search }));

    expect(screen.getByText(messages.dateRange.order)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shouldShowServerRangeErrorInsteadOfList', async () => {
    apiFetch.mockImplementation((path: string) =>
      path.startsWith('/departments')
        ? Promise.resolve(DEPARTMENTS)
        : Promise.reject(new ApiError(400, 'INVALID_DATE_RANGE', 'サーバーの期間エラー')),
    );
    renderView();
    expect(await screen.findByText('サーバーの期間エラー')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shouldRenderDecorativePencilAndSingleLineSmEditButton', async () => {
    mockApi();
    renderView();

    const button = (
      await screen.findAllByRole('button', { name: t.editLabel('山田太郎', '2026/11/08(日)') })
    )[0];
    expect(button).toHaveClass('whitespace-nowrap', 'border-primary-100', 'text-primary-100');
    expect(button).toHaveTextContent(messages.common.edit);
    expect(button.querySelector('svg')?.parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('shouldUseEditWordAndNoShuuseiTextButtonInRowAndSrOnlyHeader', async () => {
    mockApi();
    renderView();

    await screen.findAllByRole('button', { name: t.editLabel('山田太郎', '2026/11/08(日)') });
    expect(
      (await screen.findAllByRole('columnheader', { name: messages.common.edit })).length,
    ).toBeGreaterThan(0);
    const shuusei = screen
      .queryAllByRole('button')
      .filter((button) => button.textContent === '修正');
    expect(shuusei).toHaveLength(0);
  });

  it('shouldOpenEditModalForRowWithEmployeeAndDate', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockApi();
    renderView();

    await user.click(
      (await screen.findAllByRole('button', { name: t.editLabel('山田太郎', '2026/11/08(日)') }))[0],
    );
    expect(screen.getByRole('dialog', { name: t.modal.title })).toBeInTheDocument();
    expect(screen.getByLabelText(t.modal.clockIn)).toHaveValue('2026-11-08T09:00');
  });
});
