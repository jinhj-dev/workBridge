'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@/components/Spinner';
import { ApiError, NetworkError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import { SidebarNav } from './Sidebar';
import { TopBar } from './TopBar';

const DRAWER_ID = 'app-drawer';

// ログイン後の画面の共通レイアウト(09 §3 App Shell)と画面の保護(03 認証および権限処理)
export function AppShell({ children }: { children: ReactNode }) {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // ログアウト操作による未認証では、戻り先(redirect)を付けずにログイン画面へ移る
  const loggingOutRef = useRef(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated' && !loggingOutRef.current) {
      const target = pathname + window.location.search;
      router.replace(`/login?redirect=${encodeURIComponent(target)}`);
    } else if (status === 'authenticated' && user?.mustChangePassword) {
      router.replace('/password');
    }
  }, [status, user, pathname, router]);

  // ドロワーを開いたら最初のメニューへフォーカスし、Esc で閉じる
  useEffect(() => {
    if (!drawerOpen) return;
    drawerRef.current?.querySelector<HTMLElement>('a')?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  // API が失敗しても手元の認証情報は破棄されるので、必ずログイン画面へ移る
  async function handleLogout() {
    loggingOutRef.current = true;
    try {
      await logout();
    } catch (error) {
      if (!(error instanceof ApiError || error instanceof NetworkError)) throw error;
    }
    router.replace('/login');
  }

  if (status !== 'authenticated' || !user || user.mustChangePassword) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center text-primary-100">
        <Spinner />
        <span className="sr-only">{messages.common.loading}</span>
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-dvh">
      <TopBar
        userName={user.name}
        drawerOpen={drawerOpen}
        drawerId={DRAWER_ID}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
        onLogout={handleLogout}
      />

      {/* lg 以上: 常に表示する固定サイドバー */}
      <aside className="fixed top-17 bottom-0 left-0 hidden w-62.5 overflow-y-auto border-r border-general-40 bg-white lg:block">
        <SidebarNav isAdmin={isAdmin} />
      </aside>

      {/* lg 未満: メニューボタンで開くドロワー(背景のクリック・Esc・メニュー選択で閉じる) */}
      <div id={DRAWER_ID} ref={drawerRef} hidden={!drawerOpen} className="lg:hidden">
        <div
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 top-17 z-20 bg-general-100/50"
        />
        <aside className="fixed top-17 bottom-0 left-0 z-20 w-62.5 max-w-[80vw] overflow-y-auto bg-white shadow-card">
          <SidebarNav isAdmin={isAdmin} onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>

      <main className="px-4 pt-25 pb-10 sm:px-6 lg:pl-72.5 lg:pr-10">{children}</main>
    </div>
  );
}
