import { useId } from 'react';
import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  // 見出しの右側に置く補助情報やリンク
  action?: ReactNode;
  children: ReactNode;
}

// 09 §3 Card Panel: 白背景 + 見出し + 本文(radius 6, padding 28, shadow-card)
export function Card({ title, action, children }: CardProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-md bg-white p-5 shadow-card sm:p-7">
      {/* 狭い幅では action が次の行へ折り返し、見出しは縮めず1行を保つ */}
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={titleId} className="text-base/6 font-bold text-general-100">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
