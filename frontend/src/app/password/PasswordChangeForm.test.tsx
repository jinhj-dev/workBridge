import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api/client';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { ToastProvider } from '@/components/Toast';
import { messages } from '@/messages/ja';
import { PasswordChangeForm } from './PasswordChangeForm';

const t = messages.password;

// 画面遷移は App Router の代わりに遷移関数だけを差し替えて確認する
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const CURRENT = 'Temp1234';
const NEXT = 'NewPass123';

const baseUser = {
  id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
  name: 'テスト太郎',
  empId: '00002',
  role: 'EMPLOYEE',
  departmentName: '開発チーム',
  approvalRequired: true,
  mustChangePassword: false,
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function apiError(status: number, code: string, message = 'サーバーのメッセージ'): Response {
  return json(status, { statusCode: status, code, message, details: [] });
}

type Handler = (init: RequestInit) => Response | Promise<Response>;

// 既定はログイン済み(refresh → me が成功)。パスごとの応答を差し替える
function mockApi(
  handlers: Record<string, Handler> = {},
  userOverrides: Partial<typeof baseUser> = {},
) {
  const defaults: Record<string, Handler> = {
    '/auth/refresh': () => json(200, { accessToken: 'restored' }),
    '/auth/me': () => json(200, { ...baseUser, ...userOverrides }),
  };
  const all = { ...defaults, ...handlers };
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const handler = all[url.replace('/api/v1', '')];
    if (handler) return handler(init);
    return apiError(401, 'UNAUTHORIZED');
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function callsTo(fetchMock: ReturnType<typeof mockApi>, path: string) {
  return fetchMock.mock.calls.filter(([url]) => url === `/api/v1${path}`);
}

function renderApp() {
  render(
    <AuthProvider>
      <ToastProvider>
        <PasswordChangeForm />
      </ToastProvider>
    </AuthProvider>,
  );
}

async function renderForm() {
  const ui = userEvent.setup();
  renderApp();
  // 認証の復元が終わるとフォームが表示される
  await screen.findByRole('button', { name: t.submit });
  return ui;
}

async function fillAndSubmit(
  ui: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
  confirm: string,
) {
  if (current) await ui.type(screen.getByLabelText(t.currentPassword), current);
  if (next) await ui.type(screen.getByLabelText(t.newPassword), next);
  if (confirm) await ui.type(screen.getByLabelText(t.confirmPassword), confirm);
  await ui.click(screen.getByRole('button', { name: t.submit }));
}

beforeEach(() => {
  setAccessToken(null);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PasswordChangeForm 入力検証', () => {
  it('shouldShowRequiredErrorsForAllFieldsWhenEmpty', async () => {
    const fetchMock = mockApi();
    const ui = await renderForm();

    await fillAndSubmit(ui, '', '', '');

    for (const label of [t.currentPassword, t.newPassword, t.confirmPassword]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(t.validation.required);
    }
    expect(screen.getAllByText(t.validation.required)).toHaveLength(3);
    expect(screen.getByLabelText(t.currentPassword)).toHaveFocus();
    expect(callsTo(fetchMock, '/auth/password')).toHaveLength(0);
  });

  it.each([
    ['abcdefgh', t.validation.policy],
    [`${'a'.repeat(72)}1`, t.validation.tooLong],
    [CURRENT, t.validation.sameAsCurrent],
  ])('shouldShowNewPasswordErrorWithoutCallingApi(%j)', async (next, expected) => {
    const fetchMock = mockApi();
    const ui = await renderForm();

    await fillAndSubmit(ui, CURRENT, next, next);

    expect(screen.getByLabelText(t.newPassword)).toHaveAccessibleDescription(expected);
    expect(screen.getByLabelText(t.newPassword)).toHaveFocus();
    expect(callsTo(fetchMock, '/auth/password')).toHaveLength(0);
  });

  it('shouldShowMismatchErrorWhenConfirmationDiffers', async () => {
    const fetchMock = mockApi();
    const ui = await renderForm();

    await fillAndSubmit(ui, CURRENT, NEXT, `${NEXT}x`);

    expect(screen.getByLabelText(t.confirmPassword)).toHaveAccessibleDescription(
      '新しいパスワードが一致しません。',
    );
    expect(callsTo(fetchMock, '/auth/password')).toHaveLength(0);
  });

  it('shouldUsePasswordInputsWithAutocomplete', async () => {
    mockApi();
    await renderForm();

    expect(screen.getByLabelText(t.currentPassword)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(t.currentPassword)).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
    expect(screen.getByLabelText(t.newPassword)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(t.confirmPassword)).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
  });
});

describe('PasswordChangeForm 表示の切り替え', () => {
  it('shouldShowNoticeAndLogoutWithoutCancelWhenMustChangePassword', async () => {
    mockApi({}, { mustChangePassword: true });
    await renderForm();

    expect(screen.getByText(t.notice)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.cancel })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.logout })).toBeInTheDocument();
  });

  it('shouldLogoutAndMoveToLoginWhenLogoutClicked', async () => {
    const fetchMock = mockApi(
      { '/auth/logout': () => new Response(null, { status: 204 }) },
      {
        mustChangePassword: true,
      },
    );
    const ui = await renderForm();

    await ui.click(screen.getByRole('button', { name: t.logout }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(callsTo(fetchMock, '/auth/logout')).toHaveLength(1);
  });

  it('shouldHideNoticeAndGoBackOnCancelWhenNotRequired', async () => {
    mockApi();
    const ui = await renderForm();

    expect(screen.queryByText(t.notice)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.logout })).not.toBeInTheDocument();
    await ui.click(screen.getByRole('button', { name: t.cancel }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shouldRedirectToLoginWithReturnPathWhenUnauthenticated', async () => {
    mockApi({ '/auth/refresh': () => apiError(401, 'UNAUTHORIZED') });
    renderApp();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login?redirect=%2Fpassword'));
    expect(screen.queryByRole('button', { name: t.submit })).not.toBeInTheDocument();
  });
});

