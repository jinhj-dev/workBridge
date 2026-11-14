import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  // タイトル下の説明文(省略可)
  description?: string;
  // タイトル左の装飾アイコン(primary)。aria-hidden のものを渡す
  icon?: ReactNode;
  // 右端の操作(申請ボタンなど)。description 指定時は狭い幅でタイトルの下の行へ折り返す
  action?: ReactNode;
}

// ページ見出しの行: アイコン(md 以上 32px) + タイトル(28/36 Bold、md 未満 22/30) + 右端の操作。
// description がないときは狭い幅でも 1 行に収める
export function PageHeader({ title, description, icon, action }: PageHeaderProps) {
  const wrap = description !== undefined;
  return (
    <div className={`flex justify-between gap-3 ${wrap ? 'flex-wrap items-end' : 'items-center'}`}>
      <div className="min-w-0">
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
        {description && <p className="mt-2 text-sm/5 text-general-80">{description}</p>}
      </div>
      {action && <div className={wrap ? 'max-md:w-full' : 'shrink-0'}>{action}</div>}
    </div>
  );
}
