import { messages } from '@/messages/ja';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onChange: (page: number) => void;
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

// 先頭・末尾・現在ページの前後 1 つを並べ、間は「…」にする
function buildItems(page: number, totalPages: number): PageItem[] {
  const numbers = new Set([1, totalPages, page - 1, page, page + 1]);
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

// 09 §3 Pagination: 前へ/次へ + 番号 + … + 総件数(セル 36×36, radius 4)
export function Pagination({ page, totalPages, totalCount, onChange }: PaginationProps) {
  const t = messages.pagination;
  const total = <p className="text-sm/5 text-general-80 tabular-nums">{t.total(totalCount)}</p>;
  if (totalPages <= 1) return <div className="mt-4 flex justify-end">{total}</div>;

  return (
    <div className="mt-4 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
      {total}
      <nav aria-label={t.label}>
        <ul className="flex flex-wrap items-center justify-center gap-1">
          <li>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onChange(page - 1)}
              className={`${cellClass} ${wideCellClass} text-general-100 hover:bg-general-30 disabled:cursor-not-allowed disabled:text-general-60 disabled:hover:bg-transparent`}
            >
              {t.previous}
            </button>
          </li>
          {buildItems(page, totalPages).map((item) =>
            typeof item === 'string' ? (
              <li key={item} aria-hidden="true" className={`${cellClass} text-general-80`}>
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  aria-label={t.page(item)}
                  aria-current={item === page ? 'page' : undefined}
                  onClick={() => onChange(item)}
                  className={`${cellClass} ${
                    item === page
                      ? 'bg-primary-30 font-bold text-primary-100'
                      : 'text-general-100 hover:bg-general-30'
                  }`}
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
              className={`${cellClass} ${wideCellClass} text-general-100 hover:bg-general-30 disabled:cursor-not-allowed disabled:text-general-60 disabled:hover:bg-transparent`}
            >
              {t.next}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
