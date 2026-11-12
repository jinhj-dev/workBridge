import { ChevronLeftIcon, ChevronRightIcon } from '@/components/leave/leaveIcons';
import { formatMonthLabel } from '@/lib/calendar';
import { messages } from '@/messages/ja';

interface MonthNavigatorProps {
  month: string; // YYYY-MM
  onChange: (delta: -1 | 1) => void;
}

const buttonClass =
  'flex size-10 shrink-0 items-center justify-center rounded-lg border border-general-50 bg-white text-general-100 hover:bg-general-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

// ‹ 2026年11月 ›。前月・翌月は 40×40 のアイコンボタン
export function MonthNavigator({ month, onChange }: MonthNavigatorProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(-1)}
        aria-label={messages.leaveCalendar.prevMonth}
        className={buttonClass}
      >
        <span aria-hidden="true" className="size-5">
          <ChevronLeftIcon />
        </span>
      </button>
      <span
        aria-live="polite"
        className="min-w-28 text-center text-lg/7 font-bold text-general-100 tabular-nums"
      >
        {formatMonthLabel(month)}
      </span>
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label={messages.leaveCalendar.nextMonth}
        className={buttonClass}
      >
        <span aria-hidden="true" className="size-5">
          <ChevronRightIcon />
        </span>
      </button>
    </div>
  );
}
