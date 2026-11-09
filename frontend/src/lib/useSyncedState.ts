import { useState } from 'react';

// 入力フォームの値を、URL など外部の値(source)で初期化し、key が変わったら取り直す。
// 戻る操作などで URL が変わったときに入力欄を URL に合わせるために使う。
export function useSyncedState<T extends object>(
  source: T,
  key: string,
): [T, (patch: Partial<T>) => void] {
  const [state, setState] = useState({ key, value: source });
  let current = state;
  if (state.key !== key) {
    current = { key, value: source };
    setState(current);
  }
  function update(patch: Partial<T>) {
    setState({ key, value: { ...current.value, ...patch } });
  }
  return [current.value, update];
}
