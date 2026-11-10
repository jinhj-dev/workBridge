'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { messages } from '@/messages/ja';

interface MenuItem {
  href: string;
  label: string;
}

// 03 全域ナビゲーションの表と同じ順序・URL
const COMMON_MENU: MenuItem[] = [
  { href: '/dashboard', label: messages.nav.dashboard },
  { href: '/attendance', label: messages.nav.attendance },
  { href: '/leaves', label: messages.nav.leaves },
  { href: '/leaves/approvals', label: messages.nav.approvals },
];

const ADMIN_MENU: MenuItem[] = [
  { href: '/admin/users', label: messages.nav.adminUsers },
  { href: '/admin/departments', label: messages.nav.adminDepartments },
  { href: '/admin/attendance', label: messages.nav.adminAttendance },
];

interface SidebarNavProps {
  isAdmin: boolean;
  // メニューを選んだとき(ドロワーを閉じるため)
  onNavigate?: () => void;
  // 承認待ち件数。0 件・null(未取得・失敗)のときはバッジを出さない
  pendingApprovalCount?: number | null;
}

const APPROVALS_HREF = '/leaves/approvals';
const COUNT_MAX = 99;

// 09 §2.3 サイドバーメニュー: 項目の高さ 44、左右の余白 16、選択中は Primary で塗る
export function SidebarNav({ isAdmin, onNavigate, pendingApprovalCount }: SidebarNavProps) {
  const pathname = usePathname();

  function renderItem(item: MenuItem) {
    const active = pathname === item.href;
    const count = item.href === APPROVALS_HREF ? pendingApprovalCount : null;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={`mx-4 flex h-11 items-center justify-between gap-2 rounded px-4 text-sm/5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100 ${
            active ? 'bg-primary-100 text-white' : 'text-general-100 hover:bg-general-30'
          }`}
        >
          {item.label}
          {count != null && count > 0 && (
            <>
              <span className="sr-only">{messages.nav.pendingCount(count)}</span>
              <span
                aria-hidden="true"
                className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-general-100 px-1 text-xs/4 font-medium text-white tabular-nums"
              >
                {count > COUNT_MAX ? `${COUNT_MAX}+` : count}
              </span>
            </>
          )}
        </Link>
      </li>
    );
  }

  return (
    <nav aria-label={messages.nav.mainLabel} className="py-6">
      <ul>{COMMON_MENU.map(renderItem)}</ul>
      {isAdmin && (
        <>
          <p className="mx-4 mt-6 mb-2 px-4 text-xs/4 font-medium text-general-80">
            {messages.nav.adminGroup}
          </p>
          <ul>{ADMIN_MENU.map(renderItem)}</ul>
        </>
      )}
    </nav>
  );
}
