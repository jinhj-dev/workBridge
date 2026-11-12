import type { ReactNode } from 'react';
import { Card } from '@/components/Card';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import type { AttendanceSheet } from '@/lib/api/types';
import type { ApiQuery } from '@/lib/api/useApiQuery';
import { formatDays, formatHours } from '@/lib/format';
import { messages } from '@/messages/ja';
import { CardLink } from './CardLink';
import { BarChartIcon, CalendarCheckIcon, ClockIcon, CoffeeIcon, MoonIcon } from './icons';
import { MetricValue } from './MetricValue';

const t = messages.dashboard.monthly;

interface MetricItem {
  label: string;
  value: string;
  icon: ReactNode;
  iconClass: string;
}

// SCR-002 今月の勤務状況(出勤簿 API の月間集計。休日出勤は時間で表示)
export function MonthlyWorkSection({ query }: { query: ApiQuery<AttendanceSheet> }) {
  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={3} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const s = query.data.summary;
    const items: MetricItem[] = [
      {
        label: t.workDays,
        value: formatDays(s.actualWorkDays),
        icon: <CalendarCheckIcon />,
        iconClass: 'text-primary-100',
      },
      {
        label: t.totalWork,
        value: formatHours(s.actualWorkMinutes),
        icon: <ClockIcon />,
        iconClass: 'text-primary-100',
      },
      {
        label: t.overtime,
        value: formatHours(s.overtimeMinutes),
        icon: <MoonIcon />,
        iconClass: 'text-violet-100',
      },
      {
        label: t.holidayWork,
        value: formatHours(s.holidayWorkMinutes),
        icon: <CoffeeIcon />,
        iconClass: 'text-violet-100',
      },
    ];
    return (
      <dl className="grid grid-cols-4 rounded-xl bg-primary-30/50 py-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 flex-col-reverse items-center gap-0.5 border-l border-general-50 first:border-l-0"
          >
            <dt className="px-1 text-center text-xs/4 text-general-80 sm:text-sm/5">
              {item.label}
            </dt>
            <dd className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={`size-5 sm:size-6 [&>svg]:size-full ${item.iconClass}`}
              >
                {item.icon}
              </span>
              <span className="text-xl/8 font-bold text-general-100 tabular-nums sm:text-3xl/10 xl:text-2xl/9 2xl:text-3xl/10">
                <MetricValue value={item.value} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <Card
      title={t.title}
      icon={<BarChartIcon />}
      action={<CardLink href="/attendance">{t.viewDetail}</CardLink>}
    >
      {renderContent()}
    </Card>
  );
}
