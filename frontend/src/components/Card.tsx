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
      <div className="flex min-h-7 items-center justify-between gap-4">
        <h2 id={titleId} className="text-base/6 font-bold text-general-100">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
