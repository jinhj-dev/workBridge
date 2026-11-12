import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { ApprovalsAccessContext } from './ApprovalsAccess';
import { MobileTabBar } from './MobileTabBar';
import { SidebarNav } from './Sidebar';

const nav = messages.nav;
const lm = messages.leaveManagement;

function submenuLabels(): string[] {
  const toggle = screen.getByRole('button', { name: new RegExp(nav.leaves) });
  const list = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
  return within(list as HTMLElement)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '');
}

const location = vi.hoisted(() => ({ pathname: '/leaves/calendar' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => location.pathname,
}));

beforeEach(() => {
  location.pathname = '/leaves/calendar';
});

function renderSidebar(options: {
  isAdmin?: boolean;
  approvalsVisible?: boolean | null;
  pendingApprovalCount?: number | null;
}) {
  const { isAdmin = false, approvalsVisible = null, pendingApprovalCount = null } = options;
  const ui = userEvent.setup();
  render(
    <ApprovalsAccessContext.Provider value={approvalsVisible}>
      <SidebarNav
        isAdmin={isAdmin}
        onNavigate={() => {}}
        pendingApprovalCount={pendingApprovalCount}
      />
    </ApprovalsAccessContext.Provider>,
  );
  return ui;
}

function leaveToggle() {
  return screen.getByRole('button', { name: new RegExp(nav.leaves) });
}

describe('サイドバーの休暇管理サブメニュー', () => {
  it('shouldNotShowLeaveApprovalMenuItemForAnyUser', () => {
    renderSidebar({ isAdmin: true, approvalsVisible: true });
    expect(screen.queryByRole('link', { name: '休暇承認' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: nav.approvalsLink })).not.toBeInTheDocument();
    expect(screen.queryByText('休暇承認')).not.toBeInTheDocument();
  });

  it('shouldOpenSubmenuAndMarkCalendarActiveOnCalendarPath', () => {
    renderSidebar({ approvalsVisible: false });
    expect(leaveToggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: lm.tabCalendar })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: lm.tabMine })).not.toHaveAttribute('aria-current');
  });

  it('shouldKeepSubmenuClosedOutsideLeavePaths', () => {
    location.pathname = '/dashboard';
    renderSidebar({ approvalsVisible: false });
    expect(leaveToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('shouldToggleSubmenuByClickingParent', async () => {
    location.pathname = '/dashboard';
    const ui = renderSidebar({ approvalsVisible: false });
    await ui.click(leaveToggle());
    expect(leaveToggle()).toHaveAttribute('aria-expanded', 'true');
    await ui.click(leaveToggle());
    expect(leaveToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('shouldShowOnlyMineAndCalendarForNonApprover', () => {
    renderSidebar({ approvalsVisible: false });
    expect(submenuLabels()).toEqual([lm.tabMine, lm.tabCalendar]);
  });

  it('shouldShowOnlyMineAndCalendarWhileApproverCheckIsPending', () => {
    renderSidebar({ approvalsVisible: null });
    expect(submenuLabels()).toEqual([lm.tabMine, lm.tabCalendar]);
  });

  it('shouldShowApprovalsForApprover', () => {
    renderSidebar({ approvalsVisible: true });
    expect(submenuLabels()).toEqual([lm.tabMine, lm.tabCalendar, lm.tabApprovals]);
    expect(screen.getByRole('link', { name: lm.tabApprovals })).toHaveAttribute(
      'href',
      '/leaves/approvals',
    );
  });

  it('shouldMarkApprovalsActiveOnApprovalsPath', () => {
    location.pathname = '/leaves/approvals';
    renderSidebar({ approvalsVisible: true });
    expect(screen.getByRole('link', { name: lm.tabApprovals })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: lm.tabMine })).not.toHaveAttribute('aria-current');
  });

  it('shouldMarkOnlyMineActiveOnLeavesRoot', () => {
    location.pathname = '/leaves';
    renderSidebar({ approvalsVisible: true });
    expect(screen.getByRole('link', { name: lm.tabMine })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: lm.tabCalendar })).not.toHaveAttribute('aria-current');
  });

  it('shouldShowPendingCountOnLeaveManagementParent', () => {
    renderSidebar({ isAdmin: true, approvalsVisible: true, pendingApprovalCount: 3 });
    expect(within(leaveToggle()).getByText(nav.pendingCount(3))).toBeInTheDocument();
    expect(within(leaveToggle()).getByText('3')).toBeInTheDocument();
  });

  it('shouldNotShowPendingCountWhenZero', () => {
    renderSidebar({ isAdmin: true, approvalsVisible: true, pendingApprovalCount: 0 });
    expect(within(leaveToggle()).queryByText(nav.pendingCount(0))).not.toBeInTheDocument();
  });
});

describe('モバイル下部タブの休暇メニュー(FC-05)', () => {
  function renderTabs(pendingApprovalCount: number | null) {
    return render(
      <MobileTabBar
        drawerOpen={false}
        drawerId="mobile-drawer"
        onToggleDrawer={() => {}}
        pendingApprovalCount={pendingApprovalCount}
      />,
    );
  }

  it('shouldHaveFourTabsWithoutLeaveApproval', () => {
    renderTabs(null);
    const tabNav = screen.getByRole('navigation', { name: nav.tabLabel });
    const labels = within(tabNav)
      .getAllByRole('link')
      .map((link) => link.textContent ?? '');
    expect(labels.some((label) => label.includes('休暇承認'))).toBe(false);
    expect(labels).toHaveLength(3);
    expect(within(tabNav).getByRole('button', { name: nav.openMenu })).toBeInTheDocument();
  });

  it('shouldMarkLeaveManagementTabActiveOnCalendarPath', () => {
    renderTabs(null);
    const tab = screen.getByRole('link', { name: nav.leaves });
    expect(tab).toHaveAttribute('aria-current', 'page');
  });

  it('shouldShowPendingBadgeOnLeaveManagementTab', () => {
    renderTabs(2);
    const tab = screen.getByRole('link', { name: new RegExp(nav.leaves) });
    expect(within(tab).getByText(nav.pendingCount(2))).toBeInTheDocument();
  });

  it('shouldNotShowPendingBadgeWhenNoPendingApproval', () => {
    renderTabs(0);
    const tab = screen.getByRole('link', { name: nav.leaves });
    expect(within(tab).queryByText(nav.pendingCount(0))).not.toBeInTheDocument();
  });
});
