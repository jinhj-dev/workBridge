import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalsAccessProvider } from '@/components/layout/ApprovalsAccess';
import { ToastProvider } from '@/components/Toast';
import type { Leave, LeaveBalance, Paginated } from '@/lib/api/types';
import type { AuthUser } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { LeaveManagementLayout } from './LeaveManagementLayout';
import { LeavesView } from './LeavesView';

const t = messages.leaveManagement;
const APPROVER_CHECK =
  '/leaves/pending-approval?scope=mine&status=PENDING,APPROVED,REJECTED&limit=1';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
const nav = vi.hoisted(() => ({ pathname: '/leaves', search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock('@/lib/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'authenticated', user: auth.user, login: vi.fn(), logout: vi.fn() }),
}));

// 申請モーダル本体は LeaveApplyModal.test で検証する。ここでは開閉と申請後の動きだけを見る
vi.mock('@/components/leave/LeaveApplyModal', () => ({
  LeaveApplyModal: ({ open, onApplied }: { open: boolean; onApplied: () => void }) =>
    open ? (
      <div role="dialog" aria-label="apply-modal">
        <button type="button" onClick={onApplied}>
          apply-done
        </button>
      </div>
    ) : null,
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const EMPLOYEE: AuthUser = {
  id: 'u-me',
  name: '申請者',
  empId: '10001',
  role: 'EMPLOYEE',
  departmentName: '営業部',
  approvalRequired: true,
  mustChangePassword: false,
};
const ADMIN: AuthUser = { ...EMPLOYEE, id: 'u-admin', name: '管理者', role: 'ADMIN' };

const BALANCE: LeaveBalance = {
  year: 2026,
  grantedDays: 20,
  approvedDays: 0,
  pendingDays: 0,
  remainingDays: 20,
};

function pageOf(items: Leave[], totalCount = items.length): Paginated<Leave> {
  return { items, page: 1, limit: 20, totalCount, totalPages: totalCount > 0 ? 1 : 0 };
}

function mockApi(approverCount: number) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/leaves/balance') return BALANCE;
    if (path === APPROVER_CHECK) return pageOf([], approverCount);
    if (path.startsWith('/leaves/me')) return pageOf([]);
    throw new Error(`想定外の API 呼び出し: ${path}`);
  });
}

function renderLayout(user: AuthUser) {
  auth.user = user;
  const ui = userEvent.setup();
  render(
    <ToastProvider>
      <ApprovalsAccessProvider>
        <LeaveManagementLayout>
          <LeavesView />
        </LeaveManagementLayout>
      </ApprovalsAccessProvider>
    </ToastProvider>,
  );
  return ui;
}

function historyCalls(): string[] {
  return apiFetch.mock.calls
    .map(([path]) => String(path))
    .filter((path) => path.startsWith('/leaves/me'));
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.pathname = '/leaves';
  nav.search = '';
});

describe('LeaveManagementLayout 承認画面の表示判定(FC-04)', () => {
  it('shouldNotRenderInPageTabsForAnyUser', async () => {
    mockApi(1);
    renderLayout(EMPLOYEE);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(APPROVER_CHECK));
    expect(screen.queryByRole('link', { name: t.tabCalendar })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.tabApprovals })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.tabMine })).not.toBeInTheDocument();
  });

  it('shouldNotCheckApproverForAdmin', async () => {
    mockApi(0);
    renderLayout(ADMIN);
    await screen.findByRole('heading', { name: t.title });
    expect(apiFetch).not.toHaveBeenCalledWith(APPROVER_CHECK);
  });

  it('shouldRedirectNonApproverFromApprovalsPathToLeaves', async () => {
    nav.pathname = '/leaves/approvals';
    mockApi(0);
    renderLayout(EMPLOYEE);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/leaves'));
  });

  it('shouldNotRedirectApproverFromApprovalsPath', async () => {
    nav.pathname = '/leaves/approvals';
    mockApi(1);
    renderLayout(EMPLOYEE);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(APPROVER_CHECK));
    await waitFor(() => expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument());
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shouldNotRedirectAdminFromApprovalsPath', async () => {
    nav.pathname = '/leaves/approvals';
    mockApi(0);
    renderLayout(ADMIN);
    await screen.findByRole('heading', { name: t.title });
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('LeaveManagementLayout 申請後の再取得', () => {
  it('shouldReloadHistoryAfterApplyFromHeaderButton', async () => {
    mockApi(0);
    const ui = renderLayout(EMPLOYEE);
    await waitFor(() => expect(historyCalls()).toHaveLength(1));
    const before = historyCalls().length;

    await ui.click(screen.getByRole('button', { name: messages.leaves.applyButton }));
    await ui.click(screen.getByRole('button', { name: 'apply-done' }));

    expect(screen.queryByRole('dialog', { name: 'apply-modal' })).not.toBeInTheDocument();
    await waitFor(() => expect(historyCalls().length).toBeGreaterThan(before));
  });
});
