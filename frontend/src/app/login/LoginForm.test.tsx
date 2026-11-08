import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api/client';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { LoginForm } from './LoginForm';

const t = messages.login;

// LoginForm は useRouter を使うため、App Router の代わりに遷移関数だけを差し替える
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const user = {
  id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
  name: '管理者',
  empId: '00001',
  role: 'ADMIN',
  departmentName: null,
  approvalRequired: false,
  mustChangePassword: false,
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function apiError(status: number, code: string): Response {
  return json(status, { statusCode: status, code, message: 'サーバーのメッセージ', details: [] });
}

type Handler = (init: RequestInit) => Response | Promise<Response>;

// 未ログイン状態(refresh が 401)を既定にして、パスごとの応答を差し替える
function mockApi(handlers: Record<string, Handler> = {}) {
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const handler = handlers[url.replace('/api/v1', '')];
    if (handler) return handler(init);
    return apiError(401, 'UNAUTHORIZED');
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function callsTo(fetchMock: ReturnType<typeof mockApi>, path: string) {
  return fetchMock.mock.calls.filter(([url]) => url === `/api/v1${path}`);
}

function renderApp(wrapper?: (children: ReactElement) => ReactElement) {
  const ui = (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
  render(wrapper ? wrapper(ui) : ui);
}

async function renderForm() {
  const ui = userEvent.setup();
  renderApp();
  // 初回の認証復元が終わるとボタンが有効になる
  await waitFor(() => expect(screen.getByRole('button', { name: t.submit })).toBeEnabled());
  return ui;
}

async function fillAndSubmit(ui: ReturnType<typeof userEvent.setup>, empId: string, pw: string) {
  if (empId) await ui.type(screen.getByLabelText(t.empId), empId);
  if (pw) await ui.type(screen.getByLabelText(t.password), pw);
  await ui.click(screen.getByRole('button', { name: t.submit }));
}

beforeEach(() => {
  setAccessToken(null);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginForm 入力検証', () => {
  it('shouldShowRequiredErrorsWhenFieldsAreEmpty', async () => {
    const fetchMock = mockApi();
    const ui = await renderForm();

    await fillAndSubmit(ui, '', '');

    expect(screen.getByText(t.validation.empIdRequired)).toBeInTheDocument();
    expect(screen.getByText(t.validation.passwordRequired)).toBeInTheDocument();
    expect(screen.getByLabelText(t.empId)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(t.empId)).toHaveAccessibleDescription(t.validation.empIdRequired);
    expect(screen.getByLabelText(t.empId)).toHaveFocus();
    expect(callsTo(fetchMock, '/auth/login')).toHaveLength(0);
  });

  it('shouldRejectNonDigitEmpIdWithoutCallingApi', async () => {
    const fetchMock = mockApi();
    const ui = await renderForm();

    await fillAndSubmit(ui, '12a45', 'pw');

    expect(screen.getByText(t.validation.empIdDigitsOnly)).toBeInTheDocument();
    expect(callsTo(fetchMock, '/auth/login')).toHaveLength(0);
  });

  it('shouldTrimSurroundingSpacesOfEmpId', async () => {
    const fetchMock = mockApi({
      '/auth/login': () => json(200, { accessToken: 't', user }),
    });
    const ui = await renderForm();

    await fillAndSubmit(ui, '  00001  ', 'pw');

    await screen.findByRole('dialog');
    const [, init] = callsTo(fetchMock, '/auth/login')[0];
    expect(JSON.parse(String(init?.body))).toEqual({ empId: '00001', password: 'pw' });
  });

  it('shouldUseAccessibleFormControls', async () => {
    mockApi();
    await renderForm();

    expect(screen.getByLabelText(t.password)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(t.password)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText(t.empId)).toHaveAttribute('autocomplete', 'username');
  });
});

describe('LoginForm 失敗時の表示', () => {
  it.each([
    [401, 'INVALID_CREDENTIALS', t.error.invalidCredentials],
    [403, 'ACCOUNT_DISABLED', t.error.accountDisabled],
    [400, 'VALIDATION_ERROR', 'サーバーのメッセージ'],
    [500, 'INTERNAL_ERROR', t.error.server],
  ])('shouldShowMessageWhenApiReturns%i%s', async (status, code, expected) => {
    mockApi({ '/auth/login': () => apiError(status, code) });
    const ui = await renderForm();

    await fillAndSubmit(ui, '00001', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
    // 失敗したらパスワードを空にして、パスワード欄へフォーカスを戻す
    expect(screen.getByLabelText(t.password)).toHaveValue('');
    expect(screen.getByLabelText(t.password)).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shouldShowNetworkMessageWhenFetchFails', async () => {
    mockApi({
      '/auth/login': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    const ui = await renderForm();

    await fillAndSubmit(ui, '00001', 'pw');

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error.network);
  });
});

describe('LoginForm 送信中の制御', () => {
  it('shouldDisableButtonAndPreventDuplicateSubmitWhileLoggingIn', async () => {
    let resolveLogin: (res: Response) => void = () => {};
    const fetchMock = mockApi({
      '/auth/login': () =>
        new Promise<Response>((resolve) => {
          resolveLogin = resolve;
        }),
    });
    const ui = await renderForm();
    await ui.type(screen.getByLabelText(t.empId), '00001');
    await ui.type(screen.getByLabelText(t.password), 'pw{Enter}{Enter}');

    const button = screen.getByRole('button', { name: t.submit });
    expect(button).toBeDisabled();
    await ui.click(button);
    expect(callsTo(fetchMock, '/auth/login')).toHaveLength(1);

    resolveLogin(json(200, { accessToken: 't', user }));
    await screen.findByRole('dialog');
    expect(button).toBeEnabled();
  });
});

describe('LoginForm 成功時と認証の復元', () => {
  it('shouldShowLoginSuccessDialogWithUserName', async () => {
    mockApi({ '/auth/login': () => json(200, { accessToken: 't', user }) });
    const ui = await renderForm();

    await fillAndSubmit(ui, '00001', 'pw');

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(t.temporaryDialog.loggedInTitle);
    expect(dialog).toHaveTextContent(t.temporaryDialog.welcome('管理者'));
    expect(router.replace).not.toHaveBeenCalled();

    // フッターの「閉じる」ボタン(X ボタンと同名なので最後の要素)
    const closeButtons = screen.getAllByRole('button', { name: messages.common.close });
    await ui.click(closeButtons[closeButtons.length - 1]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shouldRedirectToPasswordWithoutDialogWhenMustChangePassword', async () => {
    mockApi({
      '/auth/login': () =>
        json(200, { accessToken: 't', user: { ...user, mustChangePassword: true } }),
    });
    const ui = await renderForm();

    await fillAndSubmit(ui, '00001', 'pw');

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/password'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shouldRedirectToPasswordWhenRestoredUserMustChangePassword', async () => {
    mockApi({
      '/auth/refresh': () => json(200, { accessToken: 'restored' }),
      '/auth/me': () => json(200, { ...user, mustChangePassword: true }),
    });
    renderApp();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/password'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shouldRestoreSessionWithRefreshThenMeOnFirstLoad', async () => {
    const fetchMock = mockApi({
      '/auth/refresh': () => json(200, { accessToken: 'restored' }),
      '/auth/me': (init) =>
        new Headers(init.headers).get('Authorization') === 'Bearer restored'
          ? json(200, user)
          : apiError(401, 'UNAUTHORIZED'),
    });
    renderApp();

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(t.temporaryDialog.alreadyLoggedInTitle);
    expect(callsTo(fetchMock, '/auth/refresh')).toHaveLength(1);
    expect(callsTo(fetchMock, '/auth/me')).toHaveLength(1);
  });

  it('shouldCallRefreshOnlyOnceUnderStrictMode', async () => {
    const fetchMock = mockApi();
    renderApp((children) => <StrictMode>{children}</StrictMode>);
    await waitFor(() => expect(screen.getByRole('button', { name: t.submit })).toBeEnabled());

    expect(callsTo(fetchMock, '/auth/refresh')).toHaveLength(1);
  });
});
