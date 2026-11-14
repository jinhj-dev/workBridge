import { messages } from '@/messages/ja';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onChange: (page: number) => void;
  // 狭い画面向け。現在ページの前後を省き、セルを詰めて 1 行に収める
  compact?: boolean;
  // 指定すると総件数の文言を「全 N 件中 a – b 件を表示」にする(表示範囲の算出用)
  pageSize?: number;
  // boxed: 角丸の正方形ボタン + 現在ページを青塗り + 前後は矢印(社員管理のレファレンス画像)。既定は従来の見た目
  variant?: 'default' | 'boxed';
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

// 先頭・末尾・現在ページの前後 1 つを並べ、間は「…」にする
function buildItems(page: number, totalPages: number, compact: boolean): PageItem[] {
  // compact は先頭・末尾・現在ページのみ。両端のページでは内側の隣を 1 つ足し、2 ページ目などへ直接進めるようにする
  const edgeNeighbor = page === 1 ? 2 : page === totalPages ? totalPages - 1 : page;
  const numbers = new Set(
    compact ? [1, totalPages, page, edgeNeighbor] : [1, totalPages, page - 1, page, page + 1],
  );
  const sorted = [...numbers].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((n, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && n - previous > 1) {
      items.push(index === 1 ? 'ellipsis-start' : 'ellipsis-end');
    }
    items.push(n);
  });
  return items;
}

const cellClass =
  'flex size-9 items-center justify-center rounded text-sm/5 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';
const wideCellClass = 'w-auto min-w-9 px-3';
// compact: 高さ 36 は保ち(タップ領域)、幅だけ詰める
const compactCellClass =
  'flex h-9 min-w-8 items-center justify-center rounded px-1 text-sm/5 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';
const compactEllipsisClass = 'flex h-9 w-5 items-center justify-center text-sm/5';
const compactWideCellClass = 'w-auto px-2.5';
const boxedCellClass =
  'flex size-9 items-center justify-center rounded-lg text-sm/5 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

// boxed + compact: 高さ 36 は保ち、幅だけ詰める
const boxedCompactCellClass =
  'flex h-9 min-w-8 items-center justify-center rounded-lg px-1 text-sm/5 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

function StepIcon({ direction }: { direction: 'previous' | 'next' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d={direction === 'previous' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
    </svg>
  );
}

// 09 §3 Pagination: 前へ/次へ + 番号 + … + 総件数(セル 36×36, radius 4)
export function Pagination({
  page,
  totalPages,
  totalCount,
  onChange,
  compact = false,
  pageSize,
  variant = 'default',
}: PaginationProps) {
  const t = messages.pagination;
  const totalText =
    pageSize === undefined || totalCount === 0
      ? t.total(totalCount)
      : t.range(totalCount, (page - 1) * pageSize + 1, Math.min(page * pageSize, totalCount));
  const total = <p className="text-sm/5 text-general-80 tabular-nums">{totalText}</p>;
  if (totalPages <= 1) return <div className="mt-4 flex justify-end">{total}</div>;

  const boxed = variant === 'boxed';
  const cell = boxed
    ? compact
      ? boxedCompactCellClass
      : boxedCellClass
    : compact
      ? compactCellClass
      : cellClass;
  const wideCell = boxed ? '' : compact ? compactWideCellClass : wideCellClass;
  const ellipsisCell = compact ? compactEllipsisClass : cellClass;
  const idleClass = boxed
    ? 'border border-general-50 bg-white text-general-100 hover:bg-general-30'
    : 'text-general-100 hover:bg-general-30';
  const currentClass = boxed
    ? 'border border-primary-100 bg-primary-100 font-bold text-white'
    : 'bg-primary-30 font-bold text-primary-100';
  const stepClass = boxed
    ? 'border border-general-50 bg-white text-general-100 hover:bg-general-30 disabled:cursor-not-allowed disabled:text-general-60 disabled:hover:bg-white'
    : 'text-general-100 hover:bg-general-30 disabled:cursor-not-allowed disabled:text-general-60 disabled:hover:bg-transparent';

  return (
    <div className="mt-4 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
      {total}
      <nav aria-label={t.label}>
        <ul
          className={`flex items-center justify-center ${compact ? 'gap-0.5' : 'flex-wrap gap-1'}`}
        >
          <li>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onChange(page - 1)}
              className={`${cell} ${wideCell} ${stepClass}`}
            >
              {boxed ? (
                <>
                  <StepIcon direction="previous" />
                  <span className="sr-only">{t.previous}</span>
                </>
              ) : (
                t.previous
              )}
            </button>
          </li>
          {buildItems(page, totalPages, compact).map((item) =>
            typeof item === 'string' ? (
              <li key={item} aria-hidden="true" className={`${ellipsisCell} text-general-80`}>
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  aria-label={t.page(item)}
                  aria-current={item === page ? 'page' : undefined}
                  onClick={() => onChange(item)}
                  className={`${cell} ${item === page ? currentClass : idleClass}`}
                >
                  {item}
                </button>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onChange(page + 1)}
              className={`${cell} ${wideCell} ${stepClass}`}
            >
              {boxed ? (
                <>
                  <StepIcon direction="next" />
                  <span className="sr-only">{t.next}</span>
                </>
              ) : (
                t.next
              )}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
