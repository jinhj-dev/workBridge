import { useId } from 'react';
import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  // 見出しの左に置く装飾アイコン(aria-hidden のものを渡す)
  icon?: ReactNode;
  // 見出しの右側に置く補助情報やリンク
  action?: ReactNode;
  children: ReactNode;
}

// カードの外枠(AdminStatsSection のエラー表示など、Card を使えない箇所でも共通に使う)
export const cardSurfaceClass =
  'rounded-2xl border border-general-40 bg-white px-5 py-4 shadow-card-soft sm:px-6 sm:py-5';

// Card Panel: 白背景 + 枠線 + 見出し(任意のアイコン付き)+ 本文(radius 16, padding 横24・縦20, shadow-card-soft。本文は残りの高さを受ける)
export function Card({ title, icon, action, children }: CardProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={`${cardSurfaceClass} flex flex-col`}>
      {/* 狭い幅では action が次の行へ折り返し、見出しは縮めず1行を保つ */}
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={titleId} className="flex items-center gap-2 text-lg/7 font-bold text-general-100">
          {icon && (
            <span aria-hidden="true" className="size-6 shrink-0 text-primary-100 [&>svg]:size-full">
              {icon}
            </span>
          )}
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </section>
  );
}
