import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { DepartmentDetail, UserSummary } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { DepartmentFormModal } from './DepartmentFormModal';

const t = messages.departments;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

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
  description: null,
  manager: null,
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

const CANDIDATES: UserSummary[] = [
  { id: 'u-1', empId: '00001', name: '山田 太郎', departmentName: '開発部' },
  { id: 'u-2', empId: '00002', name: '佐藤 花子', departmentName: null },
];

// 責任者候補(API-DEPT-009)は GET、保存は POST/PATCH で振り分ける
function mockApi(save: (init: RequestInit) => Promise<unknown>) {
  apiFetch.mockImplementation((path: string, init?: RequestInit) =>
    init?.method ? save(init) : Promise.resolve(CANDIDATES),
  );
}

function saveCalls(): [string, RequestInit][] {
  return apiFetch.mock.calls.filter(([, init]) => init?.method) as [string, RequestInit][];
}

function candidateCalls(): string[] {
  return apiFetch.mock.calls.filter(([, init]) => !init?.method).map(([path]) => path);
}

beforeEach(() => {
  apiFetch.mockReset();
  mockApi(() => Promise.resolve(TARGET));
});

describe('DepartmentFormModal(SCR-010 登録・編集)', () => {
  it('shouldFocusCodeFieldAndShowDescriptionCounterWhenOpened', () => {
    renderModal();
    expect(screen.getByLabelText(t.code)).toHaveFocus();
    expect(screen.getByText(messages.common.charCount(0, 500))).toBeInTheDocument();
  });

  it('shouldShowRequiredErrorsAndNotCallApiWhenEmpty', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(screen.getByText(t.form.validation.codeRequired)).toBeInTheDocument();
    expect(screen.getByText(t.form.validation.nameRequired)).toBeInTheDocument();
    expect(screen.getByLabelText(t.code)).toHaveAttribute('aria-invalid', 'true');
    expect(saveCalls()).toHaveLength(0);
  });

  it('shouldShowFormatErrorWhenCodeHasInvalidCharacters', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV_1');
    await userEvent.type(screen.getByLabelText(t.name), '開発部');
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(screen.getByText(t.form.validation.codeFormat)).toBeInTheDocument();
    expect(saveCalls()).toHaveLength(0);
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
    mockApi(() => Promise.resolve(TARGET));
    const { onClose, onDone } = renderModal();
    await userEvent.type(screen.getByLabelText(t.code), ' DEV ');
    await userEvent.type(screen.getByLabelText(t.name), ' 開発部 ');
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/admin/departments', {
        method: 'POST',
        body: JSON.stringify({ code: 'DEV', name: '開発部', description: null, managerId: null }),
      }),
    );
    expect(await screen.findByText(t.form.created)).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('shouldPatchWithExistingValuesWhenEditing', async () => {
    mockApi(() => Promise.resolve(TARGET));
    renderModal(TARGET);
    expect(screen.getByLabelText(t.code)).toHaveValue('DEV');
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/admin/departments/d-1', {
        method: 'PATCH',
        body: JSON.stringify({ code: 'DEV', name: '開発部', description: null }),
      }),
    );
    expect(await screen.findByText(t.form.updated)).toBeInTheDocument();
  });

  it('shouldShowServerMessageUnderCodeFieldWhenDuplicateCode', async () => {
    mockApi(() => Promise.reject(new ApiError(409, 'DUPLICATE_DEPARTMENT_CODE', 'コード重複', [])));
    const { onClose } = renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV');
    await userEvent.type(screen.getByLabelText(t.name), '開発部');
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(await screen.findByText('コード重複')).toBeInTheDocument();
    expect(screen.getByLabelText(t.code)).toHaveAttribute('aria-invalid', 'true');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shouldShowServerMessageUnderNameFieldWhenDuplicateName', async () => {
    mockApi(() => Promise.reject(new ApiError(409, 'DUPLICATE_DEPARTMENT_NAME', '名前重複', [])));
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
    mockApi(
      () =>
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
    expect(saveCalls()).toHaveLength(1);
    resolveRequest(TARGET);
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('shouldCloseAndRefetchWhenDepartmentNotFound', async () => {
    mockApi(() => Promise.reject(new ApiError(404, 'NOT_FOUND', '部署が見つかりません。', [])));
    const { onClose, onDone } = renderModal(TARGET);
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    expect(await screen.findByText('部署が見つかりません。')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('shouldCloseAndRefetchWhenPermissionIsRevoked', async () => {
    mockApi(() => Promise.reject(new ApiError(403, 'FORBIDDEN', '権限がありません。', [])));
    const { onClose, onDone } = renderModal(TARGET);
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    expect(await screen.findByText('権限がありません。')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('shouldCloseAndRefetchWhenDepartmentIsProtectedWhileEditing', async () => {
    mockApi(() =>
      Promise.reject(
        new ApiError(409, 'PROTECTED_DEPARTMENT', '未所属部署は変更・削除できません。', []),
      ),
    );
    const { onClose, onDone } = renderModal(TARGET);
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    expect(await screen.findByText('未所属部署は変更・削除できません。')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });
  it('shouldShowDescriptionLengthErrorWhenOver500Characters', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV');
    await userEvent.type(screen.getByLabelText(t.name), '開発部');
    await userEvent.click(screen.getByLabelText(t.form.description));
    await userEvent.paste('あ'.repeat(501));
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(screen.getByText(t.form.validation.descriptionLength)).toBeInTheDocument();
    expect(saveCalls()).toHaveLength(0);
  });

  it('shouldPostTrimmedDescriptionAndSelectedManager', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV');
    await userEvent.type(screen.getByLabelText(t.name), '開発部');
    await userEvent.type(screen.getByLabelText(t.form.description), ' 開発を担当 ');
    await userEvent.click(screen.getByLabelText(t.form.manager));
    await userEvent.click(await screen.findByRole('option', { name: /佐藤 花子/ }));
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    await waitFor(() => expect(saveCalls()).toHaveLength(1));
    expect(JSON.parse(String(saveCalls()[0][1].body))).toEqual({
      code: 'DEV',
      name: '開発部',
      description: '開発を担当',
      managerId: 'u-2',
    });
  });

  it('shouldSearchManagerCandidatesOnServerWithKeywordAfterDebounce', async () => {
    renderModal();
    const input = await screen.findByLabelText(t.form.manager);
    await waitFor(() =>
      expect(candidateCalls()).toContain('/admin/departments/manager-candidates'),
    );
    await userEvent.type(input, '佐藤');
    await waitFor(() =>
      expect(candidateCalls()).toContain(
        '/admin/departments/manager-candidates?keyword=%E4%BD%90%E8%97%A4',
      ),
    );
  });

  it('shouldShowCurrentManagerAsSelectedEvenWhenNotInCandidates', async () => {
    renderModal({ ...TARGET, manager: { id: 'u-999', empId: '00999', name: '鈴木 健太' } });
    expect(await screen.findByLabelText(t.form.manager)).toHaveValue('鈴木 健太 (00999)');
  });

  it('shouldOmitManagerIdWhenManagerIsUnchanged', async () => {
    renderModal({ ...TARGET, manager: { id: 'u-999', empId: '00999', name: '鈴木 健太' } });
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(saveCalls()).toHaveLength(1));
    expect(JSON.parse(String(saveCalls()[0][1].body))).not.toHaveProperty('managerId');
  });

  it('shouldSendNullManagerIdWhenManagerInputIsCleared', async () => {
    renderModal({ ...TARGET, manager: { id: 'u-999', empId: '00999', name: '鈴木 健太' } });
    await userEvent.clear(await screen.findByLabelText(t.form.manager));
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(saveCalls()).toHaveLength(1));
    expect(JSON.parse(String(saveCalls()[0][1].body)).managerId).toBeNull();
  });

  it('shouldShowServerMessageUnderManagerFieldWhenInvalidManager', async () => {
    mockApi(() =>
      Promise.reject(
        new ApiError(400, 'INVALID_MANAGER', '部署責任者には有効な社員を指定してください。', []),
      ),
    );
    const { onClose } = renderModal();
    await userEvent.type(screen.getByLabelText(t.code), 'DEV');
    await userEvent.type(screen.getByLabelText(t.name), '開発部');
    await userEvent.click(screen.getByRole('button', { name: t.form.create }));
    expect(
      await screen.findByText('部署責任者には有効な社員を指定してください。'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(t.form.manager)).toHaveAttribute('aria-invalid', 'true');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shouldShowSkeletonWhileManagerCandidatesAreLoading', () => {
    apiFetch.mockImplementation((path: string, init?: RequestInit) =>
      init?.method ? Promise.resolve(TARGET) : new Promise(() => {}),
    );
    renderModal();
    expect(screen.queryByLabelText(t.form.manager)).not.toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shouldShowLoadErrorWithRetryAndKeepSavingDescriptionWhenCandidatesFail', async () => {
    let failCandidates = true;
    apiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (init?.method) return Promise.resolve(TARGET);
      return failCandidates
        ? Promise.reject(new ApiError(500, 'INTERNAL_ERROR', 'error', []))
        : Promise.resolve(CANDIDATES);
    });
    renderModal(TARGET);
    expect(await screen.findByText(t.form.managerSelect.loadError)).toBeInTheDocument();
    // 候補が取れなくても、責任者を変えていなければ説明の保存は送れる(managerId は送らない)
    await userEvent.type(screen.getByLabelText(t.form.description), '説明');
    await userEvent.click(screen.getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(saveCalls()).toHaveLength(1));
    expect(JSON.parse(String(saveCalls()[0][1].body))).toEqual({
      code: 'DEV',
      name: '開発部',
      description: '説明',
    });
    // 再試行で候補が表示される
    failCandidates = false;
    await userEvent.click(screen.getByRole('button', { name: messages.common.retry }));
    expect(await screen.findByLabelText(t.form.manager)).toBeInTheDocument();
  });

  it('shouldKeepInputAndShowNoMatchWhenSearchReturnsNoCandidates', async () => {
    apiFetch.mockImplementation((path: string, init?: RequestInit) =>
      init?.method ? Promise.resolve(TARGET) : Promise.resolve([]),
    );
    renderModal();
    const input = await screen.findByLabelText(t.form.manager);
    await userEvent.type(input, '存在しない');
    await waitFor(() =>
      expect(candidateCalls()).toContain(
        `/admin/departments/manager-candidates?keyword=${encodeURIComponent('存在しない')}`,
      ),
    );
    // 0 件でも入力欄は消えず、該当なしを伝える
    expect(screen.getByLabelText(t.form.manager)).toBe(input);
    expect(await screen.findByText(t.form.managerSelect.noMatch)).toBeInTheDocument();
  });

  it('shouldDescribeManagerInputWithLimitHintOnlyWhenCandidatesReachLimit', async () => {
    const hundred: UserSummary[] = Array.from({ length: 100 }, (_, i) => ({
      id: `u-${i}`,
      empId: String(i).padStart(5, '0'),
      name: `社員${i}`,
      departmentName: null,
    }));
    apiFetch.mockImplementation((path: string, init?: RequestInit) =>
      init?.method ? Promise.resolve(TARGET) : Promise.resolve(hundred),
    );
    renderModal();
    const manager = await screen.findByRole('combobox', { name: t.form.manager });
    await waitFor(() => expect(manager).toHaveAccessibleDescription(t.form.managerLimitHint));
  });

  it('shouldNotDescribeManagerInputWithLimitHintWhenCandidatesBelowLimit', async () => {
    apiFetch.mockImplementation((path: string, init?: RequestInit) =>
      init?.method ? Promise.resolve(TARGET) : Promise.resolve(CANDIDATES),
    );
    renderModal();
    const manager = await screen.findByRole('combobox', { name: t.form.manager });
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(manager).not.toHaveAccessibleDescription(t.form.managerLimitHint);
  });

  it('shouldShowLimitHintWhenCandidatesReachLimit', async () => {
    const hundred: UserSummary[] = Array.from({ length: 100 }, (_, i) => ({
      id: `u-${i}`,
      empId: String(i).padStart(5, '0'),
      name: `社員${i}`,
      departmentName: null,
    }));
    apiFetch.mockImplementation((path: string, init?: RequestInit) =>
      init?.method ? Promise.resolve(TARGET) : Promise.resolve(hundred),
    );
    renderModal();
    expect(await screen.findByText(t.form.managerLimitHint)).toBeInTheDocument();
  });
});
