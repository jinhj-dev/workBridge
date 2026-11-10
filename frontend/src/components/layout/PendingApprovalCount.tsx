'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { Leave, Paginated } from '@/lib/api/types';

interface PendingApprovalCountValue {
  // null: 未取得または取得失敗(バッジを出さない)
  count: number | null;
  refresh: () => void;
}

const NOOP_VALUE: PendingApprovalCountValue = { count: null, refresh: () => {} };
const PendingApprovalCountContext = createContext<PendingApprovalCountValue>(NOOP_VALUE);

// サイドバーの承認待ち件数(03 全域ナビゲーション)。表示時・画面遷移時・refresh() で取り直す
export function PendingApprovalCountProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  // 遅れて届いた古い応答を捨てるための通番
  const requestIdRef = useRef(0);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    apiFetch<Paginated<Leave>>('/leaves/pending-approval?scope=mine&limit=1')
      .then((result) => {
        if (requestId === requestIdRef.current) setCount(result.totalCount);
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError || error instanceof NetworkError)) throw error;
        // 失敗してもバッジを隠すだけで、トーストは出さない
        if (requestId === requestIdRef.current) setCount(null);
      });
  }, [pathname, refreshToken]);

  return (
    <PendingApprovalCountContext.Provider value={{ count, refresh }}>
      {children}
    </PendingApprovalCountContext.Provider>
  );
}

export function usePendingApprovalCount(): PendingApprovalCountValue {
  return useContext(PendingApprovalCountContext);
}
