import { thClass } from '@/components/table';
import { messages } from '@/messages/ja';
import { SortIcon } from './icons';

interface SortableThProps {
  label: string;
  // 現在この列で並べているときだけ向きを渡す
  direction: 'asc' | 'desc' | null;
  onSort: () => void;
  align?: 'left' | 'right';
}

// 並び替えできる表見出し。<th aria-sort> の中のボタンで切り替える(SCR-010 専用)
export function SortableTh({ label, direction, onSort, align = 'left' }: SortableThProps) {
  const ariaSort = direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`${thClass} ${align === 'right' ? 'text-right' : ''}`}
    >
      <button
        type="button"
        onClick={onSort}
        aria-label={messages.departments.sort.columnLabel(label)}
        className={`inline-flex items-center gap-1 rounded text-sm/5 font-medium whitespace-nowrap hover:text-general-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100 ${
          direction ? 'text-general-100' : ''
        }`}
      >
        {label}
        <SortIcon direction={direction} />
      </button>
    </th>
  );
}
