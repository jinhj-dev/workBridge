import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingApprovalCountProvider } from '@/components/layout/PendingApprovalCount';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { Leave, Paginated } from '@/lib/api/types';
import type { AuthUser } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { ApprovalsView, parseApprovalsQuery } from './ApprovalsView';

const t = messages.approvals;

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/leaves/approvals',
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

const EMPLOYEE: AuthUser = {
  id: 'u-approver',
  name: '承認者',
  empId: '10002',
  role: 'EMPLOYEE',
  departmentName: '開発部',
  approvalRequired: true,
  mustChangePassword: false,
};
const ADMIN: AuthUser = { ...EMPLOYEE, id: 'u-admin', name: '管理者', role: 'ADMIN' };

function leave(overrides: Partial<Leave> = {}): Leave {
  return {
    id: 'leave-1',
    user: { id: 'u-applicant', name: '申請者', empId: '10001', departmentName: '営業部' },
    approver: { id: 'u-approver', name: '承認者', empId: '10002', departmentName: '開発部' },
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

function listCalls(): string[] {
  return apiFetch.mock.calls
    .map(([path]) => String(path))
    // 一覧(limit=20)だけを数える。件数カードとバッジは limit=1
    .filter((path) => path.startsWith('/leaves/pending-approval') && path.includes('limit=20'));
}

function mockApi(list: Paginated<Leave> | Error, detail: Leave = leave()) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/leaves/pending-approval')) {
      if (list instanceof Error) throw list;
      return list;
    }
    if (path === `/leaves/${detail.id}`) return detail;
    throw new Error(`想定外の API 呼び出し: ${path}`);
  });
}

// 表(テーブル)の列見出しと、指定行のセル文字列
function columnHeaders(table: HTMLElement): string[] {
  return within(table)
    .getAllByRole('columnheader')
    .map((th) => th.textContent ?? '');
}

function rowCells(table: HTMLElement, rowIndex: number): string[] {
  // 先頭は見出し行なので +1 する
  const row = within(table).getAllByRole('row')[rowIndex + 1];
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');
}

function renderView(user: AuthUser) {
  auth.user = user;
  const ui = userEvent.setup();
  render(
    <ToastProvider>
      <ApprovalsView />
    </ToastProvider>,
  );
  return ui;
}

beforeEach(() => {
  nav.search = '';
  apiFetch.mockReset();
  router.push.mockReset();
});

describe('parseApprovalsQuery', () => {
  it.each([
    ['scope=all', true, 'all', 'PENDING', 1],
    ['scope=all', false, 'mine', 'PENDING', 1],
    ['scope=foo', true, 'mine', 'PENDING', 1],
    ['page=3', false, 'mine', 'PENDING', 3],
    ['page=0', false, 'mine', 'PENDING', 1],
    ['page=abc', false, 'mine', 'PENDING', 1],
    ['page=1.5', false, 'mine', 'PENDING', 1],
    ['status=APPROVED', false, 'mine', 'APPROVED', 1],
    ['status=REJECTED&scope=all', true, 'all', 'REJECTED', 1],
    ['status=CANCELLED', false, 'mine', 'PENDING', 1],
    ['status=', false, 'mine', 'PENDING', 1],
  ])('shouldParse(%s, admin=%s)', (search, isAdmin, scope, status, page) => {
    expect(parseApprovalsQuery(new URLSearchParams(search), isAdmin)).toEqual({
      scope,
      status,
      page,
    });
  });
});

