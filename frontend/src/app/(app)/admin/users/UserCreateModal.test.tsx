import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import { UserCreateModal } from './UserCreateModal';

// 社員追加モーダル(design-frontend §4)。文言は設計書の「테스트 근거 문구」をそのまま使う
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

const JOB_TITLES = [{ id: 'jt-1', name: 'マネージャー', tone: 'VIOLET' }];
const DEPARTMENTS = [{ id: 'd-1', name: '開発部' }];

function routeApi(
  post: (init: RequestInit) => Promise<unknown> = () =>
    Promise.resolve({ id: 'u-new', empId: '10101' }),
  nextEmpId: () => Promise<unknown> = () => Promise.resolve({ empId: '10101' }),
) {
  apiFetch.mockImplementation((path: string, init?: RequestInit) => {
    if (init?.method === 'POST') return post(init);
    if (path.startsWith('/admin/users/next-emp-id')) return nextEmpId();
    if (path.startsWith('/admin/job-titles')) return Promise.resolve(JOB_TITLES);
    if (path.startsWith('/departments')) return Promise.resolve(DEPARTMENTS);
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

function postCalls(): RequestInit[] {
  return apiFetch.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => init);
}

function renderModal(props: { onClose?: () => void; onCreated?: () => void; key?: string } = {}) {
  const onClose = props.onClose ?? vi.fn();
  const onCreated = props.onCreated ?? vi.fn();
  const view = render(
    <ToastProvider>
      <UserCreateModal key={props.key ?? 'a'} open onClose={onClose} onCreated={onCreated} />
    </ToastProvider>,
  );
  return { onClose, onCreated, view };
}

// 必須項目を正しく埋める(初期パスワードは既定の有効値)
async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: '社員名' }), '山田 太郎');
  await user.selectOptions(screen.getByRole('combobox', { name: '役職' }), 'jt-1');
  await user.type(screen.getByRole('textbox', { name: 'メールアドレス' }), 'yamada@example.com');
  await user.selectOptions(screen.getByRole('combobox', { name: '所属部署' }), 'd-1');
  await user.type(screen.getByLabelText(/^入社日/), '2026-12-01');
  await user.type(screen.getByLabelText(/^初期パスワード/), 'Temp1234');
}

beforeEach(() => {
  apiFetch.mockReset();
  routeApi();
});

