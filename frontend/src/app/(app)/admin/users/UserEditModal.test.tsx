import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { UserDetail } from '@/lib/api/types';
import { UserEditModal } from './UserEditModal';

// 社員編集モーダル(design-frontend §6)。変更フィールドのみ PATCH、無効化は確認段階を経る
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

const USER: UserDetail = {
  id: 'u-1',
  empId: '10001',
  name: '山田 太郎',
  hireDate: '2026-04-01',
  departmentId: 'd-1',
  departmentName: '開発部',
  role: 'EMPLOYEE',
  approvalRequired: true,
  isActive: true,
  employmentStatus: 'ACTIVE',
  jobTitle: null,
  contactEmail: 'yamada@example.com',
  createdAt: '2026-01-02T09:00:00+09:00',
  mustChangePassword: false,
  updatedAt: '2026-01-02T09:00:00+09:00',
  pendingApprovalCount: 0,
  leaveGrants: [],
};

function renderEdit(user = USER) {
  const onSaved = vi.fn();
  render(
    <ToastProvider>
      <UserEditModal open user={user} onClose={vi.fn()} onSaved={onSaved} />
    </ToastProvider>,
  );
  return onSaved;
}

function patchCalls(): [string, RequestInit][] {
  return apiFetch.mock.calls.filter(([, init]) => init?.method === 'PATCH') as [
    string,
    RequestInit,
  ][];
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue([]);
});

describe('UserEditModal', () => {
  it('shouldPrefillFieldsAndHaveNoPasswordItem', () => {
    renderEdit();
    expect(screen.getByRole('textbox', { name: '社員名' })).toHaveValue('山田 太郎');
    expect(screen.getByRole('textbox', { name: '社員ID' })).toHaveValue('10001');
    expect(screen.queryByLabelText(/パスワード/)).not.toBeInTheDocument();
  });

  it('shouldDisableSaveWhenNothingChanged', () => {
    renderEdit();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });

  it('shouldPatchOnlyChangedFields', async () => {
    const user = userEvent.setup();
    const onSaved = renderEdit();
    const name = screen.getByRole('textbox', { name: '社員名' });
    await user.clear(name);
    await user.type(name, '佐藤 花子');
    apiFetch.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    expect(JSON.parse(String(patchCalls()[0][1].body))).toEqual({ name: '佐藤 花子' });
    expect(await screen.findByText('保存しました。')).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
  });

  it('shouldRequireConfirmationStepWhenDeactivating', async () => {
    const user = userEvent.setup();
    renderEdit();
    await user.click(screen.getByRole('radio', { name: '無効' }));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByRole('button', { name: '無効にする' })).toBeInTheDocument();
    expect(patchCalls()).toHaveLength(0);
  });

  it('shouldShowLastAdminNoticeAndKeepEnteredValuesOnConflict', async () => {
    const user = userEvent.setup();
    apiFetch.mockImplementation(() =>
      Promise.reject(new ApiError(409, 'LAST_ADMIN', '最後の管理者は無効化・権限変更できません。')),
    );
    renderEdit({ ...USER, role: 'ADMIN' });
    await user.click(screen.getByRole('radio', { name: '一般' }));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(
      await screen.findByText('最後の管理者は無効化・権限変更できません。'),
    ).toBeInTheDocument();
  });

  it('shouldRejectNameWithControlCharactersWithoutPatch', async () => {
    const user = userEvent.setup();
    renderEdit();
    const name = screen.getByRole('textbox', { name: '社員名' });
    await user.clear(name);
    await user.type(name, '山田太郎');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(
      await screen.findByText('社員名に使用できない文字が含まれています。'),
    ).toBeInTheDocument();
    expect(patchCalls()).toHaveLength(0);
  });
});
