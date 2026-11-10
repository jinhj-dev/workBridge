'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { LeaveDetailModal } from '@/components/leave/LeaveDetailModal';
import { SectionError } from '@/components/SectionError';
import { Skeleton } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { Tabs } from '@/components/Tabs';
import type { Leave, LeaveBalance, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { tokyoToday, toQueryString } from '@/lib/date-range';
import { formatDays } from '@/lib/format';
import { parseLeavesQuery } from '@/lib/leave-days';
import type { LeavesQuery, LeavesTab } from '@/lib/leave-days';
import { messages } from '@/messages/ja';
import { LeaveApplyForm } from './LeaveApplyForm';
import { LeaveHistoryList } from './LeaveHistoryList';

const t = messages.leaves;
const LIMIT = 20;

// SCR-004 休暇管理。タブ・絞り込み・ページは URL Query に持つ(03 共通規則)。既定値は URL に出さない
export function LeavesView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentYear = Number(tokyoToday(new Date()).slice(0, 4));
  const { tab, year, status, page } = parseLeavesQuery(searchParams, currentYear);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const balance = useApiQuery<LeaveBalance>('/leaves/balance');
  const history = useApiQuery<Paginated<Leave>>(
    tab === 'history' ? `/leaves/me?${toQueryString({ year, status, page, limit: LIMIT })}` : null,
  );

  function go(next: { tab: LeavesTab } & Pick<LeavesQuery, 'year' | 'status' | 'page'>) {
    const queryString = toQueryString({
      tab: next.tab === 'apply' ? 'apply' : '',
      year: next.year === currentYear ? '' : next.year,
      status: next.status,
      page: next.page > 1 ? next.page : '',
    });
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleApplied(leave: Leave) {
    balance.reload();
    // 来年など別の年の申請でも、新しい申請が一覧に見えるように年を合わせる
    go({ tab: 'history', year: Number(leave.startDate.slice(0, 4)), status: '', page: 1 });
  }

  function handleProcessed() {
    history.reload();
    balance.reload();
  }

  function renderSummary() {
    if (balance.status === 'loading') {
      return (
        <div role="status" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-23 rounded-md" />
          ))}
          <span className="sr-only">{messages.common.loading}</span>
        </div>
      );
    }
    if (balance.status === 'error' || !balance.data) {
      return (
        <div className="rounded-md bg-white p-5 shadow-card sm:p-7">
          <SectionError onRetry={balance.reload} />
        </div>
      );
    }
    const b = balance.data;
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.granted} value={formatDays(b.grantedDays)} />
        <StatCard label={t.approved} value={formatDays(b.approvedDays)} />
        <StatCard label={t.pending} value={formatDays(b.pendingDays)} />
        <StatCard label={t.remaining} value={formatDays(b.remainingDays)} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <h1 className="text-h5 font-bold text-general-100">{t.title}</h1>

      <section aria-label={t.summaryTitle}>{renderSummary()}</section>

      <Tabs
        label={t.tabsLabel}
        items={[
          { value: 'apply', label: t.tabApply },
          { value: 'history', label: t.tabHistory },
        ]}
        value={tab}
        onChange={(value) =>
          go({
            tab: value === 'apply' ? 'apply' : 'history',
            year: currentYear,
            status: '',
            page: 1,
          })
        }
      />

      {tab === 'apply' ? (
        <LeaveApplyForm onApplied={handleApplied} onBalanceStale={balance.reload} />
      ) : (
        <LeaveHistoryList
          query={history}
          filters={{ year, status, page }}
          currentYear={currentYear}
          onChange={(next) => go({ tab: 'history', ...next })}
          onOpenDetail={setSelectedId}
        />
      )}

      <LeaveDetailModal
        key={selectedId ?? 'closed'}
        leaveId={selectedId}
        onClose={() => setSelectedId(null)}
        onProcessed={handleProcessed}
      />
    </div>
  );
}
