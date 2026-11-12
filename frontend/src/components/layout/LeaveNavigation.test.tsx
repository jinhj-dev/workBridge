import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { MobileTabBar } from './MobileTabBar';
import { SidebarNav } from './Sidebar';

const nav = messages.nav;

const location = vi.hoisted(() => ({ pathname: '/leaves/calendar' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => location.pathname,
}));

beforeEach(() => {
  location.pathname = '/leaves/calendar';
});

describe('サイドバーの休暇メニュー(FC-05)', () => {
  it('shouldNotShowLeaveApprovalMenuItemForAnyUser', () => {
    render(<SidebarNav isAdmin onNavigate={() => {}} pendingApprovalCount={null} />);
    expect(screen.queryByRole('link', { name: '休暇承認' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: nav.approvalsLink })).not.toBeInTheDocument();
    expect(screen.queryByText('休暇承認')).not.toBeInTheDocument();
  });

  it('shouldMarkLeaveManagementActiveOnCalendarPath', () => {
    render(<SidebarNav isAdmin={false} onNavigate={() => {}} pendingApprovalCount={null} />);
    const link = screen.getByRole('link', { name: nav.leaves });
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('shouldShowPendingCountOnLeaveManagementLink', () => {
    render(<SidebarNav isAdmin onNavigate={() => {}} pendingApprovalCount={3} />);
    const link = screen.getByRole('link', { name: new RegExp(nav.leaves) });
    expect(within(link).getByText(nav.pendingCount(3))).toBeInTheDocument();
    expect(within(link).getByText('3')).toBeInTheDocument();
  });

  it('shouldNotShowPendingCountWhenZero', () => {
    render(<SidebarNav isAdmin onNavigate={() => {}} pendingApprovalCount={0} />);
    const link = screen.getByRole('link', { name: nav.leaves });
    expect(within(link).queryByText(nav.pendingCount(0))).not.toBeInTheDocument();
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
