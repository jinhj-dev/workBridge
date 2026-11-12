import { Card } from '@/components/Card';
import { DonutChart } from '@/components/DonutChart';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { formatPercent, shareOf } from '@/lib/attendance-rate';
import type { AdminDashboardSummary } from '@/lib/api/types';
import type { ApiQuery } from '@/lib/api/useApiQuery';
import { messages } from '@/messages/ja';
import { PieChartIcon } from './icons';

const t = messages.dashboard.company;

// SCR-002 全社の出勤状況(ADMIN のみ)。割合の分母は 出勤 + 休暇 + 未出勤
export function CompanyAttendanceSection({ query }: { query: ApiQuery<AdminDashboardSummary> }) {
  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={4} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const s = query.data;
    const denominator = s.clockedInCount + s.onLeaveCount + s.notClockedInCount;
    const rate = formatPercent(s.attendanceRate);
    const rows = [
      { label: t.clockedIn, count: s.clockedInCount, colorClass: 'text-primary-100' },
      { label: t.notClockedIn, count: s.notClockedInCount, colorClass: 'text-general-50' },
      { label: t.onLeave, count: s.onLeaveCount, colorClass: 'text-violet-100' },
    ];
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-5 sm:gap-8">
          <DonutChart
            segments={rows.map((r) => ({
              value: r.count,
              colorClass: r.colorClass,
              label: r.label,
            }))}
            centerLabel={t.rate}
            centerValue={rate}
            ariaLabel={t.chartLabel(rate, s.clockedInCount, s.notClockedInCount, s.onLeaveCount)}
          />
          <ul className="flex min-w-0 flex-1 flex-col divide-y divide-general-40">
            {rows.map((r) => (
              <li
                key={r.label}
                className="flex items-center gap-2 py-2 text-sm/5 text-general-100 first:pt-0 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className={`size-3 shrink-0 rounded-full bg-current ${r.colorClass}`}
                />
                <span className="flex-1 font-medium">{r.label}</span>
                <span className="tabular-nums">
                  {t.legend(r.count, formatPercent(shareOf(r.count, denominator)))}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {!s.isWorkday && (
          <p className="text-sm/5 text-general-80">{messages.dashboard.holidayNote}</p>
        )}
      </div>
    );
  }

  return (
    <Card title={t.title} icon={<PieChartIcon />}>
      {renderContent()}
    </Card>
  );
}