describe('ApprovalsView(SCR-005 休暇承認)', () => {
  it('shouldListMineWithoutTabsAndApproverColumnForEmployee', async () => {
    nav.search = 'scope=all';
    // 見出し(申請者)と値が衝突しないよう、申請者名は別の値にする
    mockApi(pageOf([leave({ user: { ...leave().user, name: '佐藤花子' } })]));
    renderView(EMPLOYEE);

    const table = await screen.findByRole('table');
    expect(listCalls()).toEqual(['/leaves/pending-approval?scope=mine&status=PENDING&page=1&limit=20']);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: t.approver })).not.toBeInTheDocument();
    expect(columnHeaders(table)).toEqual([
      t.createdAt,
      t.empId,
      t.applicant,
      t.department,
      t.period,
      t.leaveType,
      t.days,
      t.statusColumn,
      t.actions,
    ]);
    // 値の列対応を確認する(操作列は除く)
    expect(rowCells(table, 0).slice(0, 7)).toEqual([
      '2026/11/08',
      '10001',
      '佐藤花子',
      '営業部',
      '2026/11/20 ～ 2026/11/21',
      messages.leave.types.ANNUAL,
      '2日',
    ]);
  });

  it('shouldShowTabsAndSwitchToAllForAdmin', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView(ADMIN);
    await screen.findAllByText('申請者');

    expect(listCalls()).toEqual(['/leaves/pending-approval?scope=mine&status=PENDING&page=1&limit=20']);
    expect(screen.getByRole('tab', { name: t.scopeMine })).toHaveAttribute('aria-selected', 'true');
    await ui.click(screen.getByRole('tab', { name: t.scopeAll }));
    expect(router.push).toHaveBeenCalledWith('/leaves/approvals?scope=all');
  });

  it('shouldShowApproverColumnAndDisableOwnRowActionsInAllScope', async () => {
    nav.search = 'scope=all';
    mockApi(
      pageOf([
        leave(),
        leave({
          id: 'leave-own',
          user: { id: 'u-admin', name: '管理者', empId: '10003', departmentName: null },
        }),
      ]),
    );
    renderView(ADMIN);
    await screen.findAllByText('申請者');

    expect(screen.getByRole('columnheader', { name: t.approver })).toBeInTheDocument();
    expect(listCalls()[0]).toContain('scope=all');
    expect(screen.getAllByRole('button', { name: t.approveLabel('管理者') })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: t.rejectLabel('管理者') })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: t.detailLabel('管理者') })[0]).toBeEnabled();
    expect(screen.getAllByRole('button', { name: t.approveLabel('申請者') })[0]).toBeEnabled();
  });

  it.each([
    ['mine', t.emptyMine],
    ['all', t.emptyAll],
  ])('shouldShowEmptyMessage(%s)', async (scope, message) => {
    nav.search = `scope=${scope}`;
    mockApi(pageOf([]));
    renderView(ADMIN);
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('shouldShowPaginationWhenPageIsOutOfRange', async () => {
    nav.search = 'page=9';
    mockApi(pageOf([], { page: 9, totalCount: 3, totalPages: 1 }));
    renderView(EMPLOYEE);
    expect(await screen.findByText(t.emptyMine)).toBeInTheDocument();
    expect(screen.getByText(messages.pagination.total(3))).toBeInTheDocument();
  });

  it('shouldRetryWhenListFails', async () => {
    mockApi(new ApiError(500, 'INTERNAL_ERROR', 'エラー'));
    const ui = renderView(EMPLOYEE);
    await ui.click(await screen.findByRole('button', { name: messages.common.retry }));
    await waitFor(() => expect(listCalls()).toHaveLength(2));
  });

  it('shouldOpenConfirmStepDirectlyFromApproveButton', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView(EMPLOYEE);
    await ui.click((await screen.findAllByRole('button', { name: t.approveLabel('申請者') }))[0]);

    const dialog = await screen.findByRole('dialog', { name: messages.leave.approve.title });
    expect(
      await within(dialog).findByText(messages.leave.approve.confirm('申請者')),
    ).toBeInTheDocument();
  });

  it('shouldOpenDetailStepFromDetailButton', async () => {
    mockApi(pageOf([leave()]));
    const ui = renderView(EMPLOYEE);
    await ui.click((await screen.findAllByRole('button', { name: t.detailLabel('申請者') }))[0]);

    const dialog = await screen.findByRole('dialog', { name: messages.leave.detail.title });
    expect(await within(dialog).findByText(messages.leave.detail.leaveType)).toBeInTheDocument();
  });

  it('shouldShowDetailOnlyWhenRowApproveOpensLeaveThatIsNoLongerPending', async () => {
    mockApi(pageOf([leave()]), leave({ status: 'APPROVED' }));
    const ui = renderView(EMPLOYEE);
    await ui.click((await screen.findAllByRole('button', { name: t.approveLabel('申請者') }))[0]);

    const dialog = await screen.findByRole('dialog', { name: messages.leave.detail.title });
    await within(dialog).findByText(messages.leave.detail.leaveType);
    expect(
      within(dialog).queryByRole('button', { name: messages.leave.approve.submit }),
    ).toBeNull();
  });

  it('shouldShowSkeletonWithoutTableWhileListLoads', () => {
    apiFetch.mockImplementation(() => new Promise(() => {}));
    auth.user = EMPLOYEE;
    const { container } = render(
      <ToastProvider>
        <ApprovalsView />
      </ToastProvider>,
    );
    // 一覧領域の読み込み表示(role=status)の中に、5 行分の骨格が出ること
    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton).toHaveTextContent(messages.common.loading);
    expect(skeleton?.querySelectorAll('.animate-pulse')).toHaveLength(5);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(t.emptyMine)).not.toBeInTheDocument();
  });

  it('shouldKeepPageOneWhenSwitchingScopeFromPageThree', async () => {
    nav.search = 'page=3';
    mockApi(pageOf([], { page: 3, totalCount: 0, totalPages: 0 }));
    const ui = renderView(ADMIN);
    await screen.findByText(t.emptyMine);

    await ui.click(screen.getByRole('tab', { name: t.scopeAll }));
    expect(router.push).toHaveBeenCalledWith('/leaves/approvals?scope=all');
  });

  it('shouldMoveToSelectedPageKeepingScope', async () => {
    nav.search = 'scope=all';
    mockApi(pageOf([leave()], { totalCount: 45, totalPages: 3 }));
    const ui = renderView(ADMIN);
    await screen.findAllByText('申請者');

    await ui.click(screen.getByRole('button', { name: messages.pagination.page(2) }));
    expect(router.push).toHaveBeenCalledWith('/leaves/approvals?scope=all&page=2');
  });
});

