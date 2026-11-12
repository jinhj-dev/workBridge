'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { messages } from '@/messages/ja';
import { BellIcon, ChevronDownIcon, UserIcon } from './navIcons';

interface TopBarProps {
  userName: string;
  // 承認待ち件数。0 件・null(未取得・失敗)のときは赤い点を出さない
  pendingApprovalCount: number | null;
  onLogout: () => void;
}

const iconButtonClass =
  'flex size-10 items-center justify-center rounded text-general-80 hover:bg-general-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

const menuItemClass =
  'flex h-10 w-full items-center px-4 text-left text-sm/5 text-general-100 hover:bg-general-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100';

// 09 §3 Top Navigation: 高さ 68、白背景 + 影。左にロゴ、右に通知ベル・アバターのユーザーメニュー(lg 未満のメニューは下部タブ)
export function TopBar({ userName, pendingApprovalCount, onLogout }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // メニューの外側をクリック、または Esc で閉じる
  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-17 items-center justify-between gap-4 bg-white px-4 shadow-card sm:px-6">
      <Link
        href="/dashboard"
        className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
      >
        <Logo />
      </Link>

      <div className="flex items-center gap-2">
        {/* 通知機能は無いため、承認待ち件数がある間だけ赤い点を出して承認画面へ案内する */}
        <Link
          href="/leaves/approvals"
          aria-label={
            pendingApprovalCount != null && pendingApprovalCount > 0
              ? messages.nav.pendingCount(pendingApprovalCount)
              : messages.nav.approvalsLink
          }
          className={`${iconButtonClass} relative`}
        >
          <span aria-hidden="true" className="size-6">
            <BellIcon />
          </span>
          {pendingApprovalCount != null && pendingApprovalCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-2 right-2.5 size-2 rounded-full bg-danger-100"
            />
          )}
        </Link>
        <span aria-hidden="true" className="h-6 w-px bg-general-40" />
        <div ref={menuRef} className="relative">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="user-menu"
            aria-label={`${messages.nav.userMenu}: ${userName}`}
            className="flex h-10 max-w-48 items-center gap-1 rounded-full px-1 sm:px-2 text-sm/5 font-medium text-general-100 hover:bg-general-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-30 p-1.5 text-primary-100"
            >
              <UserIcon />
            </span>
            <span className="hidden truncate sm:inline">{userName}</span>
            <span
              aria-hidden="true"
              className={`size-5 shrink-0 text-general-80 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            >
              <ChevronDownIcon />
            </span>
          </button>
          <ul
            id="user-menu"
            hidden={!menuOpen}
            className="absolute right-0 mt-2 w-48 overflow-hidden rounded border border-general-40 bg-white py-1 shadow-card"
          >
            <li>
              <Link href="/password" onClick={() => setMenuOpen(false)} className={menuItemClass}>
                {messages.nav.changePassword}
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className={menuItemClass}
              >
                {messages.nav.logout}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
