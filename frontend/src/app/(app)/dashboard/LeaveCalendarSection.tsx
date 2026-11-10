'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/Badge';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { Card } from '@/components/Card';
import { secondaryButtonClass } from '@/components/form';
import { SectionError } from '@/components/SectionError';
import { Skeleton } from '@/components/Skeleton';
import type { LeaveCalendarMonth } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatMonthLabel, shiftMonth } from '@/lib/calendar';
import { tokyoToday } from '@/lib/date-range';
import { messages } from '@/messages/ja';
import { LeaveCalendarDayModal } from './LeaveCalendarDayModal';

const t = messages.dashboard.calendar;

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path
        d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LeaveCalendarSectionProps {
  // 値が変わったら、表示中の月を取り直す(承認・申請の直後の反映)
  refreshSignal: number;
}

// SCR-002 §3-6 休暇カレンダー。全員に、承認済みの休暇取得人数を日ごとに表示する
export function LeaveCalendarSection({ refreshSignal }: LeaveCalendarSectionProps) {
  const [today] = useState(() => tokyoToday(new Date()));
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const query = useApiQuery<LeaveCalendarMonth>(`/dashboard/leave-calendar?month=${month}`);

  // 初回は取得済みなので、2 回目以降の変化だけ再取得する
  const lastSignal = useRef(refreshSignal);
  const { reload } = query;
  useEffect(() => {
    if (lastSignal.current === refreshSignal) return;
    lastSignal.current = refreshSignal;
    reload();
  }, [refreshSignal, reload]);

  const counts = useMemo(
    () => new Map(query.data?.days.map((d) => [d.date, d.count])),
    [query.data],
  );

  function renderContent() {
    if (query.status === 'loading') {
      return (
        <div role="status">
          <span className="sr-only">{messages.common.loading}</span>
          <Skeleton className="h-72 w-full" />
        </div>
      );
    }
    if (query.status === 'error' || !query.data) return <SectionError onRetry={reload} />;
    return (
      <MonthCalendar
        month={month}
        today={today}
        onSelectDate={setSelectedDate}
        renderDay={(date) => {
          const count = counts.get(date);
          return count ? <Badge variant="dark">{t.people(count)}</Badge> : null;
        }}
        getDayDescription={(date) => {
          const count = counts.get(date);
          return count ? t.dayDescription(count) : undefined;
        }}
      />
    );
  }

  return (
    <Card
      title={t.title}
      action={
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label={t.prevMonth}
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className={`${secondaryButtonClass} flex size-9 items-center justify-center`}
          >
            <Chevron direction="left" />
          </button>
          <span
            aria-live="polite"
            className="text-center text-sm/5 font-medium whitespace-nowrap text-general-100 tabular-nums sm:min-w-24"
          >
            {formatMonthLabel(month)}
          </span>
          <button
            type="button"
            aria-label={t.nextMonth}
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className={`${secondaryButtonClass} flex size-9 items-center justify-center`}
          >
            <Chevron direction="right" />
          </button>
        </div>
      }
    >
      {renderContent()}
      <LeaveCalendarDayModal date={selectedDate} onClose={() => setSelectedDate(null)} />
    </Card>
  );
}
