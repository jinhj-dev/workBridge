import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { UserDetail } from '@/lib/api/types';
import { UserDetailModal } from './UserDetailModal';
import { UserDeleteDialog } from './UserDeleteDialog';

// 社員詳細(design-frontend §5)と社員削除確認(§7)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}));

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const DETAIL: UserDetail = {
  id: 'u-1',
  empId: '10001',
  name: '山田 太郎',
  hireDate: '2026-04-01',
  departmentId: 'd-1',
  departmentName: '開発部',
  role: 'ADMIN',
  approvalRequired: false,
  isActive: true,
  employmentStatus: 'ACTIVE',
  jobTitle: { id: 'jt-1', name: 'マネージャー', tone: 'VIOLET' },
  contactEmail: 'yamada@example.com',
  createdAt: '2026-01-02T09:00:00+09:00',
  updatedAt: '2026-02-03T09:00:00+09:00',
  mustChangePassword: true,
  pendingApprovalCount: 2,
  leaveGrants: [],
};

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(DETAIL);
});

describe('UserDetailModal', () => {
  it('shouldShowDetailItemsWithLabelsAndBadges', async () => {
    render(
      <ToastProvider>
        <UserDetailModal open userId="u-1" onClose={vi.fn()} onEdit={vi.fn()} />
      </ToastProvider>,
    );
    expect(await screen.findByRole('dialog', { name: '社員詳細' })).toBeInTheDocument();
    for (const label of [
      '社員ID',
      '氏名',
      '役職',
      'メールアドレス',
      '所属部署',
      '入社日',
      'ステータス',
      '権限',
      '休暇承認',
      'パスワード変更',
      '登録日',
      '更新日',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('マネージャー')).toBeInTheDocument();
    expect(screen.getByText('在籍中')).toBeInTheDocument();
  });

  it('shouldShowNotFoundToastAndCloseWhenDetailReturns404', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, 'NOT_FOUND', '社員が見つかりません。'));
    const onClose = vi.fn();
    const onNotFound = vi.fn();
    render(
      <ToastProvider>
        <UserDetailModal
          open
          userId="u-missing"
          onClose={onClose}
          onEdit={vi.fn()}
          onNotFound={onNotFound}
        />
      </ToastProvider>,
    );
    // トーストは再描画で差し替わるため、毎回問い合わせ直して確認する
    await waitFor(() => expect(screen.getByText('社員が見つかりません。')).toBeInTheDocument());
    expect(onClose).toHaveBeenCalled();
    expect(onNotFound).toHaveBeenCalled();
  });
});

describe('UserDeleteDialog', () => {
  it('shouldShowPendingApprovalWarningFromDetailApi', async () => {
    render(
      <ToastProvider>
        <UserDeleteDialog open user={DETAIL} onClose={vi.fn()} onDeleted={vi.fn()} />
      </ToastProvider>,
    );
    expect(
      await screen.findByText(
        'この社員に割り当てられた承認待ち 2 件は、管理者が代理で処理してください。',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('shouldSendIsActiveFalseOnConfirm', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    apiFetch.mockResolvedValue(undefined);
    render(
      <ToastProvider>
        <UserDeleteDialog
          open
          user={{ ...DETAIL, pendingApprovalCount: 0 }}
          onClose={vi.fn()}
          onDeleted={onDeleted}
        />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: '削除' }));
    const patch = apiFetch.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patch?.[0]).toBe('/admin/users/u-1');
    expect(JSON.parse(String(patch?.[1].body))).toEqual({ isActive: false });
    expect(await screen.findByText('社員を削除しました。')).toBeInTheDocument();
    expect(onDeleted).toHaveBeenCalled();
  });
});
