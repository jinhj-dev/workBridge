import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { ApiError } from '@/lib/api/client';
import type { AuthUser } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { AppShell } from './AppShell';

const nav = messages.nav;

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
const location = vi.hoisted(() => ({ pathname: '/dashboard' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => location.pathname,
}));

type Status = 'loading' | 'authenticated' | 'unauthenticated';
const auth = vi.hoisted(() => ({
  status: 'loading' as Status,
  user: null as AuthUser | null,
  logout: vi.fn(),
}));
vi.mock('@/lib/auth/AuthProvider', () => ({
  useAuth: () => ({ status: auth.status, user: auth.user, login: vi.fn(), logout: auth.logout }),
}));

const EMPLOYEE: AuthUser = {
  id: 'u-1',
  name: '山田太郎',
  empId: '10001',
  role: 'EMPLOYEE',
  departmentName: '開発部',
  approvalRequired: true,
  mustChangePassword: false,
};
const ADMIN: AuthUser = { ...EMPLOYEE, role: 'ADMIN', name: '管理者' };

// AppShell は useToast を使うため、ToastProvider の内側で描画する
function renderWithToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

function renderShell(status: Status, user: AuthUser | null) {
  auth.status = status;
  auth.user = user;
  const ui = userEvent.setup();
  renderWithToast(
    <AppShell>
      <p>子コンテンツ</p>
    </AppShell>,
  );
  return ui;
}

// 固定サイドバー(lg 以上)とドロワー(lg 未満)の両方が DOM にあるため、固定サイドバー側を使う
function fixedSidebar(): HTMLElement {
  return screen.getAllByRole('navigation', { name: nav.mainLabel })[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  location.pathname = '/dashboard';
  window.history.replaceState(null, '', '/dashboard');
});

describe('AppShell 画面の保護', () => {
  it('shouldShowSpinnerWithoutChildrenWhileLoading', () => {
    renderShell('loading', null);
    expect(screen.getByText(messages.common.loading)).toBeInTheDocument();
    expect(screen.queryByText('子コンテンツ')).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shouldRedirectToLoginWithReturnPathWhenUnauthenticated', async () => {
    renderShell('unauthenticated', null);
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/login?redirect=%2Fdashboard'),
    );
    expect(screen.queryByText('子コンテンツ')).not.toBeInTheDocument();
  });

  it('shouldIncludeQueryInReturnPath', async () => {
    location.pathname = '/leaves';
    window.history.replaceState(null, '', '/leaves?tab=apply');
    renderShell('unauthenticated', null);
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        `/login?redirect=${encodeURIComponent('/leaves?tab=apply')}`,
      ),
    );
  });

  it('shouldRedirectToPasswordWhenMustChangePassword', async () => {
    renderShell('authenticated', { ...EMPLOYEE, mustChangePassword: true });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/password'));
    expect(screen.queryByText('子コンテンツ')).not.toBeInTheDocument();
  });

  it('shouldRenderChildrenWhenAuthenticated', () => {
    renderShell('authenticated', EMPLOYEE);
    expect(screen.getByText('子コンテンツ')).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('AppShell メニュー', () => {
  it('shouldShowFourMenusForEmployeeWithCurrentPage', () => {
    renderShell('authenticated', EMPLOYEE);
    const links = within(fixedSidebar()).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/dashboard',
      '/attendance',
      '/leaves',
      '/leaves/approvals',
    ]);
    expect(within(fixedSidebar()).getByRole('link', { name: nav.dashboard })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(fixedSidebar()).getByRole('link', { name: nav.leaves })).not.toHaveAttribute(
      'aria-current',
    );
    expect(within(fixedSidebar()).queryByText(nav.adminGroup)).not.toBeInTheDocument();
  });

  it('shouldShowSixMenusForAdmin', () => {
    location.pathname = '/admin/users';
    renderShell('authenticated', ADMIN);
    const links = within(fixedSidebar()).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/dashboard',
      '/attendance',
      '/leaves',
      '/leaves/approvals',
      '/admin/users',
      '/admin/attendance',
    ]);
    expect(within(fixedSidebar()).getByRole('link', { name: nav.adminUsers })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(fixedSidebar()).getByRole('link', { name: nav.dashboard })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('shouldShowUserNameAndPasswordLinkInUserMenu', async () => {
    const ui = renderShell('authenticated', EMPLOYEE);
    const menuButton = screen.getByRole('button', { name: `${nav.userMenu}: 山田太郎` });
    expect(menuButton).toHaveTextContent('山田太郎');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await ui.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: nav.changePassword })).toHaveAttribute(
      'href',
      '/password',
    );
  });
});

