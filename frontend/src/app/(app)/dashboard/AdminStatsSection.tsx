import { cardSurfaceClass } from '@/components/Card';
import { SectionError } from '@/components/SectionError';
import { Skeleton } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import type { AdminDashboardSummary } from '@/lib/api/types';
import type { ApiQuery } from '@/lib/api/useApiQuery';
import { messages } from '@/messages/ja';
import { CalendarCheckIcon, DocumentListIcon, UsersIcon } from './icons';

const t = messages.dashboard.stats;
const gridClass = 'grid grid-cols-3 gap-3 sm:gap-4';

// SCR-002 統計 3 枚(ADMIN のみ)。全社の状況 API は全社の出勤状況カードと共有する
export function AdminStatsSection({ query }: { query: ApiQuery<AdminDashboardSummary> }) {
  if (query.status === 'loading') {
    return (
      <div role="status" className={gridClass}>
        <span className="sr-only">{messages.common.loading}</span>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-23 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (query.status === 'error' || !query.data) {
    return (
      <div className={cardSurfaceClass}>
        <SectionError onRetry={query.reload} />
      </div>
    );
  }
  const s = query.data;
  return (
    <div role="group" aria-label={t.label} className={gridClass}>
      <StatCard
        icon={<UsersIcon />}
        label={t.totalEmployees}
        value={String(s.totalEmployeeCount)}
        unit={t.peopleUnit}
      />
      <StatCard
        icon={<CalendarCheckIcon />}
        label={t.clockedIn}
        value={String(s.clockedInCount)}
        unit={t.peopleUnit}
      />
      <StatCard
        icon={<DocumentListIcon />}
        label={t.pending}
        value={String(s.pendingLeaveCount)}
        unit={t.casesUnit}
        tone="danger"
        href="/leaves/approvals?scope=all"
      />
    </div>
  );
}
