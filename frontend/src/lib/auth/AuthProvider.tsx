'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  apiFetch,
  refreshAccessToken,
  setAccessToken,
  setAuthFailureHandler,
} from '@/lib/api/client';

// API-AUTH-001 / API-AUTH-003 の user
export interface AuthUser {
  id: string; // UUID
  name: string;
  empId: string;
  role: 'ADMIN' | 'EMPLOYEE';
  departmentName: string | null;
  approvalRequired: boolean;
  mustChangePassword: boolean;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// loading: 初回の復元(refresh → me)中
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  login: (empId: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// 認証状態はメモリ(React state)だけで持つ。Access Token は api/client.ts のモジュール変数に保持する。
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  // 再取得に失敗した API があれば未認証に戻す
  useEffect(() => {
    setAuthFailureHandler(() => setState({ status: 'unauthenticated', user: null }));
    return () => setAuthFailureHandler(null);
  }, []);

  // 最初の表示(再読み込み含む): refresh → me で復元する。
  // refresh は合流されるので、StrictMode の二重実行でも実リクエストは 1 回になる。
  useEffect(() => {
    let ignore = false;
    refreshAccessToken()
      .then(() => apiFetch<AuthUser>('/auth/me'))
      .then(
        (user) => {
          // 復元中にログインが済んでいたら、その結果を上書きしない
          if (!ignore)
            setState((s) => (s.status === 'loading' ? { status: 'authenticated', user } : s));
        },
        () => {
          // 未ログイン(Cookie なし・期限切れ)や通信失敗は未認証として扱う
          if (!ignore)
            setState((s) =>
              s.status === 'loading' ? { status: 'unauthenticated', user: null } : s,
            );
        },
      );
    return () => {
      ignore = true;
    };
  }, []);

  const login = useCallback(async (empId: string, password: string): Promise<AuthUser> => {
    const data = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ empId, password }),
    });
    setAccessToken(data.accessToken);
    setState({ status: 'authenticated', user: data.user });
    return data.user;
  }, []);

  // API が失敗しても、手元の認証情報は必ず破棄する(03 全域ナビゲーション)
  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      setState({ status: 'unauthenticated', user: null });
    }
  }, []);

  // API-AUTH-005: 成功したら変更要求フラグを下ろす(Token と Cookie はそのまま使える)
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<void> => {
      await apiFetch<void>('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setState((s) => (s.user ? { ...s, user: { ...s.user, mustChangePassword: false } } : s));
    },
    [],
  );

  const value = useMemo(
    () => ({ ...state, login, logout, changePassword }),
    [state, login, logout, changePassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth は AuthProvider の内側で使ってください。');
  }
  return value;
}
