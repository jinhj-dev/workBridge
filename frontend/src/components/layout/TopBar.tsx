'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { messages } from '@/messages/ja';

interface TopBarProps {
  userName: string;
  drawerOpen: boolean;
  drawerId: string;
  onToggleDrawer: () => void;
  onLogout: () => void;
}

const iconButtonClass =
  'flex size-10 items-center justify-center rounded text-general-80 hover:bg-general-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

const menuItemClass =
  'flex h-10 w-full items-center px-4 text-left text-sm/5 text-general-100 hover:bg-general-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100';

// 09 §3 Top Navigation: 高さ 68、白背景 + 影。左にロゴ(lg 未満はメニューボタンも)、右にユーザーメニュー
export function TopBar({ userName, drawerOpen, drawerId, onToggleDrawer, onLogout }: TopBarProps) {
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-label={drawerOpen ? messages.nav.closeMenu : messages.nav.openMenu}
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          className={`${iconButtonClass} -ml-2 lg:hidden`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <Link
          href="/dashboard"
          className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
        >
          <Logo />
        </Link>
      </div>

      <div ref={menuRef} className="relative">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="user-menu"
          aria-label={`${messages.nav.userMenu}: ${userName}`}
          className="flex h-10 max-w-48 items-center gap-1 rounded px-2 text-sm/5 font-medium text-general-100 hover:bg-general-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
        >
          <span className="truncate">{userName}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className={`size-5 shrink-0 text-general-80 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
    </header>
  );
}