describe('ApprovalsView 状態カードと処理ボタン', () => {
  // 状態ごとの件数を返す(limit=1 の件数取得と一覧取得の両方に応答する)
  function mockByStatus(counts: Record<string, number>, rows: Leave[]) {
    apiFetch.mockImplementation(async (path: string) => {
      if (!path.startsWith('/leaves/pending-approval')) throw new Error(`想定外: ${path}`);
      if (path.includes('limit=1')) {
        const status = /status=(\w+)/.exec(path)?.[1] ?? 'PENDING';
        const total = counts[status] ?? 0;
        return pageOf([], { totalCount: total, totalPages: total > 0 ? 1 : 0 });
      }
      return pageOf(rows);
    });
  }

  it('shouldShowStatusCountsAndLinkEachCardToStatusUrl', async () => {
    mockByStatus({ PENDING: 4, APPROVED: 7, REJECTED: 2 }, [leave()]);
    renderView(EMPLOYEE);

    const pending = await screen.findByRole('link', { name: new RegExp(t.statusPending) });
    await waitFor(() => expect(pending).toHaveTextContent('4'));
    expect(pending).toHaveAttribute('href', '/leaves/approvals');
    expect(screen.getByRole('link', { name: new RegExp(t.statusApproved) })).toHaveAttribute(
      'href',
      '/leaves/approvals?status=APPROVED',
    );
    expect(screen.getByRole('link', { name: new RegExp(t.statusRejected) })).toHaveAttribute(
      'href',
      '/leaves/approvals?status=REJECTED',
    );
  });

  it('shouldShowApproveAndRejectOnlyForPendingRows', async () => {
    mockByStatus({ PENDING: 1, APPROVED: 1 }, [leave({ status: 'APPROVED' })]);
    renderView(EMPLOYEE);

    await screen.findAllByRole('button', { name: t.detailLabel('申請者') });
    // 表とカード(md 未満)の両方に出るため、件数で判定する
    expect(screen.queryAllByRole('button', { name: t.approveLabel('申請者') })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: t.rejectLabel('申請者') })).toHaveLength(0);
  });

  it('shouldShowEmptyApprovedMessageWhenStatusApprovedAndNoRows', async () => {
    nav.search = 'status=APPROVED';
    mockByStatus({ APPROVED: 0 }, []);
    renderView(EMPLOYEE);
    expect(await screen.findByText(t.emptyApproved)).toBeInTheDocument();
  });
});

