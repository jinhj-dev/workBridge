'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { LeaveDetailModal } from '@/components/leave/LeaveDetailModal';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import type { Leave, Paginated } from '@/lib/api/types';
import type { ApiQuery } from '@/lib/api/useApiQuery';
import { formatPeriod } from '@/lib/format';
import { messages } from '@/messages/ja';
import { CardLink } from './CardLink';
import { ChevronRightIcon, DocumentListIcon, UmbrellaIcon } from './icons';

const t = messages.dashboard.recent;

interface RecentRequestsSectionProps {
  query: ApiQuery<Paginated<Leave>>;
  // 詳細モーダルで取消などが済んだとき(残日数も取り直す)
  onProcessed: () => void;
}

// SCR-002 直近の申請履歴(自分の申請 3 件)。行を押すと休暇詳細モーダルを開く
export function RecentRequestsSection({ query, onProcessed }: RecentRequestsSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={3} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const items = query.data.items;
    if (items.length === 0) {
      return (
        <p className="border-t border-general-40 py-5 text-center text-sm/5 text-general-80">
          {t.empty}
        </p>
      );
    }
    return (
      <ul className="divide-y divide-general-40 border-t border-general-40">
        {items.map((leave) => {
          const type = messages.leave.types[leave.leaveType];
          const period = formatPeriod(leave.startDate, leave.endDate);
          return (
            <li key={leave.id}>
              <button
                type="button"
                onClick={() => setSelectedId(leave.id)}
                aria-label={t.openDetail(type, period)}
                className="flex w-full cursor-pointer items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-general-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100"
              >
                <span
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-30 text-primary-100 sm:hidden [&>svg]:size-7"
                >
                  <UmbrellaIcon />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="text-sm/5 font-bold text-general-100">{type}</span>
                  <span className="text-sm/5 text-general-80 tabular-nums sm:text-general-100">
                    {period}
                  </span>
                </span>
                <LeaveStatusBadge status={leave.status} soft />
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 text-general-80 sm:hidden [&>svg]:size-full"
                >
                  <ChevronRightIcon />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card
      title={t.title}
      icon={<DocumentListIcon />}
      action={<CardLink href="/leaves">{t.viewAll}</CardLink>}
    >
      {renderContent()}
      <LeaveDetailModal
        leaveId={selectedId}
        onClose={() => setSelectedId(null)}
        onProcessed={onProcessed}
      />
    </Card>
  );
}
