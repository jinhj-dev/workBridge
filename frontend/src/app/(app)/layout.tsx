import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';

// ログイン後の画面に共通のレイアウト(URL には影響しないルートグループ)
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
