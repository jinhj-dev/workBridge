import { Button } from '@/components/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/leave/leaveIcons';
import { formatMonthLabel } from '@/lib/calendar';
import { messages } from '@/messages/ja';

interface MonthNavigatorProps {
  month: string; // YYYY-MM
  onChange: (delta: -1 | 1) => void;
}

// ‹ 2026年11月 ›。前月・翌月は 40×40 のアイコンボタン
export function MonthNavigator({ month, onChange }: MonthNavigatorProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        iconOnly
        icon={<ChevronLeftIcon />}
        onClick={() => onChange(-1)}
        aria-label={messages.leaveCalendar.prevMonth}
      />
      <span
        aria-live="polite"
        className="min-w-28 text-center text-lg/7 font-bold text-general-100 tabular-nums"
      >
        {formatMonthLabel(month)}
      </span>
      <Button
        iconOnly
        icon={<ChevronRightIcon />}
        onClick={() => onChange(1)}
        aria-label={messages.leaveCalendar.nextMonth}
      />
    </div>
  );
}
