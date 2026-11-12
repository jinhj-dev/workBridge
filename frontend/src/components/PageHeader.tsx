import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  // タイトル左の装飾アイコン(primary)。aria-hidden のものを渡す
  icon?: ReactNode;
  // 右端の操作(申請ボタンなど)
  action?: ReactNode;
}

// ページ見出しの行: アイコン(md 以上 32px) + タイトル(28/36 Bold、md 未満 22/30) + 右端の操作。狭い幅でも 1 行に収める
export function PageHeader({ title, icon, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {icon && (
          <span aria-hidden="true" className="size-6 shrink-0 text-primary-100 md:size-8">
            {icon}
          </span>
        )}
        <h1 className="min-w-0 truncate text-page-title-sm font-bold text-general-100 md:text-page-title">
          {title}
        </h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
