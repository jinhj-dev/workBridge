import { Card } from '@/components/Card';
import { SectionError } from '@/components/SectionError';
import { Skeleton } from '@/components/Skeleton';
import type { SheetSummary } from '@/lib/api/types';
import { formatDays, formatWorkMinutes } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.attendance.sheet;

interface MonthlySummarySectionProps {
  status: 'loading' | 'error' | 'success';
  summary: SheetSummary | undefined;
  year: number;
  // 有給の残日数。取得できない間(読み込み中・失敗)は null
  remainingDays: number | null;
  // 月の切り替え中(前の月の値を表示している間)は薄く表示する
  isStale?: boolean;
  onRetry: () => void;
}

// SCR-003 月間集計。数値はすべてサーバーの集計値をそのまま表示する
export function MonthlySummarySection({
  status,
  summary,
  year,
  remainingDays,
  isStale = false,
  onRetry,
}: MonthlySummarySectionProps) {
  function renderBody() {
    if (status === 'loading') {
      return (
        <div role="status">
          <span className="sr-only">{messages.common.loading}</span>
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    if (status === 'error' || !summary) return <SectionError onRetry={onRetry} />;

    const items: { label: string; value: string }[] = [
      { label: t.scheduledWorkDays, value: formatDays(summary.scheduledWorkDays) },
      { label: t.actualWorkDays, value: formatDays(summary.actualWorkDays) },
      { label: t.actualWorkTime, value: formatWorkMinutes(summary.actualWorkMinutes) },
      { label: t.overtime, value: formatWorkMinutes(summary.overtimeMinutes) },
      { label: t.night, value: formatWorkMinutes(summary.nightMinutes) },
      { label: t.holidayWork, value: formatWorkMinutes(summary.holidayWorkMinutes) },
      { label: t.paidLeaveDays, value: formatDays(summary.paidLeaveDays) },
      {
        label: t.leaveRemaining(year),
        value: remainingDays === null ? messages.common.noValue : formatDays(remainingDays),
      },
    ];
    return (
      <dl
        aria-busy={isStale}
        className={`grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4 ${
          isStale ? 'opacity-60 transition-opacity' : ''
        }`}
      >
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <dt className="text-sm/5 text-general-80">{item.label}</dt>
            <dd className="text-h6 font-bold text-general-100 tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return <Card title={t.summaryTitle}>{renderBody()}</Card>;
}