describe('UserCreateModal', () => {
  it('shouldDefaultToAutoGenerationAndShowPredictedNumberReadOnly', async () => {
    renderModal();
    expect(await screen.findByText('10101')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '自動生成' })).toBeChecked();
    expect(screen.queryByRole('textbox', { name: '社員ID' })).not.toBeInTheDocument();
  });

  it('shouldShowCannotGenerateMessageWhenEmpIdIsNull', async () => {
    routeApi(undefined, () => Promise.resolve({ empId: null }));
    renderModal();
    expect(
      await screen.findByText('自動生成できません。直接入力してください。'),
    ).toBeInTheDocument();
  });

  it('shouldShowManualInputWhenDirectEntryChosen', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('radio', { name: '直接入力' }));
    expect(screen.getByRole('textbox', { name: '社員ID' })).toBeInTheDocument();
  });

  it('shouldShowRequiredMessagesForAllSevenFieldsOnEmptySubmit', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: '追加する' }));
    for (const message of [
      '社員名を入力してください。',
      '役職を選択してください。',
      'メールアドレスを入力してください。',
      '部署を選択してください。',
      '入社日を選択してください。',
      '初期パスワードを入力してください。',
    ]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    expect(postCalls()).toHaveLength(0);
  });

  it('shouldShowPolicyMessageForWeakInitialPassword', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText(/^初期パスワード/), 'abcdefgh');
    await user.click(screen.getByRole('button', { name: '追加する' }));
    expect(
      screen.getByText('パスワードは8文字以上で、英字と数字を含めてください。'),
    ).toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);
  });

  it('shouldMaskInitialPasswordInput', () => {
    renderModal();
    expect(screen.getByLabelText(/^初期パスワード/)).toHaveAttribute('type', 'password');
  });

  it('shouldRejectMalformedEmail', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByRole('textbox', { name: 'メールアドレス' }), 'not-an-email');
    await user.click(screen.getByRole('button', { name: '追加する' }));
    expect(screen.getByText('メールアドレスの形式が正しくありません。')).toBeInTheDocument();
  });

  it('shouldShowSelectedJobTitleBadge', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(await screen.findByRole('combobox', { name: '役職' }), 'jt-1');
    // 候補の option にも同じ文言があるため、バッジ(option 以外)を確認する
    const badge = screen.getAllByText('マネージャー').find((el) => el.tagName !== 'OPTION');
    expect(badge).toBeInTheDocument();
  });

  it('shouldPostInitialPasswordAndFixedRoleAndSendOnce', async () => {
    const user = userEvent.setup();
    const { onCreated } = renderModal();
    await screen.findByText('10101');
    await fillValid(user);

    const submit = screen.getByRole('button', { name: '追加する' });
    await user.dblClick(submit);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));

    expect(postCalls()).toHaveLength(1);
    const body = JSON.parse(String(postCalls()[0].body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      empIdMode: 'AUTO',
      initialPassword: 'Temp1234',
      role: 'EMPLOYEE',
      approvalRequired: true,
    });
  });

  it('shouldCloseAndShowToastWithConfirmedEmpIdOnSuccess', async () => {
    routeApi(() => Promise.resolve({ id: 'u-new', empId: '10102' }));
    const user = userEvent.setup();
    const { onClose, onCreated } = renderModal();
    await screen.findByText('10101');
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: '追加する' }));

    expect(
      await screen.findByText(
        '社員（社員ID: 10102）を登録しました。初回ログイン時にパスワードの変更が必要です。',
      ),
    ).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shouldShowDuplicateEmpIdErrorUnderEmpIdField', async () => {
    routeApi(() =>
      Promise.reject(new ApiError(409, 'DUPLICATE_EMP_ID', 'この社員IDは既に使用されています。')),
    );
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('radio', { name: '直接入力' }));
    await user.type(screen.getByRole('textbox', { name: '社員ID' }), '10001');
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: '追加する' }));
    expect(await screen.findByText('この社員IDは既に使用されています。')).toBeInTheDocument();
  });

  it('shouldShowExhaustedMessageWhenAutoNumberingFails', async () => {
    routeApi(() =>
      Promise.reject(
        new ApiError(
          409,
          'EMP_ID_EXHAUSTED',
          '社員IDを自動で採番できません。直接入力してください。',
        ),
      ),
    );
    const user = userEvent.setup();
    renderModal();
    await screen.findByText('10101');
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: '追加する' }));
    expect(
      await screen.findByText('社員IDを自動で採番できません。直接入力してください。'),
    ).toBeInTheDocument();
  });

  it('shouldMapServerDetailsToFieldErrorsIncludingInitialPassword', async () => {
    routeApi(() =>
      Promise.reject(
        new ApiError(400, 'VALIDATION_ERROR', '入力内容に誤りがあります。', [
          {
            field: 'initialPassword',
            message: 'パスワードは8文字以上で、英字と数字を含めてください。',
          },
        ]),
      ),
    );
    const user = userEvent.setup();
    renderModal();
    await screen.findByText('10101');
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: '追加する' }));
    expect(
      await screen.findByText('パスワードは8文字以上で、英字と数字を含めてください。'),
    ).toBeInTheDocument();
  });

  it('shouldShowNoticeErrorOnServerFailure', async () => {
    routeApi(() => Promise.reject(new ApiError(500, 'INTERNAL_ERROR', 'サーバーエラーです。')));
    const user = userEvent.setup();
    renderModal();
    await screen.findByText('10101');
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: '追加する' }));
    expect(await screen.findByText('サーバーエラーです。')).toBeInTheDocument();
  });

  it('shouldResetAllInputsIncludingPasswordWhenReopenedWithNewKey', async () => {
    const user = userEvent.setup();
    const { view } = renderModal({ key: 'a' });
    await screen.findByText('10101');
    await user.type(screen.getByRole('textbox', { name: '社員名' }), '入力中');
    await user.type(screen.getByLabelText(/^初期パスワード/), 'Temp1234');

    view.rerender(
      <ToastProvider>
        <UserCreateModal key="b" open onClose={vi.fn()} onCreated={vi.fn()} />
      </ToastProvider>,
    );
    expect(screen.getByRole('textbox', { name: '社員名' })).toHaveValue('');
    expect(screen.getByLabelText(/^初期パスワード/)).toHaveValue('');
  });
});
