'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Leave, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { useAuth } from '@/lib/auth/AuthProvider';

// 承認者かどうか: 自分への依頼が 1 件でもある(処理済みを含む)かで判定する
const APPROVER_CHECK_PATH =
  '/leaves/pending-approval?scope=mine&status=PENDING,APPROVED,REJECTED&limit=1';

// true: 承認メニューを出す / false: 出さない / null: 判定前
export const ApprovalsAccessContext = createContext<boolean | null>(null);

// 承認メニュー(サイドバーの休暇管理配下)の表示判定。管理者は常に表示、それ以外は自分への依頼があるときだけ。
// サイドバー(デスクトップ・ドロワー)と休暇管理の画面で同じ判定を使うため、AppShell で 1 回だけ取得する
export function ApprovalsAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const approverCheck = useApiQuery<Paginated<Leave>>(isAdmin ? null : APPROVER_CHECK_PATH);

  let visible: boolean | null = null;
  if (isAdmin) visible = true;
  else if (approverCheck.status === 'success') visible = (approverCheck.data?.totalCount ?? 0) > 0;
  else if (approverCheck.status === 'error') visible = false;

  return (
    <ApprovalsAccessContext.Provider value={visible}>{children}</ApprovalsAccessContext.Provider>
  );
}

export function useApprovalsVisible(): boolean | null {
  return useContext(ApprovalsAccessContext);
}
