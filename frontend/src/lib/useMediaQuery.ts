import { useSyncExternalStore } from 'react';

// メディアクエリの一致を返す。サーバー描画と hydration 中は判定できないため null(判定前)を返す
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}