describe('PasswordChangeForm 送信結果', () => {
  it('shouldSendPatchAndShowToastAndMoveToDashboardWhenSucceeded', async () => {
    const fetchMock = mockApi(
      { '/auth/password': () => new Response(null, { status: 204 }) },
      { mustChangePassword: true },
    );
    const ui = await renderForm();

    await fillAndSubmit(ui, CURRENT, NEXT, NEXT);

    expect(await screen.findByRole('status')).toHaveTextContent(t.success);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
    const calls = callsTo(fetchMock, '/auth/password');
    expect(calls).toHaveLength(1);
    const [, init] = calls[0];
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body))).toEqual({ currentPassword: CURRENT, newPassword: NEXT });
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer restored');
    // 変更が済んだので案内文は消える
    expect(screen.queryByText(t.notice)).not.toBeInTheDocument();
    expect(screen.getByLabelText(t.currentPassword)).toHaveValue('');
  });

  it('shouldShowErrorUnderCurrentFieldWhenCurrentPasswordIsWrong', async () => {
    mockApi({ '/auth/password': () => apiError(400, 'INVALID_CURRENT_PASSWORD') });
    const ui = await renderForm();

    await fillAndSubmit(ui, CURRENT, NEXT, NEXT);

    await waitFor(() =>
      expect(screen.getByLabelText(t.currentPassword)).toHaveAccessibleDescription(
        t.error.invalidCurrent,
      ),
    );
    expect(screen.getByLabelText(t.currentPassword)).toHaveFocus();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shouldShowServerMessageUnderNewFieldWhenPolicyViolation', async () => {
    const serverMessage = 'パスワードは72バイト以内で入力してください。';
    mockApi({
      '/auth/password': () => apiError(400, 'PASSWORD_POLICY_VIOLATION', serverMessage),
    });
    const ui = await renderForm();

    await fillAndSubmit(ui, CURRENT, NEXT, NEXT);

    await waitFor(() =>
      expect(screen.getByLabelText(t.newPassword)).toHaveAccessibleDescription(serverMessage),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shouldShowNetworkToastWhenFetchFails', async () => {
    mockApi({
      '/auth/password': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    const ui = await renderForm();

    await fillAndSubmit(ui, CURRENT, NEXT, NEXT);

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(messages.error.network),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([
    [500, 'INTERNAL_SERVER_ERROR', 'サーバーでエラーが発生しました。'],
    [400, 'VALIDATION_ERROR', '入力内容に誤りがあります。'],
  ])(
    'shouldShowServerMessageAsErrorToastWhenOtherApiError(%i %s)',
    async (statusCode, code, serverMessage) => {
      const fetchMock = mockApi({
        '/auth/password': () => apiError(statusCode, code, serverMessage),
      });
      const ui = await renderForm();

      await fillAndSubmit(ui, CURRENT, NEXT, NEXT);

      const toast = await screen.findByText(serverMessage);
      expect(screen.getByRole('status')).toContainElement(toast);
      expect(toast).toHaveClass('bg-danger-30');
      // 項目エラーにはせず、入力値も残す
      for (const label of [t.currentPassword, t.newPassword, t.confirmPassword]) {
        expect(screen.getByLabelText(label)).not.toHaveAttribute('aria-invalid');
      }
      expect(screen.getByLabelText(t.currentPassword)).toHaveValue(CURRENT);
      expect(router.replace).not.toHaveBeenCalled();
      expect(callsTo(fetchMock, '/auth/password')).toHaveLength(1);
      expect(screen.getByRole('button', { name: t.submit })).toBeEnabled();
    },
  );

  it('shouldDisableButtonAndSendOnlyOnceWhileSubmitting', async () => {
    let resolvePatch: (res: Response) => void = () => {};
    const fetchMock = mockApi({
      '/auth/password': () =>
        new Promise<Response>((resolve) => {
          resolvePatch = resolve;
        }),
    });
    const ui = await renderForm();
    await ui.type(screen.getByLabelText(t.currentPassword), CURRENT);
    await ui.type(screen.getByLabelText(t.newPassword), NEXT);
    await ui.type(screen.getByLabelText(t.confirmPassword), `${NEXT}{Enter}{Enter}`);

    const button = screen.getByRole('button', { name: t.submit });
    expect(button).toBeDisabled();
    await ui.click(button);
    expect(callsTo(fetchMock, '/auth/password')).toHaveLength(1);

    resolvePatch(new Response(null, { status: 204 }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
    expect(button).toBeEnabled();
  });

  it('shouldShowSpinnerAndKeepLabelWhileSubmitting', async () => {
    let resolvePatch: (res: Response) => void = () => {};
    mockApi({
      '/auth/password': () =>
        new Promise<Response>((resolve) => {
          resolvePatch = resolve;
        }),
    });
    const ui = await renderForm();
    await ui.type(screen.getByLabelText(t.currentPassword), CURRENT);
    await ui.type(screen.getByLabelText(t.newPassword), NEXT);
    await ui.type(screen.getByLabelText(t.confirmPassword), `${NEXT}{Enter}`);

    const button = screen.getByRole('button', { name: t.submit });
    expect(button).toBeDisabled();
    expect(button.querySelector('svg.animate-spin')).not.toBeNull();
    expect(button).toHaveTextContent(t.submit);

    resolvePatch(new Response(null, { status: 204 }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
  });
});