describe('AppShell ログアウト', () => {
  it.each([
    ['success', () => Promise.resolve()],
    ['api failure', () => Promise.reject(new ApiError(500, 'INTERNAL_ERROR', 'エラー'))],
  ])('shouldGoToLoginWithoutRedirectAfterLogout(%s)', async (_label, impl) => {
    auth.logout.mockImplementation(impl);
    const ui = renderShell('authenticated', EMPLOYEE);

    await ui.click(screen.getByRole('button', { name: `${nav.userMenu}: 山田太郎` }));
    await ui.click(screen.getByRole('button', { name: nav.logout }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('shouldNotAddRedirectWhenStatusBecomesUnauthenticatedByLogout', async () => {
    auth.logout.mockImplementation(async () => {
      auth.status = 'unauthenticated';
      auth.user = null;
    });
    auth.status = 'authenticated';
    auth.user = EMPLOYEE;
    const ui = userEvent.setup();
    const shell = (
      <AppShell>
        <p>子コンテンツ</p>
      </AppShell>
    );
    const { rerender } = renderWithToast(shell);

    await ui.click(screen.getByRole('button', { name: `${nav.userMenu}: 山田太郎` }));
    await ui.click(screen.getByRole('button', { name: nav.logout }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    // 未認証になった状態で描画し直しても、戻り先付きのログイン画面へは移らない
    rerender(
      <ToastProvider>
        <AppShell>
          <p>子コンテンツ（再描画）</p>
        </AppShell>
      </ToastProvider>,
    );

    expect(screen.queryByText('子コンテンツ（再描画）')).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalledWith(expect.stringContaining('redirect='));
  });
});

describe('AppShell 管理者ガード', () => {
  it('shouldRedirectEmployeeToDashboardWithOneToastOnAdminPath', async () => {
    location.pathname = '/admin/attendance';
    renderShell('authenticated', EMPLOYEE);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(messages.common.forbidden)).toBeInTheDocument();
    expect(screen.getAllByText(messages.common.forbidden)).toHaveLength(1);
    expect(screen.queryByText('子コンテンツ')).not.toBeInTheDocument();
  });

  it('shouldNotRedirectEmployeeOnNonAdminPath', () => {
    location.pathname = '/attendance';
    renderShell('authenticated', EMPLOYEE);
    expect(screen.getByText('子コンテンツ')).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shouldRenderAdminPathForAdmin', () => {
    location.pathname = '/admin/attendance';
    renderShell('authenticated', ADMIN);
    expect(screen.getByText('子コンテンツ')).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('AppShell ドロワー', () => {
  it('shouldOpenDrawerWithHamburgerAndCloseOnMenuClick', async () => {
    const ui = renderShell('authenticated', EMPLOYEE);
    const hamburger = screen.getByRole('button', { name: nav.openMenu });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    const drawer = document.getElementById(hamburger.getAttribute('aria-controls') ?? '');
    expect(drawer).not.toBeNull();
    expect(drawer).not.toBeVisible();

    await ui.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    expect(hamburger).toHaveAccessibleName(nav.closeMenu);
    expect(drawer).toBeVisible();

    await ui.click(within(drawer as HTMLElement).getByRole('link', { name: nav.leaves }));
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(drawer).not.toBeVisible();
  });

  it('shouldCloseDrawerWithEscape', async () => {
    const ui = renderShell('authenticated', EMPLOYEE);
    const hamburger = screen.getByRole('button', { name: nav.openMenu });
    await ui.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    await ui.keyboard('{Escape}');
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });
});
