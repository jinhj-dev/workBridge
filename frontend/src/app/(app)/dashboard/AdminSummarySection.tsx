'use client';

import { useId } from 'react';
import { SectionError } from '@/components/SectionError';
import { Skeleton } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import type { AdminDashboardSummary } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { messages } from '@/messages/ja';

const t = messages.dashboard.summary;
const gridClass = 'grid grid-cols-2 gap-4 xl:grid-cols-4';

// SCR-002 §3-2 本日の全体状況(ADMIN のみ。表示しない利用者には呼び出しもしない)
export function AdminSummarySection() {
  const titleId = useId();
  const query = useApiQuery<AdminDashboardSummary>('/admin/dashboard/summary');

  function renderContent() {
    if (query.status === 'loading') {
      return (
        <div role="status" className={gridClass}>
          <span className="sr-only">{messages.common.loading}</span>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-23 rounded-md" />
          ))}
        </div>
      );
    }
    if (query.status === 'error' || !query.data) {
      return (
        <div className="rounded-md bg-white p-5 shadow-card sm:p-7">
          <SectionError onRetry={query.reload} />
        </div>
      );
    }
    const s = query.data;
    return (
      <div className={gridClass}>
        <StatCard label={t.clockedIn} value={t.people(s.clockedInCount)} />
        <StatCard label={t.notClockedIn} value={t.people(s.notClockedInCount)} />
        <StatCard label={t.onLeave} value={t.people(s.onLeaveCount)} />
        <StatCard
          label={t.pending}
          value={t.cases(s.pendingLeaveCount)}
          href="/leaves/approvals?scope=all"
        />
      </div>
    );
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-base/6 font-bold text-general-100">
        {t.title}
      </h2>
      {renderContent()}
    </section>
  );
}
