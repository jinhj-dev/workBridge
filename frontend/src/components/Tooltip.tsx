'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

// 09 §3 Tooltip: 暗い背景・12px。hover とキーボードフォーカスの両方で表示し、Esc で閉じる
export function Tooltip({ content, children }: TooltipProps) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visible = (hovered || focused) && !dismissed;

  return (
    <span className="relative inline-flex">
      <span
        tabIndex={0}
        aria-describedby={visible ? id : undefined}
        onMouseEnter={() => {
          setHovered(true);
          setDismissed(false);
        }}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          setFocused(true);
          setDismissed(false);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && visible) {
            event.stopPropagation();
            setDismissed(true);
          }
        }}
        className="inline-flex rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
      >
        {children}
      </span>
      {visible && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-0 z-10 mb-1.5 w-max max-w-60 rounded bg-general-100 px-3 py-2 text-xs/4 text-white shadow-card"
        >
          {content}
        </span>
      )}
    </span>
  );
}
