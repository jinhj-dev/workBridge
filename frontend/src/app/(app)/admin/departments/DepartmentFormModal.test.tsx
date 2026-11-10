import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { DepartmentDetail } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { DepartmentFormModal } from './DepartmentFormModal';

const t = messages.departments;

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  apiFetch,
}));

const TARGET: DepartmentDetail = {
  id: 'd-1',
  code: 'DEV',
  name: '開発部',
  memberCount: 0,
  inactiveMemberCount: 0,
  isSystem: false,
  createdAt: '2026-11-01T09:00:00+09:00',
  updatedAt: '2026-11-08T09:00:00+09:00',
};

function renderModal(department: DepartmentDetail | null = null) {
  const onClose = vi.fn();
  const onDone = vi.fn();
  render(
    <ToastProvider>
      <DepartmentFormModal open department={department} onClose={onClose} onDone={onDone} />
    </ToastProvider>,
  );
  return { onClose, onDone };
}

beforeEach(() => {
  apiFetch.mockReset();
});

describe('DepartmentFormModal(SCR-010 登録・編集)', () => {
  it('shouldShowRequiredErrorsAndNotCallApiWhenEmpty', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(screen.getByText(t.form.validation.codeRequired)).toBeInTheDocument();
    expect(screen.getByText(t.form.validation.nameRequired)).toBeInTheDocument();
    expect(screen.getByLabelText(t.code)).toHaveAttribute('aria-invalid', 'true');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('shouldShowFormatErrorWhenCodeHasInvalidCharacters', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV_1');
    await userEvent.type(screen.getByLabelText(t.name), '開発部');
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(screen.getByText(t.form.validation.codeFormat)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('shouldShowLengthErrorWhenNameExceeds100Characters', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV');
    await userEvent.click(screen.getByLabelText(t.name));
    await userEvent.paste('あ'.repeat(101));
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(screen.getByText(t.form.validation.nameLength)).toBeInTheDocument();
  });

  it('shouldPostTrimmedValuesAndCloseWhenCreated', async () => {
    apiFetch.mockResolvedValue(TARGET);
    const { onClose, onDone } = renderModal();
    await userEvent.type(screen.getByLabelText(t.code), ' DEV ');
    await userEvent.type(screen.getByLabelText(t.name), ' 開発部 ');
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/admin/departments', {
        method: 'POST',
        body: JSON.stringify({ code: 'DEV', name: '開発部' }),
      }),
    );
    expect(await screen.findByText(t.form.created)).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('shouldPatchWithExistingValuesWhenEditing', async () => {
    apiFetch.mockResolvedValue(TARGET);
    renderModal(TARGET);
    expect(screen.getByLabelText(t.code)).toHaveValue('DEV');
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/admin/departments/d-1', {
        method: 'PATCH',
        body: JSON.stringify({ code: 'DEV', name: '開発部' }),
      }),
    );
    expect(await screen.findByText(t.form.updated)).toBeInTheDocument();
  });

  it('shouldShowServerMessageUnderCodeFieldWhenDuplicateCode', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, 'DUPLICATE_DEPARTMENT_CODE', 'コード重複', []));
    const { onClose } = renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV');
    await userEvent.type(screen.getByLabelText(t.name), '開発部');
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(await screen.findByText('コード重複')).toBeInTheDocument();
    expect(screen.getByLabelText(t.code)).toHaveAttribute('aria-invalid', 'true');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shouldShowServerMessageUnderNameFieldWhenDuplicateName', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, 'DUPLICATE_DEPARTMENT_NAME', '名前重複', []));
    const { onClose } = renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV');
    await userEvent.type(screen.getByLabelText(t.name), '開発部');
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(await screen.findByText('名前重複')).toBeInTheDocument();
    expect(screen.getByLabelText(t.name)).toHaveAttribute('aria-invalid', 'true');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shouldDisableSubmitWhileRequestIsInFlight', async () => {
    let resolveRequest: (value: DepartmentDetail) => void = () => {};
    apiFetch.mockReturnValue(
      new Promise<DepartmentDetail>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { onDone } = renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV');
    await userEvent.type(screen.getByLabelText(t.name), '開発部');
    const submit = screen.getByRole('button', { name: t.form.create });
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    await userEvent.click(submit);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    resolveRequest(TARGET);
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('shouldCloseAndRefetchWhenDepartmentNotFound', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, 'NOT_FOUND', '部署が見つかりません。', []));
    const { onClose, onDone } = renderModal(TARGET);
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    expect(await screen.findByText('部署が見つかりません。')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('shouldCloseAndRefetchWhenPermissionIsRevoked', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, 'FORBIDDEN', '権限がありません。', []));
    const { onClose, onDone } = renderModal(TARGET);
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    expect(await screen.findByText('権限がありません。')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('shouldCloseAndRefetchWhenDepartmentIsProtectedWhileEditing', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(409, 'PROTECTED_DEPARTMENT', '未所属部署は変更・削除できません。', []),
    );
    const { onClose, onDone } = renderModal(TARGET);
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    expect(await screen.findByText('未所属部署は変更・削除できません。')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });
});
