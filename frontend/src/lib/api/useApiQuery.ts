'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch } from './client';

export type QueryStatus = 'loading' | 'error' | 'success';

interface QueryState<T> {
  // どのパスの結果か(パスが変わったら前の結果を見せない)
  path: string | null;
  status: QueryStatus;
  data: T | undefined;
  error: unknown;
}

export interface ApiQuery<T> {
  status: QueryStatus;
  data: T | undefined;
  error: unknown;
  reload: () => void;
  // 更新系 API の応答で手元の値を置き換える(再取得しない)
  setData: (data: T) => void;
}

interface ApiQueryOptions {
  // 取得に失敗したときに 1 回呼ぶ(モーダルを閉じるなど、エラー表示以外の対応用)
  onError?: (error: unknown) => void;
}

// GET の API を 1 本呼び、読み込み中・失敗・成功の状態を返す。
// path が null のときは呼ばない(権限がなく表示しない領域など)。
export function useApiQuery<T>(path: string | null, options: ApiQueryOptions = {}): ApiQuery<T> {
  const router = useRouter();
  const [state, setState] = useState<QueryState<T>>({
    path,
    status: 'loading',
    data: undefined,
    error: null,
  });
  const [nonce, setNonce] = useState(0);
  const notifyError = useEffectEvent((error: unknown) => options.onError?.(error));

  useEffect(() => {
    if (path === null) return;
    // アンマウント後やパス変更後に古い応答で上書きしない
    let ignore = false;
    apiFetch<T>(path).then(
      (data) => {
        if (!ignore) setState({ path, status: 'success', data, error: null });
      },
      (error: unknown) => {
        if (ignore) return;
        // 03 共通規則: パスワード変更が必要な利用者は変更画面へ
        if (error instanceof ApiError && error.code === 'PASSWORD_CHANGE_REQUIRED') {
          router.replace('/password');
        }
        setState({ path, status: 'error', data: undefined, error });
        notifyError(error);
      },
    );
    return () => {
      ignore = true;
    };
  }, [path, nonce, router]);

  const reload = useCallback(() => {
    setState({ path, status: 'loading', data: undefined, error: null });
    setNonce((n) => n + 1);
  }, [path]);

  const setData = useCallback(
    (data: T) => setState({ path, status: 'success', data, error: null }),
    [path],
  );

  const current =
    state.path === path ? state : { status: 'loading' as const, data: undefined, error: null };
  return { status: current.status, data: current.data, error: current.error, reload, setData };
}
