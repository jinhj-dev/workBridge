'use client';

import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  label: string;
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
}

// 09 §3 Tabs(horizontal): 選択中は Primary の文字 + 下線 2px、下に区切り線
export function Tabs({ label, items, value, onChange }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // ← → で隣のタブへ移り、そのタブを選択する(端は反対側へ回る)
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const currentIndex = items.findIndex((item) => item.value === value);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + step + items.length) % items.length;
    onChange(items[nextIndex].value);
    listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="flex gap-6 border-b border-general-40"
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={`-mb-px h-11 shrink-0 border-b-2 px-1 text-sm/5 font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100 ${
              selected
                ? 'border-primary-100 text-primary-100'
                : 'border-transparent text-general-80 hover:text-general-100'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
