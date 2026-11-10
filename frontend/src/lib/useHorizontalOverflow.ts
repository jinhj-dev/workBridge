import { useEffect, useState } from 'react';

// 要素が横にあふれているか(スクロールできるか)を返す。
// スクロールできる領域だけキーボードで操作できるようにするために使う(あふれないときは Tab 順に入れない)。
// 戻り値の ref 関数を要素の ref に渡す。要素自身と先頭の子要素の大きさの変化に追従する
export function useHorizontalOverflow<T extends HTMLElement>(): [
  (element: T | null) => void,
  boolean,
] {
  const [element, setElement] = useState<T | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    if (!element) return;
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, overflowing];
}