// 処理(承認・却下)の流れ。バッジ(PendingApprovalCount)と一覧の再取得まで確認する
describe('ApprovalsView 処理(承認・却下)', () => {
  const PATCH_APPROVE = '/leaves/leave-1/approve';
  const PATCH_REJECT = '/leaves/leave-1/reject';

  function renderWithBadge(user: AuthUser) {
    auth.user = user;
    const ui = userEvent.setup();
    render(
      <ToastProvider>
        <PendingApprovalCountProvider>
          <ApprovalsView />
        </PendingApprovalCountProvider>
      </ToastProvider>,
    );
    return ui;
  }

  // 一覧・詳細・処理 API をまとめて応答させる。patch は PATCH の応答(投げれば失敗)
  function mockProcessApi(options: { patch?: (init?: RequestInit) => unknown; detail?: Leave }) {
    apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith('/leaves/pending-approval')) return pageOf([leave()]);
      if (path === '/leaves/leave-1') return options.detail ?? leave();
      if (path === PATCH_APPROVE || path === PATCH_REJECT) {
        return options.patch ? options.patch(init) : leave({ status: 'APPROVED' });
      }
      throw new Error(`想定外の API 呼び出し: ${path}`);
    });
  }

  function countCalls(predicate: (path: string) => boolean): number {
    return apiFetch.mock.calls.filter(([p]) => predicate(String(p))).length;
  }
  const listReloads = () =>
    countCalls((p) => p.startsWith('/leaves/pending-approval') && p.includes('limit=20'));
  const badgeLoads = () => countCalls((p) => p === '/leaves/pending-approval?scope=mine&limit=1');
  const patchPaths = () =>
    apiFetch.mock.calls
      .filter(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH')
      .map(([p]) => String(p));

  function dialogIsOpen(): boolean {
    return document.querySelector('dialog')?.hasAttribute('open') ?? false;
  }

  async function openRowAction(ui: ReturnType<typeof userEvent.setup>, label: string) {
    await ui.click((await screen.findAllByRole('button', { name: label }))[0]);
    return screen.findByRole('dialog');
  }

  it('shouldApproveAfterConfirmAndReloadListAndBadge', async () => {
    mockProcessApi({});
    const ui = renderWithBadge(EMPLOYEE);
    const dialog = await openRowAction(ui, t.approveLabel('申請者'));
    await within(dialog).findByText(messages.leave.approve.confirm('申請者'));
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.approve.submit }));

    expect(await screen.findByText(messages.leave.approve.success)).toBeInTheDocument();
    expect(patchPaths()).toEqual([PATCH_APPROVE]);
    await waitFor(() => expect(listReloads()).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(badgeLoads()).toBeGreaterThanOrEqual(2));
    expect(dialogIsOpen()).toBe(false);
  });

  it('shouldRejectWithTrimmedReasonAndReloadList', async () => {
    mockProcessApi({});
    const ui = renderWithBadge(EMPLOYEE);
    const dialog = await openRowAction(ui, t.rejectLabel('申請者'));
    const reason = await within(dialog).findByLabelText(messages.leave.reject.reasonLabel);
    await ui.type(reason, '  家庭の事情  ');
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.reject.submit }));

    expect(await screen.findByText(messages.leave.reject.success)).toBeInTheDocument();
    const rejectCall = apiFetch.mock.calls.find(([p]) => p === PATCH_REJECT);
    expect(JSON.parse(String(rejectCall?.[1]?.body))).toEqual({ rejectReason: '家庭の事情' });
    await waitFor(() => expect(listReloads()).toBeGreaterThanOrEqual(2));
  });

  it('shouldSwitchFromDetailModalToApproveConfirm', async () => {
    mockProcessApi({});
    const ui = renderWithBadge(EMPLOYEE);
    const dialog = await openRowAction(ui, t.detailLabel('申請者'));
    await within(dialog).findByText(messages.leave.detail.leaveType);
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.detail.approve }));

    await within(dialog).findByText(messages.leave.approve.confirm('申請者'));
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.approve.submit }));
    expect(await screen.findByText(messages.leave.approve.success)).toBeInTheDocument();
    expect(patchPaths()).toEqual([PATCH_APPROVE]);
  });

  it('shouldCallApproveOnlyOnceWhenSubmittedTwice', async () => {
    let resolvePatch: (value: Leave) => void = () => {};
    mockProcessApi({
      patch: () => new Promise<Leave>((resolve) => (resolvePatch = resolve)),
    });
    const ui = renderWithBadge(EMPLOYEE);
    const dialog = await openRowAction(ui, t.approveLabel('申請者'));
    await within(dialog).findByText(messages.leave.approve.confirm('申請者'));
    const submit = within(dialog).getByRole('button', { name: messages.leave.approve.submit });
    await ui.click(submit);
    await ui.click(submit);

    expect(patchPaths()).toEqual([PATCH_APPROVE]);
    resolvePatch(leave({ status: 'APPROVED' }));
    expect(await screen.findByText(messages.leave.approve.success)).toBeInTheDocument();
  });

  it('shouldToastAlreadyProcessedCloseModalAndReloadOn409', async () => {
    mockProcessApi({
      patch: () => {
        throw new ApiError(409, 'ALREADY_PROCESSED', 'サーバーのメッセージ');
      },
    });
    const ui = renderWithBadge(EMPLOYEE);
    const dialog = await openRowAction(ui, t.approveLabel('申請者'));
    await within(dialog).findByText(messages.leave.approve.confirm('申請者'));
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.approve.submit }));

    expect(await screen.findByText(messages.leave.alreadyProcessed)).toBeInTheDocument();
    expect(screen.queryByText('サーバーのメッセージ')).not.toBeInTheDocument();
    expect(dialogIsOpen()).toBe(false);
    await waitFor(() => expect(listReloads()).toBeGreaterThanOrEqual(2));
  });

  it('shouldToastForbiddenCloseModalAndReloadOn403', async () => {
    mockProcessApi({
      patch: () => {
        throw new ApiError(403, 'FORBIDDEN', 'サーバーのメッセージ');
      },
    });
    const ui = renderWithBadge(EMPLOYEE);
    const dialog = await openRowAction(ui, t.approveLabel('申請者'));
    await within(dialog).findByText(messages.leave.approve.confirm('申請者'));
    await ui.click(within(dialog).getByRole('button', { name: messages.leave.approve.submit }));

    expect(await screen.findByText(messages.leave.forbidden)).toBeInTheDocument();
    expect(dialogIsOpen()).toBe(false);
    await waitFor(() => expect(listReloads()).toBeGreaterThanOrEqual(2));
  });

  it('shouldValidateRejectReasonWithoutCallingApi', async () => {
    mockProcessApi({});
    const ui = renderWithBadge(EMPLOYEE);
    const dialog = await openRowAction(ui, t.rejectLabel('申請者'));
    const reason = await within(dialog).findByLabelText(messages.leave.reject.reasonLabel);
    const submit = within(dialog).getByRole('button', { name: messages.leave.reject.submit });

    await ui.type(reason, '   ');
    await ui.click(submit);
    expect(
      await within(dialog).findByText(messages.leave.reject.validation.required),
    ).toBeVisible();

    fireEvent.change(reason, { target: { value: 'あ'.repeat(501) } });
    await ui.click(submit);
    expect(await within(dialog).findByText(messages.leave.reject.validation.tooLong)).toBeVisible();
    expect(patchPaths()).toEqual([]);
  });

  it('shouldIgnoreClickOnOwnRowApproveWithoutOpeningConfirmOrCallingApi', async () => {
    nav.search = 'scope=all';
    mockApi(
      pageOf([
        leave({
          id: 'leave-own',
          user: { id: 'u-admin', name: '管理者', empId: '10003', departmentName: null },
        }),
      ]),
    );
    renderView(ADMIN);
    const approve = (await screen.findAllByRole('button', { name: t.approveLabel('管理者') }))[0];

    // disabled のボタンを押しても確認画面は開かず、PATCH も送られない
    fireEvent.click(approve);
    expect(dialogIsOpen()).toBe(false);
    expect(patchPaths()).toEqual([]);
  });
});
