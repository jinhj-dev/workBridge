'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { messages } from '@/messages/ja';
import {
  CalendarCheckIcon,
  ClipboardCheckIcon,
  HomeIcon,
  MenuIcon,
  UmbrellaIcon,
} from './navIcons';

interface MobileTabBarProps {
  drawerOpen: boolean;
  drawerId: string;
  onToggleDrawer: () => void;
  // 承認待ち件数。0 件・null のときはバッジを出さない
  pendingApprovalCount: number | null;
}

interface TabItem {
  href: string;
  label: string;
  icon: ReactNode;
}

// 参照デザインの下部タブ。既存の画面だけを並べ、残りのメニュー(管理者メニュー等)は「メニュー」でドロワーを開く
const TABS: TabItem[] = [
  { href: '/dashboard', label: messages.nav.home, icon: <HomeIcon /> },
  { href: '/attendance', label: messages.nav.attendance, icon: <CalendarCheckIcon /> },
  { href: '/leaves', label: messages.nav.leaves, icon: <UmbrellaIcon /> },
  { href: '/leaves/approvals', label: messages.nav.approvals, icon: <ClipboardCheckIcon /> },
];

const tabClass =
  'relative flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs/4 font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100';

// lg 未満のみ表示する下部タブ(09 §3 App Shell)
export function MobileTabBar({
  drawerOpen,
  drawerId,
  onToggleDrawer,
  pendingApprovalCount,
}: MobileTabBarProps) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-general-40 bg-white lg:hidden">
      <nav aria-label={messages.nav.tabLabel}>
        <ul className="flex gap-1 px-2 py-2">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            const showBadge = tab.href === '/leaves/approvals' && (pendingApprovalCount ?? 0) > 0;
            return (
              <li key={tab.href} className="flex flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={`${tabClass} ${active ? 'bg-primary-30 text-primary-100' : 'text-general-80'}`}
                >
                  <span aria-hidden="true" className="size-6">
                    {tab.icon}
                  </span>
                  {tab.label}
                  {showBadge && (
                    <>
                      <span className="sr-only">
                        {messages.nav.pendingCount(pendingApprovalCount ?? 0)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute top-1 right-1/4 size-2 rounded-full bg-danger-100"
                      />
                    </>
                  )}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={onToggleDrawer}
              aria-label={drawerOpen ? messages.nav.closeMenu : messages.nav.openMenu}
              aria-expanded={drawerOpen}
              aria-controls={drawerId}
              className={`${tabClass} ${drawerOpen ? 'bg-primary-30 text-primary-100' : 'text-general-80'}`}
            >
              <span aria-hidden="true" className="size-6">
                <MenuIcon />
              </span>
              {messages.nav.menu}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
